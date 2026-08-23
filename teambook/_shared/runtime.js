import './activity-ux.js';
import './header-brand-th.js';
/* V1.3 product behaviour stays the core source for onboarding, Public Seen,
   create defaults, and Home lane placement. Public visual/status/access polish
   is consolidated into ONE final owner below; retired compatibility layers are
   intentionally no longer imported. */
import './v13-public-first.js?v=20260823-v13a';
import './trust-seen.js?v=20260823-trustseen1';
import './home-create-capacity.js?v=20260823-capacity3';
import './owner-label-v13.js?v=20260823-owner2';
import './public-member-identity-v13.js?v=20260823-bookidentity3';
import './reward-history-v13.js?v=20260823-rewardhistory1';
import './public-ui-v13-final.js?v=20260823-final1';

/* TeamBook shared runtime bootstrap.
   IMPORTANT: this module is language-architecture neutral.

   Product rule:
   - one HTML document = one human language
   - never translate or rewrite page copy in the DOM
   - never select language from localStorage / query params
   - future locales use dedicated documents/routes (for example /en/...)

   User-facing copy that belongs to a locale must live in that locale's HTML or
   locale-specific runtime module. This file only wires product behavior. */

function clearRetiredLanguageState() {
  /* Remove the retired in-page language chooser if an older HTML document is
     still in a browser cache. It no longer controls any TeamBook behavior. */
  document.getElementById('xtyLanguageCard')?.remove();
  document.getElementById('xtyLanguageChoice')?.remove();

  try {
    localStorage.removeItem('teambook_language_mode');
  } catch {}
}

function boot() {
  clearRetiredLanguageState();

  /* TeamBook V1.2 gameplay is route-aware and leaves page copy untouched. */
  import('./v12-gameplay.js?v=20260822-v12d')
    .catch(error => console.warn('TeamBook V1.2 gameplay layer unavailable', error));

  if (/^\/$/.test(location.pathname)) {
    import('./v12-home-active-only.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook active Home filter unavailable', error));
  }

  if (/^\/new(?:\/|$)/.test(location.pathname)) {
    import('./v12-new-reuse.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook reusable card picker unavailable', error));
  }

  if (/^\/collection(?:\/|$)/.test(location.pathname)) {
    import('./v12-collection-reuse.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook reusable Collection actions unavailable', error));
  }

  if (/^\/p(?:\/|$)/.test(location.pathname)) {
    import('./party-teambook-cards.js?v=20260823-owner1')
      .catch(error => console.warn('TeamBook party card layer unavailable', error));
    import('./party-today-details.js?v=20260822-clean1')
      .catch(error => console.warn('TeamBook today details layer unavailable', error));
    import('./party-visibility-status.js?v=20260822-public1')
      .catch(error => console.warn('TeamBook visibility status unavailable', error));
    import('./v12-party-query.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook companion intent unavailable', error));
    import('./v12-ending-image-auth.js?v=20260822-v12d')
      .catch(error => console.warn('TeamBook Ending image auth unavailable', error));
    import('./level-up-growth.js?v=20260822-growth1')
      .catch(error => console.warn('TeamBook growth celebration unavailable', error));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
