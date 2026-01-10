import AWS from 'aws-sdk';

// Configure AWS SDK
// Credentials are now loaded from .env via Vite (VITE_ prefix)
const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
const region = import.meta.env.VITE_AWS_REGION || 'ap-south-1';

if (!accessKeyId || !secretAccessKey) {
    console.error("AWS Credentials Missing! Please set VITE_AWS_ACCESS_KEY_ID and VITE_AWS_SECRET_ACCESS_KEY in client/.env");
}

AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region
});

export const s3 = new AWS.S3();
export const bucketName = import.meta.env.VITE_S3_BUCKET || 'proctor-snapshots-vbg1';

export const dynamoDB = new AWS.DynamoDB.DocumentClient();
export const tableName = import.meta.env.VITE_DYNAMODB_TABLE || 'ProctorResults';
