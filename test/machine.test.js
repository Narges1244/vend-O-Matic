import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { VendingMachine, PurchaseResult } from '../src/machine.js';

function machineWithCoins(count, options) {
  const machine = new VendingMachine(options);
  for (let i = 0; i < count; i++) {
    machine.insertCoin();
  }
  return machine;
}

describe('VendingMachine', () => {
  test('starts with three items of five each and no coins', () => {
    const machine = new VendingMachine();
    assert.deepEqual(machine.getInventory(), [5, 5, 5]);
    assert.equal(machine.coins, 0);
  });

  test('insertCoin returns the running total', () => {
    const machine = new VendingMachine();
    assert.equal(machine.insertCoin(), 1);
    assert.equal(machine.insertCoin(), 2);
  });

  test('refund returns all coins and resets to zero', () => {
    const machine = machineWithCoins(3);
    assert.equal(machine.refund(), 3);
    assert.equal(machine.coins, 0);
  });

  test('getInventory returns a copy, not the internal array', () => {
    const machine = new VendingMachine();
    machine.getInventory()[0] = 99;
    assert.deepEqual(machine.getInventory(), [5, 5, 5]);
  });

  test('getQuantity returns null for unknown ids', () => {
    const machine = new VendingMachine();
    assert.equal(machine.getQuantity(0), 5);
    assert.equal(machine.getQuantity(3), null);
    assert.equal(machine.getQuantity(-1), null);
  });

  describe('purchase', () => {
    test('succeeds with exact change', () => {
      const machine = machineWithCoins(2);
      assert.deepEqual(machine.purchase(0), {
        result: PurchaseResult.SUCCESS,
        quantity: 1,
        change: 0,
        remaining: 4,
      });
      assert.equal(machine.coins, 0);
    });

    test('returns extra coins as change', () => {
      const machine = machineWithCoins(5);
      const outcome = machine.purchase(1);
      assert.equal(outcome.result, PurchaseResult.SUCCESS);
      assert.equal(outcome.change, 3);
      assert.equal(machine.coins, 0);
    });

    test('fails with insufficient coins and keeps them', () => {
      const machine = machineWithCoins(1);
      assert.deepEqual(machine.purchase(0), {
        result: PurchaseResult.INSUFFICIENT_COINS,
        coins: 1,
      });
      assert.equal(machine.coins, 1);
      assert.deepEqual(machine.getInventory(), [5, 5, 5]);
    });

    test('fails when out of stock and keeps the coins', () => {
      const machine = machineWithCoins(2, { stock: 0 });
      assert.deepEqual(machine.purchase(0), {
        result: PurchaseResult.OUT_OF_STOCK,
        coins: 2,
      });
      assert.equal(machine.coins, 2);
    });

    test('checks stock before coins', () => {
      const machine = new VendingMachine({ stock: 0 });
      assert.equal(machine.purchase(0).result, PurchaseResult.OUT_OF_STOCK);
    });

    test('returns NOT_FOUND for an unknown id', () => {
      const machine = machineWithCoins(2);
      assert.equal(machine.purchase(7).result, PurchaseResult.NOT_FOUND);
      assert.equal(machine.coins, 2);
    });

    test('sells out after five purchases', () => {
      const machine = new VendingMachine();
      for (let i = 0; i < 5; i++) {
        machine.insertCoin();
        machine.insertCoin();
        assert.equal(machine.purchase(2).result, PurchaseResult.SUCCESS);
      }
      assert.equal(machine.getQuantity(2), 0);
      machine.insertCoin();
      machine.insertCoin();
      assert.equal(machine.purchase(2).result, PurchaseResult.OUT_OF_STOCK);
    });
  });
});