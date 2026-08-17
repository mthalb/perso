const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
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
    // Newer AWS SDK v3 versions auto-attach a CRC32 request checksum to
    // PutObject and bake it into the presigned URL's signature. A plain
    // browser PUT has no way to compute/attach that checksum, so B2 would
    // reject every direct-from-browser upload with SignatureDoesNotMatch.
    // "WHEN_REQUIRED" keeps checksums off unless the operation truly needs
    // one, which is what presigned browser uploads need.
    requestChecksumCalculation: 'WHEN_REQUIRED',
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

// Returns a time-limited signed URL the BROWSER can PUT a file to directly —
// the video bytes never pass through our serverless function, so there's no
// server body-size limit to worry about.
//
// Deliberately NOT binding this to a specific Content-Type: some browsers
// report an empty or unexpected MIME type for a given video file, and if
// that differs even slightly from what was signed, B2 rejects the PUT with
// a signature mismatch (shows up to the user as a bare "upload failed").
// Leaving Content-Type unsigned means whatever header the client sends is
// accepted — B2 just stores it as the object's content type.
async function getSignedUploadUrl(key, ttlMs) {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: process.env.B2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: Math.floor(ttlMs / 1000) });
}

// Reads a small JSON object from the bucket (used for the video manifest).
// Returns `fallback` if the object doesn't exist yet.
async function getObjectJson(key, fallback) {
  const client = getClient();
  try {
    const res = await client.send(new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
    }));
    const text = await res.Body.transformToString();
    return JSON.parse(text);
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.Code === 'NoSuchKey' || err?.name === 'NoSuchKey') {
      return fallback;
    }
    throw err;
  }
}

// Writes a small JSON object to the bucket.
async function putObjectJson(key, data) {
  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: process.env.B2_BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }));
}

module.exports = { getSignedReadUrl, getSignedUploadUrl, getObjectJson, putObjectJson };
