// A navigation hint only. Prices, stock, consent and payment stay server-owned.
export function selectionFromSearch(search){
 const pick=new URLSearchParams(search).get('pick');
 const keys=['CL','AC','BR','SU','PO'];
 return pick==='set'?Object.fromEntries(keys.map(k=>[k,1])):keys.includes(pick)?{[pick]:1}:{};
}
