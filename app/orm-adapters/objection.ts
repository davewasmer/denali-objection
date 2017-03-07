/// <reference path="../../objection.d.ts" />
import {
  forEach,
  mapKeys,
  camelCase,
  merge,
  snakeCase
} from 'lodash';
import * as assert from 'assert';
import { Model as DenaliModel, ORMAdapter, RelationshipDescriptor } from 'denali';
import { Model as ObjectionModel, transaction } from 'objection';
import { pluralize } from 'inflection';
import * as knex from 'knex';

type TableQuery = any;
type RelationQuery = any;
interface CustomTableQueryBuilder {
  (query: TableQuery): TableQuery;
}
interface CustomRelationQueryBuilder {
  (query: RelationQuery): RelationQuery;
}
interface FilterQuery {
  [key: string]: any
}

class Model extends DenaliModel {
  static tableName: string;
  static objectionModel: typeof ObjectionModel;
}

export default class ObjectionAdapter extends ORMAdapter {

  knex: knex;
  ormModels: { [type: string]: typeof ObjectionModel };

  async all(type: string) {
    let ORMModel = this.ormModelForType(type);
    return ORMModel.query();
  }

  async find(type: string, id: string | number) {
    let ORMModel = this.ormModelForType(type);
    assert(id, 'You must pass an id to `adapter.find(id)`');
    return ORMModel.query().findById(id);
  }

  async findOne(type: string, query: FilterQuery | CustomTableQueryBuilder) {
    let results = await this.query(type, query);
    return results[0] || null;
  }

  async query(type: string, query: FilterQuery | CustomTableQueryBuilder) {
    let ORMModel = this.ormModelForType(type);
    if (typeof query === 'function') {
      return query(ORMModel.query());
    }
    return ORMModel.query().where(query);
  }

  async createRecord(type: string, data: any) {
    let ORMModel = this.ormModelForType(type);
    return ORMModel.query().insert(data);
  }

  // Objection doesn't have any concept of a "new but unsaved" model instance,
  // so we just return the supplied data object
  buildRecord(type: string, data: any) {
    return data;
  }

  idFor(model: Model) {
    if (model.record instanceof ObjectionModel) {
      return model.record.$id();
    }
    return model.record[(<typeof ObjectionModel>(<any>model.constructor).objectionModel).idColumn];
  }

  setId() {
    throw new Error('Changing ids is not supported by denali-objection');
  }

  getAttribute(model: Model, property: string) {
    return model.record[property];
  }

  setAttribute(model: Model, property: string, value: any) {
    model.record[property] = value;
    return true;
  }

  deleteAttribute(model: Model, property: string) {
    delete model.record[property];
    return true;
  }

