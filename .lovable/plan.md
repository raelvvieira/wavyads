

# Fix: redirect_uri mismatch causing callback failure

## Root Cause

The `redirect_uri` sent to Facebook during the OAuth flow uses `window.location.origin`, which resolves to:
`https://72402569-ee8b-46ad-b0be-37ba98bcae85.lovableproject.com`

But you registered the **different** domain in Facebook:
`https://id-preview--72402569-ee8b-46ad-b0be-37ba98bcae85.lovable.app`

Facebook rejects the code exchange because the redirect_uri doesn't match what's registered.

## Two things to fix

### 1. Add the correct URI in Facebook Developer portal
Add this **exact** URI to Facebook Login > Valid OAuth Redirect URIs:

```
https://72402569-ee8b-46ad-b0be-37ba98bcae85.lovableproject.com/auth/meta/callback
```

(Keep both `lovable.app` and `lovableproject.com` versions registered.)

### 2. Add error logging to edge function
The edge function swallows Facebook's error details. Add `console.error` logging before returning error responses so we can debug future issues from the logs. Also improve the callback page error message to show the actual error from the edge function instead of the generic "Edge Function returned a non-2xx status code".

### Files to modify
- `supabase/functions/meta-oauth/index.ts` -- add `console.error` for Facebook API errors
- `src/pages/MetaCallbackPage.tsx` -- improve error extraction from edge function response

