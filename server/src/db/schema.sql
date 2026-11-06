CREATE TABLE IF NOT EXISTS cities (
  name text PRIMARY KEY,
  CONSTRAINT cities_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS users (
  name text PRIMARY KEY,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('USER', 'ADMIN')),
  CONSTRAINT users_name_not_blank CHECK (length(btrim(name)) > 0)
);
