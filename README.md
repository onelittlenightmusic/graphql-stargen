# graphql-stargen
Generate graphql remote schema from star schema file

# Installation

```
npm install graphql-stargen --save
```

# Usage

`createStarSchema` function reads [star-yaml file](https://github.com/onelittlenightmusic/star-yaml) and creates executable GraphQL schema.

Here is a simple GraphQL server example.

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
- name: City
  metadata:
    root: true
  definition:
    type: graphql
    url: 'https://evening-scrubland-62386.herokuapp.com/'
    query: 'cities'
  links:
  - to: 'CityEstate'
    as: 'cityEstate'
    sameAt:
      code: cityCode
  - to: Location
    as: citySummary
    sameAt:
      cityKanji: Japanese
- name: CityEstate
  definition:
    type: graphql
    url: 'https://frozen-chamber-61303.herokuapp.com/'
    query: 'cityEstate'
- name: Location
  definition:
    type: graphql
    url: 'https://guarded-sierra-71026.herokuapp.com/'
    query: 'location'
```

You can serve the following schema on your server.

```graphql
{
  cities {
    # this represents the type 'City'
    code
    cityKana
    cityKanji
    cityEstate {
      # this represents the type 'CityEstate' linked by a 'cityEstate' field
      year
      value
    }
    citySummary {
      # this represents the type 'Location' linked by a 'citySummary' field
      Area
      Population
      Density
      Japanese
    }
  }
}
```

## Link and custom link function

**Link** is a field where 2 models connect each other.

### Definition

You can define links in your star-yaml file.
A field `links` under one table can include link definitions.

[Sample YAML](./staryaml4.yaml) 

```yaml
tables:
- name: City
  metadata:
    root: true
  definition:
    type: graphql
    url: 'https://evening-scrubland-62386.herokuapp.com/'
    query: 'city'
  # links start
  links:  
  - to: 'CityEstate'
    as: 'cityEstate'
    sameAt:
      code: cityCode
  #links end
- name: CityEstate
  definition:
    type: graphql
    url: 'https://frozen-chamber-61303.herokuapp.com/'
    query: 'cityEstate'
```

Link definition contains of 
```yaml
`to` # another table name with which the link connects
`as` # a new field name of link
`sameAt` 
```

`sameAt` is key-value field which means 
```yaml
  <parent field name>: <child field name>
```

so if you have the definition `code: cityCode`, you get the following models.

```
parent object(parent.code == '001')
 └ child object (child.cityCode == '001')
```

You can define custom link functions other than simple `==(equals to)` function.

Custom link function looks like that

```typescript
{
  <child field name>: (parent, args) => <function which returns child field value condition>
}
```

```typescript
const linkFunction = {
  cityEstate: (parent, args) => {
    return {
      cityCode: parent.code.substr(0,5) // Truncate string before 5th charactor.
    }
  }
}
```

Then you can specify link function objects to `createStarSchema`'s second argument.

```typescript
await createStarSchema('./staryaml4.yaml', linkFunction)
```

# How to work

## Query to GraphQL servers

- Query of root model
  - Fragment generation (for response and child query parameter)
  - Delegation to root model server
- Query of child models
  - Parameter genration with parent model
  - Delegation to child model server
  - Batch query in case that batching parameter function is defined

# ToDo

- Fix AST errors with some GraphQL API sites.
