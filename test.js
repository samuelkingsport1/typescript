"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var dotenv = require("dotenv");
var jsforce = require("jsforce");
var inquirer = require('inquirer');
dotenv.config();
var username = process.env.SF_USERNAME;
var password = process.env.SF_PASSWORD;
var securityToken = process.env.SF_SECURITY_TOKEN;
var consumerKey = process.env.SF_CONSUMER_KEY;
var consumerSecret = process.env.SF_CONSUMER_SECRET;
var passwordWithToken = password + securityToken;
var conn = new jsforce.Connection({
    oauth2: {
        clientId: consumerKey,
        clientSecret: consumerSecret,
        redirectUri: 'http://localhost'
    }
});
var action = process.argv[2];
var objectType = process.argv[3];
var searchTerm = process.argv[4];
conn.login(username, passwordWithToken, function (err, userInfo) {
    if (err) {
        console.error(err);
        return;
    }
    if (objectType === 'Opportunity') {
        conn.sobject('Opportunity').describe(function (err, metadata) {
            if (err) {
                console.error(err);
                return;
            }
            var stageField = metadata.fields.find(function (field) { return field.name === 'StageName'; });
            var picklistValues = stageField.picklistValues.map(function (value) { return value.label; });
            console.log('Stage picklist values:', picklistValues);
        });
    }
    if (action === 'lookup') {
        var isId = /^[a-zA-Z0-9]{15,18}$/.test(searchTerm);
        var query = void 0;
        switch (objectType) {
            case 'Account':
                query = isId
                    ? "SELECT Id, Name FROM Account WHERE Id = '".concat(searchTerm, "'")
                    : "SELECT Id, Name FROM Account WHERE Name LIKE '%".concat(searchTerm, "%'");
                break;
            case 'Contact':
                query = isId
                    ? "SELECT Id, Name, Account.Name, MobilePhone, Title FROM Contact WHERE Id = '".concat(searchTerm, "'")
                    : "SELECT Id, Name, Account.Name, MobilePhone, Title FROM Contact WHERE Name LIKE '%".concat(searchTerm, "%' OR MobilePhone LIKE '%").concat(searchTerm, "%' OR Title LIKE '%").concat(searchTerm, "%'");
                break;
            case 'Opportunity':
                query = isId
                    ? "SELECT Id, Description, Account.Name, OwnerId FROM Opportunity WHERE Id = '".concat(searchTerm, "'")
                    : "SELECT Id, Description, Account.Name, OwnerId FROM Opportunity";
                break;
            case 'Case':
                query = isId
                    ? "SELECT Id, CaseNumber, Account.Name, General_Comments__c, Subject FROM Case WHERE Id = '".concat(searchTerm, "'")
                    : "SELECT Id, CaseNumber, Account.Name, General_Comments__c, Subject FROM Case WHERE CaseNumber LIKE '%".concat(searchTerm, "%' OR General_Comments__c LIKE '%").concat(searchTerm, "%' OR Subject LIKE '%").concat(searchTerm, "%'");
                break;
            case 'User':
                query = isId
                    ? "SELECT Id, Name, IsActive, Phone FROM User WHERE Id = '".concat(searchTerm, "'")
                    : "SELECT Id, Name, IsActive, Phone FROM User WHERE Name LIKE '%".concat(searchTerm, "%' OR Phone LIKE '%").concat(searchTerm, "%'");
                break;
            default:
                console.error('Invalid object type');
                return;
        }
        conn.query(query, function (err, result) {
            if (err) {
                console.error(err);
                return;
            }
            result.records.forEach(function (record) {
                if (record.attributes.type === 'Opportunity') {
                    conn.sobject('User').retrieve(record.OwnerId, function (err, user) {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        record.OwnerName = user.Name;
                        console.log("Type: ".concat(record.attributes.type, "\nURL: https://yourInstance.salesforce.com/").concat(record.Id, "\nId: ").concat(record.Id, "\nName: ").concat(record.Name));
                    });
                }
                else {
                    console.log("Type: ".concat(record.attributes.type, "\nURL: https://yourInstance.salesforce.com/").concat(record.Id, "\nId: ").concat(record.Id, "\nName: ").concat(record.Name));
                }
            });
        });
        // ... [previous code remains unchanged]
    }
    else if (action === 'create') {
        conn.sobject(objectType).describe(function (err, meta) {
            var _this = this;
            if (err) {
                console.error(err);
                return;
            }
            var requiredFields = meta.fields.filter(function (field) { return field.nillable === false && field.createable === true; });
            requiredFields.forEach(function (field) { return console.log("Field: ".concat(field.label, "\nAPI Name: ").concat(field.name, "\n")); });
            inquirer.prompt(requiredFields.map(function (field) { return ({
                name: field.name,
                message: "Enter a value for ".concat(field.label, ":"),
                type: field.type === 'date' ? 'input' : (field.type === 'boolean' ? 'confirm' : 'input'),
            }); }))
                .then(function (answers) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    conn.sobject(objectType).create(answers, function (err, ret) {
                        return __awaiter(this, void 0, void 0, function () {
                            var missingFields, additionalAnswers, combinedAnswers;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!(err && err.errorCode === 'FIELD_INTEGRITY_EXCEPTION')) return [3 /*break*/, 2];
                                        missingFields = err.fields;
                                        console.error('Missing required fields:', missingFields.join(', '));
                                        return [4 /*yield*/, inquirer.prompt(missingFields.map(function (field) { return ({
                                                name: field,
                                                message: "Please provide a value for ".concat(field, ":"),
                                            }); }))];
                                    case 1:
                                        additionalAnswers = _a.sent();
                                        combinedAnswers = __assign(__assign({}, answers), additionalAnswers);
                                        // Retry the create operation
                                        conn.sobject(objectType).create(combinedAnswers, function (err, ret) {
                                            if (err || !ret.success) {
                                                console.error('Error creating record:', err, ret);
                                                return;
                                            }
                                            console.log('Created record id:', ret.id);
                                        });
                                        return [3 /*break*/, 3];
                                    case 2:
                                        if (err) {
                                            console.error('Error creating record:', err);
                                        }
                                        else {
                                            console.log('Created record id:', ret.id);
                                        }
                                        _a.label = 3;
                                    case 3: return [2 /*return*/];
                                }
                            });
                        });
                    });
                    return [2 /*return*/];
                });
            }); });
        });
    }
});
