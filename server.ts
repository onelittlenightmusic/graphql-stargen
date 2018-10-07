import { GraphQLServer } from 'graphql-yoga'
import { createStarSchema } from './index'
// import { StarSchemaTable } from './star';
import { createQueryPackFromFunc } from './schemagen'

async function run() {
	// const paramfunc = {
	// 	place: (address: any) => address.toLowerCase()
	// }
	// const queryPack = createQueryPackFromFunc(paramfunc)
	// const schema = await createStarSchema('./staryaml2.yaml', queryPack)
	const schema = await createStarSchema('./staryaml2.yaml')
	// const schema = await createStarSchema('./staryaml.yaml')
	// const schema = await createStarSchema('./staryaml3.yaml') // Error

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
