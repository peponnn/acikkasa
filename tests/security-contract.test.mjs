import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ganache from 'ganache';
import {BrowserProvider,ContractFactory,ZeroAddress} from 'ethers';
let engine,p,owner,admin,outsider,artifact;
before(async()=>{
 artifact=JSON.parse(await readFile('artifacts/AcikKasa.json','utf8'));
 engine=ganache.provider({logging:{quiet:true},chain:{chainId:1337,hardfork:'shanghai'},wallet:{totalAccounts:3}});
 p=new BrowserProvider(engine);p.pollingInterval=20;
 [owner,admin,outsider]=await Promise.all([p.getSigner(0),p.getSigner(1),p.getSigner(2)]);
});
after(async()=>{p?.destroy();await engine?.disconnect()});
async function fixture(){const c=await new ContractFactory(artifact.abi,artifact.bytecode,owner).deploy(await owner.getAddress());await c.waitForDeployment();return c}
async function confirm(p){return (await p).wait()}
async function snapshot(c){return {count:await c.recordCount(),income:await c.totalIncome(),expense:await c.totalExpense(),record:Array.from(await c.getRecord(1)),next:await c.replacedBy(1)}}

test('invalid direct calls and failed mined corrections leave all ledger state unchanged',async()=>{
 const c=await fixture();await confirm(c.addRecord(0,100,'Original','Diğer',''));
 const original=await snapshot(c);
 const badCalls=[()=>c.correctRecord(1,0,'Invalid','','',{gasLimit:1000000}),()=>c.correctRecord(1,100,'x'.repeat(281),'','',{gasLimit:1000000}),()=>c.correctRecord(1,100,'Valid','x'.repeat(49),'',{gasLimit:1000000}),()=>c.correctRecord(1,100,'Valid','','x'.repeat(121),{gasLimit:1000000}),()=>c.addRecord(2,100,'Bad enum','','',{gasLimit:1000000})];
 for(const call of badCalls){await assert.rejects(()=>confirm(call()));assert.deepEqual(await snapshot(c),original)}
});

test('ordinary admins cannot grant roles or seize ownership; a replaced ownership candidate cannot accept',async()=>{
 const c=await fixture();await confirm(c.setAdmin(await admin.getAddress(),true));
 await assert.rejects(()=>c.connect(admin).setAdmin(awaitAddress(),true));
 await assert.rejects(()=>c.connect(admin).proposeOwner(awaitAddress()));
 await confirm(c.proposeOwner(await admin.getAddress()));
 await confirm(c.proposeOwner(await outsider.getAddress()));
 await assert.rejects(()=>c.connect(admin).acceptOwnership());
 await confirm(c.connect(outsider).acceptOwnership());
 assert.equal(await c.pendingOwner(),ZeroAddress);
 await assert.rejects(()=>c.proposeOwner(awaitAddress()));
 assert.equal(await c.admins(await owner.getAddress()),false);
});
function awaitAddress(){return '0x0000000000000000000000000000000000000001'}

test('the ledger rejects ETH, token approvals and unknown function selectors',async()=>{
 const c=await fixture();const address=await c.getAddress();
 await assert.rejects(()=>owner.sendTransaction({to:address,value:1n}));
 await assert.rejects(()=>owner.sendTransaction({to:address,data:'0xdeadbeef'}));
 assert.ok(!artifact.abi.some(a=>a.type==='function'&&(a.stateMutability==='payable'||/^(approve|transfer|transferFrom|permit|withdraw)$/.test(a.name))));
 assert.ok(!artifact.abi.some(a=>['fallback','receive'].includes(a.type)));
});

test('deterministic adversarial operation sequences preserve totals, immutable originals and correction links',async()=>{
 const c=await fixture();await confirm(c.setAdmin(await admin.getAddress(),true));
 const rows=[],replaced=new Set();let seed=0x12345678;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed};
 for(let step=0;step<36;step++){
  const writer=step%2?c.connect(admin):c;
  const amount=BigInt(random()%1000000+1),label='Security test '+step;
  const effective=rows.filter(r=>!replaced.has(r.id));
  let prior=0,kind=random()%2;
  if(step%3===2&&effective.length){const chosen=effective[random()%effective.length];prior=chosen.id;kind=chosen.kind;await confirm(writer.correctRecord(prior,amount,label,'Test',''));replaced.add(prior)}
  else await confirm(writer.addRecord(kind,amount,label,'Test',''));
  rows.push({id:rows.length+1,kind,amount,description:label,replacesId:prior});
  const active=rows.filter(r=>!replaced.has(r.id));
  assert.equal(await c.totalIncome(),active.filter(r=>r.kind===0).reduce((a,r)=>a+r.amount,0n));
  assert.equal(await c.totalExpense(),active.filter(r=>r.kind===1).reduce((a,r)=>a+r.amount,0n));
  assert.equal(await c.recordCount(),BigInt(rows.length));
  if(prior){const old=await c.getRecord(prior);assert.equal(old.amount,rows[prior-1].amount);assert.equal(old.description,rows[prior-1].description);assert.equal(await c.replacedBy(prior),BigInt(rows.length));await assert.rejects(()=>writer.correctRecord(prior,1,'Branch','',''))}
 }
 await confirm(c.setAdmin(await admin.getAddress(),false));
 await assert.rejects(()=>c.connect(admin).correctRecord(rows.length,1,'Revoked','',''));
});
