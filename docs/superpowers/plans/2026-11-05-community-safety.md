# Community safety implementation

Scope: Admin Fraud Monitoring, member search, in-app notifications, reversible blocks, and Community Safety footer content.

Rules: Duplicate phone, matching name/age, matching normalized story across accounts, and >=5 submissions within 24 hours. Signals require human review; document inspection is unavailable until upload support exists. No automatic fraud judgments or account blocking. Protect admin accounts against blocking; owner can revoke admin permission first. Blocked sessions are revoked; login and publication are denied while blocked. Unblocking requires a fresh session.

Implementation: auth SQLite tables for blocks, notices and audit; pure fraud signal module; admin-only safety API; responsive Fraud Monitoring module; recipient-only notifications in app; footer page with accurate implemented/planned distinction.

Validation: Node tests for authorization, CSRF, session invalidation, login denial, public-card exclusion, owner/admin protection, scoped notices and rule false positives; browser UI checks against isolated fixtures; no actions on real member accounts.

Implemented and reviewed. Independent review identified blocked-only filtering after the 100-user cap; fixed server-side filtering and regression tested >100 accounts. Additional checks prevent private block-reason disclosure before email ownership, and protect owner/admin sessions against unblock requests on active protected accounts. Browser QA exercised search, notify, block, blocked filter, unblock against isolated in-memory fixtures only. Community Safety and About Us footer pages added with distinction between current and planned verification/payments.
