# Render Deploy Guide

## Service type

- Create a `Web Service`
- Runtime: `Node`
- Branch: `back`
- Root Directory: leave empty if this branch contains backend files at the repo root

## Build and start commands

- Build Command: `npm install`
- Start Command: `npm start`

If Render detects [render.yaml](C:\Users\Pitphiboon\Desktop\back\render.yaml), you can also deploy with Blueprint and keep these defaults automatically.

## Required environment variables

Set these in Render:

```env
PORT=5003
MONGO_URI=your-mongodb-atlas-uri
JWT_SECRET=your-strong-secret
FRONTEND_URL=https://your-frontend.vercel.app
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://www.your-domain.com
```

## Health check

Use:

```text
/health
```

## Important note about uploads

This backend currently stores uploaded files in the local `uploads/` folder.
That works for local development, but for a stable internet deployment you should move uploads to external storage such as Cloudinary, S3, or another object storage service.
