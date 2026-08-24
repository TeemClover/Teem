/* Retired compatibility entrypoint.
   Old cached bootstraps may still import this historical URL. Route all of
   them into the canonical 1.5 Home Public renderer so no fixed N/5 renderer
   can come back after the correct capacity has painted. */

import './home-public-v15.js?v=20260824-capacity-canon1';
