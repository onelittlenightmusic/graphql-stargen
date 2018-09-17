import { GraphQLSchema } from 'graphql';
import { loadConfig, StarSchemaTable, StarSchemaLink, getLinkLabel } from './star'
import { createBatchLoader } from './batchLoad'
// import { loadConfig, createConnection } from './star'

// interface ResolverHint {
//     childrenBatchParameter(childrenKeys: string[]): any
// }

export async function generateStarSchema(starYamlFile: string): Promise<GraphQLSchema | null> {
    var starSchemaMap = loadConfig(starYamlFile)
    await starSchemaMap.getAllSchema()

   const createMergeResolver = (link: StarSchemaLink) => {
        return (toTable: StarSchemaTable) => {
            var hint
            if(toTable.definition.type == 'graphql-opencrud') {
                hint = createOpenCRUDHint(link.sameAt)
            } else {
                hint = createGeneralHint(link.sameAt)
            }
            // ToDo: create each hint
            var childQuery
            if(hint.type == 'batch') {
                childQuery = generateBatchChildQuery(hint, toTable, link)
            } else {
                childQuery = hint.childrenSingleParameter
            }
            return async (parent: any, args: any, context: any, info: any) => {
                var results = (await childQuery(parent))
                if(link.onlyOne) {
                    return results[0]
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

export const createOpenCRUDHint = (sameAt: {[key:string]: any}) => {
    var keyName = Object.keys(sameAt)[0]
    var childKeyName = sameAt[keyName]
    return {
        type: 'batch',
		childrenBatchParameter: parents => { 
            return { 
                where: { [childKeyName+'_in']: parents.map(parent => parent[keyName]) }
            } 
        }
	}
}

export const createGeneralHint = (sameAt: {[key:string]: any}) => {
    var keyName = Object.keys(sameAt)[0]
    var childKeyName = sameAt[keyName]
    return {
        type: 'single',
		childrenSingleParameter: parent => { 
            return { 
                [childKeyName]: parent[keyName]
            } 
        }
	}
}

const generateBatchChildQuery = (hint: any, toTable: StarSchemaTable, link: StarSchemaLink) => {
    const batchingQuery = (array) => {
        var queryParameter = hint.childrenBatchParameter(array)
        var child =  toTable.binding
        var queryName = toTable.definition.query
        var query = child.query[queryName]
        return query(queryParameter)
    }

    const loader = createBatchLoader(batchingQuery, link.sameAt)
    return async (parent) => loader.load(parent)
} 

// const getParentKeys = (sameAt: any, parent: any) => {
//     var rtn = {}
//     for(var key in sameAt) {
//         rtn[key] = parent[key]
//     }
//     return rtn
// }