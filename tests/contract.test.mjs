import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ganache from 'ganache';
import { BrowserProvider, ContractFactory, ZeroAddress } from 'ethers';
import { summarize } from '../dist/js/ledger.js';

let engine, provider, owner, outsider, nextOwner, artifact;
before(async()=>{
  artifact=JSON.parse(await readFile('artifacts/AcikKasa.json','utf8'));
  engine=ganache.provider({logging:{quiet:true},chain:{chainId:1337,hardfork:'shanghai'},wallet:{totalAccounts:3}});
  provider=new BrowserProvider(engine);provider.pollingInterval=20;
  [owner,outsider,nextOwner]=await Promise.all([provider.getSigner(0),provider.getSigner(1),provider.getSigner(2)]);
});
after(async()=>{provider?.destroy();await engine?.disconnect();});
async function fixture(){const c=await new ContractFactory(artifact.abi,artifact.bytecode,owner).deploy(await owner.getAddress());await c.waitForDeployment();return c;}
async function confirmed(promise){return (await promise).wait();}

test('deployment assigns the intended owner and refuses a zero owner',async()=>{
  const c=await fixture();assert.equal(await c.owner(),await owner.getAddress());assert.equal(await c.admins(await owner.getAddress()),true);
  await assert.rejects(()=>new ContractFactory(artifact.abi,artifact.bytecode,owner).deploy(ZeroAddress));
});

test('unauthorized direct contract writes, corrections and role changes revert',async()=>{
  const c=await fixture();const other=c.connect(outsider);
  await assert.rejects(()=>other.addRecord(0,500000,'Sponsorluk','Sponsorluk','Örnek A.Ş.'));
  await assert.rejects(()=>other.correctRecord(1,100,'Hata','Diğer',''));
  await assert.rejects(()=>other.setAdmin(awaitAddressDummy(),true));
  await assert.rejects(()=>other.proposeOwner(ZeroAddress));
  assert.equal(await c.recordCount(),0n);
});
function awaitAddressDummy(){return '0x0000000000000000000000000000000000000001';}

test('income and expense produce correct totals and auditable events',async()=>{
  const c=await fixture();const receipt=await confirmed(c.addRecord(0,500000,'Sponsorluk desteği','Sponsorluk','Örnek A.Ş.'));
  await confirmed(c.addRecord(1,150000,'İkram gideri','Etkinlik','Örnek Ltd.'));
  assert.equal(await c.totalIncome(),500000n);assert.equal(await c.totalExpense(),150000n);
  const r=await c.getRecord(1);assert.equal(r.description,'Sponsorluk desteği');assert.equal(r.author,await owner.getAddress());assert.ok(r.recordedAt>0n);
  const log=receipt.logs.map(l=>{try{return c.interface.parseLog(l)}catch{return null}}).find(l=>l?.name==='RecordAdded');
  assert.equal(log.args.id,1n);assert.equal(log.args.amount,500000n);assert.equal(log.args.replacesId,0n);
});

test('corrections retain originals, replace totals and reject conflicting branches',async()=>{
  const c=await fixture();await confirmed(c.addRecord(0,500000,'Sponsor','Sponsorluk',''));
  await confirmed(c.addRecord(1,150000,'İkram','Etkinlik',''));
  await confirmed(c.correctRecord(2,120000,'İkram tutarı düzeltildi','Etkinlik',''));
  assert.equal((await c.getRecord(2)).amount,150000n);assert.equal((await c.getRecord(3)).replacesId,2n);
  assert.equal(await c.replacedBy(2),3n);assert.equal(await c.totalExpense(),120000n);
  await assert.rejects(()=>c.correctRecord(2,100000,'Rakip düzeltme','Etkinlik',''));
  await assert.rejects(()=>c.correctRecord(999,100000,'Olmayan kayıt','Etkinlik',''));
  await confirmed(c.correctRecord(3,110000,'İkinci düzeltme','Etkinlik',''));
  assert.equal(await c.totalExpense(),110000n);
  const rows=(await c.getRecords(0,50)).map(r=>({id:Number(r.id),kind:Number(r.kind),amount:r.amount,replacesId:Number(r.replacesId)}));
  assert.equal(summarize(rows).balance,390000n);assert.equal(rows.length,4);
  assert.equal((await c.getRecord(2)).description,'İkram');
});

test('invalid correction rolls back totals and cannot corrupt an effective record',async()=>{
  const c=await fixture();await confirmed(c.addRecord(1,150000,'Gider','Diğer',''));
  await assert.rejects(()=>c.correctRecord(1,0,'Geçersiz','Diğer',''));
  assert.equal(await c.totalExpense(),150000n);assert.equal(await c.replacedBy(1),0n);assert.equal(await c.recordCount(),1n);
});

test('admin grant, revocation and two-step handover enforce access boundaries',async()=>{
  const c=await fixture();const address=await outsider.getAddress();
  await confirmed(c.setAdmin(address,true));await confirmed(c.connect(outsider).addRecord(0,100,'Yetkili kayıt','Diğer',''));
  await confirmed(c.setAdmin(address,false));await assert.rejects(()=>c.connect(outsider).addRecord(0,100,'Yetkisiz kayıt','Diğer',''));
  await assert.rejects(()=>c.setAdmin(ZeroAddress,true));
  await assert.rejects(async()=>c.setAdmin(await owner.getAddress(),false));
  await confirmed(c.proposeOwner(await nextOwner.getAddress()));
  await assert.rejects(()=>c.connect(outsider).acceptOwnership());
  assert.equal(await c.owner(),await owner.getAddress());
  await confirmed(c.connect(nextOwner).acceptOwnership());assert.equal(await c.owner(),await nextOwner.getAddress());
  assert.equal(await c.admins(await owner.getAddress()),false);assert.equal(await c.admins(await nextOwner.getAddress()),true);
  await assert.rejects(()=>c.addRecord(0,100,'Eski sahip','Diğer',''));
  await confirmed(c.connect(nextOwner).addRecord(0,100,'Yeni sahip','Diğer',''));
});

test('records are paged, amounts bounded, and deficits do not underflow',async()=>{
  const c=await fixture();
  await assert.rejects(()=>c.addRecord(0,0,'Sıfır','Diğer',''));
  await assert.rejects(()=>c.addRecord(0,1000000000000001n,'Büyük','Diğer',''));
  await assert.rejects(()=>c.addRecord(0,100,'ş'.repeat(141),'Diğer',''));
  await confirmed(c.addRecord(1,50000,'Başlangıç gideri','Diğer',''));
  assert.equal(await c.totalIncome(),0n);assert.equal(await c.totalExpense(),50000n);
  assert.equal((await c.getRecords(0,1)).length,1);assert.equal((await c.getRecords(1,1)).length,0);
  await assert.rejects(()=>c.getRecords(0,51));await assert.rejects(()=>c.getRecord(0));
});
