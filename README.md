# Scrolls Web

This is the first web scaffold for Scrolls, built as a companion web app that can live at:

```txt
https://scrolls.adastra.love
```

It does not replace the iOS app. The web app talks to the existing Scrolls Supabase edge functions and shares the same users, posts, profiles, media storage, and App Store download link.

## What Is Included

- Public landing page: `/`
- Login page: `/login`
- Authenticated feed page: `/feed`
- Public profile page: `/user/[username]`
- Public post landing shell: `/scroll/[postId]`
- Shared Scrolls UI components for branding, avatars, profile headers, post cards, media rendering, and App Store CTAs
- Supabase edge-function client wrapper in `lib/api/scrolls.ts`
- Local browser session helper in `lib/auth/session.ts`

## What Is Not Finished Yet

- A public post-detail endpoint is still needed for `/scroll/[postId]` to show the exact post instead of an App Store/open-app landing shell.
- Universal links currently point from the iOS app to `scrolls-manna.tech`. To make QR/profile links use `scrolls.adastra.love`, update the iOS associated domain and `AppLinkConfig.webHost` in a later iOS release.
- Auth is stored in `localStorage` for this scaffold. For production hardening, move session handling to secure HTTP-only cookies or a small backend/session layer.
- The web feed is intentionally read-first. Posting, editing, comments, circles, and upload flows can be ported in later passes.

## Local Setup

This machine currently has Node available but not npm, so dependencies were not installed during scaffolding.

When npm is available:

```sh
cd "/Users/primadonvino/Pictures/Desktop/Scrolls app/scrolls-web"
npm install
cp .env.example .env.local
npm run dev
```

Then open:

```txt
http://localhost:3000
```

## Required Environment Variables

Create `.env.local` locally and the same variables in your host:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://xmtmjpjdxfsprubshsbu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Scrolls Supabase anon key>
NEXT_PUBLIC_SCROLLS_APP_STORE_URL=https://apps.apple.com/us/app/scrolls/id6761082441
NEXT_PUBLIC_SCROLLS_DEEP_LINK_SCHEME=scrolls://
NEXT_PUBLIC_SCROLLS_WEB_BASE_URL=https://scrolls.adastra.love
```

Do not put service-role keys in this web app.

## Vercel Deployment Plan

1. Push `scrolls-web` to GitHub as its own repo, or as a monorepo app folder.
2. In Vercel, create a new project from that repo/folder.
3. Framework preset: Next.js.
4. Add the environment variables above.
5. Deploy.
6. Add the custom domain:

```txt
scrolls.adastra.love
```

7. In your DNS provider for `adastra.love`, add:

```txt
Type: CNAME
Name: scrolls
Value: cname.vercel-dns.com
```

Vercel will provision HTTPS automatically after DNS propagates.

## Universal Link Follow-Up

When you are ready for web profile links and QR codes to point to `scrolls.adastra.love`, make a coordinated iOS + web release:

1. Add this associated domain to the iOS entitlement:

```txt
applinks:scrolls.adastra.love
```

2. Update `AppLinkConfig.webHost` in the iOS app:

```swift
static let webHost = "scrolls.adastra.love"
```

3. Host an Apple App Site Association file on the web app at:

```txt
https://scrolls.adastra.love/.well-known/apple-app-site-association
```

Use the real Apple Team ID and bundle ID before enabling this:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": ["TEAMID.Manna.scrolls"],
        "components": [
          { "/": "/user/*", "comment": "Scrolls profile links" },
          { "/": "/scroll/*", "comment": "Scrolls post links" }
        ]
      }
    ]
  }
}
```

Until that release, `scrolls.adastra.love` can still be a normal web destination and App Store landing surface.

## Suggested Next Build Passes

1. Add public post detail fetch support for `/scroll/[postId]`.
2. Add a profile preview fallback for non-authenticated visitors.
3. Add report/block from public post cards where authenticated.
4. Add comments read-only view.
5. Add posting and media upload only after the read surfaces feel solid.
