import { GraphQLSchema } from 'graphql';
import { loadConfig, StarSchemaTable, StarSchemaLink, getLinkLabel, LinkType } from './star'
import { createBatchLoader } from './batchLoad'

export async function generateStarSchema(starYamlFile: string, opt?: any): Promise<GraphQLSchema | null> {
    var starSchemaMap = loadConfig(starYamlFile)
    await starSchemaMap.getAllSchema()

   const createMergeResolver = (link: StarSchemaLink) => {
        return (toTable: StarSchemaTable) => {
            var queryPackGenerator = opt || queryPackGenerators[toTable.definition.type] || generalQueryPackageGenerator
            var queryPack: QueryPackage = queryPackGenerator(link.sameAt)
            var childQuery = queryPack.getQuery(toTable, link)
            if(childQuery == null) {
                console.log('null')
                return
            }
            return async (parent: any, args: any, context: any, info: any) => {
                var results = (await childQuery(parent, args, context, info))
                switch(link.type) {
                    case LinkType.Single:
                        return results[0]
                    case LinkType.Unique:
                    case LinkType.Multiple:
                    default:
                        break;
                }
                return results
            }
        }
    }
    var resolvers = {}
    starSchemaMap.getRootTable().links.forEach(link => {
        resolvers[getLinkLabel(link)] = createMergeResolver(link)
    })

    return starSchemaMap.createTotalExecutableSchema(resolvers)
}

const OpenCRUDQueryPackageGenerator = (sameAt: {[key:string]: string}) => {
    const add_in = (originalKeys: {[key:string]: string}): {[key:string]: string} => {
        var rtn = {}
        for(let key in originalKeys) {
            rtn[key] = originalKeys[key]+'_in'
        }
        return rtn
    }
    var keys = add_in(sameAt)
    var param = mapToParam(null, sameAt)
    var params = mapToParams(null, keys)
    return new BatchableQueryPackage(
        'batch',
		(parent, args) => { 
            return { 
                where: param(parent, args)
            } 
        },
        (parents) => {
            return {
                where: params(parents)
            }
        }
    )
}


export class QueryPackage {
    type: string
    childSingleQueryParam: (parent, args) => any
    constructor(type: string, childSingleQueryParam: any) {
        this.type = type
        this.childSingleQueryParam = childSingleQueryParam
    }
    getQuery(toTable: StarSchemaTable, link: StarSchemaLink) {
        return async (parent, args, context, info) => {
            return await toTable.binding.delegate(
            'query',
            toTable.definition.query,
            this.childSingleQueryParam(parent, args),
            info, context)
        }
    }
}

export class BatchableQueryPackage extends QueryPackage {
    childrenBatchParameter: (parents) => any    
    constructor(type: string, childSingleQueryParam: any, childrenBatchParameter: (any) => any) {
        super(type, childSingleQueryParam)
        this.childrenBatchParameter = childrenBatchParameter
    }
    generateBatchChildQuery(toTable: StarSchemaTable, link: StarSchemaLink) {
        const batchingQuery = (array) => {
            var queryName = toTable.definition.query
            var allParents = array.map(each => {return each.parent})
            var queryParameter = this.childrenBatchParameter(allParents)
            var info = array[0].info
            var context = array[0].context
            return toTable.binding.delegate('query', queryName, queryParameter, info, context)
        }
    
        const loader = createBatchLoader(batchingQuery, link.sameAt)
        return async (parent, args, context, info) => loader.load({parent, args, context, info})
    } 
    getQuery(toTable: StarSchemaTable, link: StarSchemaLink) {
        return this.generateBatchChildQuery(toTable, link)
    }
}

function isBatchable(object: any): object is BatchableQueryPackage {
    return 'childrenBatchParameter' in object;
}

export type ChildFieldFunction = (parent: any, args?: any) => any
export const createQueryPackFromFunc = (childfunc: ChildFieldFunction | null) => {
    return (sameAt: {[key:string]: string}) => {
        return new QueryPackage(
            'single',
            mapToParam(childfunc, sameAt)
        )
    }
}

const mapToParam = (childfunc: ChildFieldFunction | null, sameAt: {[key:string]: string}) => {
    return (parent, args?) => {
        var rtn = {}
        if(childfunc != null) {
            rtn = childfunc(parent, args)
        }
        for(let keyName in sameAt) {
            let childKeyName = sameAt[keyName]
            if(!(childKeyName in rtn)) {
                rtn[childKeyName] = parent[keyName]
            }
        }
        console.log(JSON.stringify(rtn))
        return rtn
    }
}

const mapToParams = (childfunc: ChildFieldFunction | null, sameAt: {[key:string]: string}) => {
    return (parents, args?) => {
        var rtn = {}
        var param = mapToParam(childfunc, sameAt)
        for(let keyName in sameAt) {
            let childKeyName = sameAt[keyName]
            let f = param[childKeyName] || ((a, _) => a)
            rtn[childKeyName] = parents.map(parent => f(parent[keyName], args))
        }
        

        // var rtn = {}
        // if(childfunc != null) {
        //     rtn = childfunc(parent, args)
        // }
        // for(let keyName in sameAt) {
        //     let childKeyName = sameAt[keyName]
        //     let f = childfunc[childKeyName] || ((a, _) => a)
        //     rtn[childKeyName] = parents.map(parent => f(parent[keyName], args))
        // }

        return rtn
    }
}

const generalQueryPackageGenerator = createQueryPackFromFunc(null)


const queryPackGenerators = {
    graphql_opencrud: OpenCRUDQueryPackageGenerator
}