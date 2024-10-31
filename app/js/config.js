/*

This file contains the configuration for the web application.
Set global variables for the cognito user pool and the api gateway invoke url.    
*/

window._config = {
    /*
    Cognito User Pool:
    Here you insert the user pool id, the app client id and the region of your cognito user pool.
    You can make a new user pool in the AWS Cognito console. You will need to integrate the user pool with the app client.
    */
    cognito: {
        userPoolId: '', // Your user pool id here. e.g. us-east-1_abcde1234
        userPoolClientId: '', // App integration client id. e.g. 12aa34bb56cc78dd90ee12ff34
        region: '', // Your cognito region here e.g. us-east-1
        identityPoolId: '', // Your identity pool id here e.g. us-east-1:1234567890
    },
    /*
    API Gateway:
    Here you insert the invoke url of your API Gateway. You can create a new API Gateway in the AWS console.
    */
    api: {
        invokeUrl: '' // e.g. https://your-api-id.execute-api.your-region.amazonaws.com/',
    },

    // S3 Bucket:
    // Here you insert the name of the S3 bucket you want to use for file uploads.
    s3: {
        bucket: '' // e.g. 'your-s3-bucket-name'
    }
};
