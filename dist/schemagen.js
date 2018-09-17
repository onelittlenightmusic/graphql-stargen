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
Object.defineProperty(exports, "__esModule", { value: true });
var star_1 = require("./star");
var batchLoad_1 = require("./batchLoad");
function generateStarSchema(starYamlFile) {
    return __awaiter(this, void 0, void 0, function () {
        var starSchemaMap, createMergeResolver, resolvers;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    starSchemaMap = star_1.loadConfig(starYamlFile);
                    return [4, starSchemaMap.getAllSchema()];
                case 1:
                    _a.sent();
                    createMergeResolver = function (link) {
                        return function (toTable) {
                            var hint;
                            if (toTable.definition.type == 'graphql-opencrud') {
                                hint = exports.createOpenCRUDHint(link.sameAt);
                            }
                            var batchingQuery = function (child, queryName, array) {
                                var queryParameter = hint.childrenBatchParameter(array);
                                var query = child.query[queryName];
                                return query(queryParameter);
                            };
                            var loader = batchLoad_1.createBatchLoader(toTable.GraphQLSchema, toTable.definition.query, batchingQuery);
                            return function (parent, args, context, info) { return __awaiter(_this, void 0, void 0, function () {
                                var results;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4, loader.load(parent)];
                                        case 1:
                                            results = (_a.sent());
                                            if (link.onlyOne) {
                                                return [2, results[0]];
                                            }
                                            return [2, results];
                                    }
                                });
                            }); };
                        };
                    };
                    resolvers = {};
                    starSchemaMap.getRootTable().links.forEach(function (link) {
                        resolvers[star_1.getLinkLabel(link)] = createMergeResolver(link);
                    });
                    return [2, starSchemaMap.createTotalExecutableSchema(resolvers)];
            }
        });
    });
}
exports.generateStarSchema = generateStarSchema;
exports.createOpenCRUDHint = function (sameAt) {
    var keyName = Object.keys(sameAt)[0];
    var childKeyName = sameAt[keyName];
    return {
        childrenBatchParameter: function (parents) {
            var _a;
            return {
                where: (_a = {}, _a[childKeyName + '_in'] = parents.map(function (parent) { return parent[keyName]; }), _a)
            };
        }
    };
};
//# sourceMappingURL=schemagen.js.map