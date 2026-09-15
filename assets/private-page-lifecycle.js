// Only injected into authenticated HTML. Hide saved history snapshots and
// revalidate the session on a back/forward restore before revealing content.
(() => {
  addEventListener('pagehide', () => { document.documentElement.style.visibility = 'hidden'; });
  addEventListener('pageshow', event => {
    if (event.persisted) location.reload();
    else document.documentElement.style.removeProperty('visibility');
  });
})();
