// Owner-approved LINE prices, 2026-09-30. Shipping/availability remain unconfirmed.
export const RETAIL={unit:39900,set:189900,shipping:null,stockConfirmed:false};
export function retailPrice(items){
 const keys=['CL','AC','BR','SU','PO'];
 if(Object.keys(items).some(k=>!keys.includes(k))||Object.values(items).some(q=>!Number.isInteger(q)||q<1||q>5))throw Error('INVALID_CART');
 const sets=Math.min(...keys.map(k=>items[k]||0));
 const count=Object.values(items).reduce((a,b)=>a+b,0);
 return {subtotal:sets*RETAIL.set+(count-sets*5)*RETAIL.unit,sets,discount:sets*(5*RETAIL.unit-RETAIL.set),prices:Object.fromEntries(Object.keys(items).map(k=>[k,RETAIL.unit]))};
}
