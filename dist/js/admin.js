import { CONFIG } from '../config.js';
import { getAddress } from '../vendor/ethers-6.17.0.min.js';
import { isConfigured, connectWallet, assertWallet, deployContract, readLedger, forgetReader, explorerTx, explainError, getReader } from './chain.js';
import { parseTL, validateText, amountInput, formatTL, summarize, shortAddress, formatDate } from './ledger.js';
import { node, externalLink, emptyState, downloadFile } from './ui.js';

const $=s=>document.querySelector(s);
let wallet=null, busy=false, records=[], correction=null, deployedConfig=null;
const deploymentKey='acikkasa.pending-deployment.'+CONFIG.expectedOwner.toLowerCase();
const banner=$('#mode-banner');

function pendingDeployment() { try { return sessionStorage.getItem(deploymentKey); } catch { return null; } }
function storeDeployment(hash) { try { sessionStorage.setItem(deploymentKey,hash); } catch { /* URL still shown in the UI. */ } }
function clearDeployment() { try { sessionStorage.removeItem(deploymentKey); } catch { /* No sensitive storage used. */ } }

function updateControls() {
  const allowed=Boolean(wallet?.authorized && isConfigured());
  $('#record-fields').disabled=!allowed||busy;
  $('#record-type').disabled=Boolean(correction);
  $('#connect-wallet').disabled=busy;
  $('#deploy-contract').disabled=busy||!wallet||wallet.address.toLowerCase()!==CONFIG.expectedOwner.toLowerCase()||Boolean(deployedConfig);
  $('#refresh-admin').disabled=busy;
  $('#access-panel').hidden=!wallet?.isOwner;
  $('#accept-owner-panel').hidden=!wallet?.isPendingOwner;
  document.querySelectorAll('#access-panel button,#access-panel input,#access-panel select,#accept-owner').forEach(e=>e.disabled=busy);
  $('#deploy-contract').textContent=pendingDeployment()?'Bekleyen kurulum işlemini kontrol et ↻':'Sepolia’ya sözleşmeyi kur ↗';
  renderRecords();
}

function status(text, hash='', error=false, target=$('#transaction-status')) {
  target.replaceChildren(node('span','',text));target.style.color=error?'var(--red)':'var(--muted)';
  if(hash)target.append(externalLink('İşlemi explorer’da incele ↗',explorerTx(hash)));
}

function showBanner(text, className='notice') {banner.className=className;banner.textContent=text;}

function renderRecords() {
  const list=$('#admin-records');list.replaceChildren();
  if(!isConfigured()){list.append(emptyState('Canlı defter henüz kurulmadı','Sepolia kurulumu tamamlanıp config.js yayımlandığında kayıtlar burada görünecek.'));return;}
  if(!records.length){list.append(emptyState('Henüz kayıt gösterilemiyor','Defter boş olabilir veya bağlantı yenilenmesi gerekebilir.'));return;}
  const {replacedIds}=summarize(records);
  for(const r of records.toReversed()) {
    const row=node('article','admin-record');
    const text=node('div');text.append(node('strong','',`#${r.id} · ${r.description}`),node('small','',`${r.kind===0?'Gelir':'Gider'} · ${formatDate(r.recordedAt)} · ${replacedIds.has(r.id)?'Düzeltildi':r.replacesId?'Düzeltme kaydı':'Geçerli'}`));
    const actions=node('div','admin-record-actions');actions.append(node('span','',formatTL(r.amount)));
    if(wallet?.authorized&&!replacedIds.has(r.id)) {
      const button=node('button','button button-outline button-small','Düzelt');button.type='button';button.disabled=busy;
      button.addEventListener('click',()=>selectCorrection(r));actions.append(button);
    }
    row.append(text,actions);list.append(row);
  }
}

