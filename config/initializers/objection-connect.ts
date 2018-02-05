import * as assert from 'assert';
import * as Knex from 'knex';
import { Application, container } from 'denali';

export default {
  name: 'objection-connect',
  before: 'define-orm-models',
  async initialize(application: Application) {
    assert(application.config.get('database', 'client'), 'Looks like you are missing database configuration. Add it to config.database - see the knex docs for configuration details: http://knexjs.org/#Installation-client');
    let config = application.config.get('database');
    container.register('objection:knex', Knex(config), { singleton: false });
  }
};
