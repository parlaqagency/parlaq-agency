/**
 * PayTR Bildirim URL (Callback) - Vercel Serverless Function
 * URL: https://parlaq.agency/api/paytr-callback
 *
 * PayTR bu endpoint'e ödeme sonucunu POST atar.
 * Endpoint'in "OK" döndürmesi zorunludur, aksi halde PayTR tekrar dener.
 */

const crypto = require("crypto");

// PayTR Panel'den aldığın bilgiler - Environment Variable olarak sakla
const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY;
const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT;

export default async function handler(req, res) {
  // Sadece POST isteklerini kabul et
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {
    merchant_oid,   // Siparişin unique ID'si
    status,         // "success" veya "failed"
    total_amount,   // Ödeme tutarı (kuruş cinsinden, 100 = 1 TL)
    hash,           // PayTR'nin gönderdiği güvenlik hash'i
    failed_reason_code,
    failed_reason_msg,
    test_mode,
    payment_type,
    currency,
    payment_amount,
  } = req.body;

  // ----------------------------------------------------------------
  // 1. HASH DOĞRULAMA - Güvenlik için zorunlu!
  // ----------------------------------------------------------------
  const hashStr = `${merchant_oid}${PAYTR_MERCHANT_SALT}${status}${total_amount}`;
  const expectedHash = crypto
    .createHmac("sha256", PAYTR_MERCHANT_KEY)
    .update(hashStr)
    .digest("base64");

  if (hash !== expectedHash) {
    console.error("PayTR hash doğrulaması başarısız!", {
      merchant_oid,
      received: hash,
      expected: expectedHash,
    });
    // Hash eşleşmiyorsa güvenlik ihlali - yine de OK dön (PayTR'ye)
    return res.status(200).send("OK");
  }

  // ----------------------------------------------------------------
  // 2. ÖDEME DURUMUNA GÖRE İŞLEM YAP
  // ----------------------------------------------------------------
  const amountTL = parseInt(total_amount) / 100; // Kuruştan TL'ye

  if (status === "success") {
    // ✅ Ödeme Başarılı
    console.log(`✅ Başarılı Ödeme - Sipariş: ${merchant_oid}, Tutar: ${amountTL} TL`);

    // TODO: Burada kendi iş mantığını uygula:
    // - Veritabanında siparişi "ödendi" olarak güncelle
    // - Müşteriye onay e-postası gönder
    // - CRM'e kaydet
    // Örnek (şimdilik sadece log):
    await handleSuccessfulPayment({
      merchant_oid,
      total_amount: amountTL,
      payment_type,
      currency,
      test_mode,
    });

  } else if (status === "failed") {
    // ❌ Ödeme Başarısız
    console.warn(`❌ Başarısız Ödeme - Sipariş: ${merchant_oid}, Sebep: ${failed_reason_msg} (${failed_reason_code})`);

    await handleFailedPayment({
      merchant_oid,
      failed_reason_code,
      failed_reason_msg,
    });
  }

  // ----------------------------------------------------------------
  // 3. PAYTR'YE MUTLAKA "OK" DÖNDÜR
  // PayTR bu yanıtı almazsa bildirimi tekrar tekrar gönderir!
  // ----------------------------------------------------------------
  return res.status(200).send("OK");
}

// ----------------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// ----------------------------------------------------------------

async function handleSuccessfulPayment({ merchant_oid, total_amount, payment_type, currency, test_mode }) {
  // Bu fonksiyonu kendi ihtiyacına göre düzenle.
  // Örneğin: e-posta gönder, veritabanı güncelle, vb.
  
  if (test_mode === "1") {
    console.log("⚠️ TEST MODU - Gerçek ödeme değil");
  }

  // Örnek: Webhook ile başka bir servise bildir (opsiyonel)
  // await fetch("https://hooks.zapier.com/...", { method: "POST", body: JSON.stringify({...}) });
  
  console.log("Sipariş işlendi:", merchant_oid);
}

async function handleFailedPayment({ merchant_oid, failed_reason_code, failed_reason_msg }) {
  console.log("Başarısız sipariş loglandı:", merchant_oid, failed_reason_code);
}
