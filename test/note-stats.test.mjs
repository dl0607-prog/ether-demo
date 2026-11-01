import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeNotes } from '../note-stats.mjs';

function assertNullProtoTags(tags) {
  assert.equal(typeof tags, 'object');
  assert.notEqual(tags, null);
  assert.equal(Object.getPrototypeOf(tags), null, 'tags 应为 null 原型对象');
}

function tagValue(tags, key) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(tags, key),
    true,
    `tags 应包含自有键 ${String(key)}`
  );
  return tags[key];
}

test('默认空输入返回零值', () => {
  const result = summarizeNotes();
  assert.deepEqual(
    { total: result.total, pinned: result.pinned },
    { total: 0, pinned: 0 }
  );
  assertNullProtoTags(result.tags);
  assert.deepEqual(Object.keys(result.tags), []);
  assert.deepEqual(Object.getOwnPropertyNames(result.tags), []);
});

test('空数组输入返回零值', () => {
  const result = summarizeNotes([]);
  assert.equal(result.total, 0);
  assert.equal(result.pinned, 0);
  assertNullProtoTags(result.tags);
  assert.equal(Object.keys(result.tags).length, 0);
});

test('非数组输入安全降级为零值', () => {
  for (const value of [null, undefined, 'abc', 123, {}, { length: 1 }]) {
    const result = summarizeNotes(value);
    assert.equal(result.total, 0);
    assert.equal(result.pinned, 0);
    assertNullProtoTags(result.tags);
    assert.equal(Object.keys(result.tags).length, 0);
  }
});

test('total 统计全部便签且 pinned 仅计 === true', () => {
  const notes = [
    { id: 1, pinned: true },
    { id: 2, pinned: false },
    { id: 3 },
    { id: 4, pinned: 1 },
    { id: 5, pinned: 'true' },
    { id: 6, pinned: {} },
    null,
    undefined,
    42
  ];
  const result = summarizeNotes(notes);
  assert.equal(result.total, 9);
  assert.equal(result.pinned, 1);
});

test('篇内重复标签去重只计一次', () => {
  const result = summarizeNotes([
    { tags: ['a', 'a', 'b', 'a', 'b'] }
  ]);
  assert.equal(tagValue(result.tags, 'a'), 1);
  assert.equal(tagValue(result.tags, 'b'), 1);
  assert.equal(Object.keys(result.tags).length, 2);
});

test('跨篇重复标签按篇计数', () => {
  const result = summarizeNotes([
    { tags: ['a', 'a'] },
    { tags: ['a', 'b'] },
    { tags: ['b'] },
    { tags: ['a', 'b', 'c'] }
  ]);
  assert.equal(tagValue(result.tags, 'a'), 3);
  assert.equal(tagValue(result.tags, 'b'), 3);
  assert.equal(tagValue(result.tags, 'c'), 1);
  assert.equal(Object.keys(result.tags).length, 3);
});

test('异常标签被忽略且不抛错', () => {
  const result = summarizeNotes([
    { tags: [1, null, undefined, {}, [], ['a'], true, '', 'ok'] },
    { tags: 'not-an-array' },
    { tags: null },
    { tags: { 0: 'x', length: 1 } },
    {}
  ]);
  assert.equal(result.total, 5);
  assert.equal(result.pinned, 0);
  assert.deepEqual(Object.keys(result.tags), ['ok']);
  assert.equal(tagValue(result.tags, 'ok'), 1);
});

test('原型污染防护：__proto__、constructor、prototype 作为普通键计数', () => {
  const beforeProto = Object.getPrototypeOf({});
  const beforeCtor = Object.prototype.constructor;

  const result = summarizeNotes([
    { tags: ['__proto__', 'constructor', 'prototype', '__proto__'] },
    { tags: ['__proto__', 'constructor'] }
  ]);

  assertNullProtoTags(result.tags);
  assert.equal(tagValue(result.tags, '__proto__'), 2);
  assert.equal(tagValue(result.tags, 'constructor'), 2);
  assert.equal(tagValue(result.tags, 'prototype'), 1);

  // Object.prototype 未被污染。
  assert.equal(Object.getPrototypeOf({}), beforeProto);
  assert.equal(Object.prototype.constructor, beforeCtor);
  assert.equal({}.__proto__, Object.prototype);
  assert.equal(Object.prototype.constructor, Object);
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal({}.polluted, undefined);
});

test('不修改入参 notes 与 tags 数组', () => {
  const tagsA = ['a', 'a', 'b'];
  const tagsB = ['b'];
  const notes = [
    { pinned: true, tags: tagsA },
    { pinned: false, tags: tagsB }
  ];
  const snapshotNotes = notes.map(n => ({ ...n, tags: [...n.tags] }));
  const keysBefore = Object.keys(notes[0]).slice();

  summarizeNotes(notes);

  assert.equal(notes.length, 2);
  assert.deepEqual(notes[0], snapshotNotes[0]);
  assert.deepEqual(notes[1], snapshotNotes[1]);
  assert.deepEqual(notes[0].tags, ['a', 'a', 'b']);
  assert.deepEqual(notes[1].tags, ['b']);
  assert.deepEqual(Object.keys(notes[0]), keysBefore);
  assert.equal(notes[0].pinned, true);
  assert.equal(notes[1].pinned, false);
});
