export function metrics(data){
 const map=new Map();const row=(story,episode)=>{const id=`${story}:${episode}`;if(!map.has(id))map.set(id,{story,episode,views:0,viewers:0,seconds:0,completes:0,unlocks:0,free:0,paid:0});return map.get(id)};
 if(data.rows)for(const r of data.rows)Object.assign(row(r.story,r.episode),r);
 else for(const e of data.events||[]){const r=row(e.story,e.episode);r.views++;r.seconds+=e.seconds;r.completes+=e.complete?1:0;r.viewers=1;}
 for(const s of data.spends||[]){const r=row(s.story,s.episode);r.unlocks+=Number(s.unlocks||1);r.free+=Number(s.free||0);r.paid+=Number(s.paid||0);}
 const rows=[...map.values()];const sum=key=>rows.reduce((n,r)=>n+Number(r[key]||0),0);
 const paidOrders=(data.orders||[]).filter(o=>o.status==='paid');const gross=data.receipts?.gross??paidOrders.reduce((n,o)=>n+o.amount,0)/100,fees=data.receipts?.fees??paidOrders.reduce((n,o)=>n+Number(o.fee||0),0)/100,refunds=data.receipts?.refunds??paidOrders.reduce((n,o)=>n+Number(o.refunded||0),0)/100;
 // Proposed share only; a commercial contract is needed before payout.
 const unit=data.pricing?.bahtPerCoin??(paidOrders.reduce((n,o)=>n+o.coins,0)?Math.max(0,gross-fees-refunds)/paidOrders.reduce((n,o)=>n+o.coins,0):0);
 const revenue=sum('paid')*unit*.70;
 return {rows,views:sum('views'),seconds:sum('seconds'),completes:sum('completes'),unlocks:sum('unlocks'),free:sum('free'),paid:sum('paid'),revenue,gross,fees,refunds,net:gross-fees-refunds};
}
