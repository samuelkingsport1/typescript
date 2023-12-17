import * as dotenv from 'dotenv';
import * as jsforce from 'jsforce';
const inquirer = require('inquirer');

dotenv.config();

const username = process.env.SF_USERNAME;
const password = process.env.SF_PASSWORD;
const securityToken = process.env.SF_SECURITY_TOKEN;
const consumerKey = process.env.SF_CONSUMER_KEY;
const consumerSecret = process.env.SF_CONSUMER_SECRET;

const passwordWithToken = password + securityToken;

const conn = new jsforce.Connection({
    oauth2: {
        clientId: consumerKey,
        clientSecret: consumerSecret,
        redirectUri: 'http://localhost'
    }
});

const action = process.argv[2];
const objectType = process.argv[3];
const searchTerm = process.argv[4];

conn.login(username, passwordWithToken, function (err, userInfo) {
    if (err) {
        console.error(err);
        return;
    }
    if (objectType === 'Opportunity') {
        conn.sobject('Opportunity').describe((err, metadata) => {
            if (err) {
                console.error(err);
                return;
            }
            let stageField = metadata.fields.find(field => field.name === 'StageName');
            let picklistValues = stageField.picklistValues.map(value => value.label);
            console.log('Stage picklist values:', picklistValues);
        });
    }

    if (action === 'lookup') {
        const isId = /^[a-zA-Z0-9]{15,18}$/.test(searchTerm);
        let query;
        switch (objectType) {
            case 'Account':
                query = isId
                    ? `SELECT Id, Name FROM Account WHERE Id = '${searchTerm}'`
                    : `SELECT Id, Name FROM Account WHERE Name LIKE '%${searchTerm}%'`;
                break;
            case 'Contact':
                query = isId
                    ? `SELECT Id, Name, Account.Name, MobilePhone, Title FROM Contact WHERE Id = '${searchTerm}'`
                    : `SELECT Id, Name, Account.Name, MobilePhone, Title FROM Contact WHERE Name LIKE '%${searchTerm}%' OR MobilePhone LIKE '%${searchTerm}%' OR Title LIKE '%${searchTerm}%'`;
                break;
            case 'Opportunity':
                query = isId
                    ? `SELECT Id, Description, Account.Name, OwnerId FROM Opportunity WHERE Id = '${searchTerm}'`
                    : `SELECT Id, Description, Account.Name, OwnerId FROM Opportunity`;
                break;
            case 'Case':
                query = isId
                    ? `SELECT Id, CaseNumber, Account.Name, General_Comments__c, Subject FROM Case WHERE Id = '${searchTerm}'`
                    : `SELECT Id, CaseNumber, Account.Name, General_Comments__c, Subject FROM Case WHERE CaseNumber LIKE '%${searchTerm}%' OR General_Comments__c LIKE '%${searchTerm}%' OR Subject LIKE '%${searchTerm}%'`;
                break;
            case 'User':
                query = isId
                    ? `SELECT Id, Name, IsActive, Phone FROM User WHERE Id = '${searchTerm}'`
                    : `SELECT Id, Name, IsActive, Phone FROM User WHERE Name LIKE '%${searchTerm}%' OR Phone LIKE '%${searchTerm}%'`;
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
                        console.log(`Type: ${record.attributes.type}\nURL: https://yourInstance.salesforce.com/${record.Id}\nId: ${record.Id}\nName: ${record.Name}`);
                    });
                } else {
                    console.log(`Type: ${record.attributes.type}\nURL: https://yourInstance.salesforce.com/${record.Id}\nId: ${record.Id}\nName: ${record.Name}`);
                }
            });
        });
    // ... [previous code remains unchanged]

} else if (action === 'create') {
    conn.sobject(objectType).describe(function (err, meta) {
        if (err) {
            console.error(err);
            return;
        }

        const requiredFields = meta.fields.filter(field => field.nillable === false && field.createable === true);
        requiredFields.forEach(field => console.log(`Field: ${field.label}\nAPI Name: ${field.name}\n`));

        inquirer.prompt(requiredFields.map(field => ({
            name: field.name,
            message: `Enter a value for ${field.label}:`,
            type: field.type === 'date' ? 'input' : (field.type === 'boolean' ? 'confirm' : 'input'),
        })))
        .then(async answers => {
            conn.sobject(objectType).create(answers, async function (err, ret) {
                if (err && err.errorCode === 'FIELD_INTEGRITY_EXCEPTION') {
                    const missingFields = err.fields;
                    console.error('Missing required fields:', missingFields.join(', '));

                    const additionalAnswers = await inquirer.prompt(missingFields.map(field => ({
                        name: field,
                        message: `Please provide a value for ${field}:`,
                    })));

                    // Merge the original answers with the additional answers
                    const combinedAnswers = {...answers, ...additionalAnswers};

                    // Retry the create operation
                    conn.sobject(objectType).create(combinedAnswers, function(err, ret) {
                        if (err || !ret.success) {
                            console.error('Error creating record:', err, ret);
                            return;
                        }

                        console.log('Created record id:', ret.id);
                    });
                } else if (err) {
                    console.error('Error creating record:', err);
                } else {
                    console.log('Created record id:', ret.id);
                }
            });
        });
    });
}
});
