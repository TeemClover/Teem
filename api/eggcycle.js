import {database} from './_lib/core.js';
import {ensureSchema,sqlStore} from './_lib/eggcycle/store.js';
import {createHandler} from './_lib/eggcycle/handler.js';
export default async function handler(req,res){
  try{const sql=database();await ensureSchema(sql);return await createHandler({store:sqlStore(sql)})(req,res);}
  catch{res.setHeader('Cache-Control','private, no-store');res.setHeader('CDN-Cache-Control','no-store');res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'ฐานข้อมูลยังไม่พร้อม กรุณาลองใหม่'}));}
}
