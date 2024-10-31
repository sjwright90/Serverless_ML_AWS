# Start with the aws python 3.10 image for lambda
FROM public.ecr.aws/lambda/python:3.10
# copy requirements.txt to the image
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# install dependencies
RUN pip install -r requirements.txt

# copy the lambda function code
COPY app_lambda_function_docker.py ${LAMBDA_TASK_ROOT}

# set environment variables
ENV BUCKET_NAME="your-s3-bucket-name"
ENV MODEL_FILE="model/binary_sklearn_model.pkl"
# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "app_lambda_function_docker.handler" ]