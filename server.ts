import { GraphQLServer } from 'graphql-yoga'
import { createStarSchema } from './index'
// import { StarSchemaTable } from './star';
import { createHintFromFunc } from './schemagen'

async function run() {
	const paramfunc = (parentField: any) => parentField.toLowerCase()
	const createHint = createHintFromFunc(paramfunc)
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
