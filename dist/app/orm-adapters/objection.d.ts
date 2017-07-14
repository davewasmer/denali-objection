/// <reference types="knex" />
/// <reference types="lodash" />
import { Model as DenaliBaseModel, ORMAdapter, RelationshipDescriptor } from 'denali';
import { Model as ObjectionBaseModel } from 'objection';
import * as knex from 'knex';
export declare type TableQuery = any;
export declare type RelationQuery = any;
export interface CustomTableQueryBuilder {
    (query: TableQuery): TableQuery;
}
export interface CustomRelationQueryBuilder {
    (query: RelationQuery): RelationQuery;
}
export interface FilterQuery {
    [key: string]: any;
}
export declare class DenaliExtendedModel extends DenaliBaseModel {
    static tableName: string;
}
declare module 'objection' {
    interface Model {
        denaliModel: DenaliExtendedModel;
    }
}
export default class ObjectionAdapter extends ORMAdapter {
    ormModels: {
        [type: string]: typeof ObjectionBaseModel;
    };
    knex: knex;
    init(): void;
    all(type: string): Promise<any>;
    find(type: string, id: string | number): Promise<any>;
    queryOne(type: string, query: FilterQuery | CustomTableQueryBuilder): Promise<any>;
    query(type: string, query: FilterQuery | CustomTableQueryBuilder): Promise<any>;
    createRecord(type: string, data: any): Promise<any>;
    buildRecord(type: string, data: any): any;
    idFor(model: DenaliExtendedModel): any;
    setId(): void;
    getAttribute(model: DenaliExtendedModel, property: string): any;
    setAttribute(model: DenaliExtendedModel, property: string, value: any): boolean;
    deleteAttribute(model: DenaliExtendedModel, property: string): boolean;
    getRelated(model: DenaliExtendedModel, relationship: string, descriptor: RelationshipDescriptor, query: FilterQuery | CustomRelationQueryBuilder): Promise<any>;
    setRelated(model: DenaliExtendedModel, relationship: string, descriptor: RelationshipDescriptor, relatedModels: DenaliExtendedModel[]): Promise<any>;
    addRelated(model: DenaliExtendedModel, relationship: string, descriptor: RelationshipDescriptor, relatedModel: DenaliExtendedModel): Promise<any>;
    removeRelated(model: DenaliExtendedModel, relationship: string, descriptor: RelationshipDescriptor, relatedModel: DenaliExtendedModel): Promise<any>;
    saveRecord(model: DenaliExtendedModel): Promise<void>;
    deleteRecord(model: DenaliExtendedModel): Promise<void>;
    startTestTransaction(): Promise<void>;
    rollbackTestTransaction(): Promise<void>;
    ormModelForType(type: string): typeof ObjectionBaseModel;
    defineModels(models: typeof DenaliExtendedModel[]): Promise<void>;
    serializeRecord(json: object): _.Dictionary<any>;
    parseRecord(json: object): _.Dictionary<any>;
    serializeColumn(key: string): string;
    parseColumn(key: string): string;
    generateRelationMappingsFor(DenaliModel: typeof DenaliExtendedModel): {
        [key: string]: any;
    };
}
