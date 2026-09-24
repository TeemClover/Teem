import {build} from 'esbuild';
import {copyFile,mkdir,writeFile,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
process.chdir(path.resolve(import.meta.dirname,'..'));
await mkdir('assets',{recursive:true});
await mkdir('reports',{recursive:true});
const result=await build({entryPoints:['app/main.js'],bundle:true,format:'esm',splitting:true,outdir:'assets',entryNames:'home',chunkNames:'[name]-[hash]',minify:true,sourcemap:false,target:['es2022'],metafile:true,legalComments:'eof'});
await writeFile('reports/build.json',JSON.stringify(result.metafile,null,2));
// Delete only hashed JavaScript chunks generated for this app; preserve hand-authored assets.
for(const name of await readdir('assets'))if(/^(?:scene|chunk|hd-[a-z][a-z0-9-]*)-[A-Z0-9]{8}\.js$/.test(name)&&!result.metafile.outputs[`assets/${name}`])await unlink(`assets/${name}`);
await copyFile('app/index.html','index.html');
await copyFile('app/styles.css','assets/home.css');
await copyFile('app/studio.css','assets/studio.css');
for(const name of ['story','wall-controls','onboarding'])await copyFile(`app/${name}.css`,`assets/${name}.css`);
console.log('Built static route /showcase/house/');
