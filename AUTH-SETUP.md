# Email verification integration

Selecting Broke now requires a server-verified email session. New accounts submit real name, gender, integer age (1–120), phone and email. No password: subsequent login uses an emailed code. Account creation occurs only after verification. There is no development bypass or displayed OTP.

## Enable email locally

1. Create a Resend account, verify a domain and create a sending API key. Follow https://resend.com/docs/api-reference/emails/send-email.
2. Copy `.env.example` to `.env` locally. Populate `RESEND_API_KEY` and `AUTH_FROM_EMAIL` using a verified sender, e.g. `DebtFreeLately <hello@your-verified-domain>`. Never put credentials in `dist/`, Git or chat.
3. Stop the running local server. Run `node --env-file=.env server.mjs` from this directory. Alternatively provide these variables through your server environment and use `npm start`.
4. Open http://127.0.0.1:4173 and select Broke. Complete registration, check the mailbox, enter the code, then test logout and email login.

Until configured, `/api/auth/config` reports `emailConfigured: false`; the form explains the missing setup and disables submission. No email is sent and no account is created. Network permissions may be required for the server's outbound connection to `api.resend.com`.

## Storage and limits

- Accounts and hashed session tokens: server-only SQLite at `.runtime/accounts.sqlite`, excluded from Git and static serving. Personal account details are stored locally in this file; protect filesystem access and backups. This is a local integration, not a production hosting setup.
- OTP digest, salt and pending registration details: memory only, expire after 10 minutes. Restarting the server invalidates pending codes.
- Five verification guesses per challenge, 60-second send cooldown, five email requests per address/hour and 40 auth POSTs per IP/hour. Single-process limits reset on restart.
- Session lasts 24 hours; HttpOnly, SameSite=Strict; Secure when `APP_ORIGIN` is HTTPS. Origin validation for POST routes. Only a name, email and account ID are returned by `/api/auth/me`.
- Core account tests use an isolated in-memory database and injected test mail delivery. No messages are sent by the test suite.

## Remaining deployment work

The existing Sites manifest is still a static preview: it cannot run these Node/SQLite API routes. A production release needs compatible server hosting and protected persistent storage, HTTPS, configured transactional email and shared rate limiting. Keep this local build until that is set up. Existing story, dashboard and chat data remains a browser-local prototype and is not a server-backed, account-isolated data store.

Live email delivery has not been tested until sender credentials are configured. Email ownership verification does not verify real name, age, phone ownership or debt authenticity.

## Bros accounts

Bros can register immediately with a unique nickname and password through `/api/auth/nickname-signup`, then sign in again through `/api/auth/nickname-login`. Nicknames are NFKC-normalized, 3–30 characters, case-insensitive and protected by a SQLite UNIQUE constraint. Passwords must be 8–128 characters; only salted scrypt hashes are stored. Five failed logins per nickname lock further attempts for 15 minutes. Nickname accounts have no email verification or email recovery. Full-information Bros accounts use the existing email verification flow and keep the Bros role. Both use server-issued HttpOnly session cookies. Prototype stories and chat data are still browser-local, not isolated by account.

## Temporary Broke design shortcut

`dist/dev-preview.mjs` exports `BROKE_DESIGN_PREVIEW_ENABLED = true`. The Broke registration page temporarily offers **Bỏ qua đăng ký · Chế độ xây dựng**. It opens the dashboard using a clearly named preview identity; no account, cookie or email verification is created. The choice lasts only in JS memory until reload or logout. Set this constant to `false` to remove the button and preview entry after email setup. The server auth requirements are unchanged.


## Admin moderation
Set ADMIN_EMAILS in the server .env to a comma-separated list of verified email accounts. Restart the server after changing the list. Visit /admin and use the existing email OTP account to sign in. If the email has no account yet, register in the app first. The private admin API checks the server session and allowlist on every request; nickname accounts do not qualify.

Submitted cards are stored in .runtime/cards.sqlite with pending status. Only approved privacy projections are returned by GET /api/cards. Owners can see statuses and rejection reasons at /my-cards. Existing browser-only drafts are not automatically published or migrated. Admin approval is a content review, not verification of debt or payment. Keep both SQLite databases on persistent private storage with backups before deployment.

### Admin members
Accounts listed in ADMIN_EMAILS are owners. Owners can open Quản lý admin on /admin to add or revoke other email addresses. Delegated admins can review cards but cannot manage memberships. Membership grants persist in the private cards.sqlite database; revocation is checked on each request, including existing sessions. The configured owners cannot be removed via the UI. Added email addresses must register and verify ownership before access; adding an address does not send an invitation.

## Fraud Monitoring and account safety
Admin dashboard > Fraud Monitoring provides rule-based review signals (shared phone, matching name/age, normalized stories shared by different accounts, five or more submissions in 24 hours). These signals never automatically block accounts or certify fraud. No document analysis exists because document upload is not implemented.

Admins can search members by name/nickname/email, send in-app notifications, and block/unblock with a required reason. Records and action history persist in accounts.sqlite. Blocking revokes all sessions, prevents email/nickname login, and excludes approved cards from the public feed. Unblocking restores eligibility but requires a fresh session. Admin accounts and the acting admin are protected from blocks; owner must revoke delegated membership before blocking that account. Notification content is visible only to its recipient and authorized admins through action history; no email/SMS is sent. Members open notifications from their personal page or Discover navigation.
