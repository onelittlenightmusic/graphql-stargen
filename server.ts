import { GraphQLServer } from 'graphql-yoga'
import { createStarSchema } from './index'
import { StarSchemaTable } from './star';

async function run() {
	// await createRemoteSchema('https://www.universe.com/graphql/beta/')
	// await createRemoteSchema('https://5rrx10z19.lp.gql.zone/graphql')
	// await createRemoteSchema('http://localhost:4020')

	const createHint = (toTable: StarSchemaTable, sameAt: {[key:string]: any}) => {
		var keyName = Object.keys(sameAt)[0]
		var childKeyName = sameAt[keyName]
		return {
			type: 'single',
			childrenSingleParameter: async (parent, context?, info?) => { 
				console.log(parent[keyName].toLowerCase(), childKeyName)
				// return [await toTable.binding.query[toTable.definition.query]({
				// 		[childKeyName]: parent[keyName].toLowerCase()
				// })]
				return [await info.mergeInfo.delegateToSchema({
					schema: toTable.GraphQLSchema,
					operation: 'query',
					fieldName: 'location',
					args: {place: parent[keyName].toLowerCase()},
					context,
					info
				})]
			}
		}
	}

	const schema = await createStarSchema('./staryaml2.yaml', createHint)
	// const schema = await createStarSchema('./staryaml.yaml')

	if(schema == null) {
		throw new Error('no remote schema exists')
	}
	
	const server = new GraphQLServer({ schema })
	server.start({port: 4000}, () =>
		console.log(`Your GraphQL server is running now ...`),
	)
}

try {
	run()
} catch(e) {
	console.log(e)
}
