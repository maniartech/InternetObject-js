/**
 * Seeded PRNG — mulberry32.
 *
 * A fuzzer is only useful if a failure can be replayed exactly, so nothing here may touch
 * `Math.random()`: every run is a pure function of its seed, and a reported seed reproduces a
 * counterexample byte for byte.
 */
export class Rng {
  private state: number;

  constructor(public readonly seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Pick one element. */
  pick<T>(xs: readonly T[]): T {
    return xs[this.int(0, xs.length - 1)];
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }
}
