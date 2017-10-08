import {
  startCase,
  snakeCase
} from 'lodash';
import { pluralize } from 'inflection';
import { Model as BaseDenaliModel, Container } from 'denali';
import * as knex from 'knex';
import ObjectionAdapter from './adapter';
import ExtendedDenaliModel from './denali-model';
import ExtendedObjectionModel from './objection-model';
import { RelationMappings } from 'objection';
import { Dict } from './utils';
import generateManyToManyRelationMapping from './relation-mappings/many-to-many';
import generateHasManyRelationMapping from './relation-mappings/has-many';
import generateHasOneRelationMapping from './relation-mappings/has-one';


export default function defineModels(adapter: ObjectionAdapter, container: Container, models: (typeof ExtendedDenaliModel | typeof BaseDenaliModel)[]) {
  let objectionModels = adapter.objectionModels;

  models.forEach((model) => {
    let type = model.getType(container);

    class ObjectionModel extends ExtendedObjectionModel {

      static tableName = (<typeof ExtendedDenaliModel>model).tableName || pluralize(snakeCase(type));
      static denaliModel = <typeof ExtendedDenaliModel>model;

      $formatDatabaseJson(json: Object) {
        json = super.$formatDatabaseJson(json);
        return adapter.serializeRecord(json);
      }

      $parseDatabaseJson(json: object) {
        json = adapter.parseRecord(json);
        return super.$parseDatabaseJson(json);
      }

    }

    // Give it a sensible name
    Object.defineProperty(ObjectionModel, 'name', {
      value: `${ startCase(model.getType(container)).replace(' ', '') }ObjectionModel`
    });

    objectionModels[type] = ObjectionModel;
  });

  models.forEach((model) => {
    let type = model.getType(container);
    let ObjectionModel = objectionModels[type];
    ObjectionModel.relationMappings = generateRelationMappingsFor(adapter, <typeof ExtendedDenaliModel>model, objectionModels, container);
  });

  models.forEach((model) => {
    let type = model.getType(container);
    let ObjectionModel = objectionModels[type];
    objectionModels[type] = ObjectionModel.bindKnex(<knex>adapter.knex);
  });
}

function generateRelationMappingsFor(adapter: ObjectionAdapter, model: typeof ExtendedDenaliModel, objectionModels: Dict<typeof ExtendedObjectionModel>, container: Container) {
  let relationMappings: RelationMappings = {};

  model.mapRelationshipDescriptors((descriptor, name) => {
    if (descriptor.mode === 'hasMany') {
      if (descriptor.options.manyToMany) {
        relationMappings[name] = generateManyToManyRelationMapping(adapter, objectionModels, container, model, name, descriptor);
      } else {
        relationMappings[name] = generateHasManyRelationMapping(adapter, objectionModels, container, model, name, descriptor);
      }
    } else {
      relationMappings[name] = generateHasOneRelationMapping(adapter, objectionModels, container, model, name, descriptor);
    }
  });

  return relationMappings;
}
