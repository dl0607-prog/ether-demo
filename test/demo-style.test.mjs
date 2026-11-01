import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/demo.html', import.meta.url), 'utf8');

test('demo 页面包含居中深色样式、渐变标题和 48px 结果字号', () => {
  assert.ok(html.includes('<style>'));
  assert.ok(html.includes('display: flex'));
  assert.ok(html.includes('font-size: 48px'));
  assert.ok(html.includes('id="result"'));
});
