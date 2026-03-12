const crypto = require("crypto");
const { sql } = require('@vercel/postgres');

const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY;
const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {
    merchant_oid, status, total_amount, hash, failed_reason_msg
  } = req.body;

  const hashStr = `${merchant_oid}${PAYTR_MERCHANT_SALT}${status}${total_amount}`;
  const expectedHash = crypto
    .createHmac("sha256", PAYTR_MERCHANT_KEY)
    .update(hashStr)
    .digest("base64");

  if (hash !== expectedHash) {
    return res.status(200).send("OK");
  }

  try {
    if (status === "success") {
      // ✅ Siparişi "paid" (ödendi) olarak güncelle
      await sql`
        UPDATE orders SET status = 'paid' WHERE merchant_oid = ${merchant_oid};
      `;
      console.log(`✅ Sipariş Onaylandı: ${merchant_oid}`);
    } else {
      // ❌ Siparişi "failed" olarak güncelle
      await sql`
        UPDATE orders SET status = 'failed' WHERE merchant_oid = ${merchant_oid};
      `;
      console.log(`❌ Sipariş Başarısız: ${merchant_oid} - Sebep: ${failed_reason_msg}`);
    }
  } catch (error) {
    console.error("Callback Veritabanı Hatası:", error);
  }

  return res.status(200).send("OK");
}
