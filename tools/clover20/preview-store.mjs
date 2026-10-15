import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';

// Local preview records live outside the checkout, never in published assets.
export function createFileStore(file) {
  let queue=Promise.resolve();
  return {save(record){
    const job=queue.then(async()=>{
      let records=[];
      try{records=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
      const existing=records.find(r=>r.requestId===record.requestId);
      if(existing)return existing.payloadHash===record.payloadHash?{reference:existing.reference,existing:true}:{conflict:true};
      if(records.filter(r=>r.ipHash===record.ipHash&&Date.now()-Date.parse(r.createdAt)<3600000).length>=60)return {limited:true};
      records.push({...record,createdAt:new Date().toISOString()});
      await mkdir(dirname(file),{recursive:true});
      await writeFile(file+'.pending',JSON.stringify(records),{mode:0o600});await rename(file+'.pending',file);
      return {reference:record.reference};
    });
    queue=job.catch(()=>{});return job;
  }};
}
