import { Model } from 'denali';

export default abstract class ExtendedDenaliModel extends Model {

  static tableName?: string;
  static idColumn?: string;

}
