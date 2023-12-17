import dotenv from 'dotenv';
dotenv.config();

const jsforce = require('jsforce');

const conn = new jsforce.Connection({
    // you can change loginUrl to connect to sandbox or prerelease env.
    loginUrl : 'https://login.salesforce.com' 
});

const username = 'my_username';
const password = 'my_password';

conn.login(username, password, function(err, userInfo) {
    if (err) { return console.error(err); }

    // Now you can get the access token and instance URL information.
    // Save them to establish connection next time.
    console.log(conn.accessToken);
    console.log(conn.instanceUrl);

    // logged in user property
    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);

    // Query Account Name and Account ID
    conn.query("SELECT Id, Name FROM Account", function(err, result) {
        if (err) { return console.error(err); }
        console.log("total : " + result.totalSize);
        console.log("fetched : " + result.records.length);
        console.log(result.records);
    });
});
