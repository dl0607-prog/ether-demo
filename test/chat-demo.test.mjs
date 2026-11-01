import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const content = await readFile(new URL('../public/chat-demo.txt', import.meta.url), 'utf8');

test('chat-demo 文件内容为 CHAT_OK', () => {
  assert.equal(content, 'CHAT_OK');
});
