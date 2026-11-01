const list = document.querySelector('#list');
const count = document.querySelector('#count');
const search = document.querySelector('#search');
const form = document.querySelector('#form');
const title = document.querySelector('#title');
const content = document.querySelector('#content');
const heading = document.querySelector('#editor-title');
const submit = document.querySelector('#submit');
const cancel = document.querySelector('#cancel');
const feedback = document.querySelector('#feedback');
let editingId = null;
let notes = [];
let searchVersion = 0;

function message(text) { feedback.textContent = text; }
function resetForm() {
  form.reset(); editingId = null; heading.textContent = '新建便签';
  submit.firstChild.textContent = '保存便签 '; cancel.hidden = true;
}
async function request(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}
function render() {
  count.textContent = String(notes.length);
  list.replaceChildren();
  if (!notes.length) {
    const empty = document.createElement('div'); empty.className = 'empty';
    empty.innerHTML = '<div class="empty-symbol">✳</div><h3></h3><p></p>';
    empty.querySelector('h3').textContent = search.value.trim() ? '没有找到相关便签' : '这里还没有便签';
    empty.querySelector('p').textContent = search.value.trim() ? '试试其他关键词。' : '从右侧写下第一条项目线索。';
    list.append(empty); return;
  }
  for (const note of notes) {
    const card = document.createElement('article'); card.className = 'note-card';
    const top = document.createElement('div'); top.className = 'note-top';
    const name = document.createElement('h3'); name.className = 'note-title'; name.textContent = note.title;
    const actions = document.createElement('div'); actions.className = 'note-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '编辑'; edit.setAttribute('aria-label', `编辑 ${note.title}`);
    edit.addEventListener('click', () => { editingId = note.id; title.value = note.title; content.value = note.content; heading.textContent = '编辑便签'; submit.firstChild.textContent = '保存修改 '; cancel.hidden = false; message(''); title.focus(); });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete'; remove.textContent = '删除'; remove.setAttribute('aria-label', `删除 ${note.title}`);
    remove.addEventListener('click', async () => {
      if (!window.confirm(`确定删除「${note.title}」吗？此操作无法撤销。`)) return;
      remove.disabled = true;
      try { await request(`/api/notes/${note.id}`, { method: 'DELETE' }); if (editingId === note.id) resetForm(); message('便签已删除'); await load(); }
      catch (error) { message(`删除失败：${error.message}`); remove.disabled = false; }
    });
    actions.append(edit, remove); top.append(name, actions);
    const body = document.createElement('p'); body.className = 'note-content'; body.textContent = note.content;
    const date = document.createElement('time'); date.className = 'note-meta'; date.dateTime = note.updatedAt; date.textContent = `更新于 ${new Date(note.updatedAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}`;
    card.append(top, body, date); list.append(card);
  }
}
async function load() {
  const version = ++searchVersion;
  try { const result = await request(`/api/notes?q=${encodeURIComponent(search.value.trim())}`); if (version === searchVersion) { notes = result; render(); } }
  catch (error) { if (version === searchVersion) { list.textContent = `加载失败：${error.message}`; count.textContent = '—'; } }
}
form.addEventListener('submit', async event => {
  event.preventDefault(); message(''); submit.disabled = true;
  try {
    const path = editingId ? `/api/notes/${editingId}` : '/api/notes';
    const method = editingId ? 'PUT' : 'POST';
    await request(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: title.value, content: content.value }) });
    resetForm(); message(method === 'POST' ? '便签已保存' : '修改已保存'); await load();
  } catch (error) { message(`保存失败：${error.message}`); }
  finally { submit.disabled = false; }
});
cancel.addEventListener('click', () => { resetForm(); message('已取消编辑'); });
let searchTimer;
search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 180); });
load();
