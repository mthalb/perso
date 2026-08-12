const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Backblaze B2 has an S3-compatible API, so we talk to it with the AWS SDK
// pointed at B2's endpoint instead of AWS's. The endpoint is region-specific
// (e.g. https://s3.us-west-004.backblazeb2.com) — copy it from your bucket's
// "Endpoint" field in the B2 dashboard.
function getClient() {
  return new S3Client({
    region: process.env.B2_REGION,
    endpoint: `https://${process.env.B2_ENDPOINT}`,
    credentials: {
      accessKeyId: process.env.B2_KEY_ID,
      secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
  });
}

// Returns a time-limited signed URL for reading one object from the bucket.
async function getSignedReadUrl(key, ttlMs) {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: process.env.B2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: Math.floor(ttlMs / 1000) });
}

module.exports = { getSignedReadUrl };

