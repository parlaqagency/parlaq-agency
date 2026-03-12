# PayTR Ödeme Sistemi Entegrasyon Özeti ve Canlı Mod Rehberi

Bu dosya, Parlaq Agency web sitesi için tamamlanan PayTR iFrame entegrasyonu hakkında teknik detayları ve Canlı Moda geçiş için yapılması gerekenleri içerir.

## 🛠 Mevcut Teknik Altyapı

1.  **Frontend (index.html):**
    *   **Zarif Ödeme Formu:** "Projeyi Başlat" butonuyla açılan, premium tasarıma uygun bir modal eklendi.
    *   **Kullanıcı Bilgileri:** Ad-Soyad, E-posta, Telefon, Adres ve Proje Notları toplanıyor.
    *   **PayTR iFrame:** Form gönderildiğinde backend'den alınan bilet (token) ile PayTR ödeme ekranı güvenli bir şekilde modal içinde yükleniyor.
    *   **Özellikler:** Lenis scroll çakışması giderildi (`data-lenis-prevent`), formda Enter tuşu desteği eklendi.

2.  **Backend (Vercel Serverless Functions):**
    *   `api/paytr-token.js`: PayTR API'sine bağlanıp güvenli ödeme biletini (token) oluşturan ana script. 18.000 TL tutarındaki "Premium Mağaza Kurulumu" paketi burada tanımlıdır.
    *   `api/paytr-callback.js`: Ödeme başarılı veya başarısız olduğunda PayTR'nin siteye bildirim gönderdiği güvenli endpoint. Sipariş numarası ve tutar doğrulaması yapar.

3.  **Ortam Değişkenleri (Vercel Environment Variables):**
    *   `PAYTR_MERCHANT_ID`
    *   `PAYTR_MERCHANT_KEY`
    *   `PAYTR_MERCHANT_SALT`
    *   (Bu değişkenler Vercel panelinde tanımlı durumdadır.)

## 🚀 PayTR Panelinde Canlı Moda Geçiş Adımları

Şu an sistem teknik olarak hazır, ancak PayTR mağazanız **"Test Modunda"** olabilir. Ödeme alabilmek için şu adımları takip etmelisiniz:

### 1. Canlı Moda Geçiş Başvurusu
*   PayTR Paneli'ne giriş yapın.
*   Eğer mağazanız henüz onaylanmadıysa, "Canlı Mod" sekmesinden veya ana sayfadaki uyarı şeridinden gerekli belgeleri (Vergi Levhası, İmza Sirküleri vb.) yükleyin.
*   "Entegrasyon Bilgileri" sekmesindeki API bilgilerinin Vercel'dekilerle aynı olduğundan emin olun.

### 2. Callback URL (Bildirim URL) Ayarı
PayTR panelinde **"Ayarlar"** veya **"Genel Ayarlar"** kısmında bulunan **"Bildirim URL (Callback URL)"** alanına aşağıdaki URL'yi yapıştırmanız ve kaydetmeniz GEREKİR:
> `https://parlaq.agency/api/paytr-callback`

### 3. Test Modunu Kapatma
*   Sistemimiz şu an default olarak Canlı Mod (`test_mode = 0`) ayarındadır.
*   Eğer gerçek kredi kartıyla ödeme denediğinizde "Mağaza test modundadır" hatası alırsanız, PayTR panelinden mağazanızı test modundan çıkarıp canlıya almalısınız.

## 📌 Cursor Notu
*"Gelecekte fiyat değişikliği veya yeni paket ekleme durumunda `api/paytr-token.js` dosyasındaki `payment_amount` değişkenini ve `user_basket` dizisini güncellemeniz yeterli olacaktır."*

---
**Durum:** Teknik Altyapı %100 Hazır.
**Bekleyen:** PayTR Panel Onayı ve Bildirim URL Tanımlaması.
