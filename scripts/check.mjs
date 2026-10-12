import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

let errors=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else if(/\.(mjs|js)$/.test(path)){const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(result.status!==0){console.error(result.stderr);errors++;}}}}
await walk('dist/js');await walk('scripts');await walk('tests');
const {CONFIG}=await import('../dist/config.js');
if(CONFIG.chainId!==11155111)throw new Error('Production configuration must target Sepolia.');
const vendor=await readFile('dist/vendor/ethers-6.17.0.min.js','utf8');
if(!vendor.includes('6.17.0'))throw new Error('Pinned ethers vendor file missing or version mismatch.');
for(const file of ['index.html','admin.html','about.html']){
  const html=await readFile('dist/'+file,'utf8');
  if(!html.includes('lang="tr"')||!html.includes('name="viewport"'))throw new Error(`Missing Turkish language or viewport in ${file}`);
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)){
    try{await readFile(join('dist',match[1]));}catch{throw new Error(`Broken local asset ${match[1]} in ${file}`);}
  }
}
if(errors)process.exit(1);
console.log('JavaScript syntax, local page assets and Sepolia configuration checked.');
