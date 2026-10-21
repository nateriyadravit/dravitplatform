# DRAVIT Platform

DRAVIT is a React + TypeScript website and a Node/Express API. The app includes a responsive editorial studio site, a SQLite-backed category explorer and live demo catalog, customer registration/sign-in, persistent project orders, private customer uploads, admin order/customer management, first-party visit/demo analytics, and stored contact enquiries.

## Requirements

- Node.js 20.19+ or 22.12+ (the current workspace uses Node 24)
- npm
- VS Code

## Run On Windows

Open `C:\Users\nater\dravit-platform` in VS Code, then open its integrated terminal.

```powershell
Set-Location C:\Users\nater\dravit-platform
npm.cmd install
Copy-Item .env.example .env
```

Edit `.env` locally. Set `ADMIN_EMAIL`, `ADMIN_PHONE`, and `ADMIN_PASSWORD` before the first server start to create the initial administrator. Admins can sign in with either the configured email address or phone number. Use a unique password with at least 12 characters; do not put credentials in source files, screenshots, or Git. The application never has a default admin password. Admin bootstrap only creates a user if that email does not already exist. Changing `ADMIN_PASSWORD` later does not update an existing account; reset the account password in SQLite or use the admin password update flow if one is configured.

SMTP settings are optional for local development. When configured, new enquiries and project orders send a notification to `BUSINESS_EMAIL` (default: `nateriyadravit@gmail.com`). Without SMTP, submissions are still stored in SQLite, but no email is delivered.

Start both development servers:

```powershell
npm.cmd run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the Express API on port 4000. `npm.cmd run dev:api` starts only the API. The dev server creates the local database and private upload directories automatically.

## Verify

```powershell
npm.cmd run test:api
npm.cmd run lint
npm.cmd run build
```

The API tests use temporary database and upload directories. The build type-checks the React app and server, then creates the production assets.

## Live Demo Catalog

The demo category list and project records are stored in SQLite (`demo_categories`, `demos`) and exposed through `/api/demo-categories` and `/api/demos`. Initial catalog records are the supplied OneBite and Glam Up Salon demos. The remaining categories intentionally have no demo record and display a coming-soon state. Administrator-authenticated `POST /api/admin/demos` adds a project; include a category slug already present in the catalog and use HTTPS for public URLs/images.

The home hero and project previews use image assets served by the two supplied live demos. Demo links open the source websites in a separate tab. Each detail page labels these as demonstration sites, not paid client case studies.

The public experience uses GSAP/ScrollTrigger for masked entrance reveals, viewport section reveals, active process steps, and a desktop-only pinned horizontal project rail. The rail reverts to normal vertical layout on mobile; animations are skipped when `prefers-reduced-motion` is enabled.

## Data And Security

- SQLite database: `data/dravit.sqlite` (override with `DRAVIT_DATABASE_FILE`)
- Private uploads: `storage/private` (override with `DRAVIT_UPLOAD_DIRECTORY`)
- `.env`, local databases, private files, and build output are ignored by Git.
- Passwords are bcrypt-hashed. Sessions use random opaque tokens in HttpOnly, SameSite=Lax cookies; only token hashes are stored in SQLite. Production cookies also require HTTPS.
- Admin routes check the authenticated role on the server. Customers can access only their own orders and files.
- Uploads are limited to 10 MB each, checked by file signature/type, stored outside `public`, and served only after owner/admin authorization as attachments.
- API inputs are validated, auth/API endpoints are rate limited, and unsafe cross-origin requests are rejected.
- Analytics use a session-scoped random visitor ID and record page/demo paths only; no email, name, or form content is included.

## Deploy

This is a Node.js application with a server-side API and SQLite database. InfinityFree shared hosting cannot run this Node.js server; deploy this ZIP to a Node.js host with HTTPS and persistent disk instead. This implementation uses a local SQLite file and local private-file directory; **do not deploy it to an ephemeral/serverless filesystem**. Attach persistent storage for both `data/` and `storage/private/`, and back them up together.

1. Set the production environment variables in the hosting provider’s secret manager. At minimum configure `NODE_ENV=production`, `PORT`, `ADMIN_EMAIL`, `ADMIN_PHONE`, and a strong `ADMIN_PASSWORD`. Admins can sign in with either the configured email or mobile number. Configure all SMTP variables to enable email delivery.
2. Build with `npm ci` and `npm run build`.
3. Start with `npm start`. Express serves `dist/` and the API from the same origin.
4. Terminate TLS at the host/reverse proxy, keep the service’s persistent volume mounted, and verify `/api/health`, registration, admin access, upload authorization, and email delivery before announcing the site.
5. Set `BUSINESS_EMAIL=nateriyadravit@gmail.com` if using a non-default recipient. Configure SMTP sender/domain authentication with your email provider.

For larger traffic or multiple server instances, migrate SQLite and local uploads to managed PostgreSQL and private object storage before scaling out. Never expose SMTP credentials, admin passwords, database files, or customer uploads as public static assets.
