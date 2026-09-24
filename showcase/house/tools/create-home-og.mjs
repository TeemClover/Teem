/**
 * Compose the share card from the already approved public exterior photograph.
 * This resizes/crops the photo and adds real shaped typography; it does not alter
 * the house or use private originals. Run with sharp and a licensed Thai font.
 * Optional: HOUSE_OG_SHARP_MODULE, HOUSE_OG_FONT_FILE, HOUSE_OG_FONT_NAME.
 */
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'assets/og-home-built-with-love-20260924.jpg');
const fontfile=process.env.HOUSE_OG_FONT_FILE;
const font=process.env.HOUSE_OG_FONT_NAME||'Thonburi';
if(!fontfile)throw new Error('Set HOUSE_OG_FONT_FILE to a licensed Thai font file.');
// Give Fontconfig a writable, temporary cache instead of a machine-wide cache.
const fontRuntime=await mkdtemp(path.join(tmpdir(),'house-og-fonts-'));
await mkdir(path.join(fontRuntime,'cache'));
const xml=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;');
const fontConfig=path.join(fontRuntime,'fonts.conf');
await writeFile(fontConfig,`<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${xml(path.dirname(fontfile))}</dir><cachedir>${xml(path.join(fontRuntime,'cache'))}</cachedir></fontconfig>`);
process.env.FONTCONFIG_FILE=fontConfig;
const sharp=require(process.env.HOUSE_OG_SHARP_MODULE||'sharp');
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=async(value,size,color,weight='normal')=>sharp({text:{
 text:`<span foreground="${color}" weight="${weight}">${escape(value)}</span>`,
 font:`${font} ${size}`,fontfile,dpi:72,rgba:true,
}}).png().toBuffer();
const photograph=await sharp(path.join(root,'media/photos/exterior-01.webp'))
 .resize({width:1200}).extract({left:0,top:26,width:1200,height:630}).toBuffer();
const shade=Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#152331" stop-opacity="0"/><stop offset=".28" stop-color="#152331" stop-opacity=".12"/><stop offset="1" stop-color="#152331" stop-opacity=".94"/></linearGradient></defs><rect x="0" y="340" width="1200" height="290" fill="url(#fade)"/><rect x="970" y="25" width="198" height="58" rx="29" fill="#f9fbfc" fill-opacity=".92"/></svg>`);
const title=await text('บ้านที่เราสร้างด้วยรัก',58,'#ffffff','bold');
const subtitle=await text('10 ปีของครอบครัวเรา · เปิดให้สำรวจใน 3D',25,'#edf3f7');
const mark=await sharp(path.join(root,'assets/myclover-logo.png')).resize(40,44,{fit:'inside'}).png().toBuffer();
const brand=await text('myClover',22,'#263342');
await sharp(photograph).composite([
 {input:shade,top:0,left:0},
 {input:title,top:474,left:48},
 {input:subtitle,top:567,left:51},
 {input:mark,top:32,left:984},
 {input:brand,top:42,left:1035},
]).jpeg({quality:94,chromaSubsampling:'4:4:4',mozjpeg:true}).toFile(output);
const metadata=await sharp(output).metadata();
if(metadata.width!==1200||metadata.height!==630)throw new Error('Unexpected OG dimensions');
if(metadata.exif||metadata.xmp||metadata.iptc)throw new Error('Private metadata in OG output');
await rm(fontRuntime,{recursive:true,force:true});
console.log('Created assets/og-home-built-with-love-20260924.jpg (1200 × 630)');
