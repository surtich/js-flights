# Server

## PostgreSQL

The server reads `DATABASE_URL` to connect to PostgreSQL. Copy `.env.example`
to `.env`, set the URL to a database and role that already exist on your
machine, and set `AUTH_TOKEN_SECRET` to a private random value of at least 32
bytes. Keep credentials in `.env`; it is ignored by Git. The secret signs
one-hour bearer access tokens.

If you need to create a dedicated local role and database, run these as a
PostgreSQL administrator:

```sh
sudo -u postgres createuser --pwprompt js_flights
sudo -u postgres createdb --owner=js_flights js_flights
```

Then set `DATABASE_URL` in `.env` to
`postgresql://js_flights:<password>@localhost:5432/js_flights`.

Apply the schema and seed the initial data:

```sh
npm run db:setup
```

The migration preserves existing city data. The setup script populates cities
from `data/airports.json` and seeds the initial users. Start the server with
`npm start`.

The initial users are `user` / `user` (role `USER`) and `admin` / `admin`
(role `ADMIN`). Passwords are stored as salted `scrypt` hashes. Change these
development credentials before exposing the service outside a local environment.

`POST /auth/login` accepts `{"name":"admin","password":"admin"}` and returns a
one-hour bearer token. Send it as `Authorization: Bearer <accessToken>` to
create, rename, or delete cities. City listing, searching, and reading remain
public; write operations require the current database role to be `ADMIN`.

`GET /cities?search=mad` returns at most 20 matching city names and the total
number of matches:

```json
{
  "cities": ["Madison", "Madrid"],
  "total": 2
}
```

`GET /cities?page=1` returns a page of 20 cities ordered by name, together with
the total count and pagination metadata. Omitting `page` returns the first page.

The city CRUD endpoints use the city name as its identifier:

- `POST /cities` with `{"name":"Madrid"}` creates a city and returns `201`.
- `GET /cities/Madrid` returns one city.
- `PUT /cities/Madrid` with `{"name":"Barcelona"}` renames it.
- `DELETE /cities/Madrid` deletes it and returns `204`.

Names are trimmed; blank names return `400`, missing cities return `404`, and
duplicate names return `409`. CRUD endpoints support CORS preflight requests.
