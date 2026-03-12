const { sql } = require('@vercel/postgres');

export default async function handler(req, res) {
  const envPass = (process.env.ADMIN_PASSWORD || "").trim();
  const fallbackPass = "Dilarakaan0308.";
  const providedPassword = (req.headers['x-admin-password'] || "").trim();

  const isAuthorized = (envPass && providedPassword === envPass) || (providedPassword === fallbackPass);

  if (!isAuthorized) {
    return res.status(401).json({ 
      error: "Şifre doğrulanamadı. Lütfen girdiğiniz şifreyi kontrol edin.",
      debug: { envSet: !!envPass }
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
