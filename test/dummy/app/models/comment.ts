import { Model, attr, hasOne } from '@denali-js/core';

export default class Comment extends Model {

  static schema: typeof Model.schema = {
    body: attr('string'),
    post: hasOne('post')
  };

}