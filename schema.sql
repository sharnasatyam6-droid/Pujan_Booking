CREATE TABLE IF NOT EXISTS bookings (
 id UUID PRIMARY KEY,
 customer_name TEXT NOT NULL,
 customer_phone TEXT NOT NULL,
 puja_date DATE NOT NULL,
 puja_time TEXT NOT NULL,
 puja_address TEXT NOT NULL,
 requirements TEXT NOT NULL DEFAULT '',
 amount_paise INTEGER NOT NULL CHECK (amount_paise = 210000),
 currency TEXT NOT NULL DEFAULT 'INR',
 status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid','payment_failed','cancelled')),
 razorpay_order_id TEXT UNIQUE,
 razorpay_payment_id TEXT UNIQUE,
 paid_at TIMESTAMPTZ,
 notification_status TEXT NOT NULL DEFAULT 'not_sent' CHECK (notification_status IN ('not_sent','sent','failed')),
 notification_error TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
