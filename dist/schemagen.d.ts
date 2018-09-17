import { GraphQLSchema } from 'graphql';
export declare function generateStarSchema(starYamlFile: string): Promise<GraphQLSchema | null>;
export declare const createOpenCRUDHint: (sameAt: {
    [key: string]: any;
}) => {
    childrenBatchParameter: (parents: any) => {
        where: {
            [x: string]: any;
        };
    };
};
