import * as assert from 'assert';
import * as knex from 'knex';
import { Model } from 'objection';
import { Application } from 'denali';

export default {
  name: 'objection-connect',
  async initialize(application: Application) {
    let adapter = application.container.lookup('orm-adapter:objection');
    assert(application.config.database && application.config.database.client, 'Looks like you are missing database configuration. Add it to config.database - see the knex docs for configuration details: http://knexjs.org/#Installation-client');
    adapter.knex = knex(application.config.database);
    Model.knex(adapter.knex);
  }
};
