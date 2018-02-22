import { Model } from '@denali-js/core';

export default abstract class ExtendedDenaliModel extends Model {

  static tableName?: string;
  static idColumn?: string;

}
