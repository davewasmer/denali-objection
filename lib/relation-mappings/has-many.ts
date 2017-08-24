import * as assert from 'assert';
import { camelCase } from 'lodash';
import { Dict } from '../utils';
import { Model as BaseObjectionModel } from 'objection';
import { Container, RelationshipDescriptor } from 'denali';
import ExtendedDenaliModel from '../denali-model';
import ExtendedObjectionModel from '../objection-model';
import { RelationMapping, RelationJoin } from 'objection';

export default function generateHasManyRelationMapping(
  objectionModels: Dict<typeof ExtendedObjectionModel>,
  container: Container,
  model: typeof ExtendedDenaliModel,
  name: string,
  descriptor: RelationshipDescriptor
): RelationMapping {
  let options = descriptor.options;
  let type = model.getType(container);
  let inverse = options.inverse || camelCase(type);

  let ObjectionModel = objectionModels[type];
  let RelatedObjectionModel = objectionModels[descriptor.type];

  assert(ObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ type }" model`);
  assert(RelatedObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ descriptor.type }" model`);

  let mapping = {
    relation: BaseObjectionModel.HasManyRelation,
    modelClass: RelatedObjectionModel,
    join: <RelationJoin>{
      from: `${ ObjectionModel.tableName }.id`, // i.e. from: 'Post.id'
      to: `${ RelatedObjectionModel.tableName }.${ inverse }_id` // i.e. to: 'Comment.postId'
    }
  };

  return mapping;
}
