const crypto = require("crypto");
import { sql } from '@vercel/postgres';

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

    if (!merchant_id || !merchant_key || !merchant_salt) {
      console.error("PayTR environment variables missing.");
      return res.status(500).json({ error: "Server Configuration Error" });
    }

    const payment_amount = "1800000"; 
    const user_name = name || "Müşteri";
    const user_address = address || "Adres Belirtilmedi";
    const user_phone = phone || "0000000000";
    const user_email = email || "musteri@email.com";
    const order_notes = notes || "";

    // 1. ADIM: Siparişi veritabanına "pending" (beklemede) olarak kaydet
    const orderResult = await sql`
      INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, order_notes, amount, status)
      VALUES (${user_name}, ${user_email}, ${user_phone}, ${user_address}, ${order_notes}, 18000.00, 'pending')
      RETURNING id;
    `;
    
    const orderId = orderResult.rows[0].id; // Örn: 10001
    const merchant_oid = `PRLQ-${orderId}`; // Sipariş No Formatı: PRLQ-10001

    // 2. ADIM: Sipariş numarasını (merchant_oid) veritabanında güncelle
    await sql`
      UPDATE orders SET merchant_oid = ${merchant_oid} WHERE id = ${orderId};
    `;

    const user_ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const user_basket = [["Premium Mağaza Kurulumu", "18000.00", 1]];
    const user_basket_encoded = Buffer.from(JSON.stringify(user_basket)).toString("base64");

    const merchant_ok_url = "https://parlaq.agency/?payment=success";
    const merchant_fail_url = "https://parlaq.agency/?payment=failed";
    const timeout_limit = "30";
    const debug_on = "0";
    const test_mode = "0"; 
    const no_installment = "0";
    const max_installment = "0";
    const currency = "TL";

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
      return res.status(500).json({ error: result.reason });
    }
  } catch (error) {
    console.error("Sipariş Hatası:", error);
    return res.status(500).json({ error: "Sipariş oluşturulurken bir hata oluştu." });
  }
}
