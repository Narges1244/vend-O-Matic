export const PRICE = 2;
export const DEFAULT_ITEM_COUNT = 3;
export const DEFAULT_STOCK = 5;

export const PurchaseResult = Object.freeze({
    SUCCESS: 'SUCCESS',
  NOT_FOUND: 'NOT_FOUND',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  INSUFFICIENT_COINS: 'INSUFFICIENT_COINS',
});

export class VendingMachine {
    #coins = 0;
    #inventory;

    constructor({itemCount = DEFAULT_ITEM_COUNT, stock = DEFAULT_STOCK} ={}){
        this.#inventory = Array(itemCount).fill(stock);
    }

    get coins() {
        return this.#coins;
    }

    insertCoin(){
        this.#coins += 1;
        return this.#coins;
    }
    refound() {
        const returned = this.#coins;
        this.#coins = 0;
        return returned;
    }

    getInventory() {
        return [...this.#inventory];
    }

    hasItem(id) {
        return Number.isInteger(id) && id>= 0 && id < this.#inventory.length;
    }
     getQuantity(id){
        return this.hasItem(id) ? this.#inventory[id]:null;
     }

     purchase(id) {
        if (!this.hasItem(id)) {
            return {result: PurchaseResult.NOT_FOUND, coins:this.#coins};

        }
        if (this.#inventory[id] === 0) {
            return { result: PurchaseResult.OUT_OF_STOCK, coins: this.#coins };
          }
          if (this.#coins < PRICE) {
            return { result: PurchaseResult.INSUFFICIENT_COINS, coins: this.#coins };
          }
      
          this.#inventory[id] -= 1;
          const change = this.#coins - PRICE;
          this.#coins = 0;
      
          return {
            result: PurchaseResult.SUCCESS,
            quantity: 1,
            change,
            remaining: this.#inventory[id],
          };
        }
     }
