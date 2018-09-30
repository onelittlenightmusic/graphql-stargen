import { GraphQLSchema } from 'graphql';
import { loadConfig, StarSchemaTable, StarSchemaLink, getLinkLabel } from './star'
import { createBatchLoader } from './batchLoad'


export async function generateStarSchema(starYamlFile: string, hintOpt?: any): Promise<GraphQLSchema | null> {
    var starSchemaMap = loadConfig(starYamlFile)
    await starSchemaMap.getAllSchema()

   const createMergeResolver = (link: StarSchemaLink) => {
        return (toTable: StarSchemaTable) => {
            var hint
            var creator;
            if(hintOpt == null) {
                if(toTable.definition.type == 'graphql-opencrud') {
                    creator = createOpenCRUDHint
                } else {
                    creator = createGeneralHint
                }
            } else {
                creator = hintOpt
            }
            hint = creator(toTable, link.sameAt)
            var childQuery
            if(hint.type == 'batch') {
                childQuery = generateBatchChildQuery(hint, toTable, link)
            } else {
                childQuery = hint.childrenSingleParameter
            }
            if(childQuery == null) {
                console.log('null')
                return
            }
            return async (parent: any, args: any, context: any, info: any) => {
                var results = (await childQuery(parent, context, info))
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

export const createOpenCRUDHint = (toTable: StarSchemaTable, sameAt: {[key:string]: any}) => {
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

export const createGeneralHint = (toTable: StarSchemaTable, sameAt: {[key:string]: any}) => {
    var keyName = Object.keys(sameAt)[0]
    var childKeyName = sameAt[keyName]
    return {
        type: 'single',
		childrenSingleParameter: async (parent, context, info) => { 
            return await toTable.binding.delegate('query', toTable.definition.query,
                { where: {
                    [childKeyName]: parent[keyName] 
                    }
                }, info, context)               
        }
	}
}

const generateBatchChildQuery = (hint: any, toTable: StarSchemaTable, link: StarSchemaLink) => {
    const batchingQuery = (array) => {
        var queryName = toTable.definition.query
        var queryParameter = hint.childrenBatchParameter(array.map(all => {return all.parent}))
        var info = array[0].info
        var context = array[0].context
        return toTable.binding.delegate('query', queryName, queryParameter, info, context)
    }

    const loader = createBatchLoader(batchingQuery, link.sameAt)
    return async (parent, context, info) => loader.load({parent, context, info})
} 

