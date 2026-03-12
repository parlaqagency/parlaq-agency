const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    // Tabloyu oluştur
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          customer_name VARCHAR(255) NOT NULL,
          customer_email VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(50) NOT NULL,
          customer_address TEXT NOT NULL,
          order_notes TEXT,
          amount DECIMAL(10, 2) DEFAULT 18000.00,
          status VARCHAR(50) DEFAULT 'pending',
          merchant_oid VARCHAR(100) UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // ID başlangıcını 10000 yap (Sadece tablo boşsa veya gerekliyse)
    // Not: Bu işlem her seferinde çalışsa da hata vermez ancak seq'i resetler. 
    // Sadece bir kez çalışması yeterli.
    await sql`ALTER SEQUENCE orders_id_seq RESTART WITH 10000;`;

    return res.status(200).json({ message: "Veritabanı başarıyla hazırlandı. Tablo oluşturuldu ve ID 10000'den başlatıldı." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
