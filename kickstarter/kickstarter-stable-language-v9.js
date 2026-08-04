// Compatibility shim for cached module graphs. The v9 observer still fought
// older hydration passes. Delegate to the stable v10 implementation, which
// keeps language state inside the existing Kickstarter language engine.
import './kickstarter-three-games-v10.js?v=20260804-three-games-v10';
