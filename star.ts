import * as fs from 'fs'
import YAML from 'yaml'
import { GraphQLSchema } from 'graphql'
import { createRemoteSchema } from './createRemoteSchema'
import { mergeSchemas } from 'graphql-tools'
import { Binding } from 'graphql-binding';
import { getSchemaJson, GqlType } from 'graphql-introspect-parse';

interface StarSchemaMetadata {
    root: boolean
}

interface StarSchemaDefinition {
    type: string
    url: string
    query: string
}

export interface StarSchemaLink {
    to: string
    as: string
    sameAt: {[key: string]: string}
    type: LinkType
}

export enum LinkType{
    Multiple = "multiple",
    Unique = "unique",
    Single = "single"
}

export interface StarSchemaTable {
    name: string
    metadata: StarSchemaMetadata
    definition: StarSchemaDefinition
    links: StarSchemaLink[]
    GraphQLSchema: GraphQLSchema
    binding: Binding
    overlays: StarSchemaTable[]
    createLinkSchema(StarSchemaMap): string | null
    createResolvers(any, StarSchemaMap): any
    createSchema(): void
    getOverlayed(String): StarSchemaTable
}

export interface StarSchemaMap {
    tables: StarSchemaTable[]
    getAllSchema(): void
    getRootTable(): StarSchemaTable
    find(targetName: string): StarSchemaTable | undefined
    schemas(): (GraphQLSchema | string)[]
    createTotalExecutableSchema(any): any
}

class StarSchemaTableImpl implements StarSchemaTable {
    name: string
    metadata: StarSchemaMetadata
    definition: StarSchemaDefinition
    links: StarSchemaLink[]
    GraphQLSchema: GraphQLSchema
    binding: Binding
    overlays: StarSchemaTable[]
    _overlayed: {[key: string]: StarSchemaTableImpl}
    constructor(table: StarSchemaTable) {
        this.links = []
        this.overlays = []
        this._overlayed = {}
        Object.assign(this, table)
    }
    createLinkSchema(allMap: StarSchemaMap) {
        if(this.links.length == 0) { return null }
        return `
        extend type ${this.name} {
            ${createLinks(this, allMap)}
        }
    `
    }
    createResolvers(mergeResolvers: any, allMap: StarSchemaMap) {
        var rtn = {}
        var name = this.name
        for(var jo of this.links) {
            var toTable = allMap.find(jo.to)
            var label = getLinkLabel(jo)
            var fragment = `fragment ${label}Fragment on ${name} {${Object.keys(jo.sameAt).join(',')}}`
            var resolverOfJoin = mergeResolvers[label](this, toTable)
            // var resolve = async (parent: any, args: any, context: any, info: any) => {
            //     return await (resolverOfJoin(parent, args, context, info))
            // }
            var resolver = {
                fragment,
                resolve: resolverOfJoin
            }
            rtn[label] = resolver
        }
        return { [this.name]: rtn }
    }
    async createSchema() {
        this.GraphQLSchema = await createRemoteSchema(this.definition.url)
        this.binding = createBinding(this.GraphQLSchema)
        // console.log(printSchema(this.GraphQLSchema))
        // console.log(JSON.stringify(this.GraphQLSchema,null,2))
    }
    getOverlayed(name: string) {
        if(this._overlayed[name] == null) {
            var overlay = this.overlays.find(o => o['overlayName'] == name)
            if(overlay == null) {
                return this
            }
            var obj = new StarSchemaTableImpl(this)
            obj.definition = { 
                ...this.definition, 
                ...overlay.definition
            }
            // console.log(JSON.stringify(obj))
            this._overlayed[name] = obj
        }
        return this._overlayed[name]
    }
}

class StarSchemaMapImpl implements StarSchemaMap {
    tables: StarSchemaTable[]
    root: StarSchemaTable
    constructor(tables: StarSchemaTable[]) {
        this.tables = tables.map(table => new StarSchemaTableImpl(table))
        var root = this.tables.find(schema => { return schema.metadata.root })
        if(root == null) {
            throw new Error("no input")
        }
        this.root = root
    }
    async getAllSchema() {
        await Promise.all(
            this.tables.map(async schema => { await schema.createSchema() })
        )
    }
    getRootTable() {
        return this.root
    }
    find(targetName: string) {
        return this.tables.find(schema => { return schema.name == targetName })
    }
    schemas() {
        var rtn: (GraphQLSchema | string)[] = this.tables.map(schema => schema.GraphQLSchema)
        // todo: not only root 
        var linkDef = this.root.createLinkSchema(this)
        if(linkDef != null) {
            rtn.push(linkDef)
        }
        return rtn
    }
    createMergeArgs(mergeResolvers) {
        var resolvers = this.root.createResolvers(mergeResolvers, this)
        var schemas = this.schemas()
        var mergeSchemaArg = {
            schemas,
            resolvers
        }
        return mergeSchemaArg
    }
    createTotalExecutableSchema(mergeResolvers) {
        var mergeSchemaArg = this.createMergeArgs(mergeResolvers)
        return mergeSchemas(mergeSchemaArg)
    }
}

export const loadConfig = (filename: string) => {
    var yamlData = fs.readFileSync(filename,'utf8');
    var obj = YAML.parse(yamlData);
    var starSchema: StarSchemaMap = new StarSchemaMapImpl(<StarSchemaTable[]> obj.tables)
    return starSchema
}

const typeToGqlStr = (type: string, returnType: GqlType) => {
    // if(linkType == LinkType.Unique || linkType == LinkType.Single)
    //     return type
    // return `[${type}]`
    if(returnType.isList()) {
        return `[${type}]`
    }
    return type
}

export const createLinks = (fromTable: StarSchemaTable, allMap: StarSchemaMap) => {
    var linkStrings:string[] = []
    for(var link of fromTable.links) {
        var toTable = allMap.find(link.to)
        if(toTable == null) continue
        var json = getSchemaJson(toTable.GraphQLSchema)
        var query = json.getQuery(toTable.definition.query)
        // console.log(JSON.stringify(query, null, 2))
        linkStrings.push(`${getLinkLabel(link)}: ${typeToGqlStr(link.to, query.getReturnType())}` )
        // console.log(rtn)
    }
    return linkStrings.join('\n')
}

export const getLinkLabel = (link: StarSchemaLink) => {
    return link.as || link.to
}

const createBinding = (newSchema: GraphQLSchema) => {
    return new Binding ({ schema: newSchema })
}