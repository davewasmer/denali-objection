import {
  mapKeys,
  camelCase,
  snakeCase
} from 'lodash';
import * as assert from 'assert';
import { Model as DenaliModel, inject, ORMAdapter, RelationshipDescriptor } from 'denali';
import { transaction, Transaction } from 'objection';
import * as knex from 'knex';
import defineModels from './define-models';
import ExtendedObjectionModel from './objection-model';
import ExtendedDenaliModel from './denali-model';
import { Dict } from './utils';

export type TableQuery = any;

export type RelationQuery = any;

export interface CustomTableQueryBuilder {
  (query: TableQuery): TableQuery;
}

export interface CustomRelationQueryBuilder {
  (query: RelationQuery): RelationQuery;
}

export interface FilterQuery {
  [key: string]: any;
}

export default class ObjectionAdapter extends ORMAdapter {

  objectionModels: Dict<typeof ExtendedObjectionModel> = {};
  knex = inject<knex>('objection:knex');
  testTransaction: Transaction;

  async all(type: string) {
    let ObjectionModel = this.objectionModelForType(type);
    let results = ObjectionModel.query();
    return results;
  }

  async find(type: string, id: string | number) {
    let ObjectionModel = this.objectionModelForType(type);
    assert(id, 'You must pass an id to `adapter.find(id)`');
    return ObjectionModel.query().findById(id);
  }

  async queryOne(type: string, query: FilterQuery | CustomTableQueryBuilder) {
    let results = await this.query(type, query);
    return results[0] || null;
  }

  async query(type: string, query: FilterQuery | CustomTableQueryBuilder) {
    let ObjectionModel = this.objectionModelForType(type);
    if (typeof query === 'function') {
      return query(ObjectionModel.query());
    }
    return ObjectionModel.query().where(query);
  }

  async createRecord(type: string, data: any) {
    let ObjectionModel = this.objectionModelForType(type);
    return ObjectionModel.query().insert(data);
  }

  // Objection doesn't have any concept of a "new but unsaved" model instance,
  // so we just return the supplied data object
  buildRecord(type: string, data: any) {
    return data;
  }

  idFor(model: ExtendedDenaliModel) {
    if (model.record instanceof ExtendedObjectionModel) {
      return model.record.$id();
    }
    let ModelClass = <typeof ExtendedDenaliModel>model.constructor;
    let type = ModelClass.getType(this.container);
    let ObjectionModel = this.objectionModels[type];
    let idColumn = ObjectionModel.idColumn;
    if (typeof idColumn === 'string') {
      return model.record[idColumn];
    } else {
      throw new Error('Compound ids are not yet supported by the denali-objection adapter');
    }
  }

  setId() {
    throw new Error('Changing ids is not supported by denali-objection');
  }

  getAttribute(model: ExtendedDenaliModel, property: string) {
    return model.record[property];
  }

  setAttribute(model: ExtendedDenaliModel, property: string, value: any) {
    model.record[property] = value;
    return true;
  }

  deleteAttribute(model: ExtendedDenaliModel, property: string) {
    delete model.record[property];
    return true;
  }

  async getRelated(model: ExtendedDenaliModel, relationship: string, descriptor: RelationshipDescriptor, query: FilterQuery | CustomRelationQueryBuilder) {
    let relatedQuery = model.record.$relatedQuery(relationship, this.testTransaction);
    if (query) {
      if (typeof query === 'object') {
        relatedQuery = relatedQuery.where(query);
      } else {
        relatedQuery = query(relatedQuery);
      }
    }
    return relatedQuery;
  }

  async setRelated(model: ExtendedDenaliModel, relationship: string, descriptor: RelationshipDescriptor, relatedModels: ExtendedDenaliModel | ExtendedDenaliModel[]) {
    await model.record.$relatedQuery(relationship, this.testTransaction).unrelate();

    let related;
    if (Array.isArray(relatedModels)) {
      related = relatedModels.map((relatedModel) => relatedModel.id);
      assert(related.filter(Boolean).length === related.length, 'You must pass Model instances to `setRelated()`, but one or more of instances of null or undefined were supplied. Make sure you are actually passing Model instances in.');
    } else {
      related = relatedModels.id;
      assert(related, 'You must pass Model instance to `setRelated()`, but one instance of null or undefined were supplied. Make sure you are actually passing Model instance in.');
    }

    return model.record.$relatedQuery(relationship, this.testTransaction).relate(related);
  }

  async addRelated(model: ExtendedDenaliModel, relationship: string, descriptor: RelationshipDescriptor, relatedModel: ExtendedDenaliModel) {
    return model.record.$relatedQuery(relationship, this.testTransaction).relate(relatedModel.id);
  }

  async removeRelated(model: ExtendedDenaliModel, relationship: string, descriptor: RelationshipDescriptor, relatedModel: ExtendedDenaliModel) {
    let ORMModel = this.objectionModelForType(model.type);
    return model.record.$relatedQuery(relationship, this.testTransaction).unrelate().where(ORMModel.idColumn, relatedModel.id);
  }

  async saveRecord(model: ExtendedDenaliModel) {
    let AdapterObjectionModel = this.objectionModelForType(model.type);
    if (typeof model.record.$id === 'function') {
      await AdapterObjectionModel.query().patchAndFetchById(model.record.$id(), model.record);
      return;
    }
    let result = await AdapterObjectionModel.query().insert(model.record);
    model.record = result;
  }

  async deleteRecord(model: ExtendedDenaliModel) {
    let ORMModel = this.objectionModelForType(model.type);
    if (Array.isArray(ORMModel.idColumn)) {
      throw new Error('Compound ids are not yet supported by the denali-objection adapter');
    }
    await ORMModel.query().delete().where(ORMModel.idColumn, model.id);
    return;
  }

  async startTestTransaction() {
    assert(this.knex, 'You tried to start a test transaction, but the database connection has not been established yet');
    this.testTransaction = await transaction.start(this.knex);
  }

  async rollbackTestTransaction() {
    if (this.testTransaction) {
      await this.testTransaction.rollback();
      delete this.testTransaction;
    }
  }

  objectionModelForType(type: string): typeof ExtendedObjectionModel {
    let AdapterObjectionModel = this.objectionModels[type];
    assert(AdapterObjectionModel, `Unable to locate the objection.js model class for the ${ type } type. Available objection models: ${ Object.keys(this.objectionModels).join(', ') }`);
    if (this.testTransaction) {
      return AdapterObjectionModel.bindTransaction(this.testTransaction);
    }
    return AdapterObjectionModel;
  }

  serializeRecord(json: object) {
    return mapKeys<any, string>(json, (value, key) => {
      return this.serializeColumn(key);
    });
  }

  parseRecord(json: object) {
    return mapKeys<any, string>(json, (value, key) => {
      return this.parseColumn(key);
    });
  }

  serializeColumn(key: string) {
    return snakeCase(key);
  }

  parseColumn(key: string) {
    return camelCase(key);
  }

  async defineModels(models: (typeof ExtendedDenaliModel | typeof DenaliModel)[]) {
    defineModels(this, this.container, models);
  }

}
