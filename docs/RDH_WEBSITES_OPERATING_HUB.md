# RDH Websites — operating hub (proposal)

This directory documents the website-services workflow built on the existing Garvey website generator. Do not move youth-learning code or tenant records into the marketing/demo area.

## Current capabilities
- Public service entry: `/websites.html`
- Template gallery: `/templates.html`
- Owner editor: `/site_intake.html`
- Owner-only preview/publish: `/api/site/preview`, `/api/site/generate`
- Customer output: `/t/:slug/site`
- Current scope: one-page sites with saved tenant config, **not** appointment booking or multi-page hosting.

## First client demonstration
- `/demos/nicc-fades.html`: self-contained mobile-first concept; no customer accounts or data writes.
- Contact actions use the publicly supplied flyer phone number.
- Instagram account is provisional; confirm which flyer handle is correct.
- Booking, live queue, payments, SMS reminders, and review requests are clearly marked as future capabilities.

## Recommended operating flow
1. Inquiry: Google Form -> response Sheet -> owner email notification.
2. Internal review: requirements, scope, price and acceptance criteria.
3. Preview: demo link; approval must be explicit.
4. Contract and setup payment before provisioning.
5. Publish: choose client-owned hosting or managed hosting.
6. Support: backup, uptime, renewals, usage limits, and offboarding/export.

## Proposed pricing (validate costs before selling)
- Starter: $199–349 setup, $19–29/month managed.
- Booking: $349–599 setup, $39–59/month managed.
- Automation: $599–999 setup, $79–129/month managed.
- Domain registration, paid messaging, payment processing and external subscriptions must be disclosed separately.

## Architecture safeguards
- Separate client data and credentials by tenant; enforce ownership server-side.
- Never store customer bookings in static HTML or Git.
- Do not promise booking, payment, SMS, or queue features before backend validation.
- Managed-hosting terms should clarify ownership, cancellation, backups, domain renewals, and migration/export.
- Keep website-services navigation distinct from the Garvey education experience.

## Next engineering checkpoints
1. Verify current live routes and full owner preview/publish journey on production.
2. Add an owner-only client-project dashboard; don't expose prospect intake publicly.
3. Extract reusable service modules for appointments, queue, payments, notifications.
4. Add automated acceptance checks and first-failure diagnostics.
