import {authRateLimited,database} from './_lib/core.js';
import {currentBackofficeSession} from './_lib/backoffice-auth.js';
import {createStore} from './_lib/candidate/store.js';
import {createHandler} from './_lib/candidate/handler.js';
import {analyzeResume} from './_lib/candidate/ai.js';
let store;
export default createHandler({getStore:()=>store||(store=createStore(database())),authenticate:async req=>Boolean(await currentBackofficeSession(database(),req)),analyze:analyzeResume,rateLimitLogin:req=>authRateLimited(database(),req,'candidate-login','team',8,15)});
