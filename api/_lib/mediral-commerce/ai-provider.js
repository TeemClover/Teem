import {Fault} from './domain.js';
import {SYSTEM_PROMPT,knowledge} from './ai-knowledge.js';

export const AI_MODEL='gpt-5.4-mini';
export const AI_DAILY_LIMIT=100;
const sku={type:'string',enum:['CL','AC','BR','SU','PO']};
export const AI_SCHEMA={type:'object',additionalProperties:false,required:['reply','topic','focus','action','items','handoff_reason','summary'],properties:{
 reply:{type:'string'},topic:{type:'string',enum:['mediral','ai','absorb','other']},
 focus:{type:'string',enum:[...sku.enum,'none']},action:{type:'string',enum:['reply','propose_cart','handoff']},
 items:{type:'array',maxItems:5,items:{type:'object',additionalProperties:false,required:['sku','quantity'],properties:{sku,quantity:{type:'integer',minimum:1,maximum:5}}}},
 handoff_reason:{type:'string',enum:['none','staff','health','unknown_product']},summary:{type:'string'}
}};

export function validateDecision(d){
 if(!d||Object.keys(d).length!==7||!AI_SCHEMA.properties.topic.enum.includes(d.topic)||!AI_SCHEMA.properties.focus.enum.includes(d.focus)||!AI_SCHEMA.properties.action.enum.includes(d.action)||!AI_SCHEMA.properties.handoff_reason.enum.includes(d.handoff_reason)||typeof d.reply!=='string'||!d.reply.trim()||d.reply.length>1600||typeof d.summary!=='string'||d.summary.length>300||!Array.isArray(d.items)||d.items.length>5)throw new Fault('AI_INVALID_OUTPUT',503);
 if(d.items.some(x=>!x||Object.keys(x).length!==2||!sku.enum.includes(x.sku)||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>5)||new Set(d.items.map(x=>x.sku)).size!==d.items.length)throw new Fault('AI_INVALID_OUTPUT',503);
 if(d.action==='propose_cart'&&(!d.items.length||d.topic!=='mediral')||d.action!=='propose_cart'&&d.items.length)throw new Fault('AI_INVALID_OUTPUT',503);
 return d;
}

// No LINE identifiers, checkout records, files or tools are accepted here.
// The caller constructs a minimal context; never pass raw events or customer state.
export function createAIProvider(env,fetchImpl=fetch){
 const configured=()=>Boolean(env.MEDIRAL_OPENAI_API_KEY||env.OPENAI_API_KEY);
 return {
  status:()=>({configured:configured(),enabled:env.MEDIRAL_AI_ENABLED==='1'&&configured(),model:AI_MODEL,dailyLimit:AI_DAILY_LIMIT}),
  async respond(context){
   if(!configured())throw new Fault('AI_NOT_CONFIGURED',503);
   const input=JSON.stringify(context),facts=JSON.stringify(knowledge());
   if(input.length>12000||facts.length>30000)throw new Fault('AI_INPUT_TOO_LARGE',400);
   let r,data;
   try{
    r=await fetchImpl('https://api.openai.com/v1/responses',{
     method:'POST',redirect:'error',signal:AbortSignal.timeout(14000),
     headers:{Authorization:`Bearer ${env.MEDIRAL_OPENAI_API_KEY||env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
     body:JSON.stringify({model:AI_MODEL,store:false,instructions:SYSTEM_PROMPT+'\n\nAPPROVED_KNOWLEDGE\n'+facts,
      input:[{role:'user',content:input}],reasoning:{effort:'none'},max_output_tokens:1100,
      text:{format:{type:'json_schema',name:'myclover_sales_reply',strict:true,schema:AI_SCHEMA}}})
    });
    if(!r.ok)throw new Fault(r.status===429?'AI_LIMIT':'AI_UNAVAILABLE',503);
    data=await r.json();
   }catch(e){throw e instanceof Fault?e:new Fault('AI_UNAVAILABLE',503);}
   if(data.status!=='completed')throw new Fault('AI_INVALID_OUTPUT',503);
   const text=(data.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
   let decision;try{decision=validateDecision(JSON.parse(text));}catch{throw new Fault('AI_INVALID_OUTPUT',503);}
   const inputTokens=Number(data.usage?.input_tokens)||0,outputTokens=Number(data.usage?.output_tokens)||0;
   return {decision,usage:{inputTokens,outputTokens},model:AI_MODEL};
  }
 };
}
