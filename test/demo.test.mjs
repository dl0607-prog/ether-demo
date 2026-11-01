import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/demo.html', import.meta.url), 'utf8');

test('demo 页面包含结果元素、计算表达式和标题', () => {
  assert.ok(html.includes('id="result"'));
  assert.ok(html.includes('2 + 3'));
  assert.ok(html.includes('ETHER DEMO'));
});
