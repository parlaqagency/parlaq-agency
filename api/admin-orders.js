import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Vercel'den gelen şifre
  const adminPassword = (process.env.ADMIN_PASSWORD || "Dilarakaan0308.").trim();
  const providedPassword = req.headers['x-admin-password']?.trim();

  // Şifre kontrolü (Eğer env var çalışmazsa manuel olarak da kontrol ediyoruz)
  if (providedPassword !== adminPassword && providedPassword !== "Dilarakaan0308.") {
    return res.status(401).json({ 
      error: "Hatalı şifre.",
      debug: "Lütfen girdiğiniz şifreyi kontrol edin."
    });
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
