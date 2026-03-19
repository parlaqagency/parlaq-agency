const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, email, website } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Ad ve e-posta zorunludur.' });
  }

  try {
    // Ajansa bildirim
    await resend.emails.send({
      from: 'PARLAQ Lead <info@parlaq.agency>',
      to: process.env.ADMIN_EMAIL,
      subject: `🎯 Yeni Ücretsiz Analiz Talebi: ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2>🎯 Yeni Analiz Talebi!</h2>
          <p><strong>Ad:</strong> ${name}</p>
          <p><strong>E-posta:</strong> ${email}</p>
          <p><strong>Website:</strong> ${website || 'Belirtilmedi'}</p>
        </div>
      `,
    });

    // Kullanıcıya onay
    await resend.emails.send({
      from: 'PARLAQ Agency <info@parlaq.agency>',
      to: email,
      subject: '✅ Analiz talebiniz alındı – PARLAQ Agency',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6c63ff,#f72585);padding:32px;text-align:center;">
            <h1 style="margin:0;font-size:28px;">PARLAQ Agency</h1>
            <p style="margin:8px 0 0;opacity:0.9;">Talebiniz alındı</p>
          </div>
          <div style="padding:32px;">
            <p style="font-size:18px;">Merhaba <strong>${name}</strong>,</p>
            <p>Ücretsiz web sitesi analiz talebinizi aldık. En kısa sürede sizinle iletişime geçeceğiz.</p>
            <p style="margin-top:24px;color:#888;font-size:13px;">PARLAQ Agency – parlaq.agency</p>
          </div>
        </div>
      `,
    });

    // Telegram bildirimi
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const msg = encodeURIComponent(`🎯 Yeni Analiz Talebi!\n\n👤 ${name}\n📧 ${email}\n🌐 ${website || 'Belirtilmedi'}`);
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${process.env.TELEGRAM_CHAT_ID}&text=${msg}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Lead form hatası:', error);
    return res.status(500).json({ error: 'Bir hata oluştu.' });
  }
}
