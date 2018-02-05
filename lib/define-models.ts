import {
  startCase,
  snakeCase,
  mapValues
} from 'lodash';
import { pluralize } from 'inflection';
import { Model as BaseDenaliModel } from 'denali';
import ObjectionAdapter from './adapter';
import ExtendedDenaliModel from './denali-model';
import ExtendedObjectionModel from './objection-model';
import { Dict } from './utils';
import generateManyToManyRelationMapping from './relation-mappings/many-to-many';
import generateHasManyRelationMapping from './relation-mappings/has-many';
import generateHasOneRelationMapping from './relation-mappings/has-one';


export default function defineModels(adapter: ObjectionAdapter, Models: (typeof ExtendedDenaliModel | typeof BaseDenaliModel)[]) {
  let objectionModels = adapter.objectionModels;

  Models.forEach((Model) => {
    let type = Model.modelName;

    class ObjectionModel extends ExtendedObjectionModel {

      static tableName = (<typeof ExtendedDenaliModel>Model).tableName || pluralize(snakeCase(type));
      static denaliModel = <typeof ExtendedDenaliModel>Model;

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
      value: `${ startCase(Model.modelName).replace(' ', '') }ObjectionModel`
    });

    objectionModels[type] = ObjectionModel;
  });

  Models.forEach((Model) => {
    let type = Model.modelName;
    let ObjectionModel = objectionModels[type];
    ObjectionModel.relationMappings = generateRelationMappingsFor(<typeof ExtendedDenaliModel>Model, objectionModels);
  });

  Models.forEach((Model) => {
    let type = Model.modelName;
    let ObjectionModel = objectionModels[type];
    objectionModels[type] = ObjectionModel.bindKnex(adapter.knex);
  });
}

function generateRelationMappingsFor(Model: typeof ExtendedDenaliModel, objectionModels: Dict<typeof ExtendedObjectionModel>) {
  return mapValues(Model.relationships, (descriptor, name) => {
    if (descriptor.mode === 'hasMany') {
      if (descriptor.options.manyToMany) {
        return generateManyToManyRelationMapping(objectionModels, Model, name, descriptor);
      } else {
        return generateHasManyRelationMapping(objectionModels, Model, name, descriptor);
      }
    } else {
      return generateHasOneRelationMapping(objectionModels, Model, name, descriptor);
    }
  });
}
