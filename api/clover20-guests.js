import {createGuestsHandler,createGuestSqlStore} from './_lib/clover20-guests.js';

let store;
// Intentionally readable without login, as requested for the reunion dashboard.
export default createGuestsHandler({async getStore(){
  if(store)return store;
  const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
  if(!url)throw Error('Registration database is not configured');
  const {neon}=await import('@neondatabase/serverless');
  store=createGuestSqlStore(neon(url));
  return store;
}});
