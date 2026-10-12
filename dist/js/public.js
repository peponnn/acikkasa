import { CONFIG } from '../config.js';
import { DEMO_RECORDS } from './demo.js';
import { isConfigured, readLedger, forgetReader, explorerTx, explorerAddress, explainError } from './chain.js';
import { summarize, formatTL, formatDate, shortAddress, exportCSV } from './ledger.js';
import { node, externalLink, downloadFile, emptyState } from './ui.js';

const $ = s => document.querySelector(s);
let records = [], totals = summarize([]), filter = 'all', query = '', loading = false, failed = false;
const banner = $('#mode-banner');
const demo = !isConfigured();

function renderBanner(warning = '') {
  banner.replaceChildren();
  banner.className = demo ? 'notice' : 'notice notice-live';
  if (demo) {
    banner.append(node('strong','','ÖRNEK GÖRÜNÜM'), node('span','','Bu iki kayıt kurgusaldır; zincire yazılmamıştır. Sepolia sözleşmesi henüz yapılandırılmadı.'));
    const link = node('a','','Kurulum bilgisi ↗'); link.href='./admin.html'; banner.append(link);
  } else {
    banner.append(node('strong','','CANLI SEPOLIA KAYITLARI'), node('span','',warning || 'Beyanlar doğrudan sözleşmeden okunur. Gerçek para transferi yapılmaz.'));
    banner.append(externalLink('Sözleşmeyi incele ↗',explorerAddress()));
    if(warning) banner.className='notice';
  }
}

function renderTotals() {
  $('#total-income').textContent = failed || loading ? '—' : formatTL(totals.income);
  $('#total-expense').textContent = failed || loading ? '—' : formatTL(totals.expense);
  $('#total-balance').textContent = failed || loading ? '—' : formatTL(totals.balance);
  $('#record-count').textContent = String(records.length);
  $('#export').disabled = failed || loading || records.length === 0;
}

function openDetails(record) {
  const body = $('#dialog-body'); body.replaceChildren();
  $('#dialog-title').textContent = `Kayıt #${record.id}`;
  const dl = node('dl','detail-list');
  const details = [['Tür',record.kind===0?'Gelir':'Gider'],['Tutar',formatTL(record.amount)],['Açıklama',record.description],['Kategori',record.category||'Diğer'],['Kurum',record.counterparty||'Belirtilmedi'],['Kayıt zamanı',new Date(record.recordedAt*1000).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})+' (İstanbul)'],['Kaydeden',demo?'Örnek cüzdan':record.author],['Durum',totals.replacedIds.has(record.id)?'Yeni kayıtla düzeltildi':'Geçerli']];
  for (const [label,value] of details) dl.append(node('dt','',label),node('dd','',value));
  body.append(dl);
  if(record.txHash) body.append(externalLink('Bu kaydın işlemini doğrula ↗',explorerTx(record.txHash),'detail-link'));
  if(demo) body.append(node('p','sample-label','Örnek kayıt: blockchain işlemi ve doğrulama bağlantısı bulunmaz.'));
  const chain=[];
  let root=record;
  while(root.replacesId) { const prior=records.find(r=>r.id===root.replacesId);if(!prior)break;root=prior; }
  let current=root;
  while(current) { chain.push(current);current=records.find(r=>r.replacesId===current.id); }
  if(chain.length>1) {
    body.append(node('h3','','Düzeltme geçmişi'));
    const list=node('ol','history-list');
    for(const r of chain) {
      const item=node('li','',`#${r.id} · ${formatTL(r.amount)} · ${totals.replacedIds.has(r.id)?'Önceki beyan':'Son geçerli beyan'}`);
      item.append(node('small','',r.description));
      if(r.txHash)item.append(externalLink('İşlemi incele ↗',explorerTx(r.txHash),'detail-link'));
      list.append(item);
    }
    body.append(list);
  }
  $('#record-dialog').showModal();
}

