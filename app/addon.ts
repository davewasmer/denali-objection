import { container, Addon } from 'denali';
import * as knex from 'knex';

export default class DenaliObjectionAddon extends Addon {

  async shutdown() {
    let knex = container.lookup<knex>('objection:knex');
    await knex.destroy();
  }

}
