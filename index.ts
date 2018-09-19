import { generateStarSchema } from './schemagen'

export const createStarSchema = async (fileName: string, hint?: any) => {
    return await generateStarSchema(fileName, hint)
}