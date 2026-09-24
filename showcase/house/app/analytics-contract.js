// Shared, bounded vocabulary. Never send URLs, text input, camera coordinates or photos.
export const FEATURES = Object.freeze({
 camera:'หมุน / ซูมบ้าน', inside:'เปิดดูข้างใน', floor:'เลือกชั้น', exploded:'แยกชั้น',
 rooms:'เลือกห้อง', model:'โมเดล', plan:'แปลน', photo:'รูปจริง', hd:'HD', sd:'SD',
 walls:'ปรับผนัง', layers:'บิลต์อิน / เฟอร์นิเจอร์', isolate:'แยกดูห้อง', focus:'ขยายพื้นที่ดูบ้าน',
 reset:'คืนมุมเดิม', ceiling:'ดูฝ้าห้อง', settings:'ตั้งค่าการแสดงผล', tour:'พาชมบ้าน', help:'วิธีเล่น', story:'เรื่องของบ้าน', learn:'เปิดข้อมูลห้องเรียน', course:'กดไปหน้าคอร์ส'
});
export const SIGNALS = ['model_ready','model_error','hd_ready','hd_error','tour_complete','guide_seen','guide_started','guide_skipped','guide_closed','guide_completed'];
export const ANALYTICS_KEY='myclover.house.stats.v1';
export const OPT_OUT_KEY='myclover.house.stats.disabled';
export function sourceOf(referrer, search, host) {
 let domain='direct';
 try {const u=new URL(referrer);const hostname=u.hostname.toLowerCase().replace(/^www\./,'');domain=!['http:','https:'].includes(u.protocol)||/^[\d.]+$/.test(hostname)||hostname.includes(':')||hostname==='localhost'?'other':hostname===host.replace(/^www\./,'')?'myclover':hostname;}catch{}
 const params=new URLSearchParams(search);
 // Only explicit campaign labels; never retain the full referring URL or arbitrary query.
 const label=key=>{const value=params.get(key)||'';return /^[a-zA-Z0-9_-]{1,64}$/.test(value)?value:'';};
 return {source:label('utm_source')||domain,medium:label('utm_medium'),campaign:label('utm_campaign')};
}
export function createActivityClock(now=()=>performance.now(), visible=true) {
 let last=now(),activeUntil=last+30000,activeMs=0;
 function tick(){const t=now();if(visible)activeMs+=Math.max(0,Math.min(t,activeUntil)-last);last=t;return Math.floor(activeMs/1000);}
 return {seconds:tick,activity(){tick();activeUntil=now()+30000;},visibility(value){tick();visible=value;if(value){last=now();activeUntil=last+30000;}}};
}
