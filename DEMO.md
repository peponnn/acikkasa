# AçıkKasa — üç dakikalık demo akışı

Bu metin sunum taslağıdır. Sepolia kurulumu ve aşağıdaki adımlar gerçekten denenmeden çalışan canlı demo diye sunulmaz.

1. **0:00–0:25 — Problem:** “Yeni bir kulübüz. Üyelerimizin ve sponsorlarımızın hangi gelir ve harcamaları beyan ettiğimizi görebilmesini istiyoruz.”
2. **0:25–1:15 — Canlı kayıt:** Yetkili MetaMask hesabıyla Sepolia'da 5.000 TL gelir ve 1.500 TL gider ekleyin. Açıklamada bunların hackathon test kayıtları olduğunu belirtin. İşlemler onaylanmalı.
3. **1:15–1:45 — Ziyaretçi:** Cüzdan bağlamadan açık defteri açın. Gelir 5.000, gider 1.500, kayıtlara göre bakiye 3.500 TL. Doğrula bağlantısından ilgili işlemi açın.
4. **1:45–2:20 — Düzeltme:** Yönetimde gideri 1.200 TL olarak düzeltin. Onaydan sonra bakiye 3.800 TL olur. Ayrıntıda eski 1.500 TL beyanını ve yeni kaydı birlikte gösterin.
5. **2:20–2:45 — Sınır:** “Gerçek para blockchain'de dolaşmıyor. Zincir, yönetimin beyanını ve geçmişini koruyor; bankadaki ödemeyi doğrulamıyor.”
6. **2:45–3:00 — Devralma:** “Kaynak kodu, site ve yönetici yetkisi kulübe devredilebilir. Bu sürüm Sepolia prototipidir.”

Kurulum yoksa açık defter yalnızca örnek görünümde gösterilir ve blockchain bağlantısının henüz canlı olmadığı söylenir. Örnek kayıtlar üzerinden onchain bonusu kazanıldığı iddia edilmez.

## Soru-cevap için

- **Neden blockchain?** Beyanın orijinal içeriğini değiştiren işlev yok; düzeltme geçmişi herkesçe incelenebilir.
- **Yönetici yanlış tutar yazarsa?** Yeni bir düzeltme ekler; eski beyan korunur.
- **Yönetici hiç yazmazsa?** Sistem bunu otomatik tespit etmez; banka entegrasyonu yok.
- **Neden TL / kuruş?** Ondalık yuvarlama hatasını ve farklı para birimlerini yanlış toplamayı önlemek için.
- **Ziyaretçi cüzdanı?** Gerekmez; RPC üzerinden salt okunur erişim var.
