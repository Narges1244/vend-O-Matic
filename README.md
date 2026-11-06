# vend-O-Matic
An HTTP service for a beverage vending machine, built with Node.js and zero external dependencies. It uses only Node's built-in modules (`node:http` for the server, `node:test` for tests).


## Requirements
- macOS (also works on Linux and Windows)
- [Node.js](https://nodejs.org) version 20 or newer

Check your version:

```bash
node -v
```

If Node.js isn't installed, the easiest way on macOS is [Homebrew](https://brew.sh):

```bash
brew install node
```

Alternatively, download the LTS installer from [nodejs.org](https://nodejs.org).



## Setup

```bash
git clone https://github.com/Narges1244/vend-O-Matic.git
cd vend-O-Matic
```

There are no dependencies, so `npm install` is not required.

## Running the server

```bash
npm start
```

The server listens on `http://localhost:3000`. To use a different port:

```bash
PORT=8080 npm start
```

Stop the server with `Ctrl + C`. The machine's state is kept in memory, so restarting the server resets it to full inventory and zero coins.

## Running the tests

```bash
npm test
```

The test suite includes:

- **Unit tests** (`test/machine.test.js`) for the vending machine rules, without HTTP.
- **Integration tests** (`test/app.test.js`) that start a real server on a random free port and check status codes, headers, and bodies for every endpoint.

The server does not need to be running for the tests.

## API

All request and response bodies use `application/json`.

| Method | Path | Success | Description |
|---|---|---|---|
| `PUT` | `/` | `204` | Insert one quarter. Body: `{"coin": 1}`. Header `X-Coins` is the total coins inserted. |
| `DELETE` | `/` | `204` | Cancel the transaction. Header `X-Coins` is the number of coins returned. |
| `GET` | `/inventory` | `200` | Returns the remaining quantity of each item, e.g. `[5,5,5]`. |
| `GET` | `/inventory/:id` | `200` | Returns the remaining quantity of one item, e.g. `5`. |
| `PUT` | `/inventory/:id` | `200` | Buy one item. See below. |

### Buying an item (`PUT /inventory/:id`)

| Situation | Status | Headers | Body |
|---|---|---|---|
| Success | `200` | `X-Coins` (change returned), `X-Inventory-Remaining` | `{"quantity": 1}` |
| Item out of stock | `404` | `X-Coins` (coins still inserted) | none |
| Fewer than 2 coins inserted | `403` | `X-Coins` (`0` or `1`) | none |

### Example session

```bash
# Insert two quarters
curl -i -X PUT http://localhost:3000/ -H "Content-Type: application/json" -d '{"coin": 1}'
curl -i -X PUT http://localhost:3000/ -H "Content-Type: application/json" -d '{"coin": 1}'

# Buy item 0 → 200, X-Coins: 0, X-Inventory-Remaining: 4, {"quantity":1}
curl -i -X PUT http://localhost:3000/inventory/0

# Check inventory → [4,5,5]
curl -i http://localhost:3000/inventory

# Insert a coin, then cancel → 204, X-Coins: 1
curl -i -X PUT http://localhost:3000/ -H "Content-Type: application/json" -d '{"coin": 1}'
curl -i -X DELETE http://localhost:3000/
```

## Assumptions and design decisions

The specification leaves a few cases open. These are the choices I made:

1. **Item IDs are 0-based.** The three items are `/inventory/0`, `/inventory/1`, and `/inventory/2`, matching their positions in the `GET /inventory` array.
2. **Stock is checked before coins.** If an item is out of stock, the response is `404` even when too few coins are inserted, because the customer cannot buy that item regardless of payment.
3. **Coins are kept after a failed purchase.** After a `404` or `403`, the inserted coins stay in the machine, so the customer can choose another item, add coins, or cancel with `DELETE /`.
4. **Unknown item IDs return `404`.** For `PUT /inventory/:id`, the `X-Coins` header is included, consistent with the out-of-stock response.
5. **Only `{"coin": 1}` is accepted.** The machine physically accepts only one quarter at a time, so any other body (invalid JSON, other values) returns `400 Bad Request`.
6. **Unsupported methods return `405`** with an `Allow` header listing the valid methods. Unknown paths return `404`.
7. **State is in memory.** A single machine is simulated, and restarting resets it. Because Node.js handles each request's logic on a single thread, updates to coins and inventory cannot interleave.

## Project structure

```
src/
  machine.js   Vending machine rules (no HTTP code)
  app.js       HTTP routing: maps requests to machine actions
  server.js    Starts the server
test/
  machine.test.js   Unit tests for the machine rules
  app.test.js       Integration tests for the HTTP API
```

The vending logic is kept separate from the HTTP layer so each can be tested on its own, and so the rules could be reused behind a different interface.