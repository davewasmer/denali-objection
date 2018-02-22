import { container, Addon } from '@denali-js/core';
import * as knex from 'knex';

export default class DenaliObjectionAddon extends Addon {

  async shutdown() {
    let knex = container.lookup<knex>('objection:knex');
    await knex.destroy();
  }

}
