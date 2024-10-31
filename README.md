# AWS Serverless ML

This repo contains components to build a password protected serverless web app on AWS to provide predictions from an ML model. The app is structured to either predict on one observation or run a batch prediction against a CSV file. I have included a sample model, a simple logistic regression pipeline, as a starting point. The system is designed to easily swap models out, allowing for updates to the model (by simply overwriting the binary model file accessed by the Docker at run time) or putting in a new model (overwrite file and adjust feature names in the JSON passed to the API). The methods here are very hands on and there are AWS tools (e.g. Sagemaker) that can/could shortcut the process. I wanted to build the pieces myself for educational purposes and because in theory the infrastructure could be ported to another Cloud provider without too many changes. The total costs are probably <$5 to set up, and once running it's pennies per month to keep it live.

The high level AWS architecture is shown here:

![alt text](https://github.com/sjwright90/Serverless_ML_AWS/blob/main/images/AWS_Architecture.png)

### Architecture components
**AWS Amplify:** Deploys and hosts the web application using source code from GitHub repository<br>
**Github:** Stores the source code for the web application<br>
**AWS Cognito:** Provides secure user authentication and manages login credentials<br>
**AWS API Gateway:** Routes client requests to backend services and returns the results<br>
**AWS Labmda:** Runs Docker container to make predictions, in response to API request<br>
**Docker:** Contains the environment, dependencies, and code to run predictive modeling, executed by AWS Lambda<br>
**AWS ECR:** Stores and manages the Docker container image<br>
**AWS S3:** Holds the binary version of the ML model, which the Docker accesses during run time<br><br>

### Project directory
app/ - html, css, and js files to build front end and logic to communicate with the backend<br>
&emsp;all AWS configurations will go here (e.g. your Cognito User Pool Id)<br>
lambda_docker/ - Files to build the docker image that is linked to AWS Lambda, including the Python script, Dockerfile, and requirements.txt<br>
&emsp;Also contains some helper functions<br>
model/ - Python scripts and synthetic data to build, pickle, and push an sklearn pipeline to the S3 bucket<br>
&emsp;the binary file is what the Docker accesses at runtime<br>

### Provisioning resources on AWS
The scripts here form the core of the serverless ML tool, but everything needs to be stitched together on AWS<br>
The specific implementation will be up to each user and is non-unique, but an example is provided here.<br>
Resources are interconnected, but following the steps in order will simplify the workflow.<br>
Certain resource IDs need to be included in the "app/js/config.js" file, these are tagged, see footnotes<br><br>
**Cognito**:<br>
*User pools*: Provision a User pool and create an App client within it. This is used to generate signed tokens for login and API calls.<sup>1,2</sup><br>
*Identity pools*: Provision an Identity pool with your User pool as the Identity provider. This is used to generate temporary credential for S3 interactions.<sup>3</sup> When creating select "Authenticated access" and "Amazon Cognito user pool" then let it generate a new IAM role for you<br><br>

**IAM**:<br>
*Roles*: You will need to make custom roles to access resources:<br>
*Labmda role*: One role to attach to your Lambda function, can use the managed "AmazonS3FullAccess" and "AWSLambdaBasicExecutionRole"<br>
*Cognito authentication role*: Created when you make the Identity pool. Attach a policy to allow "s3:PutObject" on your S3 resource<br><br>
**S3**:<br>
*Bucket*: Provision a bucket, keep defaults. Edit the Cross-origin resource sharing (CORS) in the "Permissions" tab to allow headers, methods, and origins (![example](https://github.com/sjwright90/Serverless_ML_AWS/blob/main/s3/exampleCORS.json) here all headers and origins are allowed, you can/should limit to headers, methods, and origins (i.e your domain) you need.)<sup>4</sup><br><br>
**Elastic Container Registry**:<br>
*Repository*: Provision a repo. Build the docker and push it to here. ECR provides all needed commands to build, tag, and push.<br>
See also the lambda_docker/ directory for CLI commands to test your image.<br>
You can provision an EC2 instance to do the build and push or develop locally.<br><br>
**Labmda**:<br>
*Function*: Create a function, select "Container image", use the ARN from your ECR repo, attach the role you made earlier (or do this first, let AWS create a default role, and then attach the other needed policies after).<br>
You can test the Lambda function using "API Gateway AWS Proxy" template (WARNING: this will trigger the Docker to run, which could incur costs).<br><br>
**API Gateway**:<br>
*API*: Create a new API.<br>
*Authorizers*: In the Authorizers tab create a new authorizer with "Create authorizer". Select "Cognito". Connect it to your Cognito User pool. Enter "Authorization" as Token source.
Test the token: In your Cognito App client (Cognito->User pool->App integration->App clients) make sure "ALLOW_USER_PASSWORD_AUTH" is allowed under 'Authentication flows" (if not then you can edit the client). Make sure you have at least one user with a username and password (or however you set up your login). Use the AWS CLI to get a token*:<br>

```aws cognito-idp initiate-auth --region YOUR-REGION --auth-flow USER_PASSWORD_AUTH --client-id $serverlessClientId --auth-parameters USERNAME=yourusername@domain.com,PASSWORD=YOURPASSWORD```

The token you need is at: AuthenticationResult.IdToken in the returned JSON. Select your authorizer and enter the token in the "Test authorization" box.

*Resources*: Create a resource (make sure you enable CORS which makes a default OPTIONS method). Add a POST method (make sure the name matches the "path" embedded in the Docker image), select "Lambda function" for Integration type. Enable "Lambda proxy integration". Connect it to your Lambda function using the ARN. Under "Method request settings" select your newly made Authorizer as the Authorization.
*Test (optional)*: You can test the resource from the console, this will bypass the authorization.<br>
*Deploy*: Click "Deploy". Enter a new "Stage" name. Give a short description. Go to Stages and navigate the dropdown to your Method. An "Invoke URL" is provided which is used to invoke the API.<sup>5</sup><br><br>
**AWS Amplify**:<br>
*Deploy app*: Put the 'app/' directory and all subfolders into GitHub, BitBucket, CodeCommit, or GitLab (or S3). You will need to allow AWS access to your resource location. I have only done it for GitHub and it was very easy, plus you can restrict it to only select repositories. Click through, keeping the defaults, and Amplify will build and launch your app (this can take a while). Whenever changes are pushed to the branch that Amplify tracks, it will rebuild the app (though you can turn this off if you want). There are links below with some tutorials. NOTE: We are just using Amplify to deploy our static web page, it is also possible to build an app ground up using Amplify.<br><br>
*If you require password reset, once your Cognito resources are provisioned you can launch a local instance of your server e.g. ```npx http-server .``` and use the login page to reset the password.<br>


##### Resource IDs for "config.js" file
1: ![userPoolId](https://github.com/sjwright90/Serverless_ML_AWS/blob/main/app/js/config.js?plain=14)<br>
2: ![userPoolClientId](https://github.com/sjwright90/Serverless_ML_AWS/blob/main/app/js/config.js?plain=15)<br>
3: ![identityPoolId](https://github.com/sjwright90/Serverless_ML_AWS/blob/main/app/js/config.js?plain=17)<br>
4: ![bucket](https://github.com/sjwright90/Serverless_ML_AWS/blob/main/app/js/config.js?plain=29) Name of your bucket<br>
5: ![invokeUrl](https://github.com/sjwright90/Serverless_ML_AWS/blob/main/app/js/config.js?plain=24) API URL, either full path or segment it.<br><br>

#### Helpful resources
AWS API Gateway:
https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html

Docker image for Lambda:
https://docs.aws.amazon.com/lambda/latest/dg/images-create.html

AWS Elastic Container Registry:
https://aws.amazon.com/ecr/getting-started/

AWS Amplify:
https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html
https://docs.amplify.aws/react/start/
https://aws.amazon.com/getting-started/hands-on/build-react-app-amplify-graphql/module-one/
<br><br>

#### Credit
I borrowed extensively from the "Wild Rydes" AWS tutorial and other resources.<br>
The original resources seem to have changed, but the ![AWS Tutorials](https://github.com/aws-samples/aws-serverless-workshops/tree/master) here contain most of the pieces.
### Final product
The prediction page would look like this:<br>
![alt text](https://github.com/sjwright90/Serverless_ML_AWS/blob/main/images/Prediction_Page.PNG)<br>
