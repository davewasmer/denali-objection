import { Addon, Application } from 'denali';
import ObjectionAdapter from './orm-adapters/objection';

export default class DenaliObjectionAddon extends Addon {

  async shutdown(application: Application) {
    let Adapter = <ObjectionAdapter>application.container.lookup('orm-adapter:objection');
    return Adapter.knex.destroy();
  }

}
