import {call} from './client.js';
let current=null,timer;const session=crypto.randomUUID();
export function startView(story,episode){flush();current={story:story.id,episode,format:story.format,seconds:0,complete:false,session:session+'-'+crypto.randomUUID().slice(0,8),last:performance.now()};clearInterval(timer);timer=setInterval(tick,1000);}
function tick(){if(!current)return;const now=performance.now(),dt=Math.min(2,(now-current.last)/1000);current.last=now;const dialog=document.querySelector('#story-dialog'),video=document.querySelector('#story-video'),reader=document.querySelector('#comic-reader');if(document.hidden||!dialog?.open)return;if(current.format==='drama'&&!video.paused&&!video.ended)current.seconds+=dt;else if(current.format!=='drama'&&reader?.clientHeight){current.seconds+=dt;const max=reader.scrollHeight-reader.clientHeight;if(max>0&&reader.scrollTop>=max-10)current.complete=true;}if(video?.ended&&current.format==='drama')current.complete=true;if(Math.floor(current.seconds)%5===0)flush();}
export function flush(){if(current&&current.seconds>=3)call('view',{...current,seconds:Math.floor(current.seconds)}).catch(()=>{});}
export function finishView(){if(current){current.complete=true;flush();}}
export function stopView(){flush();current=null;clearInterval(timer);}
window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',flush);
