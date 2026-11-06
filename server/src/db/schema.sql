CREATE TABLE IF NOT EXISTS cities (
  name text PRIMARY KEY,
  CONSTRAINT cities_name_not_blank CHECK (length(btrim(name)) > 0)
);
