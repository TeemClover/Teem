// Compatibility shim for cached module graphs. The v8 language override
// programmatically clicked EN and caused feedback-loop flashing. Delegate to
// the stable v10 implementation, which never changes language by itself.
import './kickstarter-three-games-v10.js?v=20260804-three-games-v10';
