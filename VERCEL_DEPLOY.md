# Vercel Deploy Guide

## Required environment variables

Set these in the Vercel project settings for the `front` app:

```env
VITE_API_URL=https://your-backend-domain.example.com
VITE_DATA_MODE=database
VITE_FORCE_DATA_MODE=true
VITE_HIDE_DATA_MODE_SWITCH=true
```

## Recommended Vercel project settings

- Framework Preset: `Vite`
- Root Directory: `.` if this repo only contains the `front` app
- Build Command: `npm run build`
- Output Directory: `dist`

## Important note

This project should use a separately deployed backend. Vercel should host only the `front` app.
Media uploads and API requests must point to the external backend set by `VITE_API_URL`.
