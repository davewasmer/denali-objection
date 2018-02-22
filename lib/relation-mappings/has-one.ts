import * as assert from 'assert';
import { Dict } from '../utils';
import { Model as BaseObjectionModel } from 'objection';
import { RelationshipDescriptor } from '@denali-js/core';
import ExtendedDenaliModel from '../denali-model';
import ExtendedObjectionModel from '../objection-model';
import { RelationMapping, RelationJoin } from 'objection';

export default function generateHasOneRelationMapping(
  objectionModels: Dict<typeof ExtendedObjectionModel>,
  model: typeof ExtendedDenaliModel,
  name: string,
  descriptor: RelationshipDescriptor
): RelationMapping {
  let type = model.modelName;

  let ObjectionModel = objectionModels[type];
  let RelatedObjectionModel = objectionModels[descriptor.relatedModelName];

  assert(ObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ type }" model`);
  assert(RelatedObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ descriptor.relatedModelName }" model`);

  let mapping = {
    relation: BaseObjectionModel.BelongsToOneRelation,
    modelClass: RelatedObjectionModel,
    join: <RelationJoin>{
      from: `${ ObjectionModel.tableName }.${ name }_id`, // i.e. from: 'Comment.postId'
      to: `${ RelatedObjectionModel.tableName }.${ RelatedObjectionModel.idColumn }` // i.e. to: 'Post.id'
    }
  };

  return mapping;
}
