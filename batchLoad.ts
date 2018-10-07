import * as DataLoader from 'dataloader'

type BatchLoaderOperation = (parameterArray: any[]) => Promise<any[]>
type BatchingQuery = (loaderParameters: any) => any

export const createBatchLoader = (batchingQuery: BatchingQuery, sameAt: {[key:string]: any}) => {
    const batchLoaderOperation: BatchLoaderOperation = async parameterArray => {
        const answers = await batchingQuery(parameterArray)
        var parentKeys = Object.keys(sameAt)
        var sortKeys = parameterArray.map(obj => filteredObj(obj.parent, parentKeys, sameAt))
        return sortByKey2(answers, sortKeys, parentKeys)
    }

    return new DataLoader<any, any[]>(batchLoaderOperation);
}

const filteredObj = (obj: any, filterKeys: string[], sameAt?: {[key: string]: string}) => {
    var rtn = {}
    filterKeys.forEach(parentField => {
        var childKey
        childKey = (sameAt != null) ? sameAt[parentField] : null
        childKey = childKey || parentField 
        rtn[childKey] = obj[parentField]
    })
    return rtn
}

const sortByKey2 = (array: any[], keys: any[], parentKeys: string[]) => {
    var arraySortMap: { [key: string]: any[] } = {}
    array.forEach(element => {
        var key = JSON.stringify(filteredObj(element, parentKeys))
        if(arraySortMap[key] == null) {
            arraySortMap[key] = []
        }
        arraySortMap[key].push(element)
    })
    return keys.map(key => arraySortMap[JSON.stringify(key)])
}