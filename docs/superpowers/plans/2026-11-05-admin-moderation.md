# Admin moderation implementation plan

Goal: Store submitted debt cards on the server and expose them publicly only after approval by the verified admin bgm38388@gmail.com.

Architecture: SQLite submission snapshots with pending/approved/rejected status, authenticated owner and admin APIs, standalone admin dashboard using existing email OTP sessions. Server derives identity and admin permission. Existing sample cards remain marked as samples.

Additional requirement: Each debt has a positive integer VND amount under Title, included in preview, submission and review.

1. Write failing Node tests for persistence, pending exclusion, privacy projection, admin denial, approval/rejection, ownership, malformed payload and amount validation.
2. Implement moderation.mjs and API routing with server-side authorization and same-origin mutation checks. Configure ADMIN_EMAILS locally without exposing secrets.
3. Wire wizard submission and amount fields to APIs; show submission status to owner. Wire discovery to server-approved cards without trusting browser storage for publication.
4. Build responsive admin dashboard, OTP login, queue filters, private review and decisions with reason. Add owner status page and links.
5. Run full test suite, API integration checks and syntax checks. Review authorization and privacy paths; restart local app and inspect UI.

Review focus: client-supplied identity/status must be ignored; ordinary or unverified users denied admin access; hidden stories/identity never in public responses; failed submit must preserve draft; repeated decisions cannot overwrite a concurrent review.

Execution: inline in existing user workspace to preserve current uncommitted prototype. No commits, deployment or email sending to third parties.

Completed: storage/API, wizard amounts and submit, public approved feed, admin and owner screens. Verification: 21 Node tests pass, syntax checks pass, browser-tested amount preview and approval in isolated in-memory QA, mobile DOM width check (no overflow), live admin URL returns 200, unauthenticated private admin endpoint returns 401. Independent review found two issues; fixed idempotent changed payload with 409 and immutable submitted wizard, and expanded UTF-8 body bound to 500KB with API regression coverage. Local server restarted.
