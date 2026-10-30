/* Kiểm thử không cần trình duyệt: node tests/run.js
   1) Chạy toàn bộ ca kiểm chứng (js/kiem-chung.js).
   2) Chạy mọi bảng tính với mọi tổ hợp ô chọn và các hệ số an toàn, kiểm tra không lỗi, không NaN. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
for (const f of ['core.js', 'm-dien.js', 'm-tram.js', 'm-co.js', 'kiem-chung.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f });
}
const CD = global.CD;
let fail = 0;

// 1) Ca kiểm chứng
for (const b of CD.benches) {
  const r = CD.runBench(b);
  if (!r.ok) {
    fail++;
    console.log(`LỆCH  ${b.code}  ${b.name}: chuẩn ${b.expect}, tool ${r.got}${r.err ? ' – ' + r.err : ''}`);
  }
}
console.log(`Ca kiểm chứng: ${CD.benches.length - fail}/${CD.benches.length} khớp`);

// 2) Mọi tổ hợp ô chọn
let runs = 0, bad = 0;
function combos(m) {
  const sels = m.inputs.filter((i) => i.type === 'sel' && typeof i.opts !== 'function');
  let list = [{}];
  for (const s of sels) {
    const next = [];
    for (const base of list) for (const o of s.opts) next.push(Object.assign({}, base, { [s.id]: o[0] }));
    list = next;
  }
  return list;
}
for (const m of CD.MODS) {
  const ks = m.sf == null ? [1] : [1, 1.25, 1.5];
  for (const over of combos(m)) for (const k of ks) {
    runs++;
    let r;
    try { r = CD.calcWith(m.id, over, k); } catch (e) {
      // Lỗi có chủ đích (ví dụ số mạch vượt bảng) vẫn hợp lệ nếu là thông báo rõ ràng
      if (!/vượt|phải|không/i.test(e.message)) { bad++; console.log(`LỖI  ${m.code} ${JSON.stringify(over)} k=${k}: ${e.message}`); }
      continue;
    }
    for (const t of r.tiles || []) {
      if (/NaN|undefined|Infinity|null/.test(String(t.v) + (t.s || ''))) { bad++; console.log(`NaN  ${m.code} ${JSON.stringify(over)} k=${k}: ${t.l} = ${t.v} ${t.s || ''}`); }
    }
    for (const c of r.checks || []) if (/NaN|undefined|Infinity/.test(c.join(' '))) { bad++; console.log(`NaN  ${m.code} check: ${c.join(' | ')}`); }
    for (const s of r.steps || []) if (/NaN|undefined|Infinity/.test(s.join(' '))) { bad++; console.log(`NaN  ${m.code} step: ${s.join(' | ')}`); }
  }
}
console.log(`Chạy ${runs} tổ hợp, ${bad} lỗi`);
process.exit(fail || bad ? 1 : 0);
