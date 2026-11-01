import test from 'node:test';
import assert from 'node:assert/strict';
import { sum } from '../src/sum.mjs';

test('sum(2, 3) 返回 5', () => {
  assert.equal(sum(2, 3), 5);
});
