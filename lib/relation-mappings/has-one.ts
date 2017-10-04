import * as assert from 'assert';
import { Dict } from '../utils';
import { Model as BaseObjectionModel } from 'objection';
import { Container, RelationshipDescriptor } from 'denali';
import ExtendedDenaliModel from '../denali-model';
import ExtendedObjectionModel from '../objection-model';
import { RelationMapping, RelationJoin } from 'objection';
import ObjectionAdapter from '../adapter';

export default function generateHasOneRelationMapping(
  adapter: ObjectionAdapter,
  objectionModels: Dict<typeof ExtendedObjectionModel>,
  container: Container,
  model: typeof ExtendedDenaliModel,
  name: string,
  descriptor: RelationshipDescriptor
): RelationMapping {
  let type = model.getType(container);

  let ObjectionModel = objectionModels[type];
  let RelatedObjectionModel = objectionModels[descriptor.type];

  assert(ObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ type }" model`);
  assert(RelatedObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ descriptor.type }" model`);

  let mapping = {
    relation: BaseObjectionModel.BelongsToOneRelation,
    modelClass: RelatedObjectionModel,
    join: <RelationJoin>{
      from: `${ ObjectionModel.tableName }.${ name }Id`, // i.e. from: 'Comment.postId'
      to: `${ RelatedObjectionModel.tableName }.id` // i.e. to: 'Post.id'
    }
  };

  return mapping;
}
