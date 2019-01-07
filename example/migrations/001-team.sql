CREATE schema eg;

CREATE TABLE team (
  id serial PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL
)
