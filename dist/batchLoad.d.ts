import { GraphQLSchema } from 'graphql';
import * as DataLoader from 'dataloader';
declare type BatchingQuery = (binding: any, query: string, loaderParameters: any) => any;
export declare const createBatchLoader: (schema: GraphQLSchema, query: string, batchingQuery: BatchingQuery) => DataLoader<any, any[]>;
export {};