  async getRelated(model: Model, relationship: string, descriptor: RelationshipDescriptor, query: FilterQuery | CustomRelationQueryBuilder) {
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

  async setRelated(model: Model, relationship: string, descriptor: RelationshipDescriptor, relatedModels: Model[]) {
    await model.record.$relatedQuery(relationship, this.testTransaction).unrelate();
    return model.record.$relatedQuery(relationship, this.testTransaction).relate(relatedModels.map((m) => m.id));
  }

  async addRelated(model: Model, relationship: string, descriptor: RelationshipDescriptor, relatedModel: Model) {
    return model.record.$relatedQuery(relationship, this.testTransaction).relate(relatedModel.id);
  }

  async removeRelated(model: Model, relationship: string, descriptor: RelationshipDescriptor, relatedModel: Model) {
    let ORMModel = this.ormModelForType(model.type);
    return model.record.$relatedQuery(relationship, this.testTransaction).unrelate().where(ORMModel.idColumn, relatedModel.id);
  }

  async saveRecord(model: Model) {
    let ORMModel = this.ormModelForType(model.type);
    if (typeof model.record.$id === 'function') {
      return ORMModel.query().patchAndFetchById(model.record.$id(), model.record);
    }
    let result = await ORMModel.query().insert(model.record);
    model.record = result;
  }

  async deleteRecord(model: Model) {
    let ORMModel = this.ormModelForType(model.type);
    return ORMModel.query().delete().where(ORMModel.idColumn, model.id);
  }

  async startTestTransaction() {
    assert(this.knex, 'You tried to start a test transaction, but the database connection has not been established yet');
    this.testTransaction = await transaction.start(this.knex);
  }

  async rollbackTestTransaction() {
    await this.testTransaction.rollback();
  }

  ormModelForType(type: string) {
    let ORMModel = this.ormModels[type];
    if (this.testTransaction) {
      return ORMModel.bindTransaction(this.testTransaction);
    }
    return ORMModel;
  }

  async defineModels(models: typeof Model[]) {
    let adapter = this; // eslint-disable-line consistent-this
    this.ormModels = {};
    models.forEach((DenaliModel) => {
      if (!DenaliModel.hasOwnProperty('abstract')) {
        class ORMModel extends ObjectionModel {
          static tableName = DenaliModel.tableName || pluralize(snakeCase(DenaliModel.type));
          static denaliModel = DenaliModel;
          $formatDatabaseJson() {
            let json = super.$formatDatabaseJson(...arguments);
            return adapter.serializeRecord(json);
          }
          $parseDatabaseJson(json: object) {
            json = adapter.parseRecord(json);
            return super.$parseDatabaseJson(json);
          }
        }
        DenaliModel.objectionModel = ORMModel;
        this.ormModels[DenaliModel.type] = ORMModel;
      }
    });

    forEach(models, (DenaliModel, type) => {
      if (!DenaliModel.abstract) {
        let ORMModel = this.ormModels[type];
        ORMModel.relationMappings = this.generateRelationMappingsFor(DenaliModel);
      }
    });
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

  generateRelationMappingsFor(DenaliModel: typeof Model) {
    let mappings: { [key: string]: any } = {};

    DenaliModel.eachRelationship((name, descriptor) => {
      let config = descriptor.options;
      let ORMModel = this.ormModels[DenaliModel.type];
      let RelatedORMModel = this.ormModels[descriptor.type];
      let mapping = <any>{
        modelClass: RelatedORMModel
      };

      if (descriptor.mode === 'hasMany') {

        // Many to many
        if (config.manyToMany) {
          mapping.relation = ObjectionModel.ManyToManyRelation;
          mapping.join = {
            from: `${ ORMModel.tableName }.id`, // i.e. from: 'Post.id'
            to: `${ RelatedORMModel.tableName }.id`, // i.e. to: 'Tag.id'
            through: {
              extra: config.manyToMany.extra
            }
          };
          let joinTable;
          if (config.manyToMany.model) {
            mapping.join.through.model = this.ormModels[config.manyToMany.model];
            joinTable = mapping.join.through.model.tableName;
          } else {
            joinTable = `${ ORMModel.tableName }_${ RelatedORMModel.tableName }`;
          }
          mapping.join.through.from = `${ joinTable }.${ camelCase(ORMModel.denaliModel.type) }Id`; // i.e. from: 'Post_Tag.postId'
          mapping.join.through.to = `${ joinTable }.${ camelCase(RelatedORMModel.denaliModel.type) }Id`; // i.e. from: 'Post_Tag.tagId'

        // Has many
        } else {
          let inverse = config.inverse || camelCase(DenaliModel.type);
          mapping.relation = ObjectionModel.HasManyRelation;
          mapping.join = {
            from: `${ ORMModel.tableName }.id`, // i.e. from: 'Post.id'
            to: `${ RelatedORMModel.tableName }.${ inverse }Id` // i.e. to: 'Comment.postId'
          };
        }

      // Belongs to
      } else {
        mapping.relation = ObjectionModel.BelongsToOneRelation;
        mapping.join = {
          from: `${ ORMModel.tableName }.${ name }Id`, // i.e. from: 'Comment.postId'
          to: `${ RelatedORMModel.tableName }.id` // i.e. to: 'Post.id'
        };
      }

      // Allow user to override at any level
      mappings[name] = merge(mapping, config.mapping);
    });

    return mappings;
  }

}
