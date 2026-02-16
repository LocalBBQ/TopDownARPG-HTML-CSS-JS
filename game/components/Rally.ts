// Rally: pool of health regainable by dealing damage (e.g. after blocking with defender).
import type { Component } from '../types/component.js';

export class Rally implements Component {
  rallyPool: number = 0;
  maxRallyPool: number;
  entity: unknown = null;

  constructor(maxRallyPool = 25) {
    this.maxRallyPool = maxRallyPool;
  }

  addToPool(amount: number): void {
    if (amount <= 0) return;
    this.rallyPool = Math.min(this.maxRallyPool, this.rallyPool + amount);
  }

  /** Heal from rally: returns amount actually healed and subtracts from pool. */
  consumeForHeal(requestedAmount: number): number {
    const amount = Math.min(requestedAmount, this.rallyPool);
    this.rallyPool = Math.max(0, this.rallyPool - amount);
    return amount;
  }
}
