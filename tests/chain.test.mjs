import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ganache from 'ganache';
import { JsonRpcProvider, ContractFactory } from 'ethers';

test('the real frontend reader reloads local EVM records, corrections and per-record transaction links',async()=>{
  // Local Ganache deliberately uses the Sepolia chain ID to exercise the strict
  // reader. This is NOT a Sepolia deployment. Production config is never edited.
  const server=ganache.server({logging:{quiet:true},chain:{chainId:11155111,hardfork:'shanghai'},wallet:{totalAccounts:2}});
  let provider, module, temp;
  try {
    await server.listen(0,'127.0.0.1');
    const port=server.address().port;
    provider=new JsonRpcProvider(`http://127.0.0.1:${port}`);provider.pollingInterval=20;
    const signer=await provider.getSigner();
    const artifact=JSON.parse(await readFile('artifacts/AcikKasa.json','utf8'));
    const contract=await new ContractFactory(artifact.abi,artifact.bytecode,signer).deploy(await signer.getAddress());
    const deployment=await contract.deploymentTransaction().wait();
    const localRoot=resolve('.local');await mkdir(localRoot,{recursive:true});
    temp=await mkdtemp(join(localRoot,'reader-'));
    await mkdir(join(temp,'js'));await mkdir(join(temp,'vendor'));
    for(const name of ['chain.js','ledger.js','contract-artifact.js'])await copyFile(join('dist','js',name),join(temp,'js',name));
    await copyFile('dist/vendor/ethers-6.17.0.min.js',join(temp,'vendor','ethers-6.17.0.min.js'));
    await writeFile(join(temp,'config.js'),'export const CONFIG = Object.freeze('+JSON.stringify({chainId:11155111,contractAddress:await contract.getAddress(),deploymentBlock:deployment.blockNumber,rpcUrls:[`http://127.0.0.1:${port}`],logChunkSize:2000,explorerUrl:'https://sepolia.etherscan.io'})+');');
    module=await import(pathToFileURL(join(temp,'js','chain.js')).href);
    const empty=await module.readLedger();assert.equal(empty.records.length,0);assert.equal(empty.totals.balance,0n);
    const income=await (await contract.addRecord(0,500000,'Örnek sponsor','Sponsorluk','Örnek A.Ş.')).wait();
    const expense=await (await contract.addRecord(1,150000,'Örnek ikram','Etkinlik','')).wait();
    const first=await module.readLedger();assert.equal(first.totals.balance,350000n);
    assert.equal(first.records[0].txHash,income.hash);assert.equal(first.records[1].txHash,expense.hash);
    const correction=await (await contract.correctRecord(2,120000,'Tutar düzeltildi','Etkinlik','')).wait();
    // Reconnect as a fresh visitor, with no wallet provider.
    module.forgetReader();
    const refreshed=await module.readLedger();
    assert.equal(refreshed.records.length,3);assert.equal(refreshed.totals.balance,380000n);
    assert.equal(refreshed.records[1].amount,150000n);assert.equal(refreshed.records[2].txHash,correction.hash);
    assert.equal(refreshed.linkWarning,'');
  } finally {
    module?.forgetReader();provider?.destroy();await server.close();
    // Verify the resolved cleanup target stays inside our named test directory.
    if(temp && resolve(temp).startsWith(resolve('.local')+sep))await rm(temp,{recursive:true,force:true});
  }
});