function renderRecords() {
  const list=$('#records');list.replaceChildren();
  if(loading){list.append(emptyState('Kayıtlar okunuyor…','Sepolia bağlantısı ve kayıt geçmişi kontrol ediliyor.'));return;}
  if(failed){list.append(emptyState('Kayıtlara ulaşılamadı','Bağlantı sorununu giderip Yenile düğmesine basın.'));return;}
  const visible=records.filter(r=>(filter==='all'||r.kind===(filter==='income'?0:1))&&`${r.description} ${r.category} ${r.counterparty} #${r.id}`.toLocaleLowerCase('tr-TR').includes(query)).toReversed();
  if(!visible.length){list.append(emptyState(records.length?'Aramanıza uygun kayıt yok':'Defter henüz boş',records.length?'Başka bir kelime veya kayıt türü deneyin.':'İlk gelir veya gider kaydı eklendiğinde burada görünecek.'));return;}
  for(const r of visible) {
    const corrected=totals.replacedIds.has(r.id);
    const row=node('article',`record-row${corrected?' corrected':''}`);
    const titleCell=node('div','record-title-cell');
    titleCell.append(node('span',`record-symbol ${r.kind===0?'income-icon':'expense-icon'}`,r.kind===0?'↙':'↗'));
    const text=node('div');
    const title=node('button','record-title',r.counterparty||r.description);title.type='button';title.addEventListener('click',()=>openDetails(r));
    text.append(title,node('span','record-description',r.counterparty?r.description:`Kayıt #${r.id}`));
    if(corrected)text.append(node('span','correction-badge','Düzeltildi · geçmiş korunuyor'));
    else if(r.replacesId)text.append(node('span','correction-badge',`#${r.replacesId} için düzeltme`));
    titleCell.append(text);
    const category=node('div','record-category');category.append(node('span','tag',r.category||'Diğer'));
    const amount=node('div',`record-amount ${r.kind===0?'amount-income':'amount-expense'}`,`${r.kind===0?'+':'−'}${formatTL(r.amount)}`);
    const verify=node('div','record-verification');
    if(r.txHash)verify.append(externalLink('Doğrula ↗',explorerTx(r.txHash)));
    else verify.append(node('span','sample-label',demo?'Örnek kayıt':'Bağlantı bekleniyor'));
    row.append(titleCell,category,node('div','record-date',formatDate(r.recordedAt)),amount,verify);list.append(row);
  }
}

async function load() {
  if(loading)return;
  loading=true;failed=false;$('#refresh').disabled=true;renderTotals();renderRecords();
  try {
    if(demo){records=DEMO_RECORDS.map(r=>({...r}));totals=summarize(records);renderBanner();$('#updated-at').textContent='Salt okunur örnekler · gerçek kayıt değildir';}
    else {
      const result=await readLedger();records=result.records;totals=result.totals;renderBanner(result.linkWarning);
      $('#updated-at').textContent=`Blok #${result.block.toLocaleString('tr-TR')} · ${new Date().toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'})} itibarıyla`;
    }
  } catch(error) {
    failed=true;records=[];totals=summarize([]);forgetReader();banner.className='notice notice-error';banner.textContent=explainError(error);
    $('#updated-at').textContent='Canlı okuma başarısız. Örnek veriye geçilmedi.';
  } finally {loading=false;$('#refresh').disabled=false;renderTotals();renderRecords();}
}

document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  filter=button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});renderRecords();
}));
$('#search').addEventListener('input',event=>{query=event.target.value.trim().toLocaleLowerCase('tr-TR');renderRecords();});
$('#refresh').addEventListener('click',load);
$('#export').addEventListener('click',()=>downloadFile(demo?'acikkasa-ornek-kayitlar.csv':'acikkasa-kayitlar.csv',exportCSV(records),'text/csv;charset=utf-8'));
$('#close-dialog').addEventListener('click',()=>$('#record-dialog').close());
$('#record-dialog').addEventListener('click',event=>{if(event.target===$('#record-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
if(!demo){const link=$('#contract-link');link.href=explorerAddress();link.target='_blank';link.rel='noopener noreferrer';}
await load();
