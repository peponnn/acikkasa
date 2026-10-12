import { JsonRpcProvider, BrowserProvider, Contract, ContractFactory, FetchRequest, getAddress, isAddress } from '../vendor/ethers-6.17.0.min.js';
import { CONFIG } from '../config.js';
import { ABI, BYTECODE } from './contract-artifact.js';
import { summarize } from './ledger.js';

export const isConfigured = () => Boolean(CONFIG.contractAddress);
let cachedReader;

function configAddress() {
  if (CONFIG.chainId !== 11155111) throw new Error('Bu sürüm yalnızca Sepolia test ağını destekler.');
  if (!isAddress(CONFIG.contractAddress)) throw new Error('config.js içindeki sözleşme adresi geçersiz.');
  if (!Number.isSafeInteger(CONFIG.deploymentBlock) || CONFIG.deploymentBlock < 0) throw new Error('Başlangıç bloğu geçersiz.');
  return getAddress(CONFIG.contractAddress);
}

export async function getReader() {
  if (cachedReader) return cachedReader;
  for (const url of CONFIG.rpcUrls) {
    let provider;
    try {
      const request = new FetchRequest(url);
      request.timeout = 10000;
      provider = new JsonRpcProvider(request, CONFIG.chainId, { staticNetwork: true, batchMaxCount: 1 });
      if (Number(BigInt(await provider.send('eth_chainId', []))) !== CONFIG.chainId) throw new Error('Yanlış RPC ağı.');
      await provider.getBlockNumber();
      cachedReader = provider;
      return provider;
    } catch { provider?.destroy(); }
  }
  throw new Error('Sepolia bağlantısı kurulamadı. İnternet bağlantısını kontrol edip yeniden deneyin.');
}

export function forgetReader() { cachedReader?.destroy(); cachedReader = undefined; }

function plainRecord(record) {
  return { id:Number(record.id), kind:Number(record.kind), amount:BigInt(record.amount),
    description:record.description, category:record.category, counterparty:record.counterparty,
    recordedAt:Number(record.recordedAt), author:record.author, replacesId:Number(record.replacesId), txHash:null };
}

export async function readLedger({ links = true } = {}) {
  const address = configAddress();
  const provider = await getReader();
  // Pin reads to one block so a concurrent write cannot mix old and new totals.
  const block = Number(BigInt(await provider.send('eth_blockNumber', [])));
  if (block < CONFIG.deploymentBlock) throw new Error('Başlangıç bloğu henüz zincirde bulunmuyor.');
  const opts = { blockTag: block };
  if (await provider.getCode(address, block) === '0x') throw new Error('Bu adreste Sepolia sözleşmesi bulunamadı.');
  const contract = new Contract(address, ABI, provider);
  const [countValue, income, expense] = await Promise.all([contract.recordCount(opts), contract.totalIncome(opts), contract.totalExpense(opts)]);
  const count = Number(countValue);
  if (!Number.isSafeInteger(count) || count > 10000) throw new Error('Kayıt sayısı bu prototipin okuma sınırını aşıyor.');
  const records = [];
  for (let offset = 0; offset < count; offset += 50) {
    const page = await contract.getRecords(offset, 50, opts);
    records.push(...page.map(plainRecord));
  }
  const totals = summarize(records);
  if (totals.income !== income || totals.expense !== expense) throw new Error('Kayıtlar ile sözleşme toplamları uyuşmuyor. Yeniden deneyin.');
  let linkWarning = '';
  if (links && count) {
    try {
      let fromBlock = CONFIG.deploymentBlock;
      let chunk = CONFIG.logChunkSize;
      while (fromBlock <= block) {
        const toBlock = Math.min(block, fromBlock + chunk - 1);
        try {
          const events = await contract.queryFilter(contract.filters.RecordAdded(), fromBlock, toBlock);
          for (const event of events) {
            const index = Number(event.args.id) - 1;
            if (records[index]) records[index].txHash = event.transactionHash;
          }
          fromBlock = toBlock + 1;
        } catch (error) {
          if (chunk <= 100) throw error;
          chunk = Math.max(100, Math.floor(chunk / 2));
        }
      }
      if (records.some(r => !r.txHash)) linkWarning = 'Bazı işlem bağlantıları alınamadı. Sözleşme kayıtları okunabiliyor; bağlantılar için yenileyin.';
    } catch { linkWarning = 'İşlem bağlantıları alınamadı. Tutarlar sözleşmeden okundu; bağlantılar için yenileyin.'; }
  }
  return { records, totals, block, linkWarning };
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error('MetaMask bulunamadı. Yönetim işlemleri için MetaMask yüklü bir tarayıcı kullanın.');
  await window.ethereum.request({ method:'eth_requestAccounts' });
  const chainId = Number(BigInt(await window.ethereum.request({ method:'eth_chainId' })));
  if (chainId !== CONFIG.chainId) {
    await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId:'0xaa36a7' }] });
  }
  const provider = new BrowserProvider(window.ethereum);
  if (Number((await provider.getNetwork()).chainId) !== CONFIG.chainId) throw new Error('Lütfen Sepolia ağına geçin.');
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const contract = isConfigured() ? new Contract(configAddress(), ABI, signer) : null;
  const [authorized, owner, pendingOwner] = contract ? await Promise.all([contract.admins(address), contract.owner(), contract.pendingOwner()]) : [false, '', ''];
  return { provider, signer, address, contract, authorized,
    isOwner:owner.toLowerCase() === address.toLowerCase(), isPendingOwner:pendingOwner.toLowerCase() === address.toLowerCase() };
}