function selectCorrection(record) {
  correction=record;
  $('#form-title').textContent=`#${record.id} için düzeltme`;
  $('#record-type').value=String(record.kind);
  $('#amount').value=amountInput(record.amount);
  $('#description').value=record.description;
  $('#counterparty').value=record.counterparty;
  $('#category').value=record.category;
  if(!$('#category').value)$('#category').value='Diğer';
  $('#privacy-check').checked=false;
  $('#correction-info').hidden=false;
  $('#correction-info').textContent=`Önceki ${formatTL(record.amount)} tutarındaki kayıt korunacak. Yeni beyan onun yerine hesaplanacak. Değişikliği açıklamada belirtin.`;
  $('#cancel-correction').hidden=false;
  $('#submit-record').textContent='Düzeltmeyi zincire yaz ↗';updateControls();
  $('#record-form').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  $('#amount').focus({preventScroll:true});
}

function resetForm() {
  correction=null;$('#record-form').reset();$('#form-title').textContent='Yeni kayıt ekle';
  $('#correction-info').hidden=true;$('#cancel-correction').hidden=true;$('#submit-record').textContent='Kaydı zincire yaz ↗';updateControls();
}

async function refresh() {
  if(!isConfigured())return;
  try {
    const result=await readLedger({links:false});records=result.records;
    showBanner(`CANLI SEPOLIA · ${records.length} kayıt · Blok #${result.block.toLocaleString('tr-TR')}. Beyanlar gerçek ödeme doğrulaması değildir.`,'notice notice-live');
  } catch(error) {records=[];forgetReader();showBanner(explainError(error),'notice notice-error');}
  renderRecords();
}

async function connect() {
  if(busy)return;busy=true;updateControls();
  try {
    wallet=await connectWallet();
    $('#wallet-status').textContent=`${shortAddress(wallet.address)} · Sepolia · ${wallet.authorized?'Kayıt yetkisi var':isConfigured()?'Kayıt yetkisi yok':'İlk kurulum'}`;
    $('#connect-wallet').textContent='Cüzdanı yeniden bağla ↻';
    status(isConfigured()?(wallet.authorized?'Cüzdan doğrulandı. Kayıt ekleyebilirsiniz.':'Bu cüzdan kayıt eklemeye yetkili değil.'):'Cüzdan bağlandı. İlk kurulumu aşağıdan yapabilirsiniz.');
  } catch(error) {wallet=null;$('#wallet-status').textContent='Cüzdan bağlanamadı';status(explainError(error),'',true);}
  finally {busy=false;updateControls();}
}

async function performWrite(send, success) {
  if(busy||!wallet)return false;
  busy=true;updateControls();let hash='';
  try {
    await assertWallet(wallet);
    status('İşlemi MetaMask’ta inceleyip onaylayın.');
    const tx=await send();hash=tx.hash;
    status('İşlem gönderildi. Zincir onayı bekleniyor; henüz tamamlanmış sayılmaz.',hash);
    const receipt=await tx.wait(1);
    if(!receipt||receipt.status!==1)throw new Error('İşlem başarısız oldu. Explorer’dan kontrol edin.');
    status(success,receipt.hash);
    await refresh();
    return true;
  } catch(error) {status(explainError(error),hash,true);return false;}
  finally {busy=false;updateControls();}
}

$('#record-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!wallet?.authorized)return;
  try {
    const amount=parseTL($('#amount').value);
    const description=$('#description').value.trim(),category=$('#category').value,counterparty=$('#counterparty').value.trim();
    validateText(description,category,counterparty);
    if(!$('#privacy-check').checked)throw new Error('Kişisel bilgi kontrolünü onaylayın.');
    const selected=correction;
    const done=await performWrite(()=>selected?wallet.contract.correctRecord(selected.id,amount,description,category,counterparty):wallet.contract.addRecord(Number($('#record-type').value),amount,description,category,counterparty),selected?'Düzeltme onaylandı. Önceki kayıt korunuyor.':'Kayıt onaylandı ve zincire eklendi.');
    if(done)resetForm();
  } catch(error){status(explainError(error),'',true);}
});

$('#connect-wallet').addEventListener('click',connect);
$('#cancel-correction').addEventListener('click',resetForm);
$('#refresh-admin').addEventListener('click',refresh);

