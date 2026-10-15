const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'../..');
const assets=path.join(root,'clover20/assets');
const fonts=path.join(assets,'fonts');
const fontCache=fs.mkdtempSync(path.join(os.tmpdir(),'clover20-fonts-'));
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const fontConfig=path.join(fontCache,'fonts.conf');
fs.writeFileSync(fontConfig,`<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${xml(fonts)}</dir><cachedir>${xml(fontCache)}</cachedir></fontconfig>`);
process.env.FONTCONFIG_FILE=fontConfig;
const sharp=require('sharp');

// Reframe the approved poster. The photographs and numeral remain original pixels.
// A square keeps the whole 20 visible in compact chat previews.
async function text(label,size,weight,color){
  return sharp({text:{text:`<span foreground="${color}">${label}</span>`,font:`Kanit ${weight} ${size}`,fontfile:path.join(fonts,`Kanit-${weight}.ttf`),rgba:true}}).png().toBuffer({resolveWithObject:true});
}
async function main(){
  const size=1200,composite=[];
  const background=Buffer.from(`<svg width="1200" height="1200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="light"><stop stop-color="#283422"/><stop offset="1" stop-color="#0b100d"/></radialGradient></defs><rect width="1200" height="1200" fill="#0b100d"/><ellipse cx="600" cy="570" rx="600" ry="600" fill="url(#light)" opacity=".5"/><path d="M80 117H1120" stroke="#dfbb7c" stroke-opacity=".2"/></svg>`);
  const poster=await sharp(path.join(assets,'clover20-poster.jpg')).extract({left:20,top:150,width:935,height:830}).png().toBuffer();
  const mask=Buffer.from(`<svg width="935" height="830" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="x"><stop stop-color="white" stop-opacity="0"/><stop offset=".024" stop-color="white"/><stop offset=".976" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset=".007" stop-color="white"/><stop offset=".975" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="m"><rect width="935" height="830" fill="url(#y)"/></mask></defs><rect width="935" height="830" fill="url(#x)" mask="url(#m)"/></svg>`);
  const numeral=await sharp(poster).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  composite.push({input:await sharp(path.join(assets,'clover-logo.png')).resize(60,65,{fit:'contain'}).png().toBuffer(),left:343,top:28});
  const brand=await text('CLOVER GROUP',32,'Medium','#eeeadd');
  composite.push({input:brand.data,left:426,top:29});
  const anniversary=await text('20 YEARS TOGETHER',15,'Regular','#dfbb7c');
  composite.push({input:anniversary.data,left:426,top:76});
  composite.push({input:numeral,left:132,top:165});
  for(const [label,top,fontSize,weight,color] of [
    ['WELCOME HOME',1014,68,'Medium','#f2eee3'],
    ['กลับบ้านมาเจอกัน',1095,36,'Light','#dfbb7c'],
    ['20 ตุลาคม 2026 · 18:00 น.',1151,25,'Regular','#abb89d'],
  ]){
    const rendered=await text(label,fontSize,weight,color);
    composite.push({input:rendered.data,left:Math.round((size-rendered.info.width)/2),top});
  }
  const output=path.join(assets,'clover20-share-v1.jpg');
  await sharp(background).composite(composite).jpeg({quality:87,mozjpeg:true}).toFile(output);
  const meta=await sharp(output).metadata();
  console.log(`${path.relative(root,output)}: ${meta.width} × ${meta.height}, ${fs.statSync(output).size} bytes`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>fs.rmSync(fontCache,{recursive:true,force:true}));
