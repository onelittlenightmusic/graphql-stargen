import { GraphQLServer } from 'graphql-yoga'
import { createStarSchema } from './index'
// import { StarSchemaTable } from './star';
import { createQueryPackFromFunc } from './schemagen'
import { config } from 'dotenv'
config()

const PORT = process.env.PORT

async function run() {
	// const schema = await createStarSchema('./staryaml.yaml')
	// const paramfunc = {
	// 	place: (address: any) => address.toLowerCase()
	// }
	// const queryPack = createQueryPackFromFunc(paramfunc)
	// const schema = await createStarSchema('./staryaml2.yaml', queryPack)
	const paramfunc = (parent, args) => {
		return {
			cityCode: parent.code.substr(0,5),
			year: 2015,
			area: 'Housing'
		}
	}
	const queryPack = createQueryPackFromFunc(paramfunc)
	const schema = await createStarSchema('./staryaml4.yaml', queryPack)
	// const schema = await createStarSchema('./staryaml3.yaml') // Error

	if(schema == null) {
		throw new Error('no remote schema exists')
	}
	
	const server = new GraphQLServer({ schema })
	server.start({port: PORT}, () =>
		console.log(`Your GraphQL server is running now ...`),
	)
}

try {
	run()
} catch(e) {
	console.log(e)
}
