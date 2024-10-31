/*
This script submits the form data to the backend API to run inputs through the machine learning model.
The results are then displayed on the page.
Authentication is handled with functions from cognito-auth.js
*/

(function scopeWrapper($) {
    const signinUrl = 'index.html';
    const apiSinglePrediction = 'prod/singlePrediction'; // Change to your API path, make sure it matches the script in the Docker image
    const apiBatchPrediction = 'prod/batchPrediction'; // Change to your API path, make sure it matches the script in the Docker image
    //Check authentication
    $(document).ready(function () {
        Auth.redirectIfNotAuthenticated(signinUrl);
        setAuthToken();
    });


    // Set the authToken variable
    let authToken;
    // Set the authToken variable
    async function setAuthToken() {
        try {
            authToken = await Auth.authToken();
            if (!authToken) {
                window.location.href = signinUrl;
                throw new Error('No auth token');
            }
        } catch (error) {
            alert(error);
            window.location.href = signinUrl;
        }
    }

    // S3 object to upload .csv file
    const s3 = new AWS.S3({
        params: { Bucket: _config.s3.bucket },
    });
    
    // Function to call the predictProba API
    predictProba = function predictProba(var_1, var_2, var_3, var_4) {
        return new Promise(function (resolve, reject) {
            // Use the API endpoint URL from the config.js file, with the API endpoint path
            const url = _config.api.invokeUrl + apiSinglePrediction; 
            const body = {
                var_1: var_1,
                var_2: var_2,
                var_3: var_3,
                var_4: var_4,
            };
            // Package up the inputs and send them to the backend API
            $.ajax({
                method: 'POST',
                url: url,
                headers: {
                    Authorization: authToken
                },
                data: JSON.stringify(body),
                contentType: 'application/json',
                success: function (result) {
                    resolve(result);
                },
                error: function ajaxError(jqXHR, textStatus, errorThrown) {
                    console.error('Error calculating: ', textStatus, ', Details: ', errorThrown);
                    console.error('Response: ', jqXHR.responseText);
                    reject('An error occured while calculating: ' + jqXHR.responseText
                        + ', ' + textStatus + ', ' + errorThrown
                    );
                }

            });
        });
    };

    predictBatch = function predictBatch(fileKey) {
        return new Promise((resolve, reject) => {
            // Pass file key to the backend API
            const url = _config.api.invokeUrl + apiBatchPrediction;
            const body = {
                fileKey: fileKey,
            }
            // Package up the inputs and send them to the backend API
            $.ajax({
                method: 'POST',
                url: url,
                headers: {
                    Authorization: authToken,
                },
                data: JSON.stringify(body),
                contentType: 'application/json',
                success: function (result) {
                    resolve(result);
                },
                error: function ajaxError(jqXHR, textStatus, errorThrown) {
                    console.error('Error calculating: ', textStatus, ', Details: ', errorThrown);
                    console.error('Response: ', jqXHR.responseText);
                    reject('An error occured while calculating: ' + jqXHR.responseText
                        + ', ' + textStatus + ', ' + errorThrown
                    );
                }
            });
        });
    }

    //
    document.getElementById("batchButton").onclick = function () {
        const file = document.getElementById('batchFile').files[0];
        if (!file) {
            alert('Please select a file to upload first.');
            return;
        }

        var userName = Auth.getUserName();
        // file key is user name (from cognito)/timestamp_filename
        const fileKey = userName + '/' + Date.now() + '_' + file.name;
        // Show the "Processing..." div
        document.getElementById("batchLoading").style.display = "block";
        // Set the temporary credentials
        Auth.setTemporaryCredentials(authToken);
        s3.upload({
            Key: fileKey,
            Body: file,
            ContentType: file.type,
        }, function (err, data) {
            if (err) {
                document.getElementById("batchLoading").style.display = "none";
                console.log('There was an error uploading your file: ', err.message);
                return alert('There was an error uploading your file: ', err.message);
            }
            predictBatch(fileKey).then(function (result) {
                try {
                    // Extract the download link from the result
                    const downloadLink = result.downloadLink;
                    // Display the download link on the page
                    if (downloadLink) {
                        document.getElementById("batchResults").href = downloadLink;
                        document.getElementById("batchResults").style.display = "block";
                    } else {
                        alert('No download link found in the result.');
                    }
                } catch (error) {
                    console.error('Error parsing result: ', error);
                    alert('Error parsing result: ' + error);
                } finally {
                    // Hide the "Processing..." div
                    document.getElementById("batchLoading").style.display = "none";
                }
            }).catch(function (error) {
                alert('Error calculating: ' + error);
                // Hide the "Processing..." div
                document.getElementById("batchLoading").style.display = "none";
            });
        }
        );
    }


    /*
     *  Event Handlers
     */
    $(function onDocReady() {
        $('#predictProbaForm').submit(handlePredictProba);
    });

    function handlePredictProba(event) {
        // Get the values from the form
        const var_1 = $('#var_1').val();
        const var_2 = $('#var_2').val();
        const var_3 = $('#var_3').val();
        const var_4 = $('#var_4').val();
        event.preventDefault();
        // Call the predictProba function
        predictProba(var_1, var_2, var_3, var_4).then(function (result) {
            try {
                // Extract the predicted probability from the result
                const predProba = result.body.pred_proba;
                const outcomeClass = outcomeClassification(predProba);
                // Display the result on the page, formatted with the outcomeClass
                $('#result').removeClass('good bad').text(predProba).addClass(outcomeClass);
                $('#report').text(reportClassification(predProba));
            } catch (error) {
                console.error('Error parsing result: ', error);
                alert('Error parsing result: ' + error);
            }
        }).catch(function (error) {
            alert('Error calculating: ' + error);
        });
    }
    /*
    Helper function to display the result.
    Allows for easy styling of the result based on custom probability threshold.
    */
    function outcomeClassification(predProba) {
        if (predProba <= 0.5) {
            return 'good';
        } else {
            return 'bad';
        }
    }

    function reportClassification(predProba) {
        if (predProba <= 0.5) {
            return 'Good result';
        } else {
            return 'Bad result';
        }
    }

}(jQuery));
