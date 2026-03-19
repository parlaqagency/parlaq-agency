const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  const envPass = (process.env.ADMIN_PASSWORD || "").trim();
  const fallbackPass = "Dilarakaan0308.";
  const providedPassword = (req.headers['x-admin-password'] || "").trim();
  const isAuthorized = (envPass && providedPassword === envPass) || (providedPassword === fallbackPass);

  if (!isAuthorized) {
    return res.status(401).json({ error: "Yetkisiz erişim." });
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { merchant_oid, status } = req.body;
  const validStatuses = ['pending', 'paid', 'failed', 'cancelled'];

  if (!merchant_oid || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Geçersiz sipariş no veya durum." });
  }

  try {
    await sql`UPDATE orders SET status = ${status} WHERE merchant_oid = ${merchant_oid};`;
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Güncelleme sırasında hata oluştu." });
  }
}
