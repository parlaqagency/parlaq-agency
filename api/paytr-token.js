const crypto = require("crypto");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { name, email, phone, address, notes } = req.body;

    // Ortam değişkenlerinden PayTR bilgilerini al
    const merchant_id = process.env.PAYTR_MERCHANT_ID;
    const merchant_key = process.env.PAYTR_MERCHANT_KEY;
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT;

    // Eğer değişkenler eksikse hata dön
    if (!merchant_id || !merchant_key || !merchant_salt) {
      console.error("PayTR environment variables missing.");
      return res.status(500).json({ error: "Server Configuration Error" });
    }

    // Sipariş tutarı (Kuruş cinsinden. Örn: 18.000 TL = 1800000 kuruş)
    // Güvenlik için tutarı frontend'den almak yerine backend'de sabit tanımlamalıyız
    // Eğer sepette birden fazla ürün varsa, fiyata göre dinamik yapılabilir.
    // Şimdilik Paket Fiyatı 18.000 TL olarak sabitliyorum. (Tek paket var)
    const payment_amount = "1800000"; 

    // Eşsiz sipariş numarası oluştur
    const merchant_oid = "PRLQ" + Date.now() + Math.floor(Math.random() * 1000);

    // Müşterinin adresi, bilgileri veya form notları
    // user_address içerisinde notları da ekleyelim
    const user_name = name || "Müşteri";
    const user_address = `${address || "Adres Belirtilmedi"} | Notlar: ${notes || "Yok"}`;
    const user_phone = phone || "0000000000";
    const user_email = email || "musteri@email.com";
    
    // Müşterinin IP adresi (Vercel'de req.headers['x-forwarded-for'])
    const user_ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    const email_str = user_email;
    const user_basket = [
      ["Premium Mağaza Kurulumu", "18000.00", 1], // [Ürün Adı, Birim Fiyat (TL), Adet]
    ];
    // user_basket'i base64 kodlamamız lazım
    const user_basket_encoded = Buffer.from(JSON.stringify(user_basket)).toString("base64");

    const merchant_ok_url = "https://parlaq.agency/?payment=success";
    const merchant_fail_url = "https://parlaq.agency/?payment=failed";
    
    // İframe'de gösterilecekse
    const timeout_limit = "30";
    const debug_on = "1"; // Canlıya geçince 0 yapabilirsin
    // Test mode
    const test_mode = "0"; // 0 Canlı mode, 1 Test Mode. PayTR panelin test modundaysa test ödemesi geçebilir.
    const no_installment = "0"; // Taksit yapılabilsin
    const max_installment = "0"; // Maximum taksit sayısı, 0 = sınırsız

    const currency = "TL";

    // Hash string oluştur (Tümü bitişik olacak, arada boşluk yok)
    // hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode + merchant_salt
    const hash_str = merchant_id + user_ip + merchant_oid + email_str + payment_amount + user_basket_encoded + no_installment + max_installment + currency + test_mode;

    const paytr_token = crypto
      .createHmac("sha256", merchant_key)
      .update(hash_str + merchant_salt)
      .digest("base64");

    const postData = {
      merchant_id,
      user_ip,
      merchant_oid,
      email: email_str,
      payment_amount,
      paytr_token,
      user_basket: user_basket_encoded,
      debug_on,
      no_installment,
      max_installment,
      user_name,
      user_address,
      user_phone,
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit,
      currency,
      test_mode,
    };

    // PayTR API'sine POST isteği at
    const response = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(postData).toString(),
    });

    const result = await response.json();

    if (result.status === "success") {
      return res.status(200).json({ token: result.token });
    } else {
      console.error("PayTR Token Hatası:", result.reason);
      return res.status(500).json({ error: result.reason });
    }
  } catch (error) {
    console.error("Beklenmeyen Hata:", error);
    return res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
}
