import * as fs from 'fs'
import YAML from 'yaml'
import { GraphQLSchema } from 'graphql'
import { createRemoteSchema } from './createRemoteSchema'
import { mergeSchemas } from 'graphql-tools'
import { Binding } from 'graphql-binding';

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
    createLinkSchema(): string | null
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
    createLinkSchema() {
        if(this.links.length == 0) { return null }
        return `
        extend type ${this.name} {
            ${createLinks(this)}
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
            var resolverOfJoin = mergeResolvers[label](toTable)
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
    }
    getOverlayed(name: string) {
        if(this._overlayed[name] == null) {
            var overlay = this.overlays.find(o => o['overlayName'] == name)
            if(overlay == null) {
                return this
            }
            var obj = new StarSchemaTableImpl(this)
            obj.definition = Object.assign(this.definition, overlay.definition)
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
        var linkDef = this.root.createLinkSchema()
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

const toType = (type: string, linkType: LinkType) => {
    if(linkType == LinkType.Unique || linkType == LinkType.Single)
        return type
    return `[${type}]`
}

export const createLinks = (starSchema: StarSchemaTable ) => {
    // todo: use schema
    var rtn = starSchema.links.map(link => { return `${getLinkLabel(link)}: ${toType(link.to, link.type)}` }).join('\n')
    // console.log(rtn)
    return rtn
}

export const getLinkLabel = (link: StarSchemaLink) => {
    return link.as || link.to
}

const createBinding = (newSchema: GraphQLSchema) => {
    return new Binding ({ schema: newSchema })
}