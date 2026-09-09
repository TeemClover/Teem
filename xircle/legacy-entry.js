import {latestEntry} from './route-contract.js';

// A bookmark is an alias, never another copy of the experience or a progress gate.
const href=latestEntry(location.pathname,location.search);
const fallback=document.querySelector('#latest-xircle');
if(fallback)fallback.href=href;
location.replace(href);