$('#admin-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!wallet?.isOwner||busy)return;
  try {
    const address=getAddress(event.target.elements.address.value.trim());
    const enabled=event.target.elements.enabled.value==='true';
    await performWrite(()=>wallet.contract.setAdmin(address,enabled),'Yönetici yetkisi güncellendi.');
  } catch(error){status(explainError(error),'',true);}
});
$('#owner-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!wallet?.isOwner||busy)return;
  try {
    const address=getAddress(event.target.elements.address.value.trim());
    await performWrite(()=>wallet.contract.proposeOwner(address),'Devir önerisi kaydedildi. Yeni sahip kendi cüzdanıyla bağlanıp kabul etmeli.');
  } catch(error){status(explainError(error),'',true);}
});
$('#accept-owner').addEventListener('click',async()=>{
  if(!wallet?.isPendingOwner||busy)return;
  const done=await performWrite(()=>wallet.contract.acceptOwnership(),'Devir kabul edildi. Önceki sahibin yönetici yetkisi kaldırıldı.');
  if(done)await connect();
});

function renderDeployment(receipt) {
  if(!receipt.contractAddress||receipt.status!==1)throw new Error('Kurulum işlemi başarılı değil. Explorer’dan kontrol edin.');
  deployedConfig={...CONFIG,contractAddress:receipt.contractAddress,deploymentBlock:receipt.blockNumber};
  clearDeployment();
  status(`Sözleşme kuruldu: ${receipt.contractAddress}. İndirdiğiniz config.js dosyasını dist/config.js yerine koyup siteyi yeniden yayımlayın. Diğer cihazlar ancak bu yayından sonra canlı kayıtları görecek.`,receipt.hash,false,$('#deployment-status'));
  $('#download-config').hidden=false;
}

$('#deploy-contract').addEventListener('click',async()=>{
  if(busy||!wallet)return;busy=true;updateControls();let hash=pendingDeployment()||'';
  try {
    if(hash) {
      status('Bekleyen kurulumun zincir durumu kontrol ediliyor…',hash,false,$('#deployment-status'));
      const reader=await getReader();const receipt=await reader.getTransactionReceipt(hash);
      if(!receipt){status('İşlem henüz onaylanmadı. Explorer’dan kontrol edip daha sonra yeniden sorgulayın.',hash,false,$('#deployment-status'));return;}
      if(receipt.status!==1){clearDeployment();throw new Error('Önceki kurulum işlemi başarısız. Yeniden kurabilirsiniz.');}
      renderDeployment(receipt);
    } else {
      status('Sepolia test ağına kurulum için MetaMask onayını bekliyoruz.', '',false,$('#deployment-status'));
      const contract=await deployContract(wallet);const tx=contract.deploymentTransaction();hash=tx.hash;storeDeployment(hash);
      status('Kurulum gönderildi, zincir onayı bekleniyor. Bu işlemi yeniden göndermeyin.',hash,false,$('#deployment-status'));
      const receipt=await tx.wait(1);renderDeployment(receipt);
    }
  } catch(error){status(explainError(error),hash,true,$('#deployment-status'));}
  finally{busy=false;updateControls();}
});
$('#download-config').addEventListener('click',()=>{
  if(deployedConfig)downloadFile('config.js','// Public configuration. No private keys or secrets.\nexport const CONFIG = Object.freeze('+JSON.stringify(deployedConfig,null,2)+');\n','text/javascript;charset=utf-8');
});

if(window.ethereum?.on) {
  const invalidate=()=>{wallet=null;correction=null;$('#wallet-status').textContent='Cüzdan veya ağ değişti. Yeniden bağlanın.';if(!busy)status('Cüzdan bağlantısı yenilenmeli.');updateControls();};
  window.ethereum.on('accountsChanged',invalidate);window.ethereum.on('chainChanged',invalidate);
}
if(!isConfigured()) {
  showBanner('KURULUM BEKLİYOR · Sözleşme adresi henüz yapılandırılmadı. Örnek görünümde gerçek kayıt eklenmez.');
  $('#setup-panel').hidden=false;$('#expected-owner').textContent=CONFIG.expectedOwner;
  if(pendingDeployment())status('Bu tarayıcı oturumunda bekleyen bir kurulum var. Yeni bir sözleşme oluşturmadan mevcut işlemi kontrol edin.',pendingDeployment(),false,$('#deployment-status'));
}
updateControls();await refresh();
