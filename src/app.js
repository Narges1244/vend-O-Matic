import http from 'node:http';
import {VendingMachine, PurchaseResult } from './machine.js';

// Helpers

function send(res, status, {headers = {}, body} = {}) {
 if (body === undefined) {
    res.writeHead(status, headers);
    res.end();
    return;
}
const json = JSON.stringify(body);
res.writeHead(status, {
  ...headers,
  'Content-Type': 'application/json',
  'Content-Length': Buffer.byteLength(json),
});
res.end(json);
}
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    return text === '' ? undefined : JSON.parse(text);
  }
  
  function methodNotAllowed(res, allowed) {
    send(res, 405, {
      headers: { Allow: allowed },
      body: { error: 'Method not allowed' },
    });
  }
  //handlers

  async function insertCoin(machine,req,res){
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return send(res, 400, { body: { error: 'Request body must be valid JSON' } });
    }
  
    if (body?.coin !== 1) {
      return send(res, 400, { body: { error: 'Request body must be {"coin": 1}' } });
    }
  
    const coins = machine.insertCoin();
    send(res, 204, { headers: { 'X-Coins': coins } });
  }
  
  function refund(machine, res) {
    const returned = machine.refund();
    send(res, 204, { headers: { 'X-Coins': returned } });
  }
  
  function getItem(machine, id, res) {
    const quantity = machine.getQuantity(id);
    if (quantity === null) {
      return send(res, 404, { body: { error: 'Item not found' } });
    }
    send(res, 200, { body: quantity });
  }
  
  function purchase(machine, id, res) {
    const outcome = machine.purchase(id);
  
    switch (outcome.result) {
      case PurchaseResult.SUCCESS:
        return send(res, 200, {
          headers: {
            'X-Coins': outcome.change,
            'X-Inventory-Remaining': outcome.remaining,
          },
          body: { quantity: outcome.quantity },
        });
      case PurchaseResult.INSUFFICIENT_COINS:
        return send(res, 403, { headers: { 'X-Coins': outcome.coins } });
      case PurchaseResult.OUT_OF_STOCK:
      case PurchaseResult.NOT_FOUND:
        return send(res, 404, { headers: { 'X-Coins': outcome.coins } });
    }
  }
  
  // ---------- Router ----------
  
  const INVENTORY_ITEM_PATH = /^\/inventory\/(\d+)$/;
  
  async function route(machine, req, res) {
    const { pathname } = new URL(req.url, 'http://localhost');
    const { method } = req;
  
    if (pathname === '/') {
      if (method === 'PUT') return insertCoin(machine, req, res);
      if (method === 'DELETE') return refund(machine, res);
      return methodNotAllowed(res, 'PUT, DELETE');
    }
  
    if (pathname === '/inventory') {
      if (method === 'GET') return send(res, 200, { body: machine.getInventory() });
      return methodNotAllowed(res, 'GET');
    }
  
    const match = pathname.match(INVENTORY_ITEM_PATH);
    if (match) {
      const id = Number(match[1]);
      if (method === 'GET') return getItem(machine, id, res);
      if (method === 'PUT') return purchase(machine, id, res);
      return methodNotAllowed(res, 'GET, PUT');
    }
  
    send(res, 404, { body: { error: 'Not found' } });
  }
  
  // App
  
  export function createApp(machine = new VendingMachine()) {
    return http.createServer(async (req, res) => {
      try {
        await route(machine, req, res);
      } catch (err) {
        console.error(err);
        send(res, 500, { body: { error: 'Internal server error' } });
      }
    });
  }
  

