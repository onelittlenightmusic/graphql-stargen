import { GraphQLSchema, GraphQLList } from 'graphql';
import { loadConfig, StarSchemaTable, StarSchemaLink, getLinkLabel, LinkType } from './star'
import { createBatchLoader } from './batchLoad'

export async function generateStarSchema(starYamlFile: string, opt?: any): Promise<GraphQLSchema | null> {
    var starSchemaMap = loadConfig(starYamlFile)
    await starSchemaMap.getAllSchema()

   const createMergeResolver = (link: StarSchemaLink) => {
        var linkName = getLinkLabel(link)
        // console.log(linkName)
        return (toTable: StarSchemaTable) => {
            var optFunc = null
            var batchFunc = null
            var targetTable = toTable
            if(opt != null) {
                optFunc = opt[linkName]
                if(optFunc != null) {
                    if(optFunc['overlays'] != null) {
                        targetTable = toTable.getOverlayed('batch')
                    }
                    if(optFunc['batch'] != null) {
                        batchFunc = optFunc['batch']
                    }
                    if(optFunc['single'] != null) {
                       optFunc = optFunc['single']
                    }
                }
            }
            
            // var queryPackFromOpt = (optFunc != null) ? createQueryPackFromFunc(optFunc) : null
            // var queryPackGenerator = createQueryPackFromFunc(link.sameAt, optFunc) || queryPackGenerators[toTable.definition.type] || generalQueryPackageGenerator
            console.log(JSON.stringify(targetTable.definition))
            var queryPack: QueryPackage = 
                // createQueryPackFromFunc(link.sameAt, optFunc)
                (queryPackGenerators[targetTable.definition.type]
                    || createQueryPackFromFunc)(link.sameAt, optFunc, batchFunc)
            var childQuery = queryPack.getQuery(targetTable, link)
            if(childQuery == null) {
                console.log('null')
                return
            }
            return async (parent: any, args: any, context: any, info: any) => {
                var results = (await childQuery(parent, args, context, info))
                if(link.type == LinkType.Single)
                    return results[0]
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
        const batchingQuery = async (array) => {
            var queryName = toTable.definition.query
            var allParents = array.map(each => {return each.parent})
            var queryParameter = this.childrenBatchParameter(allParents)
            var info = array[0].info
            // console.log(info.returnType)
            var context = array[0].context
            const outputs = await toTable.binding.delegate('query', queryName, queryParameter, info, context)
            return {
                outputs,
                isArrayType: getTypeMultiplicity(info.returnType)
            }
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
export const createQueryPackFromFunc = (sameAt: {[key:string]: string}, childfunc: ChildFieldFunction | null, batchFunc?: any) => {
    if(batchFunc == null) {
        return new QueryPackage(
            'single',
            mapToParam(childfunc, sameAt)
        )
    } else {
        return new BatchableQueryPackage(
            'batch',
            mapToParam(childfunc, sameAt),
            mapToParams(childfunc, sameAt, batchFunc)
        )
    }
}
const mapToParam = (childfunc: ChildFieldFunction | null, sameAt: {[key:string]: string}) => {
    return (parent, args?) => {
        var rtn = {}
        Object.keys(sameAt).forEach(k => {
            let v = sameAt[k]
            rtn[v] = parent[k]
        })
        if(childfunc != null) {
            rtn = Object.assign(rtn, childfunc(parent, args))
        }
        console.log(JSON.stringify(rtn))
        return rtn
    }
}

const mapToParams = (childfunc: ChildFieldFunction | null, sameAt: {[key:string]: string}, batchFunc?: any) => {
    if(batchFunc != null) {
        return paramFromBatchFunc(batchFunc)
    }
    var param = mapToParam(childfunc, sameAt)
    return (parents, args?) => {
        var paramArray = parents.map(p => param(p, args))
        var rtn = {}
        Object.keys(sameAt).forEach(k => {
            let v = sameAt[k]
            rtn[v] = paramArray.map(value => value[v])
        })

        // var rtn = {}
        // var paramArray = parents.forEach(p => {
        //     var value = param(p, args)
        //     Object.keys(sameAt).forEach(k => {
        //         let v = sameAt[k]
        //         rtn[v] = value[v]
        //     })
        // }

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

const paramFromBatchFunc = (batchFunc: any) => {
    return (parents, args?) => batchFunc(parents)
}

const OpenCRUDQueryPackageGenerator = (sameAt: {[key:string]: string}, childfunc: ChildFieldFunction | null, batchFunc?: any) => {
    const add_in = (originalKeys: {[key:string]: string}): {[key:string]: string} => {
        var rtn = {}
        for(let key in originalKeys) {
            rtn[key] = originalKeys[key]+'_in'
        }
        return rtn
    }
    var keys = add_in(sameAt)
    var param = mapToParam(childfunc, sameAt)
    var params = mapToParams(childfunc, keys, batchFunc)
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


const queryPackGenerators = {
    graphql_opencrud: OpenCRUDQueryPackageGenerator
}

const getTypeMultiplicity = (typeName: any) => {
    console.log(typeName)
    return typeName instanceof GraphQLList
}