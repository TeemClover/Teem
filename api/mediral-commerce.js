import {database} from './_lib/core.js';
import {createStore} from './_lib/mediral-commerce/store.js';
import {createProviders} from './_lib/mediral-commerce/providers.js';
import {createHandler} from './_lib/mediral-commerce/handler.js';
import {webHandler} from './_lib/mediral-commerce/web.js';
let store;
const lazyStore=new Proxy({}, {get:(_,key)=>(...args)=>{store??=createStore(database());return store[key](...args);}});
export default {fetch:webHandler(createHandler({store:lazyStore,providers:createProviders(process.env)}))};
