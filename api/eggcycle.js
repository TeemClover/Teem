import {database} from './_lib/core.js';
import {lazyStore} from './_lib/eggcycle/store.js';
import {createHandler} from './_lib/eggcycle/handler.js';
export default createHandler({store:lazyStore(database)});
