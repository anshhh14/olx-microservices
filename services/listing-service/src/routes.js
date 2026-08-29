const express = require('express');
const { pool } = require('./db');
const { upload } = require('./s3');
const { stripe, FRONTEND_URL } = require('./stripe');

const router = express.Router();

// A buyer's effective price for a listing: their negotiated price if the
// seller accepted a bargain with them, otherwise the listing's normal price.
async function getEffectivePrice(listingId, buyerId, defaultPrice) {
  const result = await pool.query(
    'SELECT price FROM negotiated_prices WHERE listing_id = $1 AND buyer_id = $2',
    [listingId, buyerId]
  );
  return result.rows[0] ? Number(result.rows[0].price) : Number(defaultPrice);
}

// List / search / filter listings
router.get('/', async (req, res) => {
  try {
    const { category, location, minPrice, maxPrice, q, page = 1, limit = 20 } = req.query;
    const conditions = ['is_sold = FALSE'];
    const values = [];

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }
    if (location) {
      values.push(`%${location}%`);
      conditions.push(`location ILIKE $${values.length}`);
    }
    if (minPrice) {
      values.push(minPrice);
      conditions.push(`price >= $${values.length}`);
    }
    if (maxPrice) {
      values.push(maxPrice);
      conditions.push(`price <= $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      conditions.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const query = `
      SELECT * FROM listings
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const result = await pool.query(query, values);
    res.json({ listings: result.rows, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// All listings posted by a given user, any status (active + sold) — "My Listings"
router.get('/mine/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM listings WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Total lifetime earnings for a seller (sum of paid orders)
router.get('/orders/earnings/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM orders WHERE seller_id = $1 AND status = 'paid'`,
      [req.params.userId]
    );
    res.json({
      total: Number(result.rows[0].total),
      count: Number(result.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Seller accepted a bargain in chat — record the one-off price for this buyer only.
// Does NOT change listings.price, so every other buyer still sees the normal price.
router.post('/:id/negotiated-price', async (req, res) => {
  try {
    const { buyerId, price } = req.body;
    if (!buyerId || !price) {
      return res.status(400).json({ error: 'buyerId and price are required' });
    }

    const listingResult = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    const listing = listingResult.rows[0];
    if (!listing) return res.status(404).json({ error: 'listing not found' });

    const result = await pool.query(
      `INSERT INTO negotiated_prices (listing_id, buyer_id, price)
       VALUES ($1, $2, $3)
       ON CONFLICT (listing_id, buyer_id)
       DO UPDATE SET price = EXCLUDED.price, created_at = NOW()
       RETURNING *`,
      [listing.id, buyerId, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Look up whether this specific buyer has a negotiated price for this listing
router.get('/:id/negotiated-price/:buyerId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM negotiated_prices WHERE listing_id = $1 AND buyer_id = $2',
      [req.params.id, req.params.buyerId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'no negotiated price for this buyer' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get single listing
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'listing not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'invalid listing id' });
  }
});

// Create listing with optional image upload (field name: "image")
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      userId, title, description, price, category, location,
      pickupLocation1, pickupLocation2, pickupLocation3,
    } = req.body;
    if (!userId || !title || !price) {
      return res.status(400).json({ error: 'userId, title, and price are required' });
    }
    const imageUrl = req.file ? req.file.location : null;

    const result = await pool.query(
      `INSERT INTO listings (user_id, title, description, price, category, location, image_url,
                              pickup_location_1, pickup_location_2, pickup_location_3)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        userId, title, description || null, price, category || null, location || null, imageUrl,
        (pickupLocation1 || '').trim() || null,
        (pickupLocation2 || '').trim() || null,
        (pickupLocation3 || '').trim() || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'internal server error' });
  }
});

// Mark listing as sold
router.patch('/:id/sold', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE listings SET is_sold = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'listing not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'invalid listing id' });
  }
});

// Delete listing
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM listings WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'listing not found' });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: 'invalid listing id' });
  }
});

// Start a Stripe Checkout session to buy a listing
router.post('/:id/checkout', async (req, res) => {
  try {
    const { buyerId, buyerName, buyerPhone, buyerAddress, deliveryMethod, pickupLocation } = req.body;
    if (!buyerId) {
      return res.status(400).json({ error: 'buyerId is required' });
    }
    if (!buyerName || !buyerName.trim() || !buyerPhone || !buyerPhone.trim()) {
      return res.status(400).json({ error: 'buyerName and buyerPhone are required' });
    }
    const method = deliveryMethod === 'pickup' ? 'pickup' : 'delivery';
    if (method === 'delivery' && (!buyerAddress || !buyerAddress.trim())) {
      return res.status(400).json({ error: 'buyerAddress is required for delivery' });
    }
    if (method === 'pickup' && (!pickupLocation || !pickupLocation.trim())) {
      return res.status(400).json({ error: 'pickupLocation is required when picking up yourself' });
    }

    const listingResult = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    const listing = listingResult.rows[0];
    if (!listing) return res.status(404).json({ error: 'listing not found' });
    if (listing.is_sold) return res.status(409).json({ error: 'listing is already sold' });
    if (String(listing.user_id) === String(buyerId)) {
      return res.status(400).json({ error: "you can't buy your own listing" });
    }

    // Pickup location must be one the seller actually offered on this listing
    if (method === 'pickup') {
      const offered = [listing.pickup_location_1, listing.pickup_location_2, listing.pickup_location_3]
        .filter(Boolean);
      if (!offered.includes(pickupLocation.trim())) {
        return res.status(400).json({ error: 'pickupLocation must match one of the seller\'s pickup spots' });
      }
    }

    const effectivePrice = await getEffectivePrice(listing.id, buyerId, listing.price);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            unit_amount: Math.round(effectivePrice * 100),
            product_data: {
              name: listing.title,
              description: listing.description || undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/#/checkout-success?session_id={CHECKOUT_SESSION_ID}&listingId=${listing.id}`,
      cancel_url: `${FRONTEND_URL}/#/listing/${listing.id}`,
    });

    await pool.query(
      `INSERT INTO orders (listing_id, buyer_id, seller_id, amount, status, stripe_session_id, buyer_name, buyer_phone, buyer_address, delivery_method, pickup_location)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10)`,
      [
        listing.id, buyerId, listing.user_id, effectivePrice, session.id, buyerName.trim(), buyerPhone.trim(),
        method === 'delivery' ? buyerAddress.trim() : null,
        method,
        method === 'pickup' ? pickupLocation.trim() : null,
      ]
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'internal server error' });
  }
});

// Start a Stripe Checkout session to buy everything currently in the
// buyer's cart in one payment. One line item + one pending `orders` row
// per listing, all sharing the same Stripe session id.
router.post('/checkout/cart', async (req, res) => {
  try {
    const { buyerId, listingIds, buyerName, buyerPhone, buyerAddress } = req.body;
    if (!buyerId) {
      return res.status(400).json({ error: 'buyerId is required' });
    }
    if (!buyerName || !buyerName.trim() || !buyerPhone || !buyerPhone.trim() || !buyerAddress || !buyerAddress.trim()) {
      return res.status(400).json({ error: 'buyerName, buyerPhone, and buyerAddress are required' });
    }
    const ids = [...new Set((listingIds || []).map(String))];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'listingIds must be a non-empty array' });
    }

    const listingsResult = await pool.query(
      `SELECT * FROM listings WHERE id = ANY($1::int[])`,
      [ids]
    );
    const listings = listingsResult.rows;

    if (listings.length !== ids.length) {
      return res.status(404).json({ error: 'one or more cart items could not be found (they may have been deleted)' });
    }
    const alreadySold = listings.find(l => l.is_sold);
    if (alreadySold) {
      return res.status(409).json({ error: `"${alreadySold.title}" was already sold — remove it from your cart` });
    }
    const ownListing = listings.find(l => String(l.user_id) === String(buyerId));
    if (ownListing) {
      return res.status(400).json({ error: `"${ownListing.title}" is your own listing — you can't buy it` });
    }

    const effectivePrices = new Map();
    for (const listing of listings) {
      effectivePrices.set(listing.id, await getEffectivePrice(listing.id, buyerId, listing.price));
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: listings.map(listing => ({
        price_data: {
          currency: 'inr',
          unit_amount: Math.round(effectivePrices.get(listing.id) * 100),
          product_data: {
            name: listing.title,
            description: listing.description || undefined,
          },
        },
        quantity: 1,
      })),
      success_url: `${FRONTEND_URL}/#/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/#/cart`,
    });

    for (const listing of listings) {
      await pool.query(
        `INSERT INTO orders (listing_id, buyer_id, seller_id, amount, status, stripe_session_id, buyer_name, buyer_phone, buyer_address)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)`,
        [listing.id, buyerId, listing.user_id, effectivePrices.get(listing.id), session.id, buyerName.trim(), buyerPhone.trim(), buyerAddress.trim()]
      );
    }

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'internal server error' });
  }
});

// Confirm a checkout session after Stripe redirects the buyer back.
// A session can cover one listing (old "Buy now") or several (cart
// checkout), so this always resolves every order row tied to it.
router.get('/orders/confirm', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });

    const orderResult = await pool.query('SELECT * FROM orders WHERE stripe_session_id = $1', [session_id]);
    const orders = orderResult.rows;
    if (orders.length === 0) return res.status(404).json({ error: 'order not found' });

    // Already confirmed earlier (e.g. buyer refreshed the success page) — don't re-process
    if (orders.every(o => o.status === 'paid')) {
      const listingsResult = await pool.query(
        'SELECT * FROM listings WHERE id = ANY($1::int[])',
        [orders.map(o => o.listing_id)]
      );
      return res.json({ orders, listings: listingsResult.rows });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'payment not completed', status: session.payment_status });
    }

    const pendingIds = orders.filter(o => o.status !== 'paid').map(o => o.id);
    const listingIds = orders.map(o => o.listing_id);

    const updatedOrders = (await pool.query(
      `UPDATE orders SET status = 'paid' WHERE id = ANY($1::int[]) RETURNING *`,
      [pendingIds]
    )).rows;
    const listings = (await pool.query(
      `UPDATE listings SET is_sold = TRUE WHERE id = ANY($1::int[]) RETURNING *`,
      [listingIds]
    )).rows;

    res.json({ orders: updatedOrders, listings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'internal server error' });
  }
});

// Orders where the given user was the buyer
router.get('/orders/mine/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, l.title, l.image_url
       FROM orders o JOIN listings l ON l.id = o.listing_id
       WHERE o.buyer_id = $1 AND o.status = 'paid'
       ORDER BY o.created_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Orders where the given user was the seller
router.get('/orders/selling/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, l.title, l.image_url
       FROM orders o JOIN listings l ON l.id = o.listing_id
       WHERE o.seller_id = $1 AND o.status = 'paid'
       ORDER BY o.created_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});module.exports = router;
