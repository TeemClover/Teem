import {build} from 'esbuild';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
await build({absWorkingDir:root,entryPoints:['src/main.js'],bundle:true,format:'esm',outfile:'app.js',minify:true,target:'es2022',external:['./house-data.js'],legalComments:'eof'});
console.log('Built starter/app.js; house-data.js remains independently editable.');
