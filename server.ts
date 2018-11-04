import { GraphQLServer } from 'graphql-yoga'
import { createStarSchema } from './index'
import { config } from 'dotenv'
config()

const PORT = process.env.PORT

async function run() {
	// const schema = await createStarSchema('./staryaml.yaml')
	// const linkFunction = (parent, args) => {
	// 	return {
	// 		place: parent.address.toLowerCase()
	// 	}
	// }
	// const schema = await createStarSchema('./staryaml2.yaml', linkFunction)
	// const schema = await createStarSchema('./staryaml3.yaml') // Error
	const linkFunction = {
		cityEstate: (parent, args) => {
			return {
				cityCode: parent.code.substr(0,5),
				year: 2015,
				area: 'Housing'
			}
		},
		cityEstate2: (parent, args) => {
			return {
				cityCode: parent.code.substr(0,5),
				year: 2014,
				area: 'Housing'
			}
		},
		citySummary: {
			single: (parent, args) => {
				return {
					Japanese: parent.cityKanji
				}
			},
			batch:  (parents) => {
				// console.log(JSON.stringify(parents.map(p => p.cityKanji)))
				return {
					Japanese_in: parents.map(p => p.cityKanji)
				}
			},
			overlays: {
				batch: "batch"
			}
		}
	}
	const schema = await createStarSchema('./staryaml4.yaml', linkFunction)

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
