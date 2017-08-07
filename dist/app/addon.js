"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const denali_1 = require("denali");
class DenaliObjectionAddon extends denali_1.Addon {
    shutdown(application) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let knex = application.container.lookup('objection:knex');
            yield knex.destroy();
        });
    }
}
exports.default = DenaliObjectionAddon;
