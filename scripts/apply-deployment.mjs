import { readFile, writeFile } from 'node:fs/promises';
import { JsonRpcProvider, Contract, getAddress } from 'ethers';
import { CONFIG } from '../dist/config.js';

// Example: node scripts/apply-deployment.mjs 0xCONTRACT 12345678
const [addressInput,blockInput]=process.argv.slice(2);
if(!addressInput||!blockInput)throw new Error('Kullanım: node scripts/apply-deployment.mjs <sözleşme-adresi> <başlangıç-bloğu>');
const address=getAddress(addressInput);
const deploymentBlock=Number(blockInput);
if(!Number.isSafeInteger(deploymentBlock)||deploymentBlock<=0)throw new Error('Başlangıç bloğu geçersiz.');
const artifact=JSON.parse(await readFile('artifacts/AcikKasa.json','utf8'));
let verified=false;
for(const rpc of CONFIG.rpcUrls){
  const provider=new JsonRpcProvider(rpc);
  try {
    if(Number((await provider.getNetwork()).chainId)!==11155111)continue;
    const block=await provider.getBlockNumber();
    if(deploymentBlock>block)throw new Error('Başlangıç bloğu gelecekte.');
    if(await provider.getCode(address)==='0x')throw new Error('Adreste sözleşme yok.');
    const contract=new Contract(address,artifact.abi,provider);
    await contract.recordCount();
    const owner=await contract.owner();
    if(owner.toLowerCase()!==CONFIG.expectedOwner.toLowerCase())throw new Error('Sözleşme sahibi beklenen ilk yönetici değil.');
    verified=true;break;
  } catch(error){console.error(error.shortMessage||error.message);}
  finally{provider.destroy();}
}
if(!verified)throw new Error('Sepolia kurulumunu doğrulayamadım. config.js değiştirilmedi.');
await writeFile('dist/config.js','// Public configuration only. No secrets.\nexport const CONFIG = Object.freeze('+JSON.stringify({...CONFIG,contractAddress:address,deploymentBlock},null,2)+');\n');
console.log(`Verified Sepolia contract ${address}; deployment block ${deploymentBlock}. config.js updated.`);
