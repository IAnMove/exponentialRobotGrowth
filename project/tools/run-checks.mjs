// Builds the site, then runs every check-* script and check-site.py, one after another.
// Usage: npm test  (or `npm run test:fast` to skip the build, or pass names: npm test -- lunar museo)
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args=process.argv.slice(2),skipBuild=args.includes('--no-build'),filters=args.filter(a=>!a.startsWith('--'));
const python=process.platform==='win32'?'python':'python3';
const run=(cmd,argv)=>{const t=performance.now(),r=spawnSync(cmd,argv,{cwd:root,encoding:'utf8',maxBuffer:64<<20});return {ok:r.status===0,out:(r.stdout||'')+(r.stderr||''),seconds:(performance.now()-t)/1000};};

if(!skipBuild){const b=run(python,['build-site.py']);if(!b.ok){console.error(b.out);console.error('Build failed.');process.exit(1);}console.log(`build  ${b.seconds.toFixed(1)}s`);}
const scripts=readdirSync(root).filter(f=>/^check-.*\.(mjs|js|py)$/.test(f)).filter(f=>!filters.length||filters.some(k=>f.includes(k))).sort();
const failed=[];
for(const file of scripts){
  const r=file.endsWith('.py')?run(python,[file]):run(process.execPath,[file]);
  const summary=r.out.trim().split('\n').filter(l=>l.trim()).at(-1)||'';
  console.log(`${r.ok?'ok  ':'FAIL'}  ${file.padEnd(32)} ${r.seconds.toFixed(1).padStart(5)}s  ${r.ok?summary.slice(0,90):''}`);
  if(!r.ok){failed.push(file);console.log(r.out.split('\n').slice(-25).map(l=>'      '+l).join('\n'));}
}
console.log(`\n${scripts.length-failed.length}/${scripts.length} checks passed.`);
if(failed.length){console.log('Failed: '+failed.join(', '));process.exit(1);}
