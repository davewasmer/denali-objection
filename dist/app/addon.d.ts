import { Addon, Application } from 'denali';
export default class DenaliObjectionAddon extends Addon {
    shutdown(application: Application): Promise<void>;
}
