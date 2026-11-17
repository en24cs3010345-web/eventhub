-- EventHub schema (PostgreSQL 13+). Safe to re-run.
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','organizer','admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  slug VARCHAR(60) NOT NULL UNIQUE,
  icon VARCHAR(10) DEFAULT '🎟️'
);

CREATE TABLE IF NOT EXISTS venues (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(150) NOT NULL,
  address  TEXT NOT NULL,
  city     VARCHAR(80) NOT NULL,
  state    VARCHAR(80),
  capacity INT NOT NULL CHECK (capacity > 0)
);

CREATE TABLE IF NOT EXISTS events (
  id           SERIAL PRIMARY KEY,
  organizer_id INT NOT NULL REFERENCES users(id),
  category_id  INT NOT NULL REFERENCES categories(id),
  venue_id     INT NOT NULL REFERENCES venues(id),
  title        VARCHAR(180) NOT NULL,
  description  TEXT NOT NULL,
  poster_url   TEXT,
  event_date   DATE NOT NULL,
  event_time   TIME NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  is_featured  BOOLEAN NOT NULL DEFAULT FALSE,
  is_seated    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, event_date);

CREATE TABLE IF NOT EXISTS ticket_types (
  id       SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name     VARCHAR(80) NOT NULL,
  price    NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  quantity INT NOT NULL CHECK (quantity >= 0),
  sold     INT NOT NULL DEFAULT 0 CHECK (sold >= 0),
  CONSTRAINT sold_within_quantity CHECK (sold <= quantity)   -- database-level overbooking guard
);

-- Seats are generated per event (for seated events only)
CREATE TABLE IF NOT EXISTS seats (
  id             SERIAL PRIMARY KEY,
  venue_id       INT NOT NULL REFERENCES venues(id),
  event_id       INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id INT NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  seat_number    VARCHAR(10) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available','held','booked')),
  UNIQUE (event_id, seat_number)
);

CREATE TABLE IF NOT EXISTS bookings (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id),
  event_id     INT NOT NULL REFERENCES events(id),
  booking_code VARCHAR(20) NOT NULL UNIQUE,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','expired')),
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id);

CREATE TABLE IF NOT EXISTS booking_items (
  id             SERIAL PRIMARY KEY,
  booking_id     INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ticket_type_id INT NOT NULL REFERENCES ticket_types(id),
  seat_id        INT REFERENCES seats(id),
  quantity       INT NOT NULL CHECK (quantity > 0),
  price          NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS payments (
  id                SERIAL PRIMARY KEY,
  booking_id        INT NOT NULL UNIQUE REFERENCES bookings(id),
  razorpay_order_id VARCHAR(80),
  transaction_id    VARCHAR(80),
  amount            NUMERIC(10,2) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed','refunded','refund_pending')),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_tickets (
  id                  SERIAL PRIMARY KEY,
  booking_id          INT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  qr_token            VARCHAR(100) NOT NULL UNIQUE,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (verification_status IN ('valid','used','cancelled')),
  verified_at         TIMESTAMPTZ,
  verified_by         INT REFERENCES users(id)
);
