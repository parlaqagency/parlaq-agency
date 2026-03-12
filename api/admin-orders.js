import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const providedPassword = req.headers['x-admin-password']?.trim();

  if (!adminPassword) {
    return res.status(500).json({ error: "Sunucu hatası: ADMIN_PASSWORD tanımlanmamış." });
  }

  if (providedPassword !== adminPassword) {
    return res.status(401).json({ error: "Hatalı şifre." });
  }

  try {
    const { rows } = await sql`
      SELECT * FROM orders 
      ORDER BY created_at DESC;
    `;
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Siparişler çekilirken bir hata oluştu." });
  }
}
