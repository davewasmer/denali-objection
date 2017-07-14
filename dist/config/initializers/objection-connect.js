"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const assert = require("assert");
const Knex = require("knex");
exports.default = {
    name: 'objection-connect',
    before: 'define-orm-models',
    initialize(application) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            assert(application.config.database && application.config.database.client, 'Looks like you are missing database configuration. Add it to config.database - see the knex docs for configuration details: http://knexjs.org/#Installation-client');
            application.container.register('objection:knex', Knex(application.config.database), {
                singleton: false,
                instantiate: false
            });
        });
    }
};
