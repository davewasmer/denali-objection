import { Model, attr, hasMany } from '@denali-js/core';

export default class Post extends Model {

  static schema: typeof Model.schema = {
    title: attr('string'),
    comments: hasMany('comment')
  };

}