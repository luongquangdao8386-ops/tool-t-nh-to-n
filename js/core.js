/* Lõi công cụ: đăng ký module, dựng form, hệ số an toàn, hiển thị kết quả. */
(function () {
  'use strict';

  const SQ3 = Math.sqrt(3);

  // ---------- Tiện ích tính toán dùng chung ----------
  const U = {
    SQ3,
    // Nhận cả dấu phẩy thập phân kiểu Việt Nam: "0,85" hoặc "1.250,5"
    num(s) {
      if (typeof s === 'number') return s;
      if (s == null) return NaN;
      s = String(s).trim().replace(/\s/g, '');
      if (!s) return NaN;
      if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(',', '.');
      return Number(s);
    },
    f(x, d = 2) {
      if (x == null || !isFinite(x)) return '—';
      return x.toLocaleString('vi-VN', { maximumFractionDigits: d, minimumFractionDigits: 0 });
    },
    pick(list, x) { for (const a of list) if (a >= x - 1e-9) return a; return null; },
    interp(tbl, x) {
      if (x <= tbl[0][0]) return tbl[0][1];
      for (let i = 1; i < tbl.length; i++) {
        if (x <= tbl[i][0]) {
          const [x0, y0] = tbl[i - 1], [x1, y1] = tbl[i];
          return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
        }
      }
      return tbl[tbl.length - 1][1];
    },
    // Ống thép Sch40: [DN, đường kính trong mm]
    pickDN(dmm) {
      for (const p of U.STD.dn) if (p[1] >= dmm - 1e-9) return p;
      return null;
    },
    velocity(m3h, idmm) { return (m3h / 3600) / (Math.PI * Math.pow(idmm / 1000, 2) / 4); },
    breakerType(In) {
      if (In <= 63) return 'MCB';
      if (In <= 630) return 'MCCB';
      if (In <= 1600) return 'MCCB / ACB';
      return 'ACB';
    },
    STD: {
      breaker: [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300],
      frame: [63, 100, 160, 250, 400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300],
      icu: [6, 10, 15, 25, 36, 50, 65, 70, 85, 100, 150],
      cable: [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300],
      motor: [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800, 1000],
      trafo: [50, 75, 100, 160, 180, 250, 320, 400, 500, 560, 630, 750, 800, 1000, 1250, 1500, 1600, 2000, 2500, 3000, 4000, 5000],
      gen: [20, 30, 45, 60, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 550, 630, 700, 800, 900, 1000, 1100, 1250, 1400, 1500, 1650, 1800, 2000, 2250, 2500, 3000],
      ct: [50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 750, 800, 1000, 1200, 1250, 1500, 1600, 2000, 2500, 3000, 3200, 4000, 5000, 6000],
      fuseMV: [6.3, 10, 16, 20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200],
      kvar: [10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200, 1500],
      dn: [[15, 15.8], [20, 20.9], [25, 26.6], [32, 35.1], [40, 40.9], [50, 52.5], [65, 62.7], [80, 77.9], [100, 102.3], [125, 128.2], [150, 154.1], [200, 202.7], [250, 254.5], [300, 303.2], [350, 333.4], [400, 381], [450, 428.7], [500, 477.8], [600, 574.6]]
    }
  };

  // ---------- Đăng ký module ----------
  const GROUPS = [
    { id: 'dien', name: 'Điện động lực', sub: 'Dòng, dây, aptomat, ngắn mạch, động cơ, tụ bù' },
    { id: 'tram', name: 'Trạm & nguồn', sub: 'MBA, tủ trung thế, tủ hạ thế, thanh cái, máy phát, tiếp địa' },
    { id: 'co', name: 'Cơ – nhiệt – tiện ích', sub: 'Chiller, điều hoà, khí nén, khí thải, bơm, hơi, chiếu sáng' }
  ];
  const MODS = [];
  const SF_PRESETS = [1, 1.1, 1.15, 1.2, 1.25, 1.3, 1.5];

  // ---------- Lưu trạng thái trên trình duyệt ----------
  const KEY = 'codien-calc.v1';
  let store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* bỏ qua */ } }

  function stateOf(m) {
    if (!store[m.id]) store[m.id] = {};
    const st = store[m.id];
    if (!st.v) st.v = {};
    for (const inp of m.inputs) if (st.v[inp.id] === undefined) st.v[inp.id] = String(inp.value);
    if (st.k === undefined) st.k = m.sf == null ? 1 : m.sf;
    return st;
  }
  function rawValues(m) {
    const st = stateOf(m), v = {};
    for (const inp of m.inputs) v[inp.id] = inp.type === 'sel' ? st.v[inp.id] : U.num(st.v[inp.id]);
    return v;
  }
  const visible = (inp, v) => !inp.show || inp.show(v);
  const optsOf = (inp, v) => (typeof inp.opts === 'function' ? inp.opts(v) : inp.opts);

  // ---------- DOM ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderNav(activeId) {
    const nav = $('#side');
    let h = `<a class="nav-link nav-home${!activeId ? ' on' : ''}" href="#tong-quan"><span class="nav-code">00</span><span>Tổng quan</span><span></span></a>`;
    for (const g of GROUPS) {
      h += `<div class="nav-group"><h3>${esc(g.name)}</h3>`;
      for (const m of MODS.filter((x) => x.group === g.id)) {
        h += `<a class="nav-link${m.id === activeId ? ' on' : ''}" href="#${m.id}"><span class="nav-code">${esc(m.code)}</span><span>${esc(m.title)}</span>${m.suggest ? '<span class="tag-sug">Gợi ý</span>' : '<span></span>'}</a>`;
      }
      h += '</div>';
    }
    nav.innerHTML = h;
  }

  function renderHome() {
    let h = `<section class="hero"><div class="hero-in">
      <div class="eyebrow">Nhà máy giấy bao bì · Phòng cơ điện</div>
      <h1>Bộ tính toán cơ điện</h1>
      <p>${MODS.length} bảng tính cho hệ thống điện, trạm, nguồn dự phòng và tiện ích nhà xưởng. Mỗi bảng tính có hệ số an toàn k chọn được (1 · 1,1 · 1,15 · 1,2 · 1,25 · 1,3 · 1,5 hoặc tự nhập), kết quả chọn thiết bị theo dãy tiêu chuẩn, kèm diễn giải công thức để kiểm tra lại.</p>
      <div class="legend"><span><span class="pill ok">Đạt</span> thỏa điều kiện</span><span><span class="pill warn">Lưu ý</span> cần xem lại</span><span><span class="pill bad">Không đạt</span> phải đổi thông số</span><span><span class="tag-sug">Gợi ý</span> bảng tính đề xuất thêm</span></div>
    </div></section>`;
    for (const g of GROUPS) {
      h += `<section class="home-group"><h2>${esc(g.name)} <small>${esc(g.sub)}</small></h2><div class="cards">`;
      for (const m of MODS.filter((x) => x.group === g.id)) {
        h += `<a class="card" href="#${m.id}"><div class="card-top"><span class="card-code">${esc(m.code)}</span>${m.suggest ? '<span class="tag-sug">Gợi ý</span>' : ''}</div><div class="card-title">${esc(m.title)}</div><div class="card-desc">${esc(m.desc)}</div></a>`;
      }
      h += '</div></section>';
    }
    h += footer();
    $('#view').innerHTML = `<div class="wrap">${h}</div>`;
  }

  function footer() {
    return `<div class="foot">Kết quả mang tính tính toán sơ bộ, dựa trên các công thức và bảng tra phổ biến (IEC 60364-5-52, IEC 60909, DIN 43671, TCVN, sổ tay khí nén/HVAC). Khi đặt hàng thiết bị cần đối chiếu catalogue nhà sản xuất và điều kiện lắp đặt thực tế. Dữ liệu nhập được lưu trên trình duyệt của máy này.</div>`;
  }

  function fmtK(k) { return U.f(k, 3); }

  function renderModule(m) {
    const st = stateOf(m);
    const v = rawValues(m);
    let h = `<div class="plate-head"><div class="plate-code">${esc(m.code)}</div><div class="plate-body"><h1>${esc(m.title)}</h1><p>${esc(m.desc)}</p></div></div>`;
    if (m.sf != null) {
      const isPreset = SF_PRESETS.some((p) => Math.abs(p - st.k) < 1e-9);
      h += `<div class="sf-bar"><div class="sf-label">Hệ số an toàn <b>k = <span id="k-show">${fmtK(st.k)}</span></b></div>
        <div class="chips" role="group" aria-label="Chọn hệ số an toàn">${SF_PRESETS.map((p) => `<button type="button" class="chip" data-k="${p}" aria-pressed="${Math.abs(p - st.k) < 1e-9}">${U.f(p, 2)}</button>`).join('')}</div>
        <label class="sf-custom" for="k-custom">Khác <input id="k-custom" class="plain" inputmode="decimal" autocomplete="off" value="${isPreset ? '' : esc(U.f(st.k, 3))}" placeholder="vd 1,4"></label>
        <div class="sf-note">${esc(m.sfNote || '')}</div></div>`;
    }
    h += `<div class="mod-grid"><section class="panel"><div class="panel-h"><span>Thông số đầu vào</span><button type="button" class="btn-ghost" id="btn-reset">Đặt lại mặc định</button></div><div class="panel-b"><div class="fields" id="fields">${fieldsHtml(m, v)}</div></div></section>
      <section class="panel res" aria-live="polite"><div class="panel-h"><span>Kết quả</span><button type="button" class="btn-ghost" id="btn-copy">Sao chép kết quả</button></div><div class="panel-b" id="result"></div></section></div>`;
    h += footer();
    $('#view').innerHTML = `<div class="wrap">${h}</div>`;
    bindModule(m);
    renderResult(m);
  }

  function fieldsHtml(m, v) {
    const st = stateOf(m);
    let h = '';
    for (const inp of m.inputs) {
      if (!visible(inp, v)) continue;
      const id = `f-${m.id}-${inp.id}`;
      let ctl;
      if (inp.type === 'sel') {
        const opts = optsOf(inp, v);
        if (!opts.some((o) => String(o[0]) === st.v[inp.id])) st.v[inp.id] = String(opts[0][0]);
        ctl = `<select id="${id}" data-in="${inp.id}">${opts.map((o) => `<option value="${esc(o[0])}"${String(o[0]) === st.v[inp.id] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
      } else {
        ctl = `<input id="${id}" data-in="${inp.id}" inputmode="decimal" autocomplete="off" value="${esc(/^-?\d+\.\d+$/.test(st.v[inp.id]) ? st.v[inp.id].replace('.', ',') : st.v[inp.id])}">`;
      }
      h += `<div class="field${inp.wide ? ' wide' : ''}" data-f="${inp.id}"><label for="${id}">${esc(inp.label)}</label><div class="ctl">${ctl}${inp.unit ? `<span class="unit">${esc(inp.unit)}</span>` : ''}</div>${inp.hint ? `<div class="hint">${esc(inp.hint)}</div>` : ''}</div>`;
    }
    return h;
  }

  function bindModule(m) {
    const st = stateOf(m);
    const view = $('#view');
    view.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
      st.k = Number(b.dataset.k); save();
      view.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      const ci = $('#k-custom'); if (ci) ci.value = '';
      $('#k-show').textContent = fmtK(st.k);
      renderResult(m);
    }));
    const kc = $('#k-custom');
    if (kc) kc.addEventListener('input', () => {
      const k = U.num(kc.value);
      if (isFinite(k) && k >= 0.5 && k <= 5) {
        st.k = k; save();
        view.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(Math.abs(Number(c.dataset.k) - k) < 1e-9)));
        $('#k-show').textContent = fmtK(k);
        renderResult(m);
      }
    });
    const fields = $('#fields');
    fields.addEventListener('input', (e) => {
      const t = e.target; if (!t.dataset.in) return;
      st.v[t.dataset.in] = t.value; save();
      if (t.tagName === 'SELECT') {
        fields.innerHTML = fieldsHtml(m, rawValues(m));
        const again = document.getElementById(t.id); if (again) again.focus();
      }
      renderResult(m);
    });
    $('#btn-reset').addEventListener('click', () => {
      store[m.id] = {}; save(); renderModule(m); toast('Đã đặt lại thông số mặc định');
    });
    $('#btn-copy').addEventListener('click', () => copyResult(m));
  }

  let lastText = '';
  function renderResult(m) {
    const st = stateOf(m);
    const v = rawValues(m);
    const box = $('#result');
    const bad = m.inputs.filter((i) => i.type !== 'sel' && visible(i, v) && !isFinite(v[i.id]));
    document.querySelectorAll('.field').forEach((el) => el.classList.toggle('err', bad.some((b) => b.id === el.dataset.f)));
    if (bad.length) {
      box.innerHTML = `<div class="error">Chưa đúng định dạng số: ${bad.map((b) => esc(b.label)).join(', ')}. Dùng dấu phẩy hoặc dấu chấm cho phần thập phân, ví dụ 0,85.</div>`;
      lastText = ''; return;
    }
    let r;
    try { r = m.calc(v, m.sf == null ? 1 : st.k, U); } catch (e) { r = { error: e.message || String(e) }; }
    if (r.error) { box.innerHTML = `<div class="error">${esc(r.error)}</div>`; lastText = ''; return; }
    let h = '';
    if (r.tiles && r.tiles.length) {
      h += '<div class="tiles">' + r.tiles.map((t) => `<div class="tile${t.main ? ' main' : ''}"><div class="tile-l">${esc(t.l)}</div><div class="tile-v">${esc(t.v)}${t.u ? `<small>${esc(t.u)}</small>` : ''}</div>${t.s ? `<div class="tile-s">${esc(t.s)}</div>` : ''}</div>`).join('') + '</div>';
    }
    if (r.checks && r.checks.length) {
      const lab = { ok: 'Đạt', warn: 'Lưu ý', bad: 'Không đạt' };
      h += '<div class="sec-t">Kiểm tra</div><div class="checks">' + r.checks.map((c) => `<div class="check"><span class="pill ${c[0]}">${lab[c[0]]}</span><span>${esc(c[1])}</span></div>`).join('') + '</div>';
    }
    if (r.steps && r.steps.length) {
      h += '<div class="sec-t">Diễn giải tính toán</div><div class="steps-wrap"><table class="steps"><thead><tr><th>Đại lượng</th><th>Công thức / cơ sở</th><th style="text-align:right">Giá trị</th></tr></thead><tbody>' +
        r.steps.map((s) => `<tr><td>${esc(s[0])}</td><td class="f">${esc(s[1] || '')}</td><td class="v">${esc(s[2])}</td></tr>`).join('') + '</tbody></table></div>';
    }
    if (r.notes && r.notes.length) {
      h += '<div class="sec-t">Ghi chú kỹ thuật</div><ul class="notes">' + r.notes.map((n) => `<li>${esc(n)}</li>`).join('') + '</ul>';
    }
    box.innerHTML = h;
    // Bản text để sao chép (dán vào Zalo, email, báo cáo)
    const L = [`${m.code} ${m.title}`];
    if (m.sf != null) L.push(`Hệ số an toàn k = ${fmtK(st.k)}`);
    L.push('— Đầu vào:');
    for (const i of m.inputs) {
      if (!visible(i, v)) continue;
      const val = i.type === 'sel' ? (optsOf(i, v).find((o) => String(o[0]) === st.v[i.id]) || [0, ''])[1] : U.f(v[i.id], 4);
      L.push(`  ${i.label}: ${val}${i.unit ? ' ' + i.unit : ''}`);
    }
    L.push('— Kết quả:');
    (r.tiles || []).forEach((t) => L.push(`  ${t.l}: ${t.v}${t.u ? ' ' + t.u : ''}${t.s ? ' (' + t.s + ')' : ''}`));
    (r.checks || []).forEach((c) => L.push(`  [${c[0] === 'ok' ? 'Đạt' : c[0] === 'warn' ? 'Lưu ý' : 'Không đạt'}] ${c[1]}`));
    lastText = L.join('\n');
  }

  function copyResult() {
    if (!lastText) { toast('Chưa có kết quả để sao chép'); return; }
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = lastText; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); toast(ok ? 'Đã sao chép kết quả' : 'Trình duyệt chặn sao chép');
    };
    try {
      navigator.clipboard.writeText(lastText).then(() => toast('Đã sao chép kết quả'), fallback);
    } catch (e) { fallback(); }
  }

  let toastTimer;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
  }

  // ---------- Điều hướng ----------
  function route() {
    const id = (location.hash || '').replace('#', '');
    const m = MODS.find((x) => x.id === id);
    document.body.classList.remove('nav-open');
    renderNav(m ? m.id : null);
    if (m) { renderModule(m); document.title = `${m.title} · Tính toán cơ điện`; }
    else { renderHome(); document.title = 'Tính toán cơ điện'; }
    window.scrollTo(0, 0);
  }

  function start() {
    $('#menu-btn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    window.addEventListener('hashchange', route);
    route();
  }

  window.CD = {
    U, GROUPS, SF_PRESETS,
    register(m) { MODS.push(m); },
    start
  };
})();
