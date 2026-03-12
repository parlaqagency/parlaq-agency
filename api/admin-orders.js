import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const providedPassword = req.headers['x-admin-password']?.trim();

  if (!adminPassword || providedPassword !== adminPassword) {
    return res.status(401).json({ error: "Yetkisiz erişim." });
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
