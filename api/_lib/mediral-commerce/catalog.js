// Owner-approved review campaign. Amounts are integer satang; shipping is unconfirmed.
export const COUPON_START=Date.parse('2026-10-01T00:00:00+07:00');
export const COUPON_END=Date.parse('2026-10-16T00:00:00+07:00');
export function retailAt(now=Date.now()){
 const active=now>=COUPON_START&&now<COUPON_END;
 return {unit:active?40000:50000,set:active?200000:250000,regular:50000,discountPercent:active?20:0,shipping:null,stockConfirmed:false};
}
export function retailPrice(items,now=Date.now()){
 const keys=['CL','AC','BR','SU','PO'],r=retailAt(now);
 if(!items||Array.isArray(items)||Object.keys(items).some(k=>!keys.includes(k))||Object.values(items).some(q=>!Number.isInteger(q)||q<1||q>5))throw Error('INVALID_CART');
 const sets=Math.min(...keys.map(k=>items[k]||0)),count=Object.values(items).reduce((a,b)=>a+b,0);
 return {couponExpiresAt:r.discountPercent?COUPON_END:null,subtotal:count*r.unit,sets,discount:count*(r.regular-r.unit),prices:Object.fromEntries(Object.keys(items).map(k=>[k,r.regular]))};
}
