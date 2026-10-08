import {createHash,createHmac} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const hmac=(key,data)=>createHmac('sha256',key).update(data).digest();
export function signedObject(key,method='GET',type='',at=new Date()){
 const endpoint=new URL(process.env.TORNTOR_S3_ENDPOINT),bucket=process.env.TORNTOR_S3_BUCKET,region=process.env.TORNTOR_S3_REGION||'auto';
 const access=process.env.TORNTOR_S3_ACCESS_KEY,secret=process.env.TORNTOR_S3_SECRET_KEY;
 if(!bucket||!access||!secret||endpoint.protocol!=='https:')throw Error('STORAGE_NOT_CONFIGURED');
 const encode=s=>encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
 const path='/'+[bucket,...key.split('/')].map(encode).join('/'),stamp=at.toISOString().replace(/[:-]|\.\d{3}/g,''),day=stamp.slice(0,8),scope=`${day}/${region}/s3/aws4_request`;
 const headers=type?'content-type;host':'host';const query={'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':`${access}/${scope}`,'X-Amz-Date':stamp,'X-Amz-Expires':'300','X-Amz-SignedHeaders':headers};
 const qs=Object.keys(query).sort().map(k=>`${encode(k)}=${encode(query[k])}`).join('&');
 const canonical=[method,path,qs,(type?`content-type:${type}\n`:'')+`host:${endpoint.host}\n`,headers,'UNSIGNED-PAYLOAD'].join('\n');
 const signing=hmac(hmac(hmac(hmac('AWS4'+secret,day),region),'s3'),'aws4_request');
 const signature=createHmac('sha256',signing).update(`AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${hash(canonical)}`).digest('hex');
 return endpoint.origin+path+'?'+qs+'&X-Amz-Signature='+signature;
}
export async function verifyObject(asset){
 const response=await fetch(signedObject(asset.key),{headers:{Range:'bytes=0-31'},signal:AbortSignal.timeout(15000)});
 if(response.status!==206){await response.body?.cancel();throw Error('FILE_MISSING');}const size=Number(response.headers.get('content-range')?.split('/')[1]);if(size!==Number(asset.size)){await response.body?.cancel();throw Error('FILE_SIZE_MISMATCH');}
 const bytes=Buffer.from(await response.arrayBuffer());
 const valid=asset.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:asset.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):asset.type==='image/webp'?bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP':asset.type==='video/mp4'?bytes.toString('ascii',4,8)==='ftyp':asset.type==='video/webm'?bytes.subarray(0,4).equals(Buffer.from([26,69,223,163])):asset.type==='text/plain';
 if(!valid)throw Error('FILE_TYPE_MISMATCH');
}
