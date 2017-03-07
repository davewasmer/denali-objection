import * as knex from 'knex';
import { Model } from 'objection';
import { Application } from 'denali';

export default {
  name: 'objection-connect',
  async initialize(application: Application) {
    let adapter = application.container.lookup('orm-adapter:objection');
    adapter.knex = knex(application.config.database);
    Model.knex(adapter.knex);
  }
};
