import { generateStarSchema } from './schemagen'

export const createStarSchema = async (fileName: string) => {
    return await generateStarSchema(fileName)
}