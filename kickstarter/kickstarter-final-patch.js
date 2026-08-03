import './kickstarter-final-patch-base.js?v=20260803-final-qa-base';

// Re-run the idempotent QA layer after the older campaign scripts finish
// their delayed hydration passes. Different query strings intentionally
// create fresh module instances without touching the preserved base file.
setTimeout(()=>import('./kickstarter-final-patch-base.js?v=20260803-final-qa-mid'),1100);
setTimeout(()=>import('./kickstarter-final-patch-base.js?v=20260803-final-qa-late'),2750);
