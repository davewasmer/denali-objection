import { Addon, Application } from 'denali';
import * as knex from 'knex';

export default class DenaliObjectionAddon extends Addon {

  async shutdown(application: Application) {
    let knex = application.container.lookup<knex>('objection:knex');
    await knex.destroy();
  }

}
