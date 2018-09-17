import * as DataLoader from 'dataloader'

type BatchLoaderOperation = (parameterArray: any[]) => Promise<any[]>
type BatchingQuery = (loaderParameters: any) => any

export const createBatchLoader = (batchingQuery: BatchingQuery, sameAt: {[key:string]: any}) => {
    var keyName = Object.keys(sameAt)[0]
    var childKeyName = sameAt[keyName]
    const batchLoaderOperation: BatchLoaderOperation = async parameterArray => {
        const answers = await batchingQuery(parameterArray)
        return sortByKey(answers, childKeyName, parameterArray.map(parent => parent[keyName]))
    }

    return new DataLoader<any, any[]>(batchLoaderOperation);

}

const sortByKey = (array: any[], keyName: string, keyArray: string[]) => {
    var arraySortMap: { [key: string]: any[] } = {}
    array.forEach(element => {
        if(arraySortMap[element[keyName]] == null) {
            arraySortMap[element[keyName]] = []
        }
        arraySortMap[element[keyName]].push(element)
    })
    return keyArray.map(key => arraySortMap[key])
}