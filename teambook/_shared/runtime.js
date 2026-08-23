/* TeamBook 1.4 legacy cache bridge ONLY.
   Current HTML/runtime never imports this file. It exists for browsers that
   cached the pre-1.4 language.js, which used to import runtime.js. In that one
   case, force-load the V1.4 single entrypoint under a fresh module URL. */
import './language.js?compat=tb14';
