import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('运行 report 脚本并输出 SUM=5', () => {
  const output = execFileSync('node', ['scripts/report.mjs'], {
    encoding: 'utf8',
  });

  assert.equal(output.trim(), 'SUM=5');
});
