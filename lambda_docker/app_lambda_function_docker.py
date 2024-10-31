import pandas as pd
import boto3
import pickle
import json
import base64
import os
from io import StringIO
from datetime import datetime

headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
}


def handler(event, context):
    s3 = boto3.client("s3")

    path = event["path"]
    endpoint = path.split("/")[-1]

    bucket_name = os.environ["BUCKET_NAME"]
    model_file = os.environ["MODEL_FILE"]
    # Load the model from S3
    model = pickle.loads(
        s3.get_object(Bucket=bucket_name, Key=model_file)["Body"].read()
    )

    # Check if the input data is base64 encoded
    if "isBase64Encoded" not in event:
        is_base64_encoded = False
    else:
        is_base64_encoded = event["isBase64Encoded"]

    # Decode the input data if it is base64 encoded
    if is_base64_encoded:
        decoded_body = base64.b64decode(event["body"]).decode("utf-8")
        parsed_body = json.loads(decoded_body)
    else:
        parsed_body = json.loads(event["body"])  # for proxy integration

    # Convert the input data to a pandas DataFrame
    # Expects the body of the request to be a json object with the keys as the feature names
    # and the values as the feature values
    # Names from input form MUST MATCH the names in the when it was built
    if endpoint == "singlePrediction":
        try:
            df = pd.DataFrame(
                parsed_body, index=[0], columns=model["scaler"].feature_names_in_
            )
            statusCode, body = processSinglePrediction(df, model)
        except Exception as e:
            statusCode = 400
            body = {"message": str(e)}

    elif endpoint == "batchPrediction":
        try:
            fname = parsed_body["fileKey"]
            obj_dict = s3.get_object(Bucket=bucket_name, Key=fname)
            body = obj_dict["Body"].read().decode("utf-8")
            df = pd.read_csv(StringIO(body))
            df = df[model["scaler"].feature_names_in_]
            statusCode, body = processMultiplePredictions(
                df, model, bucket_name, fname, s3
            )
        except Exception as e:
            statusCode = 400
            body = {"message": str(e)}
    else:
        statusCode = 500
        body = {"message": "Unknown API call"}

    return {
        "statusCode": statusCode,
        "headers": headers,
        # "body": body,
        "body": json.dumps(body),  # for proxy integration
    }


def validateDf(df):
    if df.isna().values.any():
        return False


def nanDfBody(df):
    return 400, {
        "message": f"Error-Bad input values in: {df.columns[df.isna().any()].tolist()}"
    }


def processSinglePrediction(df, model):
    if validateDf(df):
        return nanDfBody(df)
    pred_proba = model.predict_proba(df)
    proba = round(pred_proba[0, -1], 3)
    body = {"pred_proba": proba}
    return 200, body


def processMultiplePredictions(df, model, bucket_name, fname, s3):
    if validateDf(df):
        return nanDfBody(df)
    df["predicted_probability_1"] = model.predict_proba(df)[:, -1]
    file_stem = os.path.splitext(fname)[0]
    # new_fname = file_stem + "_" + str(int(datetime.now().timestamp())) + ".csv"
    new_fname = file_stem + "_predictions.csv"
    ret = put_object(df, bucket_name, new_fname, s3)
    if not ret["ResponseMetadata"]["HTTPStatusCode"] == 200:
        return 500, {"message": ret}
    # generate download link
    presigned_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket_name, "Key": new_fname},
        ExpiresIn=300,  # 5 minutes
    )
    body = {"bucket": bucket_name, "downloadLink": presigned_url}
    return 200, body


def put_object(df, bucket_name, fname, s3):
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    ret = s3.put_object(Bucket=bucket_name, Key=fname, Body=csv_buffer.getvalue())
    return ret
