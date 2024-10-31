/*
This file contains the functions for the Auth object, which is used to manage the user authentication.
The Auth object is used to check if the user is authenticated, get the current authentication token, and sign out the user.
Configuration settings for the Cognito user pool are stored in the config.js file.
*/

var Auth = window.Auth || {};

(function scopeWrapper($) {
    // Get the configuration settings from the config.js file
    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId,
    };

    // Create a new instance of the CognitoUserPool object
    var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    // Define the functions for the Auth object
    Auth.getCurrentUser = function () {
        return userPool.getCurrentUser();
    };

    // Check if the user is authenticated
    Auth.isAuthenticated = async function () {
        const cognitoUser = Auth.getCurrentUser();
        if (!cognitoUser) {
            return false;
        }

        try {
            const session = await new Promise((resolve, reject) => {
                cognitoUser.getSession((err, session) => {
                    if (err || !session.isValid()) {
                        reject(err || new Error('Session is invalid'));
                    } else {
                        resolve(session);
                    }
                });
            });
            return !!session && session.isValid();
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    };

    Auth.getUserName = function () {
        var cognitoUser = Auth.getCurrentUser();
        return cognitoUser ? cognitoUser.username : '';
    };



    // Redirect to the sign-in page if the user is not authenticated
    Auth.redirectIfNotAuthenticated = async function (redirectUrl) {
        const isAuthenticated = await Auth.isAuthenticated();
        if (!isAuthenticated) {
            alert('You must be signed in to access the page');
            window.location.replace(redirectUrl || 'index.html');
        } else {
            $('#predictProbaLoading').hide();
            $('#predictProbaContent').show();
        }
    }

    Auth.setTemporaryCredentials = function (token) {
        AWS.config.region = _config.cognito.region;
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: _config.cognito.identityPoolId,
            Logins: {
                [`cognito-idp.${AWS.config.region}.amazonaws.com/${_config.cognito.userPoolId}`]: token,
            },
        });
    }

    // Get the current authentication token and temporary credentials
    Auth.authToken = async function fetchCurrentAuthToken() {
        const isAuthenticated = await Auth.isAuthenticated();
        if (!isAuthenticated) {
            return null;
        }
        const cognitoUser = userPool.getCurrentUser();
        const session = await new Promise((resolve, reject) => {
            cognitoUser.getSession((err, session) => {
                if (err || !session.isValid()) {
                    reject(err || new Error('Session is invalid'));
                } else {
                    resolve(session);
                }
            });
        });
        return session.getIdToken().getJwtToken();
    }    

    // Sign out the user
    Auth.signOut = function () {
        var cognitoUser = userPool.getCurrentUser();
        if (cognitoUser != null) {
            cognitoUser.signOut();
            window.location.replace('index.html');
        }
    };

}(jQuery));
