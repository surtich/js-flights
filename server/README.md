# Server

## PostgreSQL

The server reads `DATABASE_URL` to connect to PostgreSQL. Copy `.env.example`
to `.env` and set the URL to a database and role that already exist on your
machine. Keep credentials in `.env`; it is ignored by Git.

If you need to create a dedicated local role and database, run these as a
PostgreSQL administrator:

```sh
sudo -u postgres createuser --pwprompt js_flights
sudo -u postgres createdb --owner=js_flights js_flights
```

Then set `DATABASE_URL` in `.env` to
`postgresql://js_flights:<password>@localhost:5432/js_flights`.

Apply the schema and empty the `cities` table:

```sh
npm run db:setup
```

Every run of the migration deletes all rows from `cities`. To populate the
table with city names from `data/airports.json`, run `npm run db:seed`
separately after the migration. Start the server with `npm start`.

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
