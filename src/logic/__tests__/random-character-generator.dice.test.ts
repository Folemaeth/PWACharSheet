import { describe, it, expect } from 'vitest';
import { rollD10, roll2d10, rollD100, pick } from '../random-character-generator';
import type { RNG } from '../random-character-generator';

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
 * Returns a float in [0, 1), Math.random-compatible.
 */
function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG that replays a fixed sequence of values, repeating the last once exhausted. */
function sequenceRng(values: number[]): RNG {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

// Boundary inputs: 0 (minimum) and the largest value strictly below 1 the seam can emit.
const ALMOST_ONE = 0.9999999999;

describe('dice helpers over the full [0, 1) RNG seam', () => {
  it('rollD10 produces only integers in 1..10 at the boundaries', () => {
    expect(rollD10(sequenceRng([0]))).toBe(1);
    expect(rollD10(sequenceRng([ALMOST_ONE]))).toBe(10);
  });

  it('rollD10 produces only integers in 1..10 across many seeds', () => {
    for (let seed = 0; seed < 500; seed++) {
      const rng = mulberry32(seed);
      for (let i = 0; i < 20; i++) {
        const v = rollD10(rng);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(10);
      }
    }
  });

  it('roll2d10 produces only integers in 2..20 at the boundaries', () => {
    // Both d10 at minimum → 1 + 1 = 2; both at max → 10 + 10 = 20.
    expect(roll2d10(sequenceRng([0, 0]))).toBe(2);
    expect(roll2d10(sequenceRng([ALMOST_ONE, ALMOST_ONE]))).toBe(20);
  });

  it('roll2d10 produces only integers in 2..20 across many seeds', () => {
    for (let seed = 0; seed < 500; seed++) {
      const rng = mulberry32(seed);
      for (let i = 0; i < 20; i++) {
        const v = roll2d10(rng);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(2);
        expect(v).toBeLessThanOrEqual(20);
      }
    }
  });

  it('rollD100 produces only integers in 1..100 at the boundaries', () => {
    expect(rollD100(sequenceRng([0]))).toBe(1);
    expect(rollD100(sequenceRng([ALMOST_ONE]))).toBe(100);
  });

  it('rollD100 produces only integers in 1..100 across many seeds', () => {
    for (let seed = 0; seed < 500; seed++) {
      const rng = mulberry32(seed);
      for (let i = 0; i < 20; i++) {
        const v = rollD100(rng);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('pick', () => {
  it('returns a member of the input list at the boundaries', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(pick(sequenceRng([0]), items)).toBe('a');
    expect(pick(sequenceRng([ALMOST_ONE]), items)).toBe('d');
  });

  it('always returns a member of the input list across many seeds', () => {
    const items = [10, 20, 30, 40, 50];
    for (let seed = 0; seed < 500; seed++) {
      const rng = mulberry32(seed);
      for (let i = 0; i < 20; i++) {
        expect(items).toContain(pick(rng, items));
      }
    }
  });

  it('throws the documented developer error on an empty array', () => {
    expect(() => pick(mulberry32(1), [])).toThrow('pick(): cannot choose from an empty array');
  });
});
