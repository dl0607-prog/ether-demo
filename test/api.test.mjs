import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { Readable, Writable } from 'node:stream';
import { createApp } from '../server.mjs';

async function transport(server, handle) {
  try {
    server.listen(0, '127.0.0.1');
    await Promise.race([once(server, 'listening'), once(server, 'error').then(([error]) => { throw error; })]);
    const base = `http://127.0.0.1:${server.address().port}`;
    return async (path, options = {}) => {
      const response = await fetch(base + path, options);
      const text = await response.text();
      return { status: response.status, data: JSON.parse(text), headers: response.headers };
    };
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error;
    console.log(`本地监听受沙箱限制 (${error.code})，使用可注入 transport 验证请求处理。`);
    return async (path, options = {}) => {
      const request = Readable.from(options.body ? [options.body] : []);
      request.url = path;
      request.method = options.method || 'GET';
      let status = 200;
      let body = '';
      const response = new Writable({ write(chunk, _encoding, callback) { body += chunk.toString(); callback(); } });
      response.writeHead = code => { status = code; };
      response.end = chunk => { if (chunk) body += chunk.toString(); };
      await handle(request, response);
      return { status, data: JSON.parse(body) };
    };
  }
}

test('API CRUD、搜索与重启后持久化', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'ether-notes-'));
  const dataFile = join(dir, 'notes.json');
  let app = createApp({ dataFile });
  let call = await transport(app.server, app.handle);
  t.after(async () => { if (app.server.listening) await new Promise(resolve => app.server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const json = (method, value) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });

  assert.deepEqual((await call('/api/notes')).data, []);
  assert.equal((await call('/api/notes', json('POST', { title: ' ', content: '内容' }))).status, 400);
  const created = await call('/api/notes', json('POST', { title: ' 产品计划 ', content: '验证搜索体验' }));
  assert.equal(created.status, 201);
  assert.equal(created.data.title, '产品计划');
  const id = created.data.id;
  assert.equal((await call('/api/notes?q=搜索')).data.length, 1);
  assert.equal((await call('/api/notes?q=无关')).data.length, 0);

  const updated = await call(`/api/notes/${id}`, json('PUT', { title: '迭代计划', content: '完成首页' }));
  assert.equal(updated.status, 200);
  assert.equal(updated.data.title, '迭代计划');
  assert.equal((await call('/api/notes?q=搜索')).data.length, 0);
  assert.equal((await call('/api/notes?q=首页')).data.length, 1);
  assert.equal(JSON.parse(await readFile(dataFile, 'utf8'))[0].content, '完成首页');

  if (app.server.listening) await new Promise(resolve => app.server.close(resolve));
  app = createApp({ dataFile });
  call = await transport(app.server, app.handle);
  assert.equal((await call('/api/notes')).data[0].id, id);
  assert.equal((await call(`/api/notes/${id}`, { method: 'DELETE' })).status, 200);
  assert.deepEqual((await call('/api/notes')).data, []);
  assert.equal((await call(`/api/notes/${id}`, { method: 'DELETE' })).status, 404);
});
