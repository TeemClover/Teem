# AI Sauce purchase path and student video benefit

Updated 2026-09-16, following the owner's instructions.

## Purchase page

- The payer supplies their name. Account display names and email addresses never
  populate that field. Offer refreshes and transient failures preserve typed
  input; a confirmed account change or logout clears it. No new browser storage.
- The sales page has no trial lesson section or outbound classroom trial CTA.
  Supporting links point to the package or offer on the same page. After payment
  verification, the existing entitled `/learn/` route starts with the foundation.
  The separate `/classroom/` service and its access policy are unchanged.
- The bank card's main action jumps to the receipt form. LINE is a fallback below
  the form. The submit label distinguishes sending evidence from account signup.
- Bonus values assigned by the owner are PDF THB500 and work-assistant Markdown
  THB1,190, total THB1,690. The existing in-lesson tools are assigned THB690 under
  the owner's authorization to value the website additions. These are assigned
  values, not claims of previous sales or a new standalone checkout.
- Course prices and package permissions remain THB990 / THB1,690 and restricted
  recovery THB790 without the two bonus files. Deadlines and transfer checks are
  unchanged. The static bank QR remains the owner's supplied image.

## Student video benefit

`student-video-credits.js` is public presentation code without paid lesson bodies,
keys or private files. It appears only for active AI Sauce access in ADV03, the
video-making demonstration in chapter 3 / COOK, and clears on lesson/account
changes. The destination is `/airova/` in a new tab.

Copy explains new-account signup through the myClover referral route, an initial
total of 50 credits, checking the actual balance, and model-dependent usage.
There is no promise of a fixed number of videos, no additional credit for an
existing account, and no automatic third-party signup or generation.

The sales page mentions the benefit without an outbound claim link. Students
reach the instructions from the lesson after their course access is active.

## Reference and review scope

The supplied AI Playbook at `https://class-ai-playbook.pages.dev/` was inspected
as an example of ordered inputs, actions and outputs. Its prompts, skills and
dashboard downloads were not copied into this product.

The supplied Claude checkout review was code-only and based on an earlier main.
Payer input, receipt navigation and purchase-step clarity were addressed here.
Amount-bound QR, extending payment deadlines, automatic transfer-time defaults,
corporate invoicing and new deadline mechanics are separate decisions and are not
implemented by this change.

## Validation

- Checkout, public reviews, bonus entitlement and learner tests: 117 passed.
- Exact public-asset inventory checks: 6 passed.
- Actual component preview checked at desktop and 390px mobile. No horizontal
  overflow; pending access removes the video-benefit card.
- Sales preview has zero classroom links, separate THB500/THB1,190 values, an
  empty payer-name field and an in-page receipt action. No console errors.
- No real payment, receipt submission, third-party account signup or credit use
  is part of this verification.

Production verification must follow deployment; local checks alone are not a
claim that the release is live.
