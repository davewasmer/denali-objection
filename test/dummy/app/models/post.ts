import { Model, attr, hasMany } from 'denali';

export default class Post extends Model {

  static schema: typeof Model.schema = {
    title: attr('string'),
    comments: hasMany('comment')
  };

}