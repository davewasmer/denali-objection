"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = require("lodash");
const assert = require("assert");
const denali_1 = require("denali");
const objection_1 = require("objection");
const inflection_1 = require("inflection");
class DenaliExtendedModel extends denali_1.Model {
}
exports.DenaliExtendedModel = DenaliExtendedModel;
class ObjectionAdapter extends denali_1.ORMAdapter {
    init() {
        this.knex = this.container.lookup('objection:knex');
    }
    all(type) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let ORMModel = this.ormModelForType(type);
            return ORMModel.query();
        });
    }
    find(type, id) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let ORMModel = this.ormModelForType(type);
            assert(id, 'You must pass an id to `adapter.find(id)`');
            return ORMModel.query().findById(id);
        });
    }
    queryOne(type, query) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let results = yield this.query(type, query);
            return results[0] || null;
        });
    }
    query(type, query) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let ORMModel = this.ormModelForType(type);
            if (typeof query === 'function') {
                return query(ORMModel.query());
            }
            return ORMModel.query().where(query);
        });
    }
    createRecord(type, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let ORMModel = this.ormModelForType(type);
            return ORMModel.query().insert(data);
        });
    }
    // Objection doesn't have any concept of a "new but unsaved" model instance,
    // so we just return the supplied data object
    buildRecord(type, data) {
        return data;
    }
    idFor(model) {
        if (model.record instanceof objection_1.Model) {
            return model.record.$id();
        }
        let DenaliModel = model.constructor;
        let type = DenaliModel.getType(this.container);
        let ObjectionModel = this.ormModels[type];
        let idColumn = ObjectionModel.idColumn;
        if (typeof idColumn === 'string') {
            return model.record[idColumn];
        }
        else {
            throw new Error('Compound ids are not yet supported by the denali-objection adapter');
        }
    }
    setId() {
        throw new Error('Changing ids is not supported by denali-objection');
    }
    getAttribute(model, property) {
        return model.record[property];
    }
    setAttribute(model, property, value) {
        model.record[property] = value;
        return true;
    }
    deleteAttribute(model, property) {
        delete model.record[property];
        return true;
    }
    getRelated(model, relationship, descriptor, query) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let relatedQuery = model.record.$relatedQuery(relationship, this.testTransaction);
            if (query) {
                if (typeof query === 'object') {
                    relatedQuery = relatedQuery.where(query);
                }
                else {
                    relatedQuery = query(relatedQuery);
                }
            }
            return relatedQuery;
        });
    }
    setRelated(model, relationship, descriptor, relatedModels) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield model.record.$relatedQuery(relationship, this.testTransaction).unrelate();
            return model.record.$relatedQuery(relationship, this.testTransaction).relate(relatedModels.map((m) => m.id));
        });
    }
    addRelated(model, relationship, descriptor, relatedModel) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return model.record.$relatedQuery(relationship, this.testTransaction).relate(relatedModel.id);
        });
    }
    removeRelated(model, relationship, descriptor, relatedModel) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let ORMModel = this.ormModelForType(model.type);
            return model.record.$relatedQuery(relationship, this.testTransaction).unrelate().where(ORMModel.idColumn, relatedModel.id);
        });
    }
    saveRecord(model) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let ORMModel = this.ormModelForType(model.type);
            if (typeof model.record.$id === 'function') {
                yield ORMModel.query().patchAndFetchById(model.record.$id(), model.record);
                return;
            }
            let result = yield ORMModel.query().insert(model.record);
            model.record = result;
        });
    }
    deleteRecord(model) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let ORMModel = this.ormModelForType(model.type);
            if (Array.isArray(ORMModel.idColumn)) {
                throw new Error('Compound ids are not yet supported by the denali-objection adapter');
            }
            yield ORMModel.query().delete().where(ORMModel.idColumn, model.id);
            return;
        });
    }
    startTestTransaction() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            assert(this.knex, 'You tried to start a test transaction, but the database connection has not been established yet');
            this.testTransaction = yield objection_1.transaction.start(this.knex);
        });
    }
    rollbackTestTransaction() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.testTransaction) {
                yield this.testTransaction.rollback();
                delete this.testTransaction;
            }
        });
    }
    ormModelForType(type) {
        let ORMModel = this.ormModels[type];
        if (this.testTransaction) {
            return ORMModel.bindTransaction(this.testTransaction);
        }
        return ORMModel;
    }
    defineModels(models) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let adapter = this; // eslint-disable-line consistent-this
            this.ormModels = {};
            models.forEach((DenaliModel) => {
                if (!DenaliModel.hasOwnProperty('abstract')) {
                    let type = DenaliModel.getType(this.container);
                    class ObjectionModel extends objection_1.Model {
                        $formatDatabaseJson(json) {
                            json = super.$formatDatabaseJson(json);
                            return adapter.serializeRecord(json);
                        }
                        $parseDatabaseJson(json) {
                            json = adapter.parseRecord(json);
                            return super.$parseDatabaseJson(json);
                        }
                    }
                    ObjectionModel.tableName = DenaliModel.tableName || inflection_1.pluralize(lodash_1.snakeCase(type));
                    ObjectionModel.denaliModel = DenaliModel;
                    Object.defineProperty(ObjectionModel, 'name', {
                        value: `${lodash_1.chain(type).startCase().replace(' ', '').value()}ObjectionModel`
                    });
                    this.ormModels[type] = ObjectionModel;
                }
            });
            models.forEach((DenaliModel) => {
                if (!DenaliModel.hasOwnProperty('abstract') || !DenaliModel.abstract) {
                    let type = DenaliModel.getType(this.container);
                    let ORMModel = this.ormModels[type];
                    ORMModel.relationMappings = this.generateRelationMappingsFor(DenaliModel);
                }
            });
            // We have to do this after all of the relationMappings are defined
            // because when bindKnex is called it eagerly tries to set the relations on the model
            this.ormModels = lodash_1.mapValues(this.ormModels, (ormModel) => ormModel.bindKnex(this.knex));
        });
    }
    serializeRecord(json) {
        return lodash_1.mapKeys(json, (value, key) => {
            return this.serializeColumn(key);
        });
    }
    parseRecord(json) {
        return lodash_1.mapKeys(json, (value, key) => {
            return this.parseColumn(key);
        });
    }
    serializeColumn(key) {
        return lodash_1.snakeCase(key);
    }
    parseColumn(key) {
        return lodash_1.camelCase(key);
    }
    generateRelationMappingsFor(DenaliModel) {
        let mappings = {};
        DenaliModel.mapRelationshipDescriptors((descriptor, name) => {
            let config = descriptor.options;
            let ORMModel = this.ormModels[DenaliModel.getType(this.container)];
            let RelatedORMModel = this.ormModels[descriptor.type];
            let mapping = {
                modelClass: RelatedORMModel
            };
            if (descriptor.mode === 'hasMany') {
                // Many to many
                if (config.manyToMany) {
                    mapping.relation = objection_1.Model.ManyToManyRelation;
                    mapping.join = {
                        from: `${ORMModel.tableName}.id`,
                        to: `${RelatedORMModel.tableName}.id`,
                        through: {
                            extra: config.manyToMany.extra
                        }
                    };
                    let joinTable;
                    if (config.manyToMany.model) {
                        mapping.join.through.model = this.ormModels[config.manyToMany.model];
                        joinTable = mapping.join.through.model.tableName;
                    }
                    else {
                        joinTable = `${ORMModel.tableName}_${RelatedORMModel.tableName}`;
                    }
                    mapping.join.through.from = `${joinTable}.${lodash_1.camelCase(ORMModel.denaliModel.getType(this.container))}Id`; // i.e. from: 'Post_Tag.postId'
                    mapping.join.through.to = `${joinTable}.${lodash_1.camelCase(RelatedORMModel.denaliModel.getType(this.container))}Id`; // i.e. from: 'Post_Tag.tagId'
                    // Has many
                }
                else {
                    let inverse = config.inverse || lodash_1.camelCase(DenaliModel.getType(this.container));
                    mapping.relation = objection_1.Model.HasManyRelation;
                    mapping.join = {
                        from: `${ORMModel.tableName}.id`,
                        to: `${RelatedORMModel.tableName}.${inverse}Id` // i.e. to: 'Comment.postId'
                    };
                }
                // Belongs to
            }
            else {
                mapping.relation = objection_1.Model.BelongsToOneRelation;
                mapping.join = {
                    from: `${ORMModel.tableName}.${name}Id`,
                    to: `${RelatedORMModel.tableName}.id` // i.e. to: 'Post.id'
                };
            }
            // Allow user to override at any level
            mappings[name] = lodash_1.merge(mapping, config.mapping);
        });
        return mappings;
    }
}
exports.default = ObjectionAdapter;
