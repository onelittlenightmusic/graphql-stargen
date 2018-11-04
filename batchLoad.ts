import * as DataLoader from 'dataloader'

type BatchLoaderOperation = (parameterArray: any[]) => Promise<any[]>
type BatchingQuery = (loaderParameters: any) => any

export const createBatchLoader = (batchingQuery: BatchingQuery, fieldMap: {[key:string]: any}) => {
    var mappedParentFields = Object.keys(fieldMap)
    var mappedChildFields = mappedParentFields.map(p => fieldMap[p])
    const batchLoaderOperation: BatchLoaderOperation = async inputArray => {
        var sortJsons = inputArray.map(i => generateJsonFromSelectedFields(i.parent, mappedParentFields, fieldMap))

        const rtn = await batchingQuery(inputArray)
        const outputs = rtn.outputs
        const isArrayType = rtn.isArrayType
        return isArrayType 
            ? sortByJson(outputs, mappedChildFields, sortJsons)
            : sortByUniqueJson(outputs, mappedChildFields, sortJsons)

        // var rtn = sortByKey2(answers, sortKeys, parentKeys, sameAt)
        // console.log(JSON.stringify(rtn))
        // return rtn
    }

    return new DataLoader<any, any[]>(batchLoaderOperation);
}

const generateJsonFromSelectedFields = (obj: any, fields: string[], fieldMap?: {[key: string]: string}) => {
    var rtn = {}
    // console.log(JSON.stringify({sameAt}))
    fields.forEach(k => {
        var v = (fieldMap || {})[k] || k 
        this[v] = obj[k]
    }, rtn)
    return JSON.stringify(rtn)
}

const sortByJson = (array: any[], fields: string[], sort: string[]) => {
    var arraySortMap: { [key: string]: any[] } = {}
    array.forEach(element => {
        var json = generateJsonFromSelectedFields(element, fields)
        // console.log(key)
        if(arraySortMap[json] == null) {
            arraySortMap[json] = []
        }
        arraySortMap[json].push(element)
    })
    // console.log(JSON.stringify(arraySortMap))
    return sort.map(s => arraySortMap[s])
}


const sortByUniqueJson = (array: any[], fields: string[], sort: string[]) => {
    var arraySortMap: { [key: string]: any } = {}
    array.forEach(element => {
        var json = generateJsonFromSelectedFields(element, fields)
        // console.log(key)
        arraySortMap[json] = element
    })
    // console.log(JSON.stringify(arraySortMap))
    return sort.map(s => arraySortMap[s])
}