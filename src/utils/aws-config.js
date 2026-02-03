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
export const timingTableName = import.meta.env.VITE_DYNAMODB_TIMING_TABLE || 'ProctorTimingData';

/**
 * Store question timing data to DynamoDB
 * @param {string} studentId - Student identifier
 * @param {Object} questionTimes - Object with question ID as key and time in seconds as value
 * @param {number} totalExamTime - Total time spent on exam in seconds
 * @returns {Promise} - Resolves when data is stored
 */
export const storeTimingData = (studentId, questionTimes, totalExamTime) => {
    const params = {
        TableName: timingTableName,
        Item: {
            StudentID: studentId,
            SessionID: `session_${Date.now()}`,
            Timestamp: Date.now(),
            QuestionTimes: questionTimes,
            TotalExamTime: totalExamTime
        }
    };

    console.log("Attempting to store timing data:", params);
    console.log("Using table:", timingTableName);

    return new Promise((resolve, reject) => {
        dynamoDB.put(params, (err, data) => {
            if (err) {
                console.error("Error storing timing data:", err);
                console.error("Error code:", err.code);
                console.error("Error message:", err.message);
                reject(err);
            } else {
                console.log("Timing data stored successfully:", data);
                resolve(data);
            }
        });
    });
};
