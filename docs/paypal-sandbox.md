# PayPal Sandbox for DebtFreeLately

DebtFreeLately uses Next.js Pages Router on Vercel and shares its Node.js request handler with the local legacy server. Vercel uses Turso/libSQL. Local development uses SQLite. The app's HTTP-only session cookie identifies Bros, Broke and verified administrators. Sandbox records use dedicated tables and never change debt balances.

## Configure a test environment

1. Sign in to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/). Under **Testing Tools → Sandbox Accounts**, create or select a Business account to receive test payments and a separate Personal account to pay. Use the Sandbox buyer credentials in Checkout.
2. Under **Apps & Credentials → Sandbox**, create a REST app linked to the Sandbox Business account. Copy its Client ID and Client Secret into server environment configuration. For local Next.js, use the ignored `.env.local` file. For Vercel, use an isolated test deployment and its environment variables. Set `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID`, and `PAYPAL_CLIENT_SECRET`. Do not prefix these names with `NEXT_PUBLIC_`. Keep the secret in environment configuration.
3. In that same Sandbox REST app, add a webhook at `https://<your-test-host>/api/contributions/webhook`. PayPal must be able to reach this URL without an interactive deployment login. For local tests, use a public HTTPS tunnel to the local server and register the tunnel URL. Subscribe to:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.PENDING`
   - `PAYMENT.CAPTURE.DENIED` and `PAYMENT.CAPTURE.DECLINED` where listed
   - `PAYMENT.CAPTURE.REFUNDED`
   - `PAYMENT.CAPTURE.REVERSED`
   - `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.UPDATED`, `CUSTOMER.DISPUTE.RESOLVED`
4. Set `PAYPAL_WEBHOOK_ID` to the ID returned for that webhook. Restart the local server or redeploy the test environment. Checkout remains disabled unless all four values are set and the environment is `sandbox`. Use the usual app configuration for email, admin access and the host. Set `APP_ORIGIN` to the URL used by your browser if it differs from the configured deployment host. A Vercel test deployment needs its own Turso configuration.
5. Run `npm run dev` locally. Using test DebtFreeLately accounts, submit a debt card as Broke and approve it as admin. At `/admin`, open **Sandbox payouts** and record creditor verification for the specific debt using a test evidence reference.
6. Sign in to DebtFreeLately as a separate Bros account. Open the approved card in Discover or Saved, choose **Send money in the app**, select the verified debt, currency and preset amount, and pay using the PayPal Sandbox Personal account. Confirm the status under **Sandbox contribution history** in Pledges. The Broke account can open the same history from **Submitted cards**. A pending payment may change after webhook delivery. If approval succeeded but capture could not be confirmed, retry the same order from Bros history.
7. Review the contribution under **Sandbox payouts** as admin. Record manual approval, a simulated failure, or a simulated receipt with an evidence reference. The audit records who did what and when. To test refunds, issue a test refund from the Sandbox merchant account and check the contribution history. Use real Sandbox transactions for webhook verification because the PayPal Webhook Simulator does not support postback signature verification.

Amounts are server presets in AUD, USD, EUR, GBP, CAD, NZD, SGD and JPY. The browser proposes a currency from its language settings and lets Bros change it. PayPal eligibility is checked for the selected currency. Refunds, reversals and disputes hold the placeholder payout for review. Sandbox receipt recording is a test workflow and does not mark debt as repaid.

Run `node --test paypal.test.mjs` for automated integration tests, or `npm test` for the full suite. This integration only uses PayPal Sandbox hosts. Live payment acceptance and creditor disbursement require PayPal approval and legal/compliance review. There is no payout provider call in this implementation.

