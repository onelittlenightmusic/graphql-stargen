"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var yaml_1 = require("yaml");
var createRemoteSchema_1 = require("./createRemoteSchema");
var graphql_tools_1 = require("graphql-tools");
var StarSchemaTableImpl = (function () {
    function StarSchemaTableImpl(table) {
        Object.assign(this, table);
    }
    StarSchemaTableImpl.prototype.createLinkSchema = function () {
        return "\n        extend type " + this.name + " {\n            " + exports.createLinks(this) + "\n        }\n    ";
    };
    StarSchemaTableImpl.prototype.createResolvers = function (mergeResolvers, allMap) {
        var _this = this;
        var _a;
        var rtn = {};
        var name = this.name;
        for (var _i = 0, _b = this.links; _i < _b.length; _i++) {
            var jo = _b[_i];
            var fragment = "fragment " + name + "Fragment on " + name + " {" + Object.keys(jo.sameAt).join(',') + "}";
            var toTable = allMap.find(jo.to);
            var label = exports.getLinkLabel(jo);
            var resolverOfJoin = mergeResolvers[label](toTable);
            var resolve = function (parent, args, context, info) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, (resolverOfJoin(parent, args, context, info))];
                        case 1: return [2, _a.sent()];
                    }
                });
            }); };
            var resolver = {
                fragment: fragment,
                resolve: resolve
            };
            rtn[label] = resolver;
        }
        return _a = {}, _a[this.name] = rtn, _a;
    };
    return StarSchemaTableImpl;
}());
var StarSchemaMapImpl = (function () {
    function StarSchemaMapImpl(tables) {
        this.tables = tables.map(function (table) { return new StarSchemaTableImpl(table); });
        var root = this.tables.find(function (schema) { return schema.metadata.root; });
        if (root == null) {
            throw new Error("no input");
        }
        this.root = root;
    }
    StarSchemaMapImpl.prototype.getAllSchema = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4, getAllSchemaPrivate(this.tables)];
                    case 1:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    StarSchemaMapImpl.prototype.getRootTable = function () {
        return this.root;
    };
    StarSchemaMapImpl.prototype.find = function (targetName) {
        return this.tables.find(function (schema) { return schema.name == targetName; });
    };
    StarSchemaMapImpl.prototype.schemas = function () {
        var rtn = this.tables.map(function (schema) { return schema.GraphQLSchema; });
        rtn.push(this.root.createLinkSchema());
        return rtn;
    };
    StarSchemaMapImpl.prototype.createMergeArgs = function (mergeResolvers) {
        var resolvers = this.root.createResolvers(mergeResolvers, this);
        var schemas = this.schemas();
        var mergeSchemaArg = {
            schemas: schemas,
            resolvers: resolvers
        };
        return mergeSchemaArg;
    };
    StarSchemaMapImpl.prototype.createTotalExecutableSchema = function (mergeResolvers) {
        var mergeSchemaArg = this.createMergeArgs(mergeResolvers);
        return graphql_tools_1.mergeSchemas(mergeSchemaArg);
    };
    return StarSchemaMapImpl;
}());
exports.loadConfig = function (filename) {
    var yamlData = fs.readFileSync(filename, 'utf8');
    var obj = yaml_1.default.parse(yamlData);
    var starSchema = new StarSchemaMapImpl(obj.tables);
    return starSchema;
};
var createSchema = function (schema) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4, createRemoteSchema_1.createRemoteSchema(schema.definition.url)];
            case 1: return [2, _a.sent()];
        }
    });
}); };
var getAllSchemaPrivate = function (starSchemas) { return __awaiter(_this, void 0, void 0, function () {
    var _this = this;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4, Promise.all(starSchemas.map(function (schema) { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = schema;
                            return [4, createSchema(schema)];
                        case 1:
                            _a.GraphQLSchema = _b.sent();
                            return [2];
                    }
                }); }); }))];
            case 1:
                _a.sent();
                return [2];
        }
    });
}); };
var toType = function (type, onlyOne) {
    if (onlyOne) {
        return type;
    }
    return "[" + type + "]";
};
exports.createLinks = function (starSchema) {
    var rtn = starSchema.links.map(function (link) { return exports.getLinkLabel(link) + ": " + toType(link.to, link.onlyOne); }).join('\n');
    console.log(rtn);
    return rtn;
};
exports.getLinkLabel = function (link) {
    if (link.as == undefined) {
        return link.to;
    }
    return link.as;
};
//# sourceMappingURL=star.js.map