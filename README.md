# Vault — setup

## How it works
- The password is checked in `api/login.js`, on the server, read from an
  environment variable — never embedded in the HTML.
- On success, the server sets a signed, `HttpOnly` cookie (a token, not the
  password) that expires after 2 hours.
- `api/videos.js` checks that cookie, and if valid, asks Backblaze B2 for a
  short-lived **signed URL** for each video (default: valid 15 minutes) and
  returns those to the browser.
- Your videos live in a private B2 bucket. Signed URLs are generated
  server-side with your B2 application key — the bucket itself stays
  private, and a signed URL grants temporary access directly. No login = no
  signed URL = no video.
- B2 is used here (instead of Firebase Storage or Cloudflare R2) because its
  free tier — 10GB storage, no expiry — doesn't require a credit card at
  all, as long as the bucket stays private (which is what you want anyway).

## 1. Set up a Backblaze B2 bucket
1. Sign up at [backblaze.com/sign-up/cloud-storage](https://www.backblaze.com/sign-up/cloud-storage)
   — no credit card needed.
2. Once logged in, go to **B2 Cloud Storage → Buckets → Create a Bucket**.
3. Name it (must be globally unique, e.g. `yourname-vault`), and set
   **Files in Bucket are: Private**. Leave the rest as default.
4. Open the bucket and note its **Endpoint**, shown on the bucket page —
   it looks like `s3.us-west-004.backblazeb2.com`. The part after `s3.` and
   before `.backblazeb2.com` is your region (e.g. `us-west-004`).
5. Upload your videos into a `vault/` folder in the bucket (e.g.
   `vault/clip1.mp4`, `vault/clip2.mp4`) — matching folder name is just a
   convention, you can change it as long as it matches `api/videos.js`.

## 2. Create an application key
1. In the B2 dashboard, go to **Application Keys → Add a New Application Key**.
2. Give it a name, restrict it to your bucket if you like, and leave
   permissions as **Read and Write** (or Read Only, since this app only
   downloads).
3. Click **Create New Key**. Copy the **keyID** and **applicationKey**
   immediately — the applicationKey is only shown once.

## 3. Set environment variables in Vercel
In your Vercel project settings → Environment Variables, add:

| Name | Value |
|---|---|
| `VAULT_PASSWORD` | the password visitors enter |
| `VAULT_SECRET` | a long random string for signing session tokens (run `openssl rand -hex 32` locally) |
| `B2_KEY_ID` | the keyID from your application key |
| `B2_APPLICATION_KEY` | the applicationKey from your application key |
| `B2_ENDPOINT` | your bucket's endpoint, e.g. `s3.us-west-004.backblazeb2.com` |
| `B2_REGION` | just the region part, e.g. `us-west-004` |
| `B2_BUCKET_NAME` | your bucket name from step 1 |

Set these for Production (and Preview/Development too if you test there).
Redeploy after adding them — env vars only take effect on a fresh deploy.

## 4. List your videos
In `api/videos.js`, make sure the `VIDEOS` array matches what you uploaded:

```js
const VIDEOS = [
  { id: 'clip1', label: 'Clip 1', path: 'vault/clip1.mp4' },
  { id: 'clip2', label: 'Clip 2', path: 'vault/clip2.mp4' },
];
```

`path` is the object's key inside the bucket — edit, add, or remove entries
as needed.

## 5. Install and deploy
Run `npm install` locally (or just let Vercel install the dependencies
automatically on deploy, since they're listed in `package.json`), then push
to the repo Vercel is connected to, or run `vercel deploy`.

## Notes / limits
- Signed URLs last 15 minutes (`SIGNED_URL_TTL_MS` in `api/videos.js`). A
  video that's already loaded will keep playing past that, but a page
  refresh or a fresh scrub after 15+ minutes of being idle will need a new
  URL — reloading the page (with a still-valid login cookie) fixes it.
- Sessions last 2 hours (`TOKEN_TTL_MS` in `api/login.js`) — adjust to taste.
- Backblaze B2's free tier includes 10GB of storage and free egress up to 3x
  your average stored data (so 10GB stored ≈ 30GB free downloads/month) —
  plenty for a small personal vault, no card required for a private bucket.
- There's a small rate-limiting nod (400ms delay on a wrong password) but no
  lockout after repeated failures — fine for a low-stakes private page, not
  meant to withstand a targeted attack.
