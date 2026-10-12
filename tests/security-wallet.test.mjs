import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,copyFile,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import ganache from 'ganache';
import {BrowserProvider,ContractFactory} from 'ethers';
let engine,provider,owner,outsider,contract,temp,module;
const wallets=[];
const previousWindow=globalThis.window;
before(async()=>{
 engine=ganache.provider({logging:{quiet:true},chain:{chainId:11155111,hardfork:'shanghai'},wallet:{totalAccounts:2}});
 provider=new BrowserProvider(engine);provider.pollingInterval=20;
 const signer=await provider.getSigner(0);owner=await signer.getAddress();outsider=await (await provider.getSigner(1)).getAddress();
 const artifact=JSON.parse(await readFile('artifacts/AcikKasa.json','utf8'));
 contract=await new ContractFactory(artifact.abi,artifact.bytecode,signer).deploy(owner);await contract.waitForDeployment();
 const root=resolve('.local');await mkdir(root,{recursive:true});temp=await mkdtemp(join(root,'security-wallet-'));
 await mkdir(join(temp,'js'));await mkdir(join(temp,'vendor'));
 for(const file of ['chain.js','ledger.js','contract-artifact.js'])await copyFile('dist/js/'+file,join(temp,'js',file));
 await copyFile('dist/vendor/ethers-6.17.0.min.js',join(temp,'vendor','ethers-6.17.0.min.js'));
 await writeFile(join(temp,'config.js'),'export const CONFIG = Object.freeze('+JSON.stringify({chainId:11155111,contractAddress:await contract.getAddress(),deploymentBlock:0,expectedOwner:owner,explorerUrl:'https://sepolia.etherscan.io'})+');');
 module=await import(pathToFileURL(join(temp,'js/chain.js')).href);
});
after(async()=>{
 for(const w of wallets)w.provider.destroy();provider?.destroy();await engine?.disconnect();globalThis.window=previousWindow;
 if(temp&&resolve(temp).startsWith(resolve('.local')+sep))await rm(temp,{recursive:true,force:true});
});
function mockWallet(account=owner){
 const state={account,chain:'0xaa36a7',reject:false,requests:[]};
 globalThis.window={ethereum:{request:async args=>{
  state.requests.push(args);
  if(args.method==='eth_requestAccounts'){if(state.reject)throw Object.assign(Error('Rejected'),{code:4001});return [state.account]}
  if(args.method==='eth_accounts')return [state.account];
  if(args.method==='eth_chainId')return state.chain;
  if(args.method==='wallet_switchEthereumChain'){assert.equal(args.params[0].chainId,'0xaa36a7');state.chain='0xaa36a7';return null}
  return engine.request(args);
 }}};
 return state;
}
async function connect(){const w=await module.connectWallet();wallets.push(w);w.provider.pollingInterval=20;return w}

test('missing provider and user rejection cannot initiate signing or a transaction',async()=>{
 globalThis.window={};await assert.rejects(()=>module.connectWallet(),/MetaMask bulunamadı/);
 const state=mockWallet();state.reject=true;await assert.rejects(()=>connect(),e=>e.code===4001);
 assert.deepEqual(state.requests.map(r=>r.method),['eth_requestAccounts']);
});

test('wallet connection requests only accounts and the required Sepolia switch, without signatures or broad permissions',async()=>{
 const state=mockWallet();state.chain='0x1';const w=await connect();
 assert.equal(w.address,owner);assert.equal(w.authorized,true);assert.equal(w.isOwner,true);
 assert.ok(state.requests.some(r=>r.method==='wallet_switchEthereumChain'));
 assert.ok(!state.requests.some(r=>/sign|sendTransaction|requestPermissions|decrypt|Encryption|addEthereumChain/i.test(r.method)));
});

test('the contract denies an outsider and changed accounts or networks invalidate a connected wallet',async()=>{
 mockWallet(outsider);const denied=await connect();assert.equal(denied.authorized,false);assert.equal(denied.isOwner,false);
 const state=mockWallet();const w=await connect();
 state.account=outsider;await assert.rejects(()=>module.assertWallet(w),/Cüzdan veya ağ değişti/);
 state.account=owner;state.chain='0x1';await assert.rejects(()=>module.assertWallet(w),/Cüzdan veya ağ değişti/);
 assert.ok(!state.requests.some(r=>r.method==='eth_sendTransaction'));
});

test('a local administrative write targets only the configured ledger and attaches no ETH value',async()=>{
 const state=mockWallet();const w=await connect();await module.assertWallet(w);
 await (await w.contract.addRecord(0,100,'Local security test','Test','')).wait();
 const sent=state.requests.filter(r=>r.method==='eth_sendTransaction');assert.equal(sent.length,1);
 const tx=sent[0].params[0];assert.equal(tx.to.toLowerCase(),(await contract.getAddress()).toLowerCase());
 assert.equal(BigInt(tx.value||'0x0'),0n);
 assert.equal(tx.data.slice(0,10),contract.interface.getFunction('addRecord').selector);
});