export async function assertWallet(wallet) {
  const accounts = await window.ethereum.request({ method:'eth_accounts' });
  const chainId = Number(BigInt(await window.ethereum.request({ method:'eth_chainId' })));
  if (chainId !== CONFIG.chainId || accounts[0]?.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error('Cüzdan veya ağ değişti. Cüzdanı yeniden bağlayın.');
  }
}

export async function deployContract(wallet) {
  await assertWallet(wallet);
  const initialOwner = getAddress(CONFIG.expectedOwner.toLowerCase());
  if (wallet.address.toLowerCase() !== initialOwner.toLowerCase()) throw new Error('Kurulum için belirtilen ilk yönetici cüzdanını bağlayın.');
  if ((await wallet.provider.getBalance(wallet.address)) === 0n) throw new Error('Kurulum için cüzdanınızda Sepolia test ETH bulunmalı.');
  const factory = new ContractFactory(ABI, BYTECODE, wallet.signer);
  const deployed = await factory.deploy(initialOwner);
  return deployed;
}

export const explorerTx = hash => `${CONFIG.explorerUrl}/tx/${hash}`;
export const explorerAddress = () => `${CONFIG.explorerUrl}/address/${CONFIG.contractAddress}`;

export function explainError(error) {
  const code = error?.code ?? error?.info?.error?.code;
  if (code === 'ACTION_REJECTED' || code === 4001) return 'İşlemi cüzdanda reddettiniz. Yeni bir kayıt eklenmedi.';
  if (code === 'INSUFFICIENT_FUNDS') return 'İşlem ücreti için yeterli Sepolia test ETH yok.';
  if (code === -32002) return 'MetaMask’ta bekleyen bir bağlantı isteği var. Cüzdan penceresini kontrol edin.';
  const name = error?.revert?.name;
  const names = { Unauthorized:'Bu cüzdanın işlem yetkisi yok.', AlreadyCorrected:'Bu kayıt zaten düzeltildi. Son geçerli kaydı seçin.', RecordNotFound:'Kayıt bulunamadı.', InvalidAmount:'Tutar geçersiz.', InvalidText:'Metin alanlarından biri boş veya çok uzun.', InvalidAddress:'Adres geçersiz ya da sözleşme sahibinin yetkisi kaldırılamaz.' };
  if (names[name]) return names[name];
  if (code === 'CALL_EXCEPTION') return 'Sözleşme işlemi kabul etmedi. Yetkiyi, tutarı ve düzeltilecek kaydı kontrol edin.';
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT' || code === 'SERVER_ERROR') return 'Zincir bağlantısında sorun var. İşlemin durumunu explorer’dan kontrol edin.';
  return error?.shortMessage || error?.message || 'İşlem tamamlanamadı. Yeniden deneyin.';
}
