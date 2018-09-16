import { GraphQLServer } from 'graphql-yoga'
import test from 'ava';
import { generateStarSchema } from '../schemagen'
import { config } from 'dotenv'
config()
const __API_PORT__ = process.env.API_PORT


async function run() {
	const schema = await generateStarSchema('./staryaml.yaml')
	// const logInput = async (resolve, root, args, context, info) => {
	// 	// console.log(`>>>logInput: ${JSON.stringify(root)},${JSON.stringify(args)}`)
	// 	const result = await resolve(root, args, context, info)
	// 	console.log(`${JSON.stringify(root)},${JSON.stringify(args)} \n >>> ${JSON.stringify(result)}`)
	// 	return result
	// }

	if(schema == null) {
		throw new Error('no remote schema exists')
	}
	const server = new GraphQLServer({ 
		schema, 
		// middlewares: [logInput
		// 	// {
		// 	// 	Query: {
		// 	// 		users: logInput,
		// 	// 	}
		// 	// }
		// ]
	})
	server.start({port: __API_PORT__}, () =>
		console.log(`Your GraphQL server is running now ...`),
	)
}

test('Create simple mergeSchema server', async t => {
	await run()
	t.pass()
})
