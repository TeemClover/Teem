// Compatibility shim: the original v7 runtime rebuilt language-sensitive DOM
// repeatedly and could flash English and Thai during hydration. Keep this URL
// safe for cached module graphs, but delegate to the stable v10 implementation.
import './kickstarter-three-games-v10.js?v=20260804-three-games-v10';
