# Full Vercel deployment

Goal: Deploy the existing app, including account sessions, email verification and admin moderation, to bgm38388-web/debtfreelately.

Architecture: Serve dist through Vercel static hosting and send /api requests to a Node function. Use the provisioned Turso Starter database in hnd1. Preserve existing API and privacy behavior; make database operations asynchronous. Store OTP challenges, login throttles and request limits in the shared database so cold starts and concurrent instances do not lose them. Keep credentials out of Git and static files.

Alternatives: Neon/Postgres requires changing the SQL dialect; a separate persistent Node host adds a second deployment. Turso preserves SQLite and keeps API and frontend on Vercel.

Constraints: Existing browser-local chat/drafts/pledges remain prototypes; this deployment makes existing server-backed account and moderation capabilities live. No payment processing is added. Existing local databases stay untouched; provision a fresh cloud database and provide an explicit migration command for local account/card data if needed. Only verified emails in ADMIN_EMAILS retain owner access.

Tasks (execute inline as requested by the user's repeated instructions to continue):

- [ ] Add a failing shared-instance test: OTP requested on instance A verifies on B; replay fails; sessions and lockouts are shared.
- [ ] Add asynchronous database adapter supporting local SQLite tests and remote libSQL, atomic transactions and migrations.
- [ ] Convert auth and moderation to async; persist challenges and rate windows; adapt existing behavioral tests and add concurrent replay coverage.
- [ ] Add Vercel API handler and routing, secure cookies, explicit origin checking and shared request limits. Verify endpoint behavior through HTTP tests.
- [ ] Configure server-only email/admin env vars without printing values, run migrations, build and stage production deployment.
- [ ] Verify static pages, account signup/login/logout, unauthorized admin access, durable sessions and private card projections; review diff, commit, push and promote the tested deployment.

Review focus: concurrent OTP consumption; account blocking across instances; request origin and secure cookies; no deployment of local secrets/databases; remote transaction rollback.

Progress: Baseline npm test passed 29/29; adapted suite now passes 36/36. Vercel project and Turso database are linked. CLI and MCP OAuth completed; MCP tools not yet exposed to this running chat. Real Turso smoke passed cross-instance OTP, replay protection, sessions, concurrent card submission, privacy and blocking. Production deployment staged and building/verification in progress.

Ruling: Import existing local accounts using a tested, conflict-safe migration so existing users can sign in after deployment. Source databases remain untouched; old sessions are intentionally excluded. Imported 1 email account, 5 nickname accounts and 1 profile setting, no cards or safety records. The migration was tested for repeatability and password compatibility before use.

Review: Independent review found no critical/important issues; expiry race was regraded and fixed with a failing-then-passing test that advances time during verification. Deferred minor: session lookup performs cleanup writes; optimize periodic cleanup later. Production smoke passed 7 static routes, email config, secure-cookie nickname signup/login/logout, durable sessions, origin rejection, admin authorization and email-verification requirement. Live email delivery is not sent by automated checks.
