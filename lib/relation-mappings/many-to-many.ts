import * as assert from 'assert';
import { Dict } from '../utils';
import { camelCase } from 'lodash';
import { Model as BaseObjectionModel } from 'objection';
import ExtendedDenaliModel from '../denali-model';
import ExtendedObjectionModel from '../objection-model';
import { RelationshipDescriptor } from 'denali';
import { RelationMapping, RelationJoin, RelationThrough } from 'objection';

export default function generateManyToManyRelationMapping(
  objectionModels: Dict<typeof ExtendedObjectionModel>,
  model: typeof ExtendedDenaliModel,
  name: string,
  descriptor: RelationshipDescriptor
): RelationMapping {
  let type = model.modelName;
  let options = descriptor.options;
  let ObjectionModel = objectionModels[type];
  let RelatedObjectionModel = objectionModels[descriptor.relatedModelName];
  let relatedType = RelatedObjectionModel.denaliModel.modelName;

  assert(ObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ type }" model`);
  assert(RelatedObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ descriptor.relatedModelName }" model`);

  let mapping = {
    relation: BaseObjectionModel.ManyToManyRelation,
    modelClass: RelatedObjectionModel,
    join: <RelationJoin>{
      from: `${ ObjectionModel.tableName }.id`, // i.e. from: 'Post.id'
      to: `${ RelatedObjectionModel.tableName }.id`, // i.e. to: 'Tag.id'
      through: <RelationThrough>{
        extra: options.manyToMany.extra
      }
    }
  };

  let joinTable;
  if (options.manyToMany.model) {
    mapping.join.through.modelClass = objectionModels[options.manyToMany.model];
    joinTable = mapping.join.through.modelClass.tableName;
  } else {
    joinTable = `${ ObjectionModel.tableName }_${ RelatedObjectionModel.tableName }`;
  }

  mapping.join.through.from = `${ joinTable }.${ camelCase(type) }Id`; // i.e. from: 'Post_Tag.postId'
  mapping.join.through.to = `${ joinTable }.${ camelCase(relatedType) }Id`; // i.e. from: 'Post_Tag.tagId'

  return mapping;
}
