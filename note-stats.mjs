// note-stats.mjs
// 独立纯函数模块：汇总便签统计信息。
// - notes 默认空数组；非数组输入安全降级为空数组。
// - pinned 仅在 note.pinned === true 时计数。
// - tags 以“篇”为单位去重后计数；仅接受非空字符串标签。
// - 返回的 tags 使用 null 原型对象，避免 __proto__ 等键触发原型污染。
// - 不修改入参。

export function summarizeNotes(notes = []) {
  const list = Array.isArray(notes) ? notes : [];
  const total = list.length;
  let pinned = 0;
  const tagCounts = Object.create(null);

  for (const note of list) {
    if (note !== null && typeof note === 'object' && note.pinned === true) {
      pinned += 1;
    }

    const rawTags =
      note !== null && typeof note === 'object' ? note.tags : undefined;
    if (!Array.isArray(rawTags)) continue;

    // 每篇内去重，且仅保留非空字符串。
    const seen = new Set();
    for (const tag of rawTags) {
      if (typeof tag !== 'string' || tag.length === 0) continue;
      if (seen.has(tag)) continue;
      seen.add(tag);
    }

    for (const tag of seen) {
      // tagCounts 为 null 原型对象，'__proto__' 等键为普通自有属性。
      if (Object.prototype.hasOwnProperty.call(tagCounts, tag)) {
        tagCounts[tag] += 1;
      } else {
        tagCounts[tag] = 1;
      }
    }
  }

  return { total, pinned, tags: tagCounts };
}
