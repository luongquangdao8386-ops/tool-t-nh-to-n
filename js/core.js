/* Lõi công cụ: đăng ký module, điều hướng, dựng giao diện, hệ số an toàn, hiển thị kết quả. */
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

  // ---------- Nhóm & module ----------
  const GROUPS = [
    { id: 'dien', name: 'Điện động lực', icon: 'bolt', sub: 'cable' },
    { id: 'tram', name: 'Trạm & nguồn', icon: 'source', sub: 'bolt' },
    { id: 'co', name: 'Cơ – nhiệt – tiện ích', icon: 'gear', sub: 'gear' }
  ];
  const MODS = [];
  const SF_PRESETS = [1, 1.1, 1.15, 1.2, 1.25, 1.3, 1.5];
  const groupOf = (m) => GROUPS.find((g) => g.id === m.group);
  const modsOf = (g) => MODS.filter((m) => m.group === g.id);
  const pad2 = (n) => String(n).padStart(2, '0');

  // ---------- Trạng thái nhập liệu: chỉ giữ khi đang dùng, không lưu lại; về trang chủ là trở về mặc định ----------
  let store = {};
  function save() { /* không lưu */ }
  function resetAll() { store = {}; }

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

  // ---------- Biểu tượng (nét 1,7 px, theo bản thiết kế) ----------
  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
    source: '<rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 6V3m8 3V3M8 10h3m2 0h3M8 14h3m2 0h3m-4 3v4"/>',
    gear: '<path d="m9 3 1-1h4l1 3 3 1 3 1v4l-2 2-1 3v3l-4 2-3-1-3-1H5l-2-4 1-3 1-3V6l4-3Z"/><circle cx="12" cy="12" r="3.5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    left: '<path d="M19 12H5m5-5-5 5 5 5"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    calc: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"/>',
    factory: '<path d="M3 21V10l6 3V9l6 4V3h4v18H3Z"/><path d="M6 17h1m3 0h1m3 0h1"/>',
    sliders: '<path d="M4 7h8m4 0h4M4 17h3m4 0h9"/><circle cx="14" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    circlecheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    warn: '<path d="m10.3 3.5-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.7-2.5l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 8v5m0 3v.1"/>',
    fail: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m-6 0 6-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    formula: '<path d="M18 4H8l6 8-6 8h10M4 4v16"/>',
    cable: '<path d="M3 17h7a5 5 0 0 0 0-10H7m0-3v6m-3-6v6m0-6h3m-1 6v3M14 4h7m-7 4h5m-2 7h4m-4 4h4"/>'
  };
  const icon = (n) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${P[n] || P.calc}</svg>`;
  const MARK = '<span class="brandmark"><svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M7 12.5 18 6l11 6.5V24L18 30 7 24V12.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m7 12.5 11 6 11-6M18 18.5V30" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m19.5 8-6 9h5l-2 8 8-11h-5l.5-6Z" fill="currentColor" stroke="#F5C400" stroke-width="1.2" stroke-linejoin="round"/></svg></span>';
  const BRAND = `<a class="brand" href="#tong-quan" aria-label="Tính toán cơ điện — Trang tổng quan">${MARK}<span><span class="brand-name">Tính toán cơ điện</span><span class="brand-subtitle">NHÀ MÁY GIẤY BAO BÌ</span></span></a>`;
  const PAPER = '<svg class="paper-icon" viewBox="0 0 170 90" fill="none" aria-hidden="true"><path d="M14 63h139M28 56V31l32 14V27l32 15V17h25v39M100 18V8h8v10M40 51h7m18 0h7m18 0h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="m22 76 63 7 64-7m-127-7 63 7 64-7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="133" cy="47" r="16" fill="white" stroke="currentColor" stroke-width="1.4"/><circle cx="133" cy="47" r="8" stroke="currentColor" stroke-width="1.4"/><circle cx="133" cy="47" r="2" fill="currentColor"/></svg>';
  const CABLE_DRAWING = '<svg class="cable-drawing" viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="m52 21 27 15c10 6 16 18 13 30-4 15-23 23-36 15L29 66" stroke="currentColor" stroke-width="1.2"/><ellipse cx="40" cy="45" rx="26" ry="28" transform="rotate(-28 40 45)" stroke="currentColor" stroke-width="1.5"/><ellipse cx="40" cy="45" rx="21" ry="23" transform="rotate(-28 40 45)" stroke="currentColor" stroke-width="1"/><ellipse cx="39" cy="34" rx="7" ry="8" transform="rotate(-28 39 34)" stroke="currentColor" stroke-width="1.2"/><ellipse cx="30" cy="49" rx="7" ry="8" transform="rotate(-28 30 49)" stroke="currentColor" stroke-width="1.2"/><ellipse cx="49" cy="51" rx="7" ry="8" transform="rotate(-28 49 51)" stroke="currentColor" stroke-width="1.2"/><path d="m57 31 26 15M62 52l28 16M45 70l24 14" stroke="currentColor" stroke-width="1"/></svg>';

  // ---------- DOM ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const normalize = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  const fmtK = (k) => U.f(k, 3);
  let view = 'home';
  let current = null;

  // ---------- Khung chung ----------
  function header() {
    return `<header class="topbar"><div class="top-inner">
      <button type="button" class="icon-button mobile-menu" data-menu aria-label="Mở menu danh mục" aria-expanded="false">${icon('menu')}</button>
      ${BRAND}
      <nav class="top-nav" aria-label="Điều hướng chính"><a class="top-link ${view === 'home' ? 'active' : ''}" href="#tong-quan">${icon('grid')}Tổng quan</a><button type="button" class="top-link" data-menu>${icon('list')}Danh mục</button><a class="top-link ${view === 'verify' ? 'active' : ''}" href="#kiem-chung">${icon('shield')}Kiểm chứng</a></nav>
      <div class="top-meta"><span class="factory-tag">${icon('factory')}Công cụ kỹ thuật nhà máy</span><span class="pill-badge"><i class="pill-dot"></i>${MODS.length} bảng tính</span></div>
    </div></header>`;
  }

  function sidebar() {
    const cg = current ? current.group : null;
    return `<aside class="sidebar" aria-label="Nhóm bảng tính"><p class="side-eyebrow">KHÔNG GIAN KỸ THUẬT</p>
      <a href="#tong-quan" class="side-link ${view === 'home' ? 'active' : ''}">${icon('grid')}Tổng quan</a>
      <a href="#kiem-chung" class="side-link ${view === 'verify' ? 'active' : ''}">${icon('shield')}Kiểm chứng</a>
      <div class="side-separator"></div><p class="side-caption">DANH MỤC BẢNG TÍNH</p>
      ${GROUPS.map((g) => `<a class="side-link ${view === 'calc' && g.id === cg ? 'active' : ''}" href="#nhom-${g.id}">${icon(g.icon)}${esc(g.name)}<span class="count">${pad2(modsOf(g).length)}</span></a>`).join('')}
      ${view === 'calc' && current ? `<a href="#${current.id}" class="side-current"><span class="code-tag">${esc(current.code)}</span><span><b>${esc(current.title)}</b></span></a>` : ''}
      <div class="side-bottom">${PAPER}<strong>Tính đúng. Chọn an toàn.</strong><p>Đồng hành cùng vận hành<br>nhà máy giấy bao bì.</p></div></aside>`;
  }

  function footer(calc) {
    return `<footer class="page-footer ${calc ? 'calc-page-footer' : ''}"><span>${icon('factory')}Dành cho nhà máy giấy bao bì</span><span>Công cụ hỗ trợ tính toán · thiết kế chính thức do kỹ sư có thẩm quyền duyệt</span></footer>`;
  }

  // ---------- Trang tổng quan ----------
  function toolCard(m) {
    return `<a class="tool-card" href="#${m.id}" data-search="${esc(normalize(m.code + ' ' + m.title + ' ' + (m.short || '') + ' ' + m.desc))}"><span class="tool-info"><span class="tool-topline"><span class="code-tag">${esc(m.code)}</span>${icon('arrow')}</span><span class="tool-name">${esc(m.title)}</span><span class="tool-desc">${esc(m.short || m.desc)}</span></span></a>`;
  }

  function homeView() {
    return `<main id="main" class="main"><div class="overview-top"><div><div class="eyebrow">BỘ CÔNG CỤ CHO KỸ SƯ NHÀ MÁY</div><h1>Bảng tính cơ điện</h1><p>Từ nguồn điện đến dây chuyền sản xuất. Chọn công cụ, nhập thông số và kiểm tra phương án.</p>
      <div class="mobile-summary"><strong>${MODS.length}</strong> bảng tính<span class="dot"></span><strong>${pad2(GROUPS.length)}</strong> nhóm chuyên môn</div></div>
      <div class="overview-stats"><div class="stat"><b>${MODS.length}<span>.</span></b><span>Bảng tính</span></div><div class="stat"><b>${pad2(GROUPS.length)}<span>.</span></b><span>Nhóm chuyên môn</span></div></div></div>
      <div class="search-area"><label class="search-box">${icon('search')}<input type="search" id="home-search" placeholder="Tìm bảng tính theo tên hoặc mã..." aria-label="Tìm bảng tính theo tên hoặc mã" autocomplete="off"><span class="key-hint">/</span></label><span class="search-count" id="search-count">${MODS.length} bảng tính</span></div>
      <a class="verify-banner" href="#kiem-chung"><span class="vb-icon">${icon('shield')}</span><span class="vb-text"><strong>Kiểm chứng tính toán</strong><span>Mỗi bảng ghi rõ tiêu chuẩn, giả thiết và cách tự kiểm. Trang Kiểm chứng đối chiếu bảng tra và công thức với số liệu chuẩn.</span></span>${icon('arrow')}</a>
      <div class="groups-grid">${GROUPS.map((g) => `<section class="group" id="nhom-${g.id}" aria-labelledby="title-${g.id}"><div class="group-heading"><span class="group-icon">${icon(g.icon)}</span><h2 id="title-${g.id}">${esc(g.name)}</h2><span class="group-count">${pad2(modsOf(g).length)}</span></div><div class="tool-list">${modsOf(g).map(toolCard).join('')}</div></section>`).join('')}</div>
      <p class="empty-state" id="empty-state" hidden>Chưa tìm thấy bảng tính phù hợp.<br>Thử tìm bằng tên hoặc mã khác.</p>${footer(false)}</main>`;
  }

  function bindHome() {
    const input = $('#home-search');
    input.addEventListener('input', () => {
      const q = normalize(input.value.trim());
      let total = 0;
      document.querySelectorAll('.group').forEach((sec) => {
        let n = 0;
        sec.querySelectorAll('.tool-card').forEach((c) => { c.hidden = !c.dataset.search.includes(q); if (!c.hidden) n++; });
        sec.hidden = n === 0;
        sec.querySelector('.group-count').textContent = pad2(n);
        total += n;
      });
      $('#search-count').textContent = `${total} bảng tính`;
      $('#empty-state').hidden = total !== 0;
    });
  }

  // ---------- Trang bảng tính ----------
  function calcView(m) {
    const g = groupOf(m), st = stateOf(m), v = rawValues(m);
    const isPreset = SF_PRESETS.some((p) => Math.abs(p - st.k) < 1e-9);
    const nIn = m.inputs.filter((i) => visible(i, v)).length;
    let h = `<main id="main" class="main calc-main"><div class="breadcrumb"><button type="button" data-home aria-label="Về trang tổng quan">${icon('left')}</button><a href="#tong-quan">Tổng quan</a>${icon('chevron')}<a href="#nhom-${g.id}">${esc(g.name)}</a>${icon('chevron')}<span>${esc(m.code)}</span></div>
      <div class="calc-heading"><div class="eyebrow"><span class="calc-code">${esc(m.code)}</span>${esc(g.name)}</div><h1>${esc(m.title)}</h1><p>${esc(m.desc)}</p></div>`;
    if (m.sf != null) {
      h += `<section class="factor-panel" aria-labelledby="factor-title"><div class="factor-caption"><h2 id="factor-title">Hệ số an toàn <i>k = <span id="k-show">${fmtK(st.k)}</span></i></h2><p>${esc(m.sfNote || '')}</p></div>
        <div><div class="factor-choices" role="group" aria-label="Chọn hệ số an toàn">${SF_PRESETS.map((p) => `<button type="button" class="factor-btn" data-k="${p}" aria-pressed="${Math.abs(p - st.k) < 1e-9}">${U.f(p, 2)}</button>`).join('')}<button type="button" class="factor-btn" data-k="other" aria-pressed="${!isPreset}">Khác</button></div>
        <label class="custom-factor" id="custom-factor" ${isPreset ? 'hidden' : ''}>Nhập hệ số k<input id="custom-k" type="text" inputmode="decimal" autocomplete="off" value="${esc(U.f(st.k, 3))}" aria-label="Hệ số an toàn tùy chọn"><small>Ví dụ: 1,35</small></label></div></section>`;
    } else {
      h += '<div style="height:22px"></div>';
    }
    h += `<div class="calc-grid"><div class="calc-left"><section class="panel input-panel" aria-labelledby="input-title"><div class="panel-head"><span class="section-symbol">${icon('sliders')}</span><div><h2 id="input-title">Thông số đầu vào</h2><p id="in-count">${nIn} thông số</p></div><span class="section-num">01</span></div>
        <form class="input-body" id="calc-form" novalidate><div class="form-grid" id="fields">${fieldsHtml(m, v)}</div><div class="input-hint">${icon('info')}<span>Số thập phân dùng dấu phẩy hoặc dấu chấm, ví dụ 0,85. Kết quả tính lại ngay khi đổi thông số. Về trang chủ thì mọi bảng trở về số mặc định.</span></div></form></section>
        <p class="left-note">${icon('shield')}<span>Đối chiếu điều kiện lắp đặt thực tế<br>trước khi lựa chọn dây và thiết bị bảo vệ.</span></p></div>
      <div class="calc-right"><section class="panel result-panel" aria-labelledby="result-title"><div class="panel-head"><span class="section-symbol">${icon('calc')}</span><h2 id="result-title">Kết quả</h2><span class="live-caption">Tính theo thông số nhập</span></div><div class="result-body" id="result" aria-live="polite"></div></section></div></div>${footer(true)}</main>`;
    return h;
  }

  function fieldsHtml(m, v) {
    const st = stateOf(m);
    // Ô chọn chiếm trọn hàng; ô số bị lẻ một mình trên hàng cũng kéo rộng để không chừa khoảng trống
    const list = m.inputs.filter((inp) => visible(inp, v)).map((inp) => ({ inp, wide: inp.type === 'sel' || !!inp.wide }));
    let open = null;
    for (const it of list) {
      if (it.wide) { if (open) open.wide = true; open = null; }
      else open = open ? null : it;
    }
    if (open) open.wide = true;
    let h = '';
    for (const { inp, wide } of list) {
      const id = `f-${m.id}-${inp.id}`;
      const hint = inp.hint ? `<span class="field-hint">${esc(inp.hint)}</span>` : '';
      if (inp.type === 'sel') {
        const opts = optsOf(inp, v);
        if (!opts.some((o) => String(o[0]) === st.v[inp.id])) st.v[inp.id] = String(opts[0][0]);
        h += `<label class="field wide" data-f="${inp.id}" for="${id}"><span class="field-label">${esc(inp.label)}</span><span class="select-shell"><select id="${id}" data-in="${inp.id}">${opts.map((o) => `<option value="${esc(o[0])}"${String(o[0]) === st.v[inp.id] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>${icon('down')}</span>${hint}</label>`;
      } else {
        const raw = st.v[inp.id];
        const shown = /^-?\d+\.\d+$/.test(raw) ? raw.replace('.', ',') : raw;
        h += `<label class="field${wide ? ' wide' : ''}" data-f="${inp.id}" for="${id}"><span class="field-label">${esc(inp.label)}</span><span class="input-shell"><input id="${id}" data-in="${inp.id}" type="text" inputmode="decimal" autocomplete="off" value="${esc(shown)}">${inp.unit ? `<span class="unit" aria-hidden="true">${esc(inp.unit)}</span>` : ''}</span>${hint}</label>`;
      }
    }
    return h;
  }

  function bindCalc(m) {
    const st = stateOf(m);
    const custom = $('#custom-factor'), ck = $('#custom-k');
    const setPressed = (k, other) => document.querySelectorAll('.factor-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === 'other' ? other : !other && Math.abs(Number(b.dataset.k) - k) < 1e-9)));
    document.querySelectorAll('.factor-btn').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.k === 'other') {
        custom.hidden = false; setPressed(st.k, true); ck.focus(); ck.select();
        return;
      }
      st.k = Number(b.dataset.k); save();
      custom.hidden = true; ck.value = U.f(st.k, 3);
      setPressed(st.k, false);
      $('#k-show').textContent = fmtK(st.k);
      renderResult(m);
    }));
    if (ck) ck.addEventListener('input', () => {
      const k = U.num(ck.value);
      if (isFinite(k) && k >= 0.5 && k <= 5) {
        st.k = k; save();
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
        $('#in-count').textContent = `${m.inputs.filter((i) => visible(i, rawValues(m))).length} thông số`;
      }
      renderResult(m);
    });
    $('#calc-form').addEventListener('submit', (e) => e.preventDefault());
    $('#result').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'copy-results') copyResult();
      if (b.id === 'reset-defaults') { store[m.id] = {}; save(); render(); toast('Đã đặt lại thông số mặc định'); }
    });
  }

  // Giữ số dính với đơn vị khi xuống dòng (259 A, 2,36 %, 120 mm²…)
  const nb = (s) => String(s).replace(/(\d) (?=(A|V|kA|kV|%|mm²|mm|kVA|kVAr|kW|m|°C|s|Ω|lux|bar|RT)\b|%|mm²|°C|Ω)/g, '$1 ');

  // Tách "Tiêu đề: chi tiết" để hiện hai dòng như thiết kế
  function splitCheck(c) {
    if (c.length >= 3) return [c[1], c[2]];
    const t = c[1], i = t.indexOf(': ');
    if (i > 0 && i < 60) return [t.slice(0, i), t.slice(i + 2)];
    return [t, ''];
  }

  function basisHtml(b) {
    const sec = (t, list) => (list && list.length ? `<h4>${t}</h4><ul>${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
    return `<details class="basis-box"><summary>${icon('shield')}<span>Cơ sở tính toán &amp; cách kiểm chứng</span>${icon('down')}</summary><div class="basis-body">${sec('Tiêu chuẩn, công thức', b.std)}${sec('Giả thiết', b.assume)}${sec('Cách tự kiểm', b.verify)}<a class="basis-link" href="#kiem-chung">Mở trang Kiểm chứng ${icon('arrow')}</a></div></details>`;
  }

  let lastText = '';
  function renderResult(m) {
    const st = stateOf(m);
    const v = rawValues(m);
    const box = $('#result');
    const actions = (copy) => `<div class="result-actions">${copy ? `<button type="button" class="button-primary" id="copy-results">${icon('copy')}Sao chép kết quả</button>` : ''}<button type="button" class="button-secondary" id="reset-defaults">${icon('reset')}Đặt lại mặc định</button></div>`;
    const bad = m.inputs.filter((i) => i.type !== 'sel' && visible(i, v) && !isFinite(v[i.id]));
    document.querySelectorAll('.field').forEach((el) => el.classList.toggle('err', bad.some((b) => b.id === el.dataset.f)));
    if (bad.length) {
      box.innerHTML = `<div class="result-error">${icon('fail')}<span>Chưa đúng định dạng số: ${bad.map((b) => esc(b.label)).join(', ')}. Dùng dấu phẩy hoặc dấu chấm cho phần thập phân, ví dụ 0,85.</span></div>${actions(false)}`;
      lastText = ''; return;
    }
    let r;
    try { r = m.calc(v, m.sf == null ? 1 : st.k, U); } catch (e) { r = { error: e.message || String(e) }; }
    if (r.error) { box.innerHTML = `<div class="result-error">${icon('fail')}<span>${esc(r.error)}</span></div>${actions(false)}`; lastText = ''; return; }

    const tiles = r.tiles || [];
    const main = tiles.find((t) => t.main) || tiles[0];
    const rest = tiles.filter((t) => t !== main);
    let h = '';
    if (main) {
      const len = String(main.v).length;
      const size = len <= 6 ? '' : len <= 11 ? ' m' : ' l';
      h += `<div class="hero-result"><div class="result-label">${esc(main.l)}</div><div class="main-value num${size}"><b>${esc(main.v)}</b>${main.u ? `<span>${esc(main.u)}</span>` : ''}</div>${main.s ? `<div class="result-subline">${icon(groupOf(m).sub)}<span>${esc(main.s)}</span></div>` : ''}${m.id === 'tiet-dien-day' ? CABLE_DRAWING : ''}</div>`;
    }
    if (rest.length) {
      h += '<div class="secondary-results">' + rest.map((t) => {
        const long = (String(t.v) + (t.u || '')).length > 10;
        return `<dl class="secondary-result"><dt>${esc(t.l)}</dt><dd class="num${long ? ' long' : ''}">${esc(t.v)}${t.u ? ` <span>${esc(t.u)}</span>` : ''}</dd>${t.s ? `<div class="sub">${esc(t.s)}</div>` : ''}</dl>`;
      }).join('') + '</div>';
    }
    if (r.checks && r.checks.length) {
      const map = { ok: ['', 'circlecheck', 'Đạt'], warn: ['warn', 'warn', 'Lưu ý'], bad: ['fail', 'fail', 'Không đạt'] };
      h += `<h3 class="checks-title">Kiểm tra phương án${main ? `<small>Đang chọn: ${esc(main.v)}${main.u ? ' ' + esc(main.u) : ''}</small>` : ''}</h3><ul class="checks">` + r.checks.map((c) => {
        const [cls, ic, lab] = map[c[0]];
        const [title, detail] = splitCheck(c);
        return `<li class="check-row ${cls}"><span class="check-status-icon">${icon(ic)}</span><div class="check-copy"><strong>${esc(nb(title))}</strong>${detail ? `<p>${esc(nb(detail))}</p>` : ''}</div><span class="badge ${cls}">${lab}</span></li>`;
      }).join('') + '</ul>';
    }
    if (r.steps && r.steps.length) {
      h += `<section class="formula-panel" aria-labelledby="formula-title"><h3 class="formula-title" id="formula-title">${icon('formula')}Diễn giải công thức</h3><div class="formula-wrap"><table><thead><tr><th scope="col">Đại lượng</th><th scope="col">Công thức</th><th scope="col">Giá trị</th></tr></thead><tbody>` +
        r.steps.map((s) => `<tr><td>${esc(s[0])}</td><td class="math">${esc(s[1] || '')}</td><td>${esc(nb(s[2]))}</td></tr>`).join('') + '</tbody></table></div></section>';
    }
    if (r.notes && r.notes.length) {
      h += `<div class="notes-box"><h3>${icon('info')}Ghi chú kỹ thuật</h3><ul>${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
    }
    if (m.basis) h += basisHtml(m.basis);
    h += actions(true);
    h += `<p class="result-note">${icon('info')}<span>Công cụ hỗ trợ tính toán theo tiêu chuẩn ghi ở mục Cơ sở tính toán. Thiết kế chính thức phải được kỹ sư có thẩm quyền kiểm tra và đối chiếu catalogue thiết bị.</span></p>`;
    box.innerHTML = h;

    // Bản chữ để sao chép (dán vào Zalo, email, báo cáo)
    const L = [`${m.code} ${m.title}`];
    if (m.sf != null) L.push(`Hệ số an toàn k = ${fmtK(st.k)}`);
    L.push('— Đầu vào:');
    for (const i of m.inputs) {
      if (!visible(i, v)) continue;
      const val = i.type === 'sel' ? (optsOf(i, v).find((o) => String(o[0]) === st.v[i.id]) || [0, ''])[1] : U.f(v[i.id], 4);
      L.push(`  ${i.label}: ${val}${i.unit ? ' ' + i.unit : ''}`);
    }
    L.push('— Kết quả:');
    tiles.forEach((t) => L.push(`  ${t.l}: ${t.v}${t.u ? ' ' + t.u : ''}${t.s ? ' (' + t.s + ')' : ''}`));
    (r.checks || []).forEach((c) => { const [a, b] = splitCheck(c); L.push(`  [${c[0] === 'ok' ? 'Đạt' : c[0] === 'warn' ? 'Lưu ý' : 'Không đạt'}] ${a}${b ? ': ' + b : ''}`); });
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
    try { navigator.clipboard.writeText(lastText).then(() => toast('Đã sao chép kết quả'), fallback); } catch (e) { fallback(); }
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2500);
  }

  // ---------- Menu danh mục (trượt từ trái) ----------
  let prevFocus = null;
  function openMenu() {
    const ov = $('#overlay');
    if (!ov.hidden) return;
    prevFocus = document.activeElement;
    const openG = current ? current.group : GROUPS[0].id;
    ov.innerHTML = `<div class="backdrop" data-close></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1">
      <div class="drawer-top">${BRAND}<button type="button" class="icon-button" data-close aria-label="Đóng menu danh mục">${icon('close')}</button></div>
      <div class="drawer-head"><div class="eyebrow">${MODS.length} CÔNG CỤ · ${GROUPS.length} NHÓM CHUYÊN MÔN</div><h2 id="drawer-title">Danh mục bảng tính</h2><p>Chọn công cụ phù hợp với công việc.</p><label class="search-box">${icon('search')}<input id="menu-search" type="search" placeholder="Tìm theo tên hoặc mã..." aria-label="Tìm trong danh mục" autocomplete="off"></label></div>
      <nav class="drawer-scroll" aria-label="Danh mục bảng tính">${GROUPS.map((g, i) => `<details ${g.id === openG ? 'open' : ''}><summary><span class="group-icon">${icon(g.icon)}</span>${esc(g.name)}<span class="group-count">${pad2(modsOf(g).length)}</span>${icon('down')}</summary><div class="drawer-items">${modsOf(g).map((m) => {
        const cur = current && current.id === m.id;
        return `<a class="drawer-item ${cur ? 'current' : ''}" href="#${m.id}" data-close data-search="${esc(normalize(m.code + ' ' + m.title))}" ${cur ? 'aria-current="page"' : ''}><span class="code-tag">${esc(m.code)}</span><span>${esc(m.title)}</span>${cur ? icon('chevron') : ''}</a>`;
      }).join('')}</div></details>${i < GROUPS.length - 1 ? '<hr class="drawer-separator">' : ''}`).join('')}<p id="menu-empty" class="empty-state" hidden>Không có bảng tính phù hợp.</p></nav>
      <div class="drawer-footer"><a class="drawer-home" href="#kiem-chung" data-close>${icon('shield')}Kiểm chứng tính toán${icon('arrow')}</a><a class="drawer-home" href="#tong-quan" data-close>${icon('grid')}Về trang tổng quan${icon('arrow')}</a><p>Tính đúng. Chọn an toàn.</p></div></aside>`;
    ov.hidden = false;
    document.body.classList.add('menu-open');
    document.querySelectorAll('[data-menu]').forEach((e) => e.setAttribute('aria-expanded', 'true'));
    ov.querySelectorAll('[data-close]').forEach((e) => e.addEventListener('click', () => closeMenu(false)));
    ov.querySelector('.brand').addEventListener('click', () => closeMenu(false));
    const ms = $('#menu-search');
    ms.addEventListener('input', () => {
      const q = normalize(ms.value.trim());
      let total = 0;
      ov.querySelectorAll('details').forEach((d) => {
        let n = 0;
        d.querySelectorAll('.drawer-item').forEach((a) => { a.hidden = !a.dataset.search.includes(q); if (!a.hidden) n++; });
        d.hidden = n === 0; if (q) d.open = true;
        d.querySelector('.group-count').textContent = pad2(n);
        total += n;
      });
      $('#menu-empty').hidden = total !== 0;
      ov.querySelectorAll('.drawer-separator').forEach((hr) => { hr.hidden = !!q; });
    });
    $('.drawer').focus();
  }
  function closeMenu(restore = true) {
    const ov = $('#overlay');
    if (ov.hidden) return;
    ov.hidden = true; ov.innerHTML = '';
    document.body.classList.remove('menu-open');
    document.querySelectorAll('[data-menu]').forEach((e) => e.setAttribute('aria-expanded', 'false'));
    if (restore && prevFocus && prevFocus.isConnected) prevFocus.focus();
  }

  // ---------- Kiểm chứng: chạy các hàm tính với ca có đáp số độc lập ----------
  const BENCH = [];
  const AUDIT = [];
  function calcWith(id, over = {}, k) {
    const m = MODS.find((x) => x.id === id);
    if (!m) throw new Error('Không có bảng ' + id);
    const v = {};
    for (const inp of m.inputs) {
      const raw = over[inp.id] !== undefined ? over[inp.id] : inp.value;
      v[inp.id] = inp.type === 'sel' ? String(raw) : U.num(raw);
    }
    const r = m.calc(v, k === undefined ? (m.sf == null ? 1 : m.sf) : k, U);
    if (r.error) throw new Error(r.error);
    return r;
  }
  function runBench(b) {
    try {
      const got = b.run();
      const tol = b.tol === undefined ? 0.005 : b.tol;
      const ok = typeof b.expect === 'number' ? Math.abs(got - b.expect) <= Math.abs(b.expect) * tol + 1e-9 : got === b.expect;
      return { got, ok, dev: typeof b.expect === 'number' && b.expect !== 0 ? (got - b.expect) / b.expect * 100 : 0 };
    } catch (e) { return { got: NaN, ok: false, err: e.message || String(e) }; }
  }
  function verifyView() {
    const res = BENCH.map((b) => ({ b, r: runBench(b) }));
    const pass = res.filter((x) => x.r.ok).length;
    const ext = BENCH.filter((b) => b.ext).length;
    const kinds = [['table', 'Bảng tra tiêu chuẩn'], ['factor', 'Hệ số hiệu chỉnh'], ['formula', 'Công thức – tính tay'], ['select', 'Kết quả chọn thiết bị']];
    const fmtV = (b, x) => (typeof x === 'number' ? (isFinite(x) ? U.f(x, b.digits === undefined ? 2 : b.digits) : '—') : esc(x));
    const row = ({ b, r }) => `<li class="vrow ${r.ok ? '' : 'fail'}"><div class="vrow-main"><span class="code-tag">${esc(b.code)}</span><strong>${esc(b.name)}</strong><span class="badge ${r.ok ? '' : 'fail'}">${r.ok ? 'Khớp' : 'Lệch'}</span></div>
      <div class="vrow-nums"><span>Chuẩn: <b class="num">${fmtV(b, b.expect)}${b.unit ? ' ' + esc(b.unit) : ''}</b></span><span>Tool: <b class="num">${fmtV(b, r.got)}${b.unit ? ' ' + esc(b.unit) : ''}</b></span>${typeof b.expect === 'number' && r.ok !== undefined && !r.err ? `<span>Lệch: <b class="num">${U.f(r.dev, 2)} %</b></span>` : ''}</div>
      <p class="vrow-src">${b.ext ? '<span class="ext">Đã đối chiếu nguồn ngoài</span> ' : ''}${esc(b.src)}${r.err ? ' · Lỗi: ' + esc(r.err) : ''}</p></li>`;
    return `<main id="main" class="main verify-main"><div class="breadcrumb"><button type="button" data-home aria-label="Về trang tổng quan">${icon('left')}</button><a href="#tong-quan">Tổng quan</a>${icon('chevron')}<span>Kiểm chứng</span></div>
      <div class="calc-heading"><div class="eyebrow"><span class="calc-code">KC</span>Kiểm chứng tính toán</div><h1>Kiểm chứng tính toán</h1><p>Trang này chạy trực tiếp các hàm tính của tool với những ca có đáp số độc lập: số trong bảng tiêu chuẩn, phép tính tay theo công thức gốc, quy định. Ca nào lệch quá dung sai sẽ hiện "Lệch".</p></div>
      <div class="verify-summary"><div class="vs-big ${pass === res.length ? '' : 'fail'}"><b class="num">${pass}/${res.length}</b><span>ca khớp</span></div><div class="vs-text"><p><strong>${ext}</strong> ca đã được đối chiếu với nguồn bên ngoài trong lần rà soát gần nhất (bản chép bảng IEC, catalogue hãng, văn bản quy định). Các ca còn lại so với giá trị trong bảng tiêu chuẩn và tính tay.</p><p>Khớp ở đây nghĩa là tool tính đúng theo tiêu chuẩn đã ghi. Nó không thay cho việc kỹ sư kiểm tra điều kiện thực tế và catalogue thiết bị.</p></div></div>
      <section class="verify-how"><h2>Ba bước để tự kiểm một kết quả</h2><ol>
        <li><strong>Tra bảng.</strong> Ở mỗi bảng tính, dòng "Iz một sợi (bảng)" hoặc "Dòng bảng" là số tra trực tiếp. So với catalogue hãng cáp, thanh cái (Cadivi, LS Vina, Rittal…) cùng cách lắp và nhiệt độ chuẩn.</li>
        <li><strong>Tính tay.</strong> Mở "Diễn giải công thức", bấm máy tính lại từng dòng. Mục "Cơ sở tính toán &amp; cách kiểm chứng" ghi rõ tiêu chuẩn, điều khoản và giả thiết.</li>
        <li><strong>Đối chiếu thực tế.</strong> So với nhãn thiết bị, phần mềm chọn thiết bị của hãng, số đo tại hiện trường; thiết kế chính thức do kỹ sư có thẩm quyền duyệt.</li></ol></section>
      ${kinds.map(([kd, name]) => { const list = res.filter((x) => x.b.kind === kd); return list.length ? `<section class="verify-group"><h2>${name} <small>${list.filter((x) => x.r.ok).length}/${list.length}</small></h2><ul class="vlist">${list.map(row).join('')}</ul></section>` : ''; }).join('')}
      ${AUDIT.length ? `<section class="verify-group audit"><h2>Lỗi đã phát hiện và sửa</h2><ul class="audit-list">${AUDIT.map((a) => `<li><span class="code-tag">${esc(a[0])}</span><div><strong>${esc(a[1])}</strong><p>${esc(a[2])}</p></div></li>`).join('')}</ul></section>` : ''}
      ${footer(true)}</main>`;
  }

  // ---------- Điều hướng ----------
  function render() {
    closeMenu(false);
    const id = (location.hash || '').replace('#', '');
    const m = MODS.find((x) => x.id === id);
    view = m ? 'calc' : id === 'kiem-chung' ? 'verify' : 'home';
    current = m || null;
    if (view === 'home') resetAll();
    $('#app').innerHTML = header() + `<div class="app-layout">${sidebar()}${m ? calcView(m) : view === 'verify' ? verifyView() : homeView()}</div>`;
    document.querySelectorAll('[data-menu]').forEach((e) => e.addEventListener('click', openMenu));
    document.querySelectorAll('[data-home]').forEach((e) => e.addEventListener('click', () => { location.hash = 'tong-quan'; }));
    document.title = m ? `${m.code} ${m.title} · Tính toán cơ điện` : view === 'verify' ? 'Kiểm chứng · Tính toán cơ điện' : 'Tính toán cơ điện';
    if (m) { bindCalc(m); renderResult(m); window.scrollTo(0, 0); }
    else if (view === 'verify') { window.scrollTo(0, 0); }
    else {
      bindHome();
      const g = id.startsWith('nhom-') ? document.getElementById(id) : null;
      if (g) g.scrollIntoView(); else window.scrollTo(0, 0);
      if (id === 'danh-muc') openMenu();
    }
  }

  function start() {
    document.addEventListener('keydown', (e) => {
      const ov = $('#overlay');
      if (!ov.hidden) {
        if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
        if (e.key === 'Tab') {
          const f = [...$('.drawer').querySelectorAll('a,button,input,summary')].filter((x) => x.offsetParent !== null);
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        return;
      }
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && view === 'home' && !/INPUT|SELECT|TEXTAREA/.test(tag)) { e.preventDefault(); $('#home-search').focus(); }
    });
    window.addEventListener('hashchange', render);
    render();
  }

  window.CD = {
    U, GROUPS, SF_PRESETS, MODS,
    register(m) { MODS.push(m); },
    bench(list) { BENCH.push(...list); },
    audit(list) { AUDIT.push(...list); },
    benches: BENCH, runBench, calcWith,
    start
  };
})();
