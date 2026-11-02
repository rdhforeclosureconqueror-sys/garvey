# Garvey Learning — Stripe monthly membership

Price: **$9.99 USD/month**, recurring. This link is LIVE and charges real money.

Stripe checkout: https://buy.stripe.com/cNiaEQ6Lv66E6sSd7i8bS01

## Implementation checklist

- Add a clearly labeled **Join for $9.99/month** link on the existing membership/parent dashboard; preserve free assessments and existing sign-in.
- Do not grant membership on link click or redirect. Verify Stripe's signed webhook on the backend and use Stripe subscription ID, customer ID, product/price ID and authenticated user mapping.
- Handle checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated and customer.subscription.deleted idempotently. Check active/trialing status and current entitlement at protected routes.
- Link Stripe customers to authenticated parent accounts using a server-generated checkout session or a verified enrollment token. A generic static payment link alone cannot securely bind the buyer to a specific signed-in parent.
- Provide a customer billing portal for cancellation/payment method changes; preserve access through paid period when canceled at period end.
- Test with Stripe TEST MODE products and prices (separate from these live links): successful payment, failed payment, duplicate webhook, cancellation, and renewal. Never use live card details for testing.
- Keep webhook secret and Stripe secret API key in Render environment variables, never in repository code.
- Verify tax treatment, cancellation disclosures and parental account ownership before public launch.

**Current status:** Stripe live link and $9.99 monthly product exist. Website wiring, secure entitlement provisioning, test-mode flow, and end-to-end verification are NOT complete. Do not mark production ready based solely on this document.
