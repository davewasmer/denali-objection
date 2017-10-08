import * as assert from 'assert';
import * as knex from 'knex';
import { Application } from 'denali';

export default {
  name: 'objection-connect',
  before: 'define-orm-models',
  async initialize(application: Application) {
    assert(application.config.database && application.config.database.client, 'Looks like you are missing database configuration. Add it to config.database - see the knex docs for configuration details: http://knexjs.org/#Installation-client');
    application.container.register('objection:knex', knex(application.config.database), {
      singleton: false,
      instantiate: false
    });
  }
};
