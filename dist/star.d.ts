import { GraphQLSchema } from 'graphql';
interface StarSchemaMetadata {
    root: boolean;
}
interface StarSchemaDefinition {
    type: string;
    url: string;
    query: string;
}
export interface StarSchemaLink {
    to: string;
    as: string;
    sameAt: any[];
    onlyOne: boolean;
}
export interface StarSchemaTable {
    name: string;
    metadata: StarSchemaMetadata;
    definition: StarSchemaDefinition;
    links: StarSchemaLink[];
    GraphQLSchema: GraphQLSchema;
    createLinkSchema(): string;
    createResolvers(any: any, StarSchemaMap: any): any;
}
export interface StarSchemaMap {
    tables: StarSchemaTable[];
    getAllSchema(): void;
    getRootTable(): StarSchemaTable;
    find(targetName: string): StarSchemaTable | undefined;
    schemas(): (GraphQLSchema | string)[];
    createTotalExecutableSchema(any: any): any;
}
export declare const loadConfig: (filename: string) => StarSchemaMap;
export declare const createLinks: (starSchema: StarSchemaTable) => string;
export declare const getLinkLabel: (link: StarSchemaLink) => string;
export {};
