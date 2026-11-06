import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

describe('Vend-O-Matic API', () => {
  let server;
  let baseUrl;

  beforeEach(async () => {
    server = createApp();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  function insertCoin() {
    return fetch(`${baseUrl}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin: 1 }),
    });
  }

  async function insertCoins(count) {
    for (let i = 0; i < count; i++) {
      await insertCoin();
    }
  }

  function buy(id) {
    return fetch(`${baseUrl}/inventory/${id}`, { method: 'PUT' });
  }

  describe('PUT /', () => {
    test('accepts a coin and returns the running total', async () => {
      const first = await insertCoin();
      assert.equal(first.status, 204);
      assert.equal(first.headers.get('x-coins'), '1');

      const second = await insertCoin();
      assert.equal(second.headers.get('x-coins'), '2');
    });

    test('rejects a body other than {"coin": 1}', async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coin: 5 }),
      });
      assert.equal(res.status, 400);
    });

    test('rejects invalid JSON', async () => {
      const res = await fetch(`${baseUrl}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      assert.equal(res.status, 400);
    });
  });

  describe('DELETE /', () => {
    test('returns all inserted coins and resets the count', async () => {
      await insertCoins(3);

      const res = await fetch(`${baseUrl}/`, { method: 'DELETE' });
      assert.equal(res.status, 204);
      assert.equal(res.headers.get('x-coins'), '3');

      const next = await insertCoin();
      assert.equal(next.headers.get('x-coins'), '1');
    });
  });

  describe('GET /inventory', () => {
    test('returns all quantities as a JSON array', async () => {
      const res = await fetch(`${baseUrl}/inventory`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /application\/json/);
      assert.deepEqual(await res.json(), [5, 5, 5]);
    });
  });

  describe('GET /inventory/:id', () => {
    test('returns the quantity of one item', async () => {
      const res = await fetch(`${baseUrl}/inventory/1`);
      assert.equal(res.status, 200);
      assert.equal(await res.json(), 5);
    });

    test('returns 404 for an unknown item', async () => {
      const res = await fetch(`${baseUrl}/inventory/9`);
      assert.equal(res.status, 404);
    });
  });

  describe('PUT /inventory/:id', () => {
    test('vends one item and returns the change', async () => {
      await insertCoins(3);

      const res = await buy(0);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-coins'), '1');
      assert.equal(res.headers.get('x-inventory-remaining'), '4');
      assert.deepEqual(await res.json(), { quantity: 1 });

      const inventory = await fetch(`${baseUrl}/inventory`);
      assert.deepEqual(await inventory.json(), [4, 5, 5]);
    });

    test('returns 403 when coins are insufficient', async () => {
      await insertCoin();

      const res = await buy(0);
      assert.equal(res.status, 403);
      assert.equal(res.headers.get('x-coins'), '1');
    });

    test('returns 404 when out of stock and keeps the coins', async () => {
      for (let i = 0; i < 5; i++) {
        await insertCoins(2);
        const sold = await buy(0);
        await sold.text();
      }

      await insertCoins(2);
      const res = await buy(0);
      assert.equal(res.status, 404);
      assert.equal(res.headers.get('x-coins'), '2');
    });

    test('returns 404 for an unknown item', async () => {
      await insertCoins(2);

      const res = await buy(9);
      assert.equal(res.status, 404);
      assert.equal(res.headers.get('x-coins'), '2');
    });
  });

  describe('unsupported requests', () => {
    test('returns 405 with an Allow header for the wrong method', async () => {
      const res = await fetch(`${baseUrl}/`, { method: 'POST' });
      assert.equal(res.status, 405);
      assert.equal(res.headers.get('allow'), 'PUT, DELETE');
    });

    test('returns 404 for an unknown path', async () => {
      const res = await fetch(`${baseUrl}/nothing-here`);
      assert.equal(res.status, 404);
    });
  });
});