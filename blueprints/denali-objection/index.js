import { Blueprint } from 'denali-cli';

export default class DenaliObjectionBlueprint extends Blueprint {

  static blueprintName = 'denali-objection';
  static description = 'Installs denali-objection';

  locals(/* argv */) {
    console.log("This blueprint is run when denali-objection is installed via `denali install`. It's a good spot to make any changes to the consuming app or addon, i.e. create a config file, add a route, etc");
  }

}
