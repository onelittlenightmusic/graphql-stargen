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
    sameAt: any[]
    onlyOne: boolean
}

export interface StarSchemaTable {
    name: string
    metadata: StarSchemaMetadata
    definition: StarSchemaDefinition
    links: StarSchemaLink[]
    GraphQLSchema: GraphQLSchema
    binding: Binding
    createLinkSchema(): string | null
    createResolvers(any, StarSchemaMap): any
    createSchema(): void
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
    links: any[]
    GraphQLSchema: GraphQLSchema
    binding: Binding
    constructor(table: StarSchemaTable) {
        this.links = []
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
            var fragment = `fragment ${name}Fragment on ${name} {${Object.keys(jo.sameAt).join(',')}}`
            var toTable = allMap.find(jo.to)
            var label = getLinkLabel(jo)
            var resolverOfJoin = mergeResolvers[label](toTable)
            var resolve = async (parent: any, args: any, context: any, info: any) => {
                return await (resolverOfJoin(parent, args, context, info))
            }
            var resolver = {
                fragment,
                resolve
            }
            rtn[label] = resolver
        }
        return { [this.name]: rtn }
    }
    async createSchema() {
        this.GraphQLSchema = await createRemoteSchema(this.definition.url)
        this.binding = createBinding(this.GraphQLSchema)
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

const toType = (type: string, onlyOne: boolean) => {
    if(onlyOne) {
        return type
    }
    return `[${type}]`
}

export const createLinks = (starSchema: StarSchemaTable ) => {
    // todo: use schema
    var rtn = starSchema.links.map(link => { return `${getLinkLabel(link)}: ${toType(link.to, link.onlyOne)}` }).join('\n')
    console.log(rtn)
    return rtn
}

export const getLinkLabel = (link: StarSchemaLink) => {
    if(link.as == undefined) {
        return link.to
    }
    return link.as
}

const createBinding = (newSchema: GraphQLSchema) => {
    return new Binding ({ schema: newSchema })
}