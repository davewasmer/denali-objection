import {
  mapKeys,
  camelCase,
  merge,
  snakeCase,
  startCase
} from 'lodash';
import * as assert from 'assert';
import { inject, Model as DenaliBaseModel, ORMAdapter, RelationshipDescriptor } from 'denali';
import { Model as ObjectionBaseModel, transaction } from 'objection';
import { pluralize } from 'inflection';
import * as knex from 'knex';

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

export class DenaliExtendedModel extends DenaliBaseModel {
  static tableName: string;
}

declare module 'objection' {
  interface Model {
    denaliModel: DenaliExtendedModel;
  }
}

export default class ObjectionAdapter extends ORMAdapter {

  ormModels: { [type: string]: typeof ObjectionBaseModel };
  knex = inject<knex>('objection:knex');

  async all(type: string) {
    let ORMModel = this.ormModelForType(type);
    return ORMModel.query();
  }

  async find(type: string, id: string | number) {
    let ORMModel = this.ormModelForType(type);
    assert(id, 'You must pass an id to `adapter.find(id)`');
    return ORMModel.query().findById(id);
  }

  async queryOne(type: string, query: FilterQuery | CustomTableQueryBuilder) {
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

  idFor(model: DenaliExtendedModel) {
    if (model.record instanceof ObjectionBaseModel) {
      return model.record.$id();
    }
    let DenaliModel = <typeof DenaliExtendedModel>model.constructor;
    let type = DenaliModel.getType(this.container);
    let ObjectionModel = this.ormModels[type];
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

  getAttribute(model: DenaliExtendedModel, property: string) {
    return model.record[property];
  }

  setAttribute(model: DenaliExtendedModel, property: string, value: any) {
    model.record[property] = value;
    return true;
  }

  deleteAttribute(model: DenaliExtendedModel, property: string) {
    delete model.record[property];
    return true;
  }

  async getRelated(model: DenaliExtendedModel, relationship: string, descriptor: RelationshipDescriptor, query: FilterQuery | CustomRelationQueryBuilder) {
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

  async setRelated(model: DenaliExtendedModel, relationship: string, descriptor: RelationshipDescriptor, relatedModels: DenaliExtendedModel[]) {
    await model.record.$relatedQuery(relationship, this.testTransaction).unrelate();
    return model.record.$relatedQuery(relationship, this.testTransaction).relate(relatedModels.map((m) => m.id));
  }

  async addRelated(model: DenaliExtendedModel, relationship: string, descriptor: RelationshipDescriptor, relatedModel: DenaliExtendedModel) {
    return model.record.$relatedQuery(relationship, this.testTransaction).relate(relatedModel.id);
  }

  async removeRelated(model: DenaliExtendedModel, relationship: string, descriptor: RelationshipDescriptor, relatedModel: DenaliExtendedModel) {
    let ORMModel = this.ormModelForType(model.type);
    return model.record.$relatedQuery(relationship, this.testTransaction).unrelate().where(ORMModel.idColumn, relatedModel.id);
  }

  async saveRecord(model: DenaliExtendedModel) {
    let ORMModel = this.ormModelForType(model.type);
    if (typeof model.record.$id === 'function') {
      await ORMModel.query().patchAndFetchById(model.record.$id(), model.record);
      return;
    }
    let result = await ORMModel.query().insert(model.record);
    model.record = result;
  }

  async deleteRecord(model: DenaliExtendedModel) {
    let ORMModel = this.ormModelForType(model.type);
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

  ormModelForType(type: string) {
    let ORMModel = this.ormModels[type];
    if (this.testTransaction) {
      return ORMModel.bindTransaction(this.testTransaction);
    }
    return ORMModel;
  }

  async defineModels(models: typeof DenaliExtendedModel[]) {
    let adapter = this; // eslint-disable-line consistent-this
    this.ormModels = {};
    models.forEach((DenaliModel) => {
      if (!DenaliModel.hasOwnProperty('abstract')) {
        let type = DenaliModel.getType(this.container);
        class ObjectionModel extends ObjectionBaseModel {
          static tableName = DenaliModel.tableName || pluralize(snakeCase(type));
          static denaliModel = DenaliModel;
          $formatDatabaseJson(json: Object) {
            json = super.$formatDatabaseJson(json);
            return adapter.serializeRecord(json);
          }
          $parseDatabaseJson(json: object) {
            json = adapter.parseRecord(json);
            return super.$parseDatabaseJson(json);
          }
        }
        Object.defineProperty(ObjectionModel, 'name', {
          value: startCase(type) + 'ObjectionModel'
        });
        this.ormModels[type] = ObjectionModel.bindKnex(this.knex);
      }
    });

    models.forEach((DenaliModel) => {
      if (!DenaliModel.hasOwnProperty('abstract') || !DenaliModel.abstract) {
        let ORMModel = this.ormModels[DenaliModel.getType(this.container)];
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

  generateRelationMappingsFor(DenaliModel: typeof DenaliExtendedModel) {
    let mappings: { [key: string]: any } = {};

    DenaliModel.mapRelationshipDescriptors((descriptor, name) => {
      let config = descriptor.options;
      let ORMModel = this.ormModels[DenaliModel.getType(this.container)];
      let RelatedORMModel = this.ormModels[descriptor.type];
      let mapping = <any>{
        modelClass: RelatedORMModel
      };

      if (descriptor.mode === 'hasMany') {

        // Many to many
        if (config.manyToMany) {
          mapping.relation = ObjectionBaseModel.ManyToManyRelation;
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
          mapping.join.through.from = `${ joinTable }.${ camelCase(ORMModel.denaliModel.getType(this.container)) }Id`; // i.e. from: 'Post_Tag.postId'
          mapping.join.through.to = `${ joinTable }.${ camelCase(RelatedORMModel.denaliModel.getType(this.container)) }Id`; // i.e. from: 'Post_Tag.tagId'

        // Has many
        } else {
          let inverse = config.inverse || camelCase(DenaliModel.getType(this.container));
          mapping.relation = ObjectionBaseModel.HasManyRelation;
          mapping.join = {
            from: `${ ORMModel.tableName }.id`, // i.e. from: 'Post.id'
            to: `${ RelatedORMModel.tableName }.${ inverse }Id` // i.e. to: 'Comment.postId'
          };
        }

      // Belongs to
      } else {
        mapping.relation = ObjectionBaseModel.BelongsToOneRelation;
        mapping.join = {
          from: `${ ORMModel.tableName }.${ name }Id`, // i.e. from: 'Comment.postId'
          to: `${ RelatedORMModel.tableName }.id` // i.e. to: 'Post.id'
        };
      }

      // Allow user to override at any level
      mappings[name] = merge(mapping, config.mapping);
    });

    console.log(DenaliModel)
    console.log(mappings)
    return mappings;
  }

}
