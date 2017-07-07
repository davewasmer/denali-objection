import * as knex from 'knex';
import { Model as DenaliModel } from 'denali';

declare module 'objection' {
  type id = string | number | string[] | number[];

  export class Model {
    static idColumn: string;
    static bindTransaction(transaction: Transaction): typeof Model;
    static query(): any;
    static relationMappings: { [relationship: string]: any };
    static ManyToManyRelation: any;
    static HasManyRelation: any;
    static BelongsToOneRelation: any;
    static tableName: string;
    static denaliModel: typeof DenaliModel;
    static knex(knex: knex): void;
    static bindKnex(knex: knex): typeof Model;
    $id(): id;
    $id(id: id): void;
    $formatDatabaseJson(...args: any[]): object;
    $parseDatabaseJson(json: object): object;
  }

  interface Transaction {}
  export const transaction = {
    start(knex: knex): Transaction;
  }
}