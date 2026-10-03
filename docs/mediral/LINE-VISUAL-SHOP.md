# LINE visual shop · 2026-10-03

The shared myClover OA serves the product browser as a single Flex carousel: full routine, five product cards, and purchasing/trust information. Exact navigation commands bypass GPT; open questions still use the existing conversation service. A changed product focus adds its card once, while payment, handoff and personal-data collection remain protected.

Prices come from catalog.js at response time (LINE promotion ends 2026-10-15 Bangkok); web coupons retain their own displayed expiry. Images are format-only PNG exports of the five approved web packs, plus the existing routine OG image. These are illustrative product assets, not new product evidence or clinical proof. No customer conversations were added.

Web links carry campaign attribution and a bounded pick parameter. Browsing does not create orders; selections never override an active order. Customers still review details and explicitly submit checkout.

Admin buttons preview the current payload and validate it against LINE without delivering messages. Native LINE auto-responses must be disabled after production validation to avoid double replies. Keep the native greeting and webhook enabled; menu A can request the carousel and menu B opens checkout directly.

Validation: automated commerce and Mediral suites; local visual preview; production LINE schema validation and assets are checked during release. No broadcast or unsolicited customer follow-up is part of this change.
