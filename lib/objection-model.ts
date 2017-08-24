import ExtendedDenaliModel from './denali-model';
import { Model as ObjectionModel } from 'objection';

export default class ExtendedObjectionModel extends ObjectionModel {
  static denaliModel: typeof ExtendedDenaliModel;
}
