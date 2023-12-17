import * as dotenv from 'dotenv';
import * as jsforce from 'jsforce';
const inquirer = require('inquirer');

dotenv.config();

// Salesforce credentials and connection setup
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

// Command line arguments for action, objectType, and searchTerm
const action = process.argv[2];
const objectType = process.argv[3];
const searchTerm = process.argv[4];

// Blacklist of object types
const blacklist = ['User'];

// Login to Salesforce
conn.login(username, passwordWithToken, function (err, userInfo) {
    if (err) {
        console.error(err);
        return;
    }

    // Handling Opportunity object type separately if needed
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

    // Dynamic lookup functionality
    if (action === 'lookup') {
        // Check if the object type is in the blacklist
        if (blacklist.includes(objectType)) {
            console.error('Access to this object type is restricted');
            return;
        }

        // Use Metadata API to get fields dynamically
        conn.sobject(objectType).describe(function(err, meta) {
            if (err) {
                console.error('Error describing object:', err);
                return;
            }

            // Determine if searchTerm is an ID or a Name
            const isId = /^[a-zA-Z0-9]{15,18}$/.test(searchTerm);
            const queryField = isId ? 'Id' : 'Name';
            const query = isId
                ? `SELECT Id, Name FROM ${objectType} WHERE Id = '${searchTerm}'`
                : `SELECT Id, Name FROM ${objectType} WHERE Name LIKE '%${searchTerm}%'`;

            // Execute the dynamic query
            conn.query(query, function (err, result) {
                if (err) {
                    console.error('Error during query execution:', err);
                    return;
                }

                // Output each found record
                result.records.forEach(record => {
                    console.log(`Type: ${record.attributes.type}\nURL: https://yourInstance.salesforce.com/${record.Id}\nId: ${record.Id}\nName: ${record.Name}`);
                });
            });
        });
    } else if (action === 'create') {
        // Check if the object type is in the blacklist
        if (blacklist.includes(objectType)) {
            console.error('Creation of this object type is restricted');
            return;
        }
    
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
    } // Closing brace for 'else if'
}); // Closing brace for conn.login
