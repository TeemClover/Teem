# TeamBook language route contract

## Canon

**One HTML document contains one human language.**

TeamBook does not translate an already-rendered document. There is no runtime
DOM translator, language dictionary that swaps visible strings, hidden bilingual
copy, `?lang=`, browser-language auto-rewrite, or localStorage language mode.

The current canonical product routes are Thai and use `<html lang="th">`.

When another language is released, it gets its own document tree:

| Language | Route example |
|---|---|
| Thai | `/read/`, `/new/`, `/join/`, `/p/` |
| English | `/en/read/`, `/en/new/`, `/en/join/`, `/en/p/` |
| Japanese | `/ja/read/`, `/ja/new/`, `/ja/join/`, `/ja/p/` |

Do not create `/read/?lang=en`, `#lang=en`, a Thai/English toggle that rewrites
text nodes, or one HTML file containing both Thai and English versions hidden by
CSS/JS.

## Why

Dedicated documents make language a routing concern instead of mutable UI state.
This prevents partial translations, stale MutationObserver rewrites, mixed SEO
metadata, layout changes after paint, screen-reader duplication, and cached
language state leaking between pages.

## HTML ownership

Every localized document owns all visible static copy for that language:

- `<html lang>`
- `<title>` and meta description
- Open Graph / Twitter copy
- JSON-LD copy
- headings, labels, buttons, hints and empty states
- image alt text and accessible labels

Only add `hreflang` links when the counterpart route actually exists and has been
reviewed. Never point an `hreflang` tag to an untranslated fallback.

## Dynamic UI

Shared data and API contracts remain language-neutral: IDs, event types, states,
counts, timestamps and semantic error codes.

A runtime module may implement behavior, but it must not decide which language a
page uses. If dynamic UI needs localized prose, that prose belongs to the locale
implementation loaded by that dedicated route. It must never mix dictionaries for
multiple human languages into one rendered page.

The Thai product currently uses `/_shared/runtime.js`. Future `/en/...` or
`/ja/...` routes may share language-neutral logic, but their visible copy must be
owned by their locale documents/modules.

## Retired system

`/_shared/language.js` is a temporary compatibility shim for older HTML/cache
references. It imports `runtime.js` only. Do not add language behavior back to
it.

The old `teambook_language_mode` preference and in-page language chooser are
retired. `runtime.js` removes stale UI/state if an old cached document still
contains them.

## Change checklist

Before merging a new locale:

1. Create the complete dedicated route tree for that locale.
2. Set the correct `<html lang>` and localized metadata in every document.
3. Keep navigation inside the same locale unless the user explicitly chooses a
   different locale document.
4. Verify mobile/desktop layout with the real localized copy; do not assume Thai
   line lengths.
5. Add reciprocal `hreflang` only after both documents exist.
6. Never solve missing translation by injecting another language into the same
   document at runtime.
