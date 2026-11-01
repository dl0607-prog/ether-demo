import http from 'node:http';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']]
]);

function send(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

async function bodyOf(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 64 * 1024) throw Object.assign(new Error('请求内容过大'), { status: 413 });
  }
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error('请提交有效 JSON'), { status: 400 }); }
}

function fields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.title !== 'string' || typeof value.content !== 'string') {
    throw Object.assign(new Error('标题和内容必须为文本'), { status: 400 });
  }
  const title = value.title.trim();
  const content = value.content.trim();
  if (!title || !content) throw Object.assign(new Error('请填写标题和内容'), { status: 400 });
  if (title.length > 120 || content.length > 10000) {
    throw Object.assign(new Error('标题或内容超出长度限制'), { status: 400 });
  }
  return { title, content };
}

export function createApp({ dataFile = join(root, 'data', 'notes.json') } = {}) {
  let queue = Promise.resolve();
  async function readNotes() {
    try {
      const data = JSON.parse(await readFile(dataFile, 'utf8'));
      if (!Array.isArray(data)) throw new Error('便签数据格式错误');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }
  async function saveNotes(notes) {
    await mkdir(dirname(dataFile), { recursive: true });
    const temporary = `${dataFile}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(notes, null, 2) + '\n', 'utf8');
    await rename(temporary, dataFile);
  }
  function mutate(operation) {
    const result = queue.then(async () => {
      const notes = await readNotes();
      const outcome = operation(notes);
      await saveNotes(notes);
      return outcome;
    });
    queue = result.catch(() => {});
    return result;
  }
  async function handle(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && assets.has(url.pathname)) {
        const [file, type] = assets.get(url.pathname);
        const body = await readFile(join(root, 'public', file));
        res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
        res.end(body);
        return;
      }
      if (url.pathname === '/api/notes') {
        if (req.method === 'GET') {
          await queue;
          const q = (url.searchParams.get('q') || '').trim().toLocaleLowerCase();
          const notes = (await readNotes()).filter(n =>
            !q || n.title.toLocaleLowerCase().includes(q) || n.content.toLocaleLowerCase().includes(q));
          send(res, 200, notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
          return;
        }
        if (req.method === 'POST') {
          const input = fields(await bodyOf(req));
          const note = await mutate(notes => {
            const now = new Date().toISOString();
            const note = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
            notes.push(note);
            return note;
          });
          send(res, 201, note);
          return;
        }
      }
      const match = /^\/api\/notes\/([0-9a-f-]+)$/.exec(url.pathname);
      if (match && (req.method === 'PUT' || req.method === 'DELETE')) {
        const input = req.method === 'PUT' ? fields(await bodyOf(req)) : null;
        const note = await mutate(notes => {
          const index = notes.findIndex(n => n.id === match[1]);
          if (index < 0) throw Object.assign(new Error('便签不存在'), { status: 404 });
          if (input) Object.assign(notes[index], input, { updatedAt: new Date().toISOString() });
          else notes.splice(index, 1);
          return input ? notes[index] : null;
        });
        send(res, 200, note === null ? { deleted: true } : note);
        return;
      }
      send(res, 404, { error: '页面或接口不存在' });
    } catch (error) {
      send(res, error.status || 500, { error: error.status ? error.message : '服务器处理失败' });
      if (!error.status) console.error(error);
    }
  }
  return { handle, server: http.createServer(handle) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 3000);
  createApp().server.listen(port, '127.0.0.1', () => {
    console.log(`ETHER Field Notes: http://127.0.0.1:${port}`);
  });
}
