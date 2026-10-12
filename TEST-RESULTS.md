# Doğrulama kayıtları

Tarih: 12 Ekim 2026. Bu dosya yerel geliştirme doğrulamasını anlatır; Sepolia deployment belgesi değildir.

## Derleme

Solidity 0.8.30, optimizer 200, viaIR true, EVM Paris ile AcikKasa derlendi. Deployment bytecode: 6489 bayt. ABI ve bytecode sözleşme kaynağından üretildi; hazır ethers.js 6.17.0 dağıtımı yerel vendor dizinine alındı.

## Otomatik testler

- `ledger.test.mjs`: Türkçe tutar girişi, kuruş hesaplaması, negatif bakiye, ardışık düzeltmeler, UTF-8 sınırları ve CSV formula injection kontrolü — 5 test geçti.
- `contract.test.mjs`: constructor, doğrudan yetkisiz çağrılar, event'ler, bakiye, düzeltme geçmişi, başarısız düzeltmenin geri alınması, yetki iptali, iki aşamalı devir, sayfalama ve sınırlar — 7 test geçti.
- `chain.test.mjs`: gerçek frontend okuma modülü ile yerel RPC'den kayıtlar, düzeltmeler ve işlem hash'lerinin okunması; cüzdansız yeniden bağlantı — 1 test geçti.

Toplam: 13 test. Sözleşme ve okuma entegrasyonu yerel Ganache üzerinde çalıştırıldı. Yerel test ağı Sepolia chain ID'sini kullanarak frontend ağ kontrolünü de denedi; bu ağ gerçek Sepolia değildir. Testte üretim config.js'i değiştirilmedi.

## Tarayıcı

- Açık defterin 5.000 TL / 1.500 TL / 3.500 TL salt okunur örneklerini göstermesi kontrol edildi.
- Gelir/gider filtresi, sonuçsuz arama, kayıt ayrıntısı ve örneklerde gerçek explorer linki bulunmaması kontrol edildi.
- 390 piksel mobil viewport'ta açık defter incelendi; yatay taşma görülmedi. Bu, fiziksel telefon testi değildir.
- Yönetim panelinin kurulum beklerken yazmayı kapatması ve MetaMask olmayan tarayıcıda açıklayıcı hata vermesi kontrol edildi.
- JavaScript sözdizimi, yerel sayfa dosyaları ve Sepolia ayarları kontrol edildi.

## Henüz doğrulanmayanlar

Gerçek MetaMask imzasıyla Sepolia'ya kurulum, gerçek ağda kayıt/düzeltme ve fiziksel telefon testi.

GitHub teslim reposu: https://github.com/peponnn/acikkasa. Kaynak yüklemesi sonrasında dosyalar yerel sürümle ayrıca karşılaştırılır.
