const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'listings_db',
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL,
      category VARCHAR(100),
      location VARCHAR(255),
      image_url TEXT,
      is_sold BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL REFERENCES listings(id),
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      stripe_session_id VARCHAR(255) NOT NULL,
      buyer_name VARCHAR(255),
      buyer_phone VARCHAR(30),
      buyer_address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Existing databases created before delivery details were collected at
  // checkout won't have these columns yet — add them if missing so upgrades
  // don't require a manual migration.
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255);
  `);
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(30);
  `);
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_address TEXT;
  `);

  // Cart checkout puts several listings under one Stripe session, so
  // stripe_session_id can no longer be unique per row (one order row per
  // listing, many rows can share a session). Drop the old single-item-era
  // UNIQUE constraint if this table was created before that changed, and
  // replace it with a plain (non-unique) index for lookup speed.
  await pool.query(`
    DO $$
    DECLARE
      constraint_name text;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'orders'
        AND tc.constraint_type = 'UNIQUE'
        AND ccu.column_name = 'stripe_session_id';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', constraint_name);
      END IF;
    END $$;
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS orders_stripe_session_id_idx ON orders (stripe_session_id);
  `);

  // Per-buyer negotiated price from an accepted chat offer. This never
  // touches listings.price (which stays the same for everyone else) — it's
  // a private override that only applies when this specific buyer checks out.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS negotiated_prices (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      buyer_id INTEGER NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(listing_id, buyer_id)
    );
  `);

  // Up to 3 pickup spots the seller offers, set when the listing is posted.
  // Buyers who choose "pick up myself" at checkout pick one of these instead
  // of entering a delivery address.
  await pool.query(`
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS pickup_location_1 VARCHAR(255);
  `);
  await pool.query(`
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS pickup_location_2 VARCHAR(255);
  `);
  await pool.query(`
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS pickup_location_3 VARCHAR(255);
  `);

  // Whether this order is being shipped to the buyer's address or picked up
  // in person, and — for pickup — which of the seller's 3 spots was chosen.
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) NOT NULL DEFAULT 'delivery';
  `);
  await pool.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255);
  `);
}

module.exports = { pool, init };
