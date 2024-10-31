/*
This file contains the functions for the login page.
*/

(function scopeWrapper($) {
    var predictUrl = 'predict.html';

    var userPool = new AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    });

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    /*
    Cognito User Pool functions
    */
    function signin(email, password, onSuccess, onFailure) {
        var cognitoUser = userPool.getCurrentUser();
        if (cognitoUser != null) {
            // sign out if already signed in
            cognitoUser.signOut();
        }
        authenticateUser(email, password, onSuccess, onFailure);
    }

    function authenticateUser(email, password, onSuccess, onFailure) {
        var authenticationData = {
            Username: email,
            Password: password
        };
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

        var userData = {
            Username: email,
            Pool: userPool
        };

        var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure,
            // If the user is new, they will be prompted to enter a new password
            newPasswordRequired: function (userAttributes, requiredAttributes) {
                var newPassword = enterConfirmPassword();
                cognitoUser.completeNewPasswordChallenge(newPassword, requiredAttributes, this);
            }
        });

    }

    // Function to enter and confirm new password
    function enterConfirmPassword() {
        var counter = 0;
        while (counter < 3) {
            var newPassword = prompt('Enter new password ', '');
            var confirmPassword = prompt('Confirm new password ', '');
            if (newPassword === confirmPassword) {
                return newPassword;
            } else {
                alert('Passwords do not match. Please try again.');
                counter++;
            }
        }
        // if the user fails to enter the correct password after 3 attempts
        alert('You have failed to enter the correct password after 3 attempts. Please try again later.');
        return null;
    }


    /*
    Forgot password function
    */
    function forgotPassword(email, onSuccess, onFailure) {
        var userData = {
            Username: email,
            Pool: userPool
        };

        var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        // call forgotPassword on cognitoUser
        cognitoUser.forgotPassword({
            onSuccess: function (result) {
                console.log('call result: ' + result);
                onSuccess(result);
            },
            onFailure: function (err) {
                onFailure(err);
            },
            inputVerificationCode() { // this is optional, and likely won't be implemented as in AWS's example (i.e, prompt to get info)
                var verificationCode = prompt('Please input verification code ', '');
                var newPassword = enterConfirmPassword();
                cognitoUser.confirmPassword(verificationCode, newPassword, this);
            }
        });
    }
    /*
    Event Handlers
    */

    // When the sign-in form is submitted, handle the sign-in
    $(function onDocReady() {
        $('#signinForm').submit(handleSignin);
        $('#forgotPasswordForm').submit(handleForgotPassword);
    });

    // Handle sign-in
    function handleSignin(event) {
        var email = $('#emailInputSignin').val();
        var password = $('#passwordInputSignin').val();
        event.preventDefault();
        signin(email, password,
            function signinSuccess() {
                // On success, redirect to the predict page
                console.log('Successfully Logged In to Cognito at: ' + new Date().toISOString());
                alert('Successfully Logged In');
                window.location.replace(predictUrl);
            },
            function signinError(err) {
                // On failure, display the error
                alert(err);
            }
        );
    }

    // Handle forgot password
    function handleForgotPassword(event) {
        var email = $('#emailInputForgotPassword').val();
        event.preventDefault();
        forgotPassword(email,
            function forgotPasswordSuccess() {
                // Alert success
                alert('Password reset, login with new password');
            },
            function forgotPasswordError(err) {
                alert(err);
            }
        );
    }


}(jQuery));
