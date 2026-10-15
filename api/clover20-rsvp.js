import { createRegistrationHandler, createSqlStore } from './_lib/clover20-registration.js';

let store;
export default createRegistrationHandler({
  salt:process.env.CLOVER20_RATE_SALT||process.env.DATABASE_URL||process.env.POSTGRES_URL||'unconfigured',
  async getStore(){
    if(store)return store;
    const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
    if(!url)throw Error('Registration database is not configured');
    const {neon}=await import('@neondatabase/serverless');
    store=createSqlStore(neon(url));return store;
  }
});
