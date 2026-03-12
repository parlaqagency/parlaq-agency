const crypto = require("crypto");
const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { name, email, phone, address, notes, packageName, amount } = req.body;

    // Ortam değişkenlerinden PayTR bilgilerini al
    const merchant_id = (process.env.PAYTR_MERCHANT_ID || "").trim();
    const merchant_key = (process.env.PAYTR_MERCHANT_KEY || "").trim();
    const merchant_salt = (process.env.PAYTR_MERCHANT_SALT || "").trim();

    if (!merchant_id || !merchant_key || !merchant_salt) {
      console.error("PayTR environment variables missing.");
      return res.status(500).json({ error: "PayTR ayarları (ID, Key, Salt) eksik. Lütfen Vercel panelinden kontrol edin." });
    }

    const original_amount_usd = amount || 100;
    let final_amount_try = 0;
    let exchange_rate = 1;

    // 1. ADIM: Güncel USD/TRY kurunu çek
    try {
      const rateResponse = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const rateData = await rateResponse.json();
      exchange_rate = rateData.rates.TRY;
      final_amount_try = Math.round(original_amount_usd * exchange_rate); 
    } catch (e) {
      console.error("Döviz kuru çekilemedi:", e);
      return res.status(500).json({ error: "Döviz kuru alınamadı. Lütfen tekrar deneyin." });
    }

    const order_amount = final_amount_try; 
    const payment_amount = Math.floor(order_amount * 100).toString(); // Kuruş bazında tam sayı
    
    const user_name = (name || "Müşteri").substring(0, 60);
    const user_address = (address || "Adres Belirtilmedi").substring(0, 255);
    const user_phone = (phone || "0000000000").substring(0, 20);
    const user_email = (email || "musteri@email.com").substring(0, 100);
    const order_notes = notes || "";
    const package_name = (packageName || "Premium Paket").substring(0, 100);

    // 2. ADIM: Siparişi veritabanına kaydet (currency kolonu yoksa önce ekle)
    try {
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';`;
    } catch (e) { /* Kolon zaten varsa hata görmezden gel */ }

    const orderResult = await sql`
      INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, order_notes, package_name, amount, currency, status)
      VALUES (${user_name}, ${user_email}, ${user_phone}, ${user_address}, ${order_notes}, ${package_name}, ${order_amount}, 'TRY', 'pending')
      RETURNING id;
    `;
    
    const orderId = orderResult.rows[0].id;
    // SADECE RAKAM KULLANIYORUZ - PayTR'ın en sevdiği format
    const merchant_oid = orderId.toString();

    await sql`
      UPDATE orders SET merchant_oid = ${merchant_oid} WHERE id = ${orderId};
    `;

    let user_ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "1.1.1.1";
    if (user_ip.includes(",")) {
      user_ip = user_ip.split(",")[0].trim();
    }
    // Sepet içeriğinde özel karakterleri temizle
    const basket_name = package_name.replace(/[^a-zA-Z0-9 ]/g, "");
    const user_basket = [[`${basket_name}`, order_amount.toString(), 1]];
    const user_basket_encoded = Buffer.from(JSON.stringify(user_basket)).toString("base64");

    const merchant_ok_url = "https://parlaq.agency/?payment=success";
    const merchant_fail_url = "https://parlaq.agency/?payment=failed";
    const timeout_limit = "30";
    const debug_on = "1"; // Debug açık
    const test_mode = "0"; 
    const no_installment = "0";
    const max_installment = "0";
    const currency = "TRY";

    const hash_str = merchant_id + user_ip + merchant_oid + user_email + payment_amount + user_basket_encoded + no_installment + max_installment + currency + test_mode;

    const paytr_token = crypto
      .createHmac("sha256", merchant_key)
      .update(hash_str + merchant_salt)
      .digest("base64");

    const postData = {
      merchant_id, user_ip, merchant_oid, email: user_email, payment_amount,
      paytr_token, user_basket: user_basket_encoded, debug_on, no_installment,
      max_installment, user_name, user_address, user_phone, merchant_ok_url,
      merchant_fail_url, timeout_limit, currency, test_mode,
    };

    const response = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(postData).toString(),
    });

    const result = await response.json();

    if (result.status === "success") {
      return res.status(200).json({ token: result.token, orderId: merchant_oid });
    } else {
      console.error("PayTR Error Details:", result);
      return res.status(500).json({ error: result.reason + " (OID: " + merchant_oid + ")" });
    }
  } catch (error) {
    console.error("Sipariş Hatası:", error);
    return res.status(500).json({ error: "Sipariş oluşturulurken bir hata oluştu." });
  }
}
