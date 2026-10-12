import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseTL, exportCSV, validateRecords} from '../dist/js/ledger.js';
import {node, externalLink} from '../dist/js/ui.js';
const record={id:1,kind:0,amount:100n,replacesId:0,recordedAt:1791795600,description:'Test',category:'Diğer',counterparty:'',author:'0x1'};

test('malformed RPC histories cannot introduce cycles, missing records, branches or kind changes',()=>{
 assert.doesNotThrow(()=>validateRecords([record,{...record,id:2,replacesId:1,amount:200n}]));
 for(const rows of [ [{...record,replacesId:1}], [{...record,id:2}], [{...record,kind:2}], [{...record,amount:0n}], [{...record,recordedAt:Infinity}], [record,{...record,id:2,replacesId:1,kind:1}], [record,{...record,id:2,replacesId:1},{...record,id:3,replacesId:1}] ])assert.throws(()=>validateRecords(rows));
 assert.throws(()=>validateRecords([record],2));
});

test('oversized amounts and CSV formula payloads with control characters are rejected or neutralized',()=>{
 assert.throws(()=>parseTL('9'.repeat(100000)));
 for(const payload of ['=1+1','+SUM(A1)','-1+2','@SUM(A1)','\t=1','\r\n=1','\u0000=1','\u0001\t+1']){
  const csv=exportCSV([{...record,description:payload}]);
  assert.match(csv,/'[\s]*[=+@-]/);
  assert.ok(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(csv));
 }
 assert.ok(exportCSV([{...record,description:'İkram; "test"\nİkinci satır'}]).includes('"İkram; ""test""\nİkinci satır"'));
});

test('UI helpers treat attack payloads as text and reject executable or credential-bearing URLs',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:tag=>({tag,set innerHTML(_){throw Error('HTML execution sink used')}})};
 try{
  const payload='<img src=x onerror=alert(1)><script>alert(2)</script>';
  assert.equal(node('span','',payload).textContent,payload);
  for(const url of ['javascript:alert(1)','data:text/html,<script>alert(1)</script>','http://example.com','https://user:password@example.com'])assert.throws(()=>externalLink('Test',url));
  const link=externalLink(payload,'https://sepolia.etherscan.io/tx/0x1');
  assert.equal(link.textContent,payload);assert.equal(link.rel,'noopener noreferrer');
 }finally{globalThis.document=previous}
});

test('application source excludes HTML execution sinks, third-party scripts and secret-handling wallet methods',async()=>{
 for(const file of ['admin.js','public.js','ui.js','chain.js']){
  const source=await readFile('dist/js/'+file,'utf8');
  assert.doesNotMatch(source,/\b(?:eval|Function)\s*\(|\.innerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/);
  assert.doesNotMatch(source,/personal_sign|eth_sign(?:TypedData)?|wallet_requestPermissions|wallet_addEthereumChain|eth_getEncryptionPublicKey|eth_decrypt/);
 }
 for(const file of ['index.html','admin.html','about.html']){
  const html=await readFile('dist/'+file,'utf8');
  assert.doesNotMatch(html,/<script\b[^>]*\bsrc=['"]https?:/i);
  assert.doesNotMatch(html,/\son(?:error|load|click|submit)\s*=/i);
 }
});
