# graphql-stargen
Generate graphql remote schema from star schema file

## Installation

```
npm install graphql-stargen --save
```

## Usage

`createStarSchema` function reads [star-yaml file](https://github.com/onelittlenightmusic/star-yaml) and creates `ExecutableSchema`.

```typescript
import { GraphQLServer } from 'graphql-yoga'
import { createStarSchema } from 'graphql-stargen'

async function run() {
	const schema = await createStarSchema('./staryaml.yaml')

	if(schema == null) {
		throw new Error('no remote schema exists')
	}
	
	const server = new GraphQLServer({ schema })
	server.start({port: 4000}, () => console.log(`Your GraphQL server is running now ...`))
}

run()
```

[star-yaml file](https://github.com/onelittlenightmusic/star-yaml) looks like that.

```yaml
apiVersion: v1
kind: Star
tables:
- name: User
  metadata:
    root: true
  definition: 
    type: graphql
    url: 'http://localhost:4020'
    query: 'users'
  links:
  - to: 'Location'
    # as: 'location2'
    sameAt:
      address: address
    onlyOne: true
- name: Location
  definition:
    type: graphql-opencrud
    url: 'http://localhost:4021'
    query: 'locations'
```

You can serve the following schema on your server.

```graphql
{ 
  users {
    name
    address
  }
}
{
  locations {
    address
    country
  }
}
{
  users {
    name
    address
    location {
      country
    }
  }
}
```

## ToDo

- AST errors with some GraphQL API sites.