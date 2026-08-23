/* RETIRED LANGUAGE ENTRYPOINT — compatibility shim only.

   TeamBook no longer translates or rewrites page copy at runtime.
   One document owns one human language. Future locales use dedicated HTML
   routes such as /en/... or /ja/....

   Existing pages may still reference this filename while browser caches and
   old markup age out; all product behavior now lives in runtime.js.

   DO NOT add dictionaries, language detection, localStorage language state,
   DOM text replacement, MutationObserver translation, or language toggles here. */

import './runtime.js?v=20260823-publicfinal2';