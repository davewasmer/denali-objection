import * as assert from 'assert';
import { Dict } from '../utils';
import { Model as BaseObjectionModel } from 'objection';
import ExtendedDenaliModel from '../denali-model';
import ExtendedObjectionModel from '../objection-model';
import { RelationshipDescriptor, Container } from 'denali';
import { RelationMapping, RelationJoin, RelationThrough } from 'objection';
import ObjectionAdapter from '../adapter';

export default function generateManyToManyRelationMapping(
  adapter: ObjectionAdapter,
  objectionModels: Dict<typeof ExtendedObjectionModel>,
  container: Container,
  model: typeof ExtendedDenaliModel,
  name: string,
  descriptor: RelationshipDescriptor
): RelationMapping {
  let type = model.getType(container);
  let options = descriptor.options;
  let ObjectionModel = objectionModels[type];
  let RelatedObjectionModel = objectionModels[descriptor.type];

  assert(ObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ type }" model`);
  assert(RelatedObjectionModel, `Unable to find the corresponding Objection model for the Denali "${ descriptor.type }" model`);

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

  let foreignKeyForRelationship = options.foreignKeyForRelationship ? () => options.foreignKeyForRelationship : adapter.foreignKeyForRelationship;

  mapping.join.through.from = `${joinTable}.${foreignKeyForRelationship.call(adapter, model)}`; // i.e. from: 'Post_Tag.postId'
  mapping.join.through.to = `${joinTable}.${foreignKeyForRelationship.call(adapter, RelatedObjectionModel.denaliModel)}`; // i.e. from: 'Post_Tag.postId'

  return mapping;
}
