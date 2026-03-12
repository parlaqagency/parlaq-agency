-- Sipariş tablosu oluşturma
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

-- Sipariş numarasını 10000'den başlatma (Sadece tablo boşken çalışır)
ALTER SEQUENCE orders_id_seq RESTART WITH 10000;
