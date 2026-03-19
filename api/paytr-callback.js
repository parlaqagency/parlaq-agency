const crypto = require("crypto");
const { sql } = require('@vercel/postgres');
const { Resend } = require('resend');

const PAYTR_MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY;
const PAYTR_MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT;
const resend = new Resend(process.env.RESEND_API_KEY);

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

      // 📧 Müşteri ve ajans bildirim e-postalarını gönder
      const { rows } = await sql`
        SELECT customer_name, customer_email, package_name, amount FROM orders WHERE merchant_oid = ${merchant_oid};
      `;
      const order = rows[0];

      if (order) {
        const amountFormatted = order.amount
          ? Number(order.amount).toLocaleString('tr-TR') + ' ₺'
          : total_amount ? (Number(total_amount) / 100).toLocaleString('tr-TR') + ' ₺' : '';

        // Müşteriye onay maili
        await resend.emails.send({
          from: 'PARLAQ Agency <info@parlaq.agency>',
          to: order.customer_email,
          subject: '✅ Siparişiniz Alındı – PARLAQ Agency',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#6c63ff,#f72585);padding:32px;text-align:center;">
                <h1 style="margin:0;font-size:28px;">PARLAQ Agency</h1>
                <p style="margin:8px 0 0;opacity:0.9;">Siparişiniz başarıyla alındı</p>
              </div>
              <div style="padding:32px;">
                <p style="font-size:18px;">Merhaba <strong>${order.customer_name}</strong>,</p>
                <p>Ödemeniz onaylandı. En kısa sürede sizinle iletişime geçeceğiz.</p>
                <div style="background:#1a1a2e;border-radius:8px;padding:20px;margin:24px 0;">
                  <h3 style="margin:0 0 12px;color:#6c63ff;">Sipariş Detayları</h3>
                  <p style="margin:4px 0;">📦 Paket: <strong>${order.package_name || 'Belirtilmedi'}</strong></p>
                  <p style="margin:4px 0;">💰 Tutar: <strong>${amountFormatted}</strong></p>
                  <p style="margin:4px 0;">🔑 Sipariş No: <strong>${merchant_oid}</strong></p>
                </div>
                <p>Herhangi bir sorunuz için <a href="https://wa.me/905315155553" style="color:#6c63ff;">WhatsApp</a> üzerinden bize ulaşabilirsiniz.</p>
                <p style="margin-top:32px;color:#888;font-size:13px;">PARLAQ Agency – parlaqagency.com</p>
              </div>
            </div>
          `,
        });

        // Ajansa bildirim maili
        await resend.emails.send({
          from: 'PARLAQ Bildirim <info@parlaq.agency>',
          to: process.env.ADMIN_EMAIL,
          subject: `💰 Yeni Ödeme: ${order.customer_name} – ${amountFormatted}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <h2>🎉 Yeni Sipariş Geldi!</h2>
              <p><strong>Müşteri:</strong> ${order.customer_name}</p>
              <p><strong>E-posta:</strong> ${order.customer_email}</p>
              <p><strong>Paket:</strong> ${order.package_name || 'Belirtilmedi'}</p>
              <p><strong>Tutar:</strong> ${amountFormatted}</p>
              <p><strong>Sipariş No:</strong> ${merchant_oid}</p>
            </div>
          `,
        });

        console.log(`📧 E-postalar gönderildi: ${order.customer_email}`);

        // 📱 Telegram bildirimi
        const telegramMsg = encodeURIComponent(
          `🎉 YENİ SİPARİŞ!\n\n👤 ${order.customer_name}\n📦 ${order.package_name || 'Belirtilmedi'}\n💰 ${amountFormatted}\n🔑 ${merchant_oid}`
        );
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${process.env.TELEGRAM_CHAT_ID}&text=${telegramMsg}`);
        console.log(`📱 Telegram bildirimi gönderildi`);
      }
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
