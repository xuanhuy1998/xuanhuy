/* TOEIC 850 Coach — ứng dụng một trang, không cần build, lưu tiến độ trong trình duyệt (localStorage). */
{
const TOPICS = [
  {id:'office', vi:'Văn phòng & Hành chính'},
  {id:'hr', vi:'Nhân sự & Tuyển dụng'},
  {id:'finance', vi:'Tài chính & Ngân hàng'},
  {id:'marketing', vi:'Marketing & Truyền thông'},
  {id:'sales', vi:'Bán hàng & Khách hàng'},
  {id:'contracts', vi:'Hợp đồng & Pháp lý'},
  {id:'production', vi:'Sản xuất & Chất lượng'},
  {id:'logistics', vi:'Vận chuyển & Mua hàng'},
  {id:'travel', vi:'Du lịch & Đi lại'},
  {id:'hospitality', vi:'Nhà hàng & Khách sạn'},
  {id:'meetings', vi:'Hội họp & Sự kiện'},
  {id:'tech', vi:'Công nghệ & IT'},
  {id:'property', vi:'Bất động sản & Cơ sở vật chất'},
  {id:'health', vi:'Sức khoẻ & Bảo hiểm'},
  {id:'general', vi:'Từ học thuật Part 5–7'}
];
const TOPIC = Object.fromEntries(TOPICS.map((t,i)=>[t.id,{...t,i}]));
const POS = {n:'danh từ',v:'động từ',adj:'tính từ',adv:'trạng từ',phr:'cụm từ',prep:'giới từ',conj:'liên từ'};
const LEVEL = {1:'Nền tảng 700',2:'Bứt phá 800',3:'Chinh phục 850+'};

/* ---------- dữ liệu từ vựng ---------- */
const WORDS = [], BY = {};
for (const t of TOPICS) {
  let ti = 0;
  for (const line of (window.RAW?.[t.id] || '').split('\n')) {
    const p = line.trim().split('|');
    if (p.length !== 5) continue;
    const id = p[0].toLowerCase();
    if (BY[id] || p[0].includes('(')) continue;
    const w = {id, w:p[0], pos:p[1], vi:p[2], ex:p[3], lv:+p[4] || 1, t:t.id, ti:ti++};
    WORDS.push(w); BY[id] = w;
  }
}
const TOTAL = WORDS.length;

/* ---------- lưu trữ ---------- */
const KEY = 'toeic850.v1';
const DAY = 864e5;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
let S = load() || {};
const fresh = () => ({profile:null, cards:{}, st:{}, log:{}, xp:0, star:{}});
S = Object.assign(fresh(), S);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

/* ---------- tiện ích ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const dkey = (d=new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dayStart = (t=Date.now()) => { const d = new Date(t); d.setHours(0,0,0,0); return +d; };
const shuffle = a => { a = [...a]; for (let i=a.length-1;i>0;i--) { const j = Math.random()*(i+1)|0; [a[i],a[j]] = [a[j],a[i]]; } return a; };
const fmtDate = d => new Date(d).toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'});
const L = (k=dkey()) => (S.log[k] ||= {n:0,r:0,c:0,w:0,xp:0,g:0,k:0});
const addXP = n => { S.xp += n; L().xp += n; };
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const icon = {
  speak:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>'
};
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2200);
}

/* ---------- phát âm ---------- */
const canSpeak = 'speechSynthesis' in window;
function voices() { try { return speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang)); } catch (e) { return []; } }
function speak(text) {
  if (!canSpeak) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = S.profile?.rate || .9;
    const v = voices().find(v => v.name === S.profile?.voice) || voices().find(v => /en-US/i.test(v.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}

/* ---------- lặp lại ngắt quãng (SM-2 rút gọn) ---------- */
function status(id) {
  const c = S.cards[id];
  if (!c) return 'new';
  if (c.iv >= 21) return 'mast';
  if (c.iv >= 3) return 'rev';
  return 'learn';
}
function nextIv(c, q) {
  if (q === 1) return 0;
  if (!c || c.reps === 0) return q === 4 ? 4 : 1;
  if (c.reps === 1) return q === 2 ? 2 : q === 3 ? 3 : 7;
  return Math.max(c.iv + 1, Math.round(c.iv * (q === 2 ? 1.2 : q === 3 ? c.ef : c.ef * 1.35)));
}
const ivLabel = d => d === 0 ? '1 phút' : d < 30 ? `${d} ngày` : d < 365 ? `${Math.round(d/30)} tháng` : `${(d/365).toFixed(1)} năm`;
function stat(id) { return (S.st[id] ||= {c:0,w:0}); }
function grade(id, q) {
  const now = Date.now();
  let c = S.cards[id];
  if (!c) { c = S.cards[id] = {iv:0, ef:2.5, reps:0, lap:0, due:now, first:now}; L().n++; }
  else L().r++;
  const iv = nextIv(c, q);
  if (q === 1) { c.lap++; c.reps = 0; c.iv = 0; c.ef = Math.max(1.3, c.ef - .2); c.due = now + 6e4; }
  else { c.iv = iv; c.ef = Math.max(1.3, c.ef + (q === 2 ? -.15 : q === 4 ? .1 : 0)); c.reps++; c.due = dayStart(now) + iv*DAY + 3*36e5; }
  c.last = now;
  const s = stat(id); q > 1 ? s.c++ : s.w++;
  q > 1 ? L().c++ : L().w++;
  addXP(q === 1 ? 2 : q === 4 ? 12 : 10);
  save();
}
function markKnown(id) {
  const now = Date.now();
  S.cards[id] = {iv:30, ef:2.6, reps:3, lap:0, due:dayStart(now)+30*DAY+3*36e5, first:now, last:now, known:true};
  L().k++; addXP(3); save();
}
function recordAnswer(id, ok) {
  const s = stat(id); ok ? s.c++ : s.w++;
  ok ? L().c++ : L().w++;
  const c = S.cards[id];
  if (!ok && c && c.iv >= 1) { c.due = Math.min(c.due, Date.now()); c.iv = Math.max(1, Math.round(c.iv/2)); }
  addXP(ok ? 5 : 1);
  save();
}
const dueIds = (topic) => Object.entries(S.cards).filter(([id,c]) => c.due <= Date.now() && BY[id] && (!topic || BY[id].t === topic)).sort((a,b) => a[1].due - b[1].due).map(([id]) => id);
function newQueue(topic) {
  const cur = S.profile?.current || 700;
  const rank = cur < 730 ? {1:0,2:1,3:2} : cur < 800 ? {1:.6,2:0,3:1.2} : {1:1.6,2:.6,3:0};
  const focus = new Set(S.profile?.focus || []);
  return WORDS.filter(w => !S.cards[w.id] && (!topic || w.t === topic))
    .map(w => [w.id, rank[w.lv]*1000 - (focus.has(w.t) ? 450 : 0) + w.ti*20 + TOPIC[w.t].i])
    .sort((a,b) => a[1] - b[1]).map(x => x[0]);
}
function weakList() {
  const ids = new Set([...Object.keys(S.st), ...Object.keys(S.cards)]);
  return [...ids].filter(id => BY[id]).map(id => {
    const s = S.st[id] || {c:0,w:0}, c = S.cards[id];
    return [id, s.w*2 + (c?.lap||0)*2 - s.c*.6];
  }).filter(x => x[1] > 0).sort((a,b) => b[1] - a[1]).map(x => x[0]);
}

/* ---------- số liệu ---------- */
function counts(list=WORDS) {
  const r = {new:0, learn:0, rev:0, mast:0};
  for (const w of list) r[status(w.id)]++;
  r.learned = r.learn + r.rev + r.mast;
  return r;
}
function streak() {
  let n = 0, d = new Date();
  if (!(S.log[dkey(d)]?.xp > 0)) d.setDate(d.getDate()-1);
  while (S.log[dkey(d)]?.xp > 0) { n++; d.setDate(d.getDate()-1); }
  return n;
}
function recentAcc() {
  let c = 0, w = 0;
  for (let i=0;i<14;i++) { const d = new Date(); d.setDate(d.getDate()-i); const l = S.log[dkey(d)]; if (l) { c += l.c; w += l.w; } }
  return c + w >= 10 ? c/(c+w) : null;
}
function estimate() {
  const cur = S.profile?.current || 700;
  let k = 0;
  for (const w of WORDS) { const s = status(w.id); k += s === 'mast' ? 1 : s === 'rev' ? .7 : s === 'learn' ? .35 : 0; }
  const vocab = k / TOTAL, acc = recentAcc() ?? .75;
  return Math.min(990, Math.round((cur + vocab * (990 - cur) * .58 * (.6 + .4*acc)) / 5) * 5);
}
function daysLeft() {
  const e = S.profile?.exam; if (!e) return null;
  return Math.ceil((new Date(e + 'T00:00:00') - dayStart()) / DAY);
}
function suggestedPerDay() {
  const d = daysLeft(), remain = TOTAL - counts().learned;
  if (d === null || d <= 0) return null;
  return Math.max(5, Math.ceil(remain / Math.max(1, d - 10)));
}
function topicStats(t) {
  const list = WORDS.filter(w => w.t === t);
  const ct = counts(list);
  let c = 0, w = 0;
  for (const x of list) { const s = S.st[x.id]; if (s) { c += s.c; w += s.w; } }
  return {...ct, total:list.length, acc: c + w ? c/(c+w) : null};
}

/* ---------- khung ---------- */
const view = $('#view');
let onKey = null, cleanup = null;
function renderTop() {
  const s = streak();
  $('#topChips').innerHTML = `<span class="pill" title="Chuỗi ngày học liên tiếp"><span class="dot"></span>${s} ngày</span><span class="pill num" title="Điểm kinh nghiệm">${S.xp.toLocaleString('vi-VN')} XP</span>`;
}
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  if (G.timer) { clearInterval(G.timer); G.timer = null; }
  onKey = null;
  let r = (location.hash || '#home').slice(1).split('/')[0];
  if (!S.profile) r = 'profile';
  if (!VIEWS[r]) r = 'home';
  $$('.tab').forEach(a => a.dataset.route === r ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current'));
  VIEWS[r]();
  renderTop();
  window.scrollTo(0, 0);
}
function go(r) { if (location.hash === '#'+r) route(); else location.hash = r; }
document.addEventListener('keydown', e => {
  if (!onKey || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.key !== 'Enter') return;
  onKey(e);
});
addEventListener('hashchange', route);
// bấm lại tab đang mở (ví dụ đang chơi game) thì quay về màn hình chính của tab
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute('href') === (location.hash || '#home')) { e.preventDefault(); route(); }
});

/* ---------- TỔNG QUAN ---------- */
function viewHome() {
  const p = S.profile, ct = counts(), l = L(), due = dueIds().length;
  const newLeft = Math.max(0, p.newPerDay - l.n);
  const est = estimate(), dl = daysLeft(), sug = suggestedPerDay();
  const weak = weakList();
  const tasks = [
    {done: due === 0, n:1, h: due ? `Ôn ${due} thẻ đến hạn` : 'Không còn thẻ đến hạn', sub: `Đã ôn ${l.r} lượt hôm nay`, pct: due ? l.r/(l.r+due) : 1, act:`<a class="btn sm primary" href="#learn">Ôn ngay</a>`},
    {done: newLeft === 0, n:2, h: newLeft ? `Học ${newLeft} từ mới` : `Đã học đủ ${p.newPerDay} từ mới`, sub: `${l.n}/${p.newPerDay} từ mới · ${l.k||0} từ đánh dấu đã biết`, pct: Math.min(1, l.n/p.newPerDay), act:`<a class="btn sm ${due?'':'primary'}" href="#learn">Học</a>`},
    {done: l.g > 0, n:3, h: 'Chơi 1 mini game ôn tập', sub: weak.length ? `Ưu tiên ${Math.min(weak.length,20)} từ bạn hay sai` : 'Củng cố các từ vừa học', pct: Math.min(1, l.g), act:`<a class="btn sm" href="#games">Chơi</a>`}
  ];
  const lo = 500, hi = 990, pos = v => `${((Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*100).toFixed(1)}%`;
  view.innerHTML = `
  <div class="view-head">
    <div><h1>Hôm nay</h1><p class="muted" style="margin-top:6px">${esc(fmtDate(Date.now()))}${dl !== null ? (dl > 0 ? `. Còn <b>${dl} ngày</b> đến kỳ thi.` : dl === 0 ? '. <b>Hôm nay là ngày thi</b>, chúc bạn thành công!' : '.') : '.'}</p></div>
  </div>
  <div class="grid-home">
    <div class="stack-col">
      <section class="panel" aria-labelledby="h-tasks">
        <h2 id="h-tasks">Nhiệm vụ hôm nay</h2>
        ${tasks.map(t => `<div class="task"><span class="bubble ${t.done?'done':''}">${t.done?'':['A','B','C'][t.n-1]}</span><div><h3>${t.h}</h3><p class="small muted">${t.sub}</p><div class="bar"><i style="width:${Math.round(t.pct*100)}%"></i></div></div>${t.act}</div>`).join('')}
      </section>
      <section class="panel tint" aria-labelledby="h-goal">
        <h2 id="h-goal">Mục tiêu ${p.target}+</h2>
        <div class="scale" role="img" aria-label="Điểm hiện tại ${p.current}, ước tính ${est}, mục tiêu ${p.target}">
          <div class="rail"></div>
          <div class="fill" style="left:0;width:${pos(est)}"></div>
          <div class="mk" style="left:${pos(p.current)};color:var(--muted)">Đầu vào ${p.current}</div>
          <div class="mk" style="left:${pos(p.target)};color:var(--mint)">Mục tiêu ${p.target}</div>
          <div class="mk low" style="left:${pos(est)};color:var(--print)">Ước tính ${est}</div>
        </div>
        <div class="goal-figs">
          <div><b class="num">${ct.learned}</b><span>từ đã học</span></div>
          <div><b class="num">${ct.mast}</b><span>từ đã thuộc</span></div>
          <div><b class="num">${recentAcc() === null ? '–' : Math.round(recentAcc()*100)+'%'}</b><span>độ chính xác 14 ngày</span></div>
        </div>
        <p class="small muted" style="margin-top:12px">${sug ? `Để học hết ${TOTAL} từ trước ngày thi (chừa 10 ngày ôn), bạn cần khoảng <b>${sug} từ mới/ngày</b>; hiện đặt ${p.newPerDay}. ` : ''}Điểm ước tính chỉ dựa trên tiến độ từ vựng, không thay thế đề thi thử.</p>
      </section>
    </div>
    <div class="sheet-col">
      <section class="sheet" aria-labelledby="h-sheet">
        <div class="sheet-head"><h2 id="h-sheet">Phiếu ${TOTAL} từ</h2><span class="small muted">Mỗi ô tròn là một từ, xếp theo 15 chủ đề. Rê chuột hoặc chạm để xem.</span></div>
        <div class="fig" id="sheetFig"><canvas id="sheet" aria-label="Bản đồ tiến độ ${TOTAL} từ"></canvas></div>
        <div class="legend">
          <span><i class="lg new"></i>Chưa học <b>${ct.new}</b></span>
          <span><i class="lg learn"></i>Đang học <b>${ct.learn}</b></span>
          <span><i class="lg rev"></i>Đang nhớ <b>${ct.rev}</b></span>
          <span><i class="lg mast"></i>Đã thuộc <b>${ct.mast}</b></span>
        </div>
      </section>
    </div>
  </div>
  <div class="home-lower">
    <section class="panel" aria-labelledby="h-topics">
      <h2 id="h-topics">Tiến độ theo chủ đề</h2>
      <div class="topics">${TOPICS.map(t => { const s = topicStats(t.id); return `<div class="trow"><div class="name"><span>${esc(t.vi)}</span><div class="bar ${s.mast > s.total/2 ? 'mint':''}"><i style="width:${Math.round(s.learned/s.total*100)}%"></i></div></div><span class="cnt num">${s.learned}/${s.total}<br><span class="acc">${s.acc === null ? '' : Math.round(s.acc*100)+'% đúng'}</span></span><button data-topic="${t.id}" aria-label="Học chủ đề ${esc(t.vi)}">Học</button></div>`; }).join('')}</div>
    </section>
    <div class="stack-col">
      <section class="panel" aria-labelledby="h-cal">
        <h2 id="h-cal">12 tuần gần nhất</h2>
        <div class="stats4">
          <div><b class="num">${streak()}</b><span>ngày liên tiếp</span></div>
          <div><b class="num">${Object.values(S.log).filter(x=>x.xp>0).length}</b><span>ngày đã học</span></div>
          <div><b class="num">${l.xp}</b><span>XP hôm nay</span></div>
        </div>
        <div class="cal" id="cal"></div>
      </section>
      <section class="panel weak" aria-labelledby="h-weak">
        <h2 id="h-weak">Từ hay sai</h2>
        ${weak.length ? `<ul>${weak.slice(0,6).map(id => `<li><span><b>${esc(BY[id].w)}</b> <span class="muted small">${esc(BY[id].vi)}</span></span><span class="small" style="color:var(--print)">sai ${S.st[id]?.w||0}</span></li>`).join('')}</ul><div class="row" style="margin-top:14px"><button class="btn sm primary" id="weakCards">Ôn bằng flashcard</button><button class="btn sm" id="weakGame">Ôn bằng game</button></div>` : `<p class="muted">Chưa có từ nào bị sai nhiều. Các từ bạn trả lời sai trong flashcard và mini game sẽ hiện ở đây để ôn lại.</p>`}
      </section>
    </div>
  </div>
  <p class="foot">${TOTAL} từ trong 15 chủ đề thường gặp ở đề TOEIC Listening & Reading. Tiến độ lưu trong trình duyệt này; sao lưu ở mục Lộ trình.</p>`;
  $$('[data-topic]').forEach(b => b.onclick = () => { LS.preset = {mode:'topic', topic:b.dataset.topic}; go('learn'); });
  $('#weakCards')?.addEventListener('click', () => { LS.preset = {mode:'list', ids:weak.slice(0,20), label:'Từ hay sai'}; go('learn'); });
  $('#weakGame')?.addEventListener('click', () => { G.pool = 'weak'; go('games'); });
  // lịch học
  const cal = $('#cal'), today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today); start.setDate(start.getDate() - 83);
  start.setDate(start.getDate() - ((start.getDay()+6)%7));
  let html = '';
  for (let d = new Date(start); d <= today; d.setDate(d.getDate()+1)) {
    const x = S.log[dkey(d)]?.xp || 0, lv = x === 0 ? '' : x < 60 ? 'l1' : x < 180 ? 'l2' : 'l3';
    html += `<i class="${lv} ${+d === +today ? 'today':''}" title="${dkey(d)}: ${x} XP"></i>`;
  }
  cal.innerHTML = html;
  drawSheet();
}
function drawSheet() {
  const fig = $('#sheetFig'), cv = $('#sheet');
  if (!fig || !cv) return;
  const tip = document.createElement('div'); tip.className = 'sheet-tip'; tip.hidden = true; fig.appendChild(tip);
  let geo = null;
  const draw = () => {
    const W = fig.clientWidth, H = fig.clientHeight, dpr = window.devicePixelRatio || 1;
    if (!W || !H) return;
    cv.width = W*dpr; cv.height = H*dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
    const cs = getComputedStyle(fig);
    const col = n => cs.getPropertyValue(n).trim();
    const probe = document.createElement('span'); fig.appendChild(probe);
    const resolve = v => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
    const C = {new:resolve('--line'), learn:resolve('--soft'), rev:resolve('--pencil'), mast:resolve('--mint'), print:resolve('--print')};
    probe.remove(); void col;
    // lưới: chọn số cột để ô vuông lấp đầy khung
    let best = null;
    for (let cols = 20; cols <= 90; cols++) {
      const rows = Math.ceil(TOTAL/cols), s = Math.min(W/cols, H/rows);
      if (!best || s > best.s) best = {cols, rows, s};
    }
    const {cols, rows, s} = best, ox = (W - cols*s)/2, oy = (H - rows*s)/2, r = s*.36;
    geo = {cols, s, ox, oy};
    WORDS.forEach((w, i) => {
      const cx = ox + (i % cols)*s + s/2, cy = oy + Math.floor(i/cols)*s + s/2, st = status(w.id);
      ctx.beginPath(); ctx.arc(cx, cy, st === 'new' ? r - .6 : r, 0, Math.PI*2);
      if (st === 'new') { ctx.lineWidth = Math.max(1, s*.09); ctx.strokeStyle = C.new; ctx.stroke(); }
      else { ctx.fillStyle = C[st]; ctx.fill(); }
      if (i > 0 && w.t !== WORDS[i-1].t) { ctx.fillStyle = C.print; ctx.fillRect(cx - s/2, cy - s*.42, Math.max(1.5, s*.1), s*.84); }
    });
  };
  const ro = new ResizeObserver(draw); ro.observe(fig);
  const at = e => {
    if (!geo) return null;
    const b = cv.getBoundingClientRect(), x = e.clientX - b.left - geo.ox, y = e.clientY - b.top - geo.oy;
    if (x < 0 || y < 0) return null;
    const i = Math.floor(y/geo.s)*geo.cols + Math.floor(x/geo.s);
    return WORDS[i] && x < geo.cols*geo.s ? {w:WORDS[i], x:e.clientX - b.left, y:e.clientY - b.top} : null;
  };
  const show = e => {
    const h = at(e); if (!h) { tip.hidden = true; return; }
    const lbl = {new:'chưa học', learn:'đang học', rev:'đang nhớ', mast:'đã thuộc'}[status(h.w.id)];
    tip.textContent = `${h.w.w}: ${h.w.vi} (${lbl})`;
    tip.style.left = Math.min(Math.max(h.x, 120), fig.clientWidth - 120) + 'px'; tip.style.top = h.y + 'px'; tip.hidden = false;
  };
  cv.addEventListener('pointermove', show);
  cv.addEventListener('pointerdown', e => { show(e); const h = at(e); if (h) speak(h.w.w); });
  cv.addEventListener('pointerleave', () => tip.hidden = true);
  cleanup = () => ro.disconnect();
}

/* ---------- FLASHCARD ---------- */
const LS = {preset:null, session:null};
function buildSession(opt) {
  const mode = opt.mode;
  let queue = [], label = 'Kế hoạch hôm nay';
  if (mode === 'plan' || mode === 'topic' || mode === 'extra') {
    const topic = mode === 'topic' ? opt.topic : null;
    const due = dueIds(topic);
    const nNew = mode === 'plan' ? Math.max(0, S.profile.newPerDay - L().n) : 10;
    const news = newQueue(topic).slice(0, nNew);
    while (due.length || news.length) { queue.push(...due.splice(0,3)); if (news.length) queue.push(news.shift()); }
    if (topic) label = TOPIC[topic].vi; if (mode === 'extra') label = 'Học thêm 10 từ';
  } else if (mode === 'list') { queue = opt.ids.filter(id => BY[id]); label = opt.label; }
  else if (mode === 'star') { queue = shuffle(Object.keys(S.star).filter(id => S.star[id] && BY[id])); label = 'Từ đã gắn sao'; }
  return {queue, label, mode, topic:opt.topic, flipped:false, done:0, total:queue.length};
}
function viewLearn() {
  if (LS.preset) { LS.session = buildSession(LS.preset); LS.preset = null; }
  if (!LS.session || (!LS.session.queue.length && LS.session.mode === 'plan')) LS.session = buildSession({mode:'plan'});
  renderCard();
}
function renderCard() {
  const s = LS.session, id = s.queue[0], w = BY[id];
  const due = dueIds().length, newLeft = Math.max(0, S.profile.newPerDay - L().n);
  const head = `
    <div class="view-head"><div><h1>Flashcard</h1><p class="muted" style="margin-top:6px">${esc(s.label)}. Chấm mức nhớ thật lòng, lịch ôn sẽ tự giãn ra theo trí nhớ của bạn.</p></div></div>
    <div class="learn-bar">
      <div class="counts num"><span><i class="lg new"></i>Mới hôm nay ${newLeft}</span><span><i class="lg rev"></i>Đến hạn ${due}</span><span class="muted">Lượt này ${s.done}/${s.total}</span></div>
      <select id="mode" aria-label="Chọn bộ thẻ">
        <option value="plan">Kế hoạch hôm nay</option>
        <option value="extra">Học thêm 10 từ mới</option>
        <option value="star">Từ đã gắn sao</option>
        <optgroup label="Theo chủ đề">${TOPICS.map(t => `<option value="topic:${t.id}">${esc(t.vi)}</option>`).join('')}</optgroup>
      </select>
    </div>`;
  if (!w) {
    view.innerHTML = head + `<div class="empty"><div class="big-bubbles"><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i></div><h2>${s.total ? 'Xong lượt này!' : 'Không còn thẻ nào'}</h2><p class="muted">${s.mode === 'plan' ? 'Bạn đã hoàn thành phần flashcard của hôm nay. Thẻ cần ôn sẽ tự quay lại đúng lúc.' : 'Bộ thẻ này đã hết.'}</p><div class="row"><button class="btn primary" id="more">Học thêm 10 từ</button><a class="btn" href="#games">Chơi mini game</a></div></div>`;
    bindMode();
    $('#more').onclick = () => { LS.session = buildSession({mode:'extra'}); renderCard(); };
    return;
  }
  const isNew = !S.cards[id], c = S.cards[id];
  const exHtml = highlight(w.ex, w.w);
  view.innerHTML = head + `
    <div class="card-stage">
      <div class="flash ${s.flipped?'flipped':''}" id="flash" role="button" tabindex="0" aria-label="Thẻ từ ${esc(w.w)}. Bấm để lật">
        <div class="face front">
          <div class="face-top"><span>${esc(TOPIC[w.t].vi)}</span><span class="lvl" title="${LEVEL[w.lv]}">${[1,2,3].map(i=>`<i class="${i<=w.lv?'on':''}"></i>`).join('')}&nbsp;${isNew ? 'Từ mới' : 'Ôn tập'}</span></div>
          <div class="word">${esc(w.w)}</div>
          <div class="row"><span class="pos">${POS[w.pos]||w.pos}</span><button class="icon-btn" data-say="${esc(w.w)}" aria-label="Nghe phát âm">${icon.speak}</button></div>
          <p class="hint">Chạm để lật thẻ <span class="kbd">Space</span></p>
        </div>
        <div class="face back">
          <div class="face-top"><span>${esc(w.w)} · ${POS[w.pos]||w.pos}</span><span>${LEVEL[w.lv]}</span></div>
          <div class="meaning">${esc(w.vi)}</div>
          <div class="example"><span style="flex:1">${exHtml}</span><button class="icon-btn" data-say="${esc(w.ex)}" aria-label="Nghe câu ví dụ">${icon.speak}</button></div>
          ${c ? `<p class="small muted" style="margin-top:10px">Đã ôn ${c.reps} lần liên tiếp đúng, quên ${c.lap} lần.</p>` : ''}
        </div>
      </div>
    </div>
    ${s.flipped ? `<div class="grades">${[1,2,3,4].map(q => `<button class="grade g${q}" data-q="${q}">${['Quên','Khó','Nhớ','Dễ'][q-1]}<small>${ivLabel(nextIv(c,q))} · phím ${q}</small></button>`).join('')}</div>`
      : `<div class="pre-actions"><button class="btn primary" id="flip">Lật thẻ</button>${isNew ? '<button class="btn" id="known">Tôi đã biết từ này</button>' : ''}<button class="btn ghost" id="starBtn">${S.star[id] ? 'Bỏ sao' : 'Gắn sao'}</button></div>`}`;
  bindMode();
  const flip = () => { s.flipped = !s.flipped; renderCard(); };
  $('#flash').onclick = e => { if (e.target.closest('[data-say]')) return; flip(); };
  $$('[data-say]').forEach(b => b.onclick = e => { e.stopPropagation(); speak(b.dataset.say); });
  $('#flip')?.addEventListener('click', flip);
  $('#known')?.addEventListener('click', () => { markKnown(id); next(); toast(`Đã đánh dấu “${w.w}” là đã thuộc`); });
  $('#starBtn')?.addEventListener('click', () => { S.star[id] = !S.star[id]; save(); renderCard(); });
  $$('[data-q]').forEach(b => b.onclick = () => rate(+b.dataset.q));
  function rate(q) {
    grade(id, q);
    s.queue.shift();
    if (q === 1) s.queue.splice(Math.min(3, s.queue.length), 0, id); else s.done++;
    s.flipped = false; renderCard(); renderTop();
  }
  function next() { s.queue.shift(); s.done++; s.flipped = false; renderCard(); renderTop(); }
  onKey = e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
    else if (s.flipped && /^[1-4]$/.test(e.key)) rate(+e.key);
    else if (e.key.toLowerCase() === 'p') speak(w.w);
  };
}
function bindMode() {
  const s = LS.session, sel = $('#mode');
  sel.value = s.mode === 'topic' ? 'topic:' + s.topic : ['plan','extra','star'].includes(s.mode) ? s.mode : 'plan';
  sel.onchange = () => {
    const v = sel.value;
    LS.session = buildSession(v.startsWith('topic:') ? {mode:'topic', topic:v.slice(6)} : {mode:v});
    renderCard();
  };
}
function wordForm(sentence, word) {
  const e = x => x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const w = word.toLowerCase();
  const alts = [e(w) + '(?:s|es|d|ed|ing|\'s)?'];
  if (/e$/.test(w)) alts.push(e(w.slice(0,-1)) + '(?:ing|ed)');
  if (/y$/.test(w)) alts.push(e(w.slice(0,-1)) + '(?:ies|ied)');
  if (/[^aeiou][aeiou][bdgmnprt]$/.test(w)) alts.push(e(w) + w.slice(-1) + '(?:ed|ing)');
  const m = sentence.match(new RegExp('\\b(' + alts.join('|') + ')\\b', 'i'));
  return m ? m[0] : null;
}
function highlight(sentence, word) {
  const f = wordForm(sentence, word);
  if (!f) return esc(sentence);
  const i = sentence.indexOf(f);
  return esc(sentence.slice(0,i)) + '<mark>' + esc(f) + '</mark>' + esc(sentence.slice(i + f.length));
}

/* ---------- MINI GAME ---------- */
const G = {pool:'learned'};
const GAMES = [
  {id:'quiz', name:'Trắc nghiệm A-B-C-D', desc:'10 câu, đoán nghĩa Anh ↔ Việt như tô phiếu trả lời.', art:`<svg viewBox="0 0 96 96">${[0,1,2,3].map(i=>`<circle cx="${18+i*20}" cy="48" r="8" fill="${i===2?'var(--pencil)':'none'}" stroke="${i===2?'var(--pencil)':'var(--print)'}" stroke-width="2.5"/>`).join('')}<rect x="8" y="22" width="80" height="6" rx="3" fill="var(--line)"/><rect x="8" y="68" width="56" height="6" rx="3" fill="var(--line)"/></svg>`},
  {id:'part5', name:'Điền từ kiểu Part 5', desc:'Chọn từ đúng điền vào chỗ trống trong câu công sở.', art:`<svg viewBox="0 0 96 96"><rect x="8" y="30" width="22" height="6" rx="3" fill="var(--line)"/><rect x="36" y="38" width="28" height="3" fill="var(--print)"/><rect x="70" y="30" width="18" height="6" rx="3" fill="var(--line)"/><rect x="8" y="50" width="62" height="6" rx="3" fill="var(--line)"/><circle cx="50" cy="74" r="8" fill="var(--pencil)"/><circle cx="72" cy="74" r="8" fill="none" stroke="var(--print)" stroke-width="2.5"/><circle cx="28" cy="74" r="8" fill="none" stroke="var(--print)" stroke-width="2.5"/></svg>`},
  {id:'match', name:'Ghép cặp tốc độ', desc:'Nối 6 từ với nghĩa đúng nhanh nhất có thể.', art:`<svg viewBox="0 0 96 96">${[0,1,2].map(i=>`<circle cx="22" cy="${24+i*24}" r="8" fill="var(--pencil)"/><circle cx="74" cy="${24+i*24}" r="8" fill="none" stroke="var(--print)" stroke-width="2.5"/>`).join('')}<path d="M30 24 L66 48 M30 48 L66 72 M30 72 L66 24" stroke="var(--mint)" stroke-width="2.5" fill="none"/></svg>`},
  {id:'dict', name:'Nghe và gõ từ', desc:'Nghe phát âm, gõ lại chính tả. Luyện cho Part 1–4.', art:`<svg viewBox="0 0 96 96"><path d="M16 38v20h12l16 13V25L28 38z" fill="var(--pencil)"/><path d="M54 36a14 14 0 0 1 0 24M62 28a26 26 0 0 1 0 40" stroke="var(--print)" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="16" y="80" width="64" height="4" rx="2" fill="var(--line)"/></svg>`},
  {id:'speed', name:'Đúng hay sai 60 giây', desc:'Phản xạ nhanh: nghĩa này đúng hay sai? Giữ chuỗi combo.', art:`<svg viewBox="0 0 96 96"><circle cx="48" cy="52" r="30" fill="none" stroke="var(--print)" stroke-width="3"/><rect x="42" y="12" width="12" height="8" rx="2" fill="var(--pencil)"/><path d="M48 52 L48 32" stroke="var(--pencil)" stroke-width="4" stroke-linecap="round"/><path d="M48 52 L62 60" stroke="var(--mint)" stroke-width="4" stroke-linecap="round"/><circle cx="48" cy="52" r="4" fill="var(--pencil)"/></svg>`}
];
function poolIds() {
  const learned = Object.keys(S.cards).filter(id => BY[id]);
  let ids;
  if (G.pool === 'weak') ids = weakList();
  else if (G.pool === 'all') ids = WORDS.map(w => w.id);
  else if (G.pool === 'star') ids = Object.keys(S.star).filter(id => S.star[id] && BY[id]);
  else if (G.pool.startsWith('topic:')) ids = WORDS.filter(w => w.t === G.pool.slice(6)).map(w => w.id);
  else ids = learned;
  if (ids.length < 12) ids = [...new Set([...ids, ...learned, ...newQueue().slice(0, 40)])];
  return ids;
}
function pick(ids, n) {
  // ưu tiên từ hay sai và từ mới học gần đây
  return ids.map(id => {
    const s = S.st[id] || {c:0,w:0}, c = S.cards[id];
    const wgt = 1 + 3*(s.w/(s.c+s.w||1)) + (c && c.iv < 3 ? 1 : 0);
    return [id, Math.random() ** (1/wgt)];
  }).sort((a,b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
}
function distractors(w, n, field='vi') {
  const seen = new Set([w[field]]);
  const cand = shuffle(WORDS.filter(x => x.id !== w.id && x.pos === w.pos));
  cand.sort((a,b) => (b.t === w.t) - (a.t === w.t));
  const out = [];
  for (const x of cand.length >= n ? cand : shuffle(WORDS)) { if (!seen.has(x[field]) && x.id !== w.id) { seen.add(x[field]); out.push(x); } if (out.length >= n) break; }
  return out;
}
function viewGames() {
  const lc = Object.keys(S.cards).length, wk = weakList().length;
  view.innerHTML = `
    <div class="view-head"><div><h1>Mini game</h1><p class="muted" style="margin-top:6px">Mỗi câu trả lời được ghi lại: từ sai sẽ quay về hàng đợi flashcard và hiện ở mục “Từ hay sai”.</p></div></div>
    <div class="pool" role="group" aria-label="Chọn bộ từ">
      <span class="small muted" style="margin-right:4px">Bộ từ:</span>
      ${[['learned',`Từ đã học (${lc})`],['weak',`Từ hay sai (${wk})`],['star','Từ gắn sao'],['all',`Toàn bộ ${TOTAL} từ`]].map(([k,l]) => `<button class="chip" data-pool="${k}" aria-pressed="${G.pool===k}">${l}</button>`).join('')}
      <select id="poolTopic" aria-label="Theo chủ đề"><option value="">Theo chủ đề…</option>${TOPICS.map(t => `<option value="topic:${t.id}" ${G.pool==='topic:'+t.id?'selected':''}>${esc(t.vi)}</option>`).join('')}</select>
    </div>
    ${lc < 12 && G.pool === 'learned' ? `<p class="small muted" style="margin:-8px 0 16px">Bạn mới học ${lc} từ, game sẽ trộn thêm các từ sắp học theo lộ trình.</p>` : ''}
    <div class="games">${GAMES.map(g => `<button class="game-card" data-game="${g.id}">${g.art}<div><h3>${g.name}</h3><p>${g.desc}</p></div></button>`).join('')}</div>`;
  $$('[data-pool]').forEach(b => b.onclick = () => { G.pool = b.dataset.pool; viewGames(); });
  $('#poolTopic').onchange = e => { if (e.target.value) { G.pool = e.target.value; viewGames(); } };
  $$('[data-game]').forEach(b => b.onclick = () => startGame(b.dataset.game));
}
function startGame(id) {
  const g = GAMES.find(x => x.id === id);
  G.cur = id;
  ({quiz:gameQuiz, part5:gamePart5, match:gameMatch, dict:gameDict, speed:gameSpeed})[id](g);
}
function shell(g, hud, body) {
  view.innerHTML = `<div class="game-shell"><div class="game-hud"><button class="btn sm ghost" id="quit">← Danh sách game</button><div class="prog">${hud}</div></div>${body}</div>`;
  $('#quit').onclick = () => { if (G.timer) clearInterval(G.timer); viewGames(); };
}
function finish(g, {score, sub, wrong, xp}) {
  if (G.timer) clearInterval(G.timer);
  L().g++; addXP(xp); save(); renderTop();
  const wr = [...new Set(wrong)];
  shell(g, `<b>${g.name}</b>`, `<div class="result panel">
    <div class="score num">${score}</div><p class="muted" style="margin-top:8px">${sub}</p><p style="margin-top:6px"><b>+${xp} XP</b> thưởng hoàn thành</p>
    ${wr.length ? `<h3 style="margin-top:22px">Từ cần ôn lại</h3><ul>${wr.map(id => `<li><b>${esc(BY[id].w)}</b><span class="muted">${esc(BY[id].vi)}</span></li>`).join('')}</ul>` : '<p style="margin-top:18px">Không sai câu nào. Xuất sắc!</p>'}
    <div class="row" style="justify-content:center;margin-top:18px"><button class="btn primary" id="again">Chơi lại</button>${wr.length ? '<button class="btn" id="review">Ôn các từ sai bằng flashcard</button>' : ''}<button class="btn ghost" id="back">Game khác</button></div></div>`);
  $('#again').onclick = () => startGame(g.id);
  $('#back').onclick = viewGames;
  $('#review')?.addEventListener('click', () => { LS.preset = {mode:'list', ids:wr, label:'Ôn từ sai trong game'}; go('learn'); });
  onKey = e => { if (e.key === 'Enter') startGame(g.id); };
}
function choiceGame(g, items, render) {
  let i = 0, right = 0; const wrong = [];
  const step = () => {
    if (i >= items.length) return finish(g, {score:`${right}/${items.length}`, sub:'câu trả lời đúng', wrong, xp: 10 + right*2});
    const it = items[i], letters = 'ABCD';
    shell(g, `<div class="row" style="justify-content:space-between"><b>Câu ${i+1}/${items.length}</b><span class="muted num">Đúng ${right}</span></div><div class="bar"><i style="width:${i/items.length*100}%"></i></div>`,
      `<div class="q-card">${render(it)}</div><div class="opts">${it.opts.map((o,k) => `<button class="opt" data-k="${k}"><span class="b">${letters[k]}</span><span>${esc(o.label)}</span></button>`).join('')}</div><div id="fb"></div>`);
    $$('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
    let answered = false;
    const answer = k => {
      if (answered) { return; }
      answered = true;
      const ok = it.opts[k].ok;
      recordAnswer(it.w.id, ok); if (ok) right++; else wrong.push(it.w.id);
      $$('.opt').forEach((b, j) => { b.disabled = true; if (it.opts[j].ok) b.classList.add('right'); });
      const b = $(`.opt[data-k="${k}"]`); b.classList.add('pick'); if (!ok) b.classList.add('wrong');
      $('#fb').innerHTML = `<div class="feedback"><b>${esc(it.w.w)}</b> (${POS[it.w.pos]||it.w.pos}): ${esc(it.w.vi)}<br><span class="muted">${highlight(it.w.ex, it.w.w)}</span><div class="row" style="margin-top:10px"><button class="btn sm primary" id="nx">Câu tiếp <span class="kbd" style="color:inherit;border-color:currentColor">Enter</span></button></div></div>`;
      $('#nx').onclick = () => { i++; step(); };
      $('#nx').focus({preventScroll:true});
    };
    $$('.opt').forEach(b => b.onclick = () => answer(+b.dataset.k));
    onKey = e => {
      const k = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
      if (!answered && k >= 0 && k < it.opts.length) answer(k);
      else if (answered && e.key === 'Enter') { e.preventDefault(); i++; step(); }
    };
  };
  step();
}
function gameQuiz(g) {
  const items = pick(poolIds(), 10).map(id => {
    const w = BY[id], en2vi = Math.random() < .55, field = en2vi ? 'vi' : 'w';
    const opts = shuffle([{label:w[field], ok:true}, ...distractors(w, 3, field).map(x => ({label:x[field], ok:false}))]);
    return {w, en2vi, opts};
  });
  choiceGame(g, items, it => it.en2vi
    ? `<p class="sub" style="margin:0 0 6px">Nghĩa của từ này là gì?</p><div class="row"><span class="q">${esc(it.w.w)}</span><button class="icon-btn" data-say="${esc(it.w.w)}" aria-label="Nghe">${icon.speak}</button></div><p class="sub">${POS[it.w.pos]||''}</p>`
    : `<p class="sub" style="margin:0 0 6px">Từ tiếng Anh nào mang nghĩa:</p><div class="q">${esc(it.w.vi)}</div><p class="sub">${POS[it.w.pos]||''}</p>`);
}
function gamePart5(g) {
  const ids = poolIds().filter(id => wordForm(BY[id].ex, BY[id].w));
  const items = pick(ids, 10).map(id => {
    const w = BY[id];
    const opts = shuffle([{label:w.w, ok:true}, ...distractors(w, 3, 'w').map(x => ({label:x.w, ok:false}))]);
    return {w, opts};
  });
  choiceGame(g, items, it => {
    const f = wordForm(it.w.ex, it.w.w), i = it.w.ex.indexOf(f);
    return `<p class="sub" style="margin:0 0 10px">Chọn từ (dạng gốc) phù hợp nhất để điền vào chỗ trống.</p><div class="q sent">${esc(it.w.ex.slice(0,i))}<span class="blank">&nbsp;</span>${esc(it.w.ex.slice(i+f.length))}</div>`;
  });
}
function gameMatch(g) {
  const ids = pick(poolIds(), 6), wrong = [];
  let sel = null, left = ids.length, miss = 0, t0 = Date.now();
  const L1 = shuffle(ids), R1 = shuffle(ids);
  shell(g, `<div class="row" style="justify-content:space-between"><b>Nối từ với nghĩa</b><span class="timer" id="tm">0.0s</span></div>`,
    `<p class="muted small" style="margin-bottom:12px">Chọn một từ bên trái rồi chọn nghĩa đúng bên phải. Sai mỗi lần cộng 3 giây.</p><div class="match">${L1.map((id,k) => `<button class="mcell" data-side="L" data-id="${id}">${esc(BY[id].w)}</button><button class="mcell" data-side="R" data-id="${R1[k]}">${esc(BY[R1[k]].vi)}</button>`).join('')}</div>`);
  G.timer = setInterval(() => { const el = $('#tm'); if (el) el.textContent = ((Date.now()-t0)/1000 + miss*3).toFixed(1) + 's'; }, 100);
  $$('.mcell').forEach(b => b.onclick = () => {
    if (b.classList.contains('ok')) return;
    if (!sel || sel.dataset.side === b.dataset.side) { $$('.mcell.sel').forEach(x => x.classList.remove('sel')); sel = b; b.classList.add('sel'); if (b.dataset.side === 'L') speak(BY[b.dataset.id].w); return; }
    const a = sel; sel = null; a.classList.remove('sel');
    const lw = a.dataset.side === 'L' ? a.dataset.id : b.dataset.id;
    if (a.dataset.id === b.dataset.id) {
      a.classList.add('ok'); b.classList.add('ok'); recordAnswer(lw, true);
      if (--left === 0) { const sec = (Date.now()-t0)/1000 + miss*3; finish(g, {score: sec.toFixed(1)+'s', sub:`${ids.length} cặp, sai ${miss} lần`, wrong, xp: Math.max(8, 30 - Math.round(sec/2))}); }
    } else {
      miss++; wrong.push(lw); recordAnswer(lw, false);
      [a,b].forEach(x => { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 450); });
    }
  });
}
function gameDict(g) {
  const items = pick(poolIds(), 10);
  let i = 0, right = 0; const wrong = [];
  const step = () => {
    if (i >= items.length) return finish(g, {score:`${right}/${items.length}`, sub:'từ gõ đúng chính tả', wrong, xp: 10 + right*3});
    const w = BY[items[i]];
    let hinted = !canSpeak, done = false;
    shell(g, `<div class="row" style="justify-content:space-between"><b>Từ ${i+1}/${items.length}</b><span class="muted num">Đúng ${right}</span></div><div class="bar"><i style="width:${i/items.length*100}%"></i></div>`,
      `<div class="q-card"><div class="row"><button class="btn primary" id="play">${icon.speak.replace('<svg','<svg width="20" height="20"')} Nghe lại</button><button class="btn" id="slow">Nghe chậm</button><button class="btn ghost" id="hint">Gợi ý</button></div>
      <p class="sub" id="hintTxt" ${hinted?'':'hidden'}>${esc(w.vi)} (${POS[w.pos]||''}), bắt đầu bằng “${esc(w.w[0])}”, ${w.w.length} ký tự</p>
      ${canSpeak ? '' : '<p class="sub">Trình duyệt không hỗ trợ đọc, hãy gõ từ theo nghĩa.</p>'}</div>
      <form class="type-in" id="tf" autocomplete="off"><input type="text" id="ans" placeholder="Gõ từ bạn nghe được" autocapitalize="off" spellcheck="false" aria-label="Câu trả lời"><button class="btn primary">Kiểm tra</button></form><div id="fb"></div>`);
    const say = r => { const o = S.profile.rate; S.profile.rate = r; speak(w.w); S.profile.rate = o; };
    $('#play').onclick = () => say(S.profile.rate || .9);
    $('#slow').onclick = () => say(.55);
    $('#hint').onclick = () => { hinted = true; $('#hintTxt').hidden = false; };
    say(S.profile.rate || .9);
    $('#ans').focus({preventScroll:true});
    $('#tf').onsubmit = e => {
      e.preventDefault();
      if (done) { i++; return step(); }
      const v = $('#ans').value; if (!v.trim()) return;
      done = true;
      const ok = norm(v) === norm(w.w);
      recordAnswer(w.id, ok); if (ok) right++; else wrong.push(w.id);
      $('#ans').disabled = true;
      $('#fb').innerHTML = `<div class="feedback" style="border-left:4px solid ${ok?'var(--mint)':'var(--print)'}">${ok ? 'Chính xác!' : `Đáp án: <b>${esc(w.w)}</b>`} ${esc(w.vi)}<br><span class="muted">${highlight(w.ex, w.w)}</span><div class="row" style="margin-top:10px"><button class="btn sm primary" id="nx">Từ tiếp <span class="kbd" style="color:inherit;border-color:currentColor">Enter</span></button></div></div>`;
      $('#nx').onclick = () => { i++; step(); };
      $('#nx').focus({preventScroll:true});
    };
    onKey = e => { if (done && e.key === 'Enter' && e.target.id !== 'nx') { e.preventDefault(); i++; step(); } };
  };
  step();
}
function gameSpeed(g) {
  const ids = poolIds();
  let score = 0, n = 0, combo = 0, best = 0, end = Date.now() + 60000, cur = null; const wrong = [];
  const nextQ = () => {
    const w = BY[pick(ids, 1)[0]], truth = Math.random() < .5;
    cur = {w, truth, m: truth ? w.vi : distractors(w, 1)[0].vi};
    $('#sw').textContent = w.w; $('#sm').textContent = cur.m;
    $('#combo').textContent = combo > 1 ? `Combo x${combo}` : '';
  };
  shell(g, `<div class="row" style="justify-content:space-between"><span class="timer" id="tl">60</span><b class="num" id="sc">0 điểm</b></div><div class="bar"><i id="tb" style="width:100%"></i></div>`,
    `<div class="q-card speed"><div class="w" id="sw"></div><div class="m" id="sm"></div><div class="small" id="combo" style="color:var(--print);font-weight:700;min-height:1.5em"></div></div>
    <div class="tf"><button class="btn" id="no">Sai <span class="kbd">←</span></button><button class="btn primary" id="yes">Đúng <span class="kbd" style="color:inherit;border-color:currentColor">→</span></button></div>`);
  const answer = says => {
    if (!cur) return;
    const ok = says === cur.truth; n++;
    recordAnswer(cur.w.id, ok);
    if (ok) { combo++; best = Math.max(best, combo); score += 1 + Math.floor(combo/5); }
    else { combo = 0; wrong.push(cur.w.id); }
    $('#sc').textContent = score + ' điểm';
    const q = $('.q-card'); q.classList.remove('flash-ok'); void q.offsetWidth; if (ok) q.classList.add('flash-ok');
    nextQ();
  };
  $('#yes').onclick = () => answer(true);
  $('#no').onclick = () => answer(false);
  onKey = e => { if (e.key === 'ArrowRight') answer(true); if (e.key === 'ArrowLeft') answer(false); };
  nextQ();
  G.timer = setInterval(() => {
    const left = Math.max(0, end - Date.now());
    const tl = $('#tl'); if (!tl) return clearInterval(G.timer);
    tl.textContent = Math.ceil(left/1000); $('#tb').style.width = (left/600) + '%';
    if (left <= 0) finish(g, {score, sub:`${n} câu, đúng ${n - wrong.length}, combo dài nhất ${best}`, wrong, xp: 10 + score});
  }, 100);
}

/* ---------- TỪ VỰNG ---------- */
const W = {q:'', topic:'', lv:'', st:'', limit:120, open:null};
function viewWords() {
  view.innerHTML = `
    <div class="view-head"><div><h1>${TOTAL} từ vựng</h1><p class="muted" style="margin-top:6px">Tra cứu, nghe phát âm, gắn sao các từ muốn ôn riêng.</p></div></div>
    <div class="filters">
      <input type="search" id="fq" placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt" value="${esc(W.q)}" aria-label="Tìm kiếm">
      <select id="ft" aria-label="Chủ đề"><option value="">Mọi chủ đề</option>${TOPICS.map(t => `<option value="${t.id}">${esc(t.vi)}</option>`).join('')}</select>
      <select id="fl" aria-label="Cấp độ"><option value="">Mọi cấp độ</option>${[1,2,3].map(l => `<option value="${l}">${LEVEL[l]}</option>`).join('')}</select>
      <select id="fs" aria-label="Trạng thái"><option value="">Mọi trạng thái</option><option value="new">Chưa học</option><option value="learn">Đang học</option><option value="rev">Đang nhớ</option><option value="mast">Đã thuộc</option><option value="star">Đã gắn sao</option></select>
      <button class="btn" id="learnSel">Học nhóm này</button>
    </div>
    <p class="small muted" id="wc" style="margin-bottom:8px"></p>
    <div class="wlist" id="wl"></div>
    <div class="row" style="justify-content:center;margin-top:16px"><button class="btn" id="moreW">Xem thêm</button></div>`;
  $('#ft').value = W.topic; $('#fl').value = W.lv; $('#fs').value = W.st;
  const list = () => {
    const q = norm(W.q);
    return WORDS.filter(w => (!W.topic || w.t === W.topic) && (!W.lv || w.lv === +W.lv) && (!W.st || (W.st === 'star' ? S.star[w.id] : status(w.id) === W.st)) && (!q || norm(w.w).includes(q) || norm(w.vi).includes(q)));
  };
  const draw = () => {
    const l = list();
    $('#wc').textContent = `${l.length} từ phù hợp`;
    $('#wl').innerHTML = l.slice(0, W.limit).map(w => `<div class="wrow" data-id="${esc(w.id)}"><span class="st ${status(w.id)}" title="${{new:'Chưa học',learn:'Đang học',rev:'Đang nhớ',mast:'Đã thuộc'}[status(w.id)]}"></span><span class="w"><b>${esc(w.w)}</b><span>${w.pos}</span></span><span class="m">${esc(w.vi)}</span><span class="lv lvl" title="${LEVEL[w.lv]}">${[1,2,3].map(i=>`<i class="${i<=w.lv?'on':''}"></i>`).join('')}</span><button class="icon-btn" data-say="${esc(w.w)}" aria-label="Nghe ${esc(w.w)}">${icon.speak}</button><button class="star ${S.star[w.id]?'on':''}" data-star="${esc(w.id)}" aria-label="Gắn sao" aria-pressed="${!!S.star[w.id]}">${icon.star}</button>${W.open === w.id ? `<span class="ex">${highlight(w.ex, w.w)} <span style="white-space:nowrap">(${esc(TOPIC[w.t].vi)})</span></span>` : ''}</div>`).join('') || '<p class="muted" style="padding:20px 0">Không có từ nào khớp bộ lọc.</p>';
    $('#moreW').hidden = l.length <= W.limit;
  };
  draw();
  $('#fq').oninput = e => { W.q = e.target.value; W.limit = 120; draw(); };
  $('#ft').onchange = e => { W.topic = e.target.value; W.limit = 120; draw(); };
  $('#fl').onchange = e => { W.lv = e.target.value; W.limit = 120; draw(); };
  $('#fs').onchange = e => { W.st = e.target.value; W.limit = 120; draw(); };
  $('#moreW').onclick = () => { W.limit += 200; draw(); };
  $('#learnSel').onclick = () => { const ids = list().map(w => w.id).slice(0, 30); if (!ids.length) return toast('Không có từ nào để học'); LS.preset = {mode:'list', ids: shuffle(ids), label:`Nhóm từ đã lọc (${ids.length} từ)`}; go('learn'); };
  $('#wl').onclick = e => {
    const say = e.target.closest('[data-say]'); if (say) return speak(say.dataset.say);
    const st = e.target.closest('[data-star]'); if (st) { S.star[st.dataset.star] = !S.star[st.dataset.star]; save(); return draw(); }
    const row = e.target.closest('.wrow'); if (row) { W.open = W.open === row.dataset.id ? null : row.dataset.id; draw(); }
  };
}

/* ---------- LỘ TRÌNH / HỒ SƠ ---------- */
function viewProfile() {
  const setup = !S.profile;
  const p = S.profile || {current:700, target:850, exam: dkey(new Date(Date.now() + 90*DAY)), newPerDay:20, focus:[], rate:.9, voice:''};
  const vs = voices();
  view.innerHTML = `
    ${setup ? `<div class="welcome"><div><h1>Lộ trình 700 → 850+</h1><p class="muted" style="margin-top:10px;max-width:62ch">Cho biết điểm hiện tại, mục tiêu và ngày thi. Ứng dụng sẽ chia ${TOTAL} từ thành nhiệm vụ mỗi ngày, ưu tiên cấp độ phù hợp với trình độ của bạn và nhắc lại đúng lúc sắp quên.</p></div>
      <svg viewBox="0 0 150 120" aria-hidden="true">${Array.from({length:20},(_,i)=>`<circle cx="${15+(i%5)*30}" cy="${15+Math.floor(i/5)*30}" r="10" fill="${i<7?'var(--pencil)':i<11?'var(--mint)':'none'}" stroke="${i<7?'var(--pencil)':i<11?'var(--mint)':'var(--print)'}" stroke-width="2.5"/>`).join('')}</svg></div>`
      : `<div class="view-head"><div><h1>Lộ trình của bạn</h1><p class="muted" style="margin-top:6px">Thay đổi được lưu ngay và áp dụng cho kế hoạch hôm nay.</p></div></div>`}
    <form id="pf" class="panel">
      <div class="form-grid">
        <div class="field"><label for="pc">Điểm TOEIC hiện tại</label><input type="number" id="pc" min="10" max="990" step="5" value="${p.current}"><span class="help">Điểm gần nhất hoặc đề thi thử.</span></div>
        <div class="field"><label for="pt">Điểm mục tiêu</label><input type="number" id="pt" min="10" max="990" step="5" value="${p.target}"><span class="help">Gợi ý 850 trở lên.</span></div>
        <div class="field"><label for="pe">Ngày thi dự kiến</label><input type="date" id="pe" value="${p.exam}"><span class="help" id="peHelp"></span></div>
        <div class="field"><label for="pn">Từ mới mỗi ngày: <b id="pnv">${p.newPerDay}</b></label><input type="range" id="pn" min="5" max="60" step="5" value="${p.newPerDay}"><span class="help" id="pnHelp"></span></div>
      </div>
      <div class="field" style="margin-top:18px"><label>Chủ đề ưu tiên (học trước)</label><div class="topic-chips">${TOPICS.map(t => `<button type="button" class="chip" data-f="${t.id}" aria-pressed="${p.focus.includes(t.id)}">${esc(t.vi)}</button>`).join('')}</div><span class="help">Chọn các chủ đề bạn hay sai trong đề thi thử hoặc gắn với công việc.</span></div>
      <div class="form-grid" style="margin-top:18px">
        <div class="field"><label for="pv">Giọng đọc tiếng Anh</label><select id="pv"><option value="">Mặc định (en-US)</option>${vs.map(v => `<option ${v.name===p.voice?'selected':''}>${esc(v.name)}</option>`).join('')}</select><span class="help">${canSpeak ? 'Dùng giọng đọc có sẵn trong máy.' : 'Trình duyệt này không hỗ trợ đọc.'}</span></div>
        <div class="field"><label for="pr">Tốc độ đọc: <b id="prv">${p.rate}</b></label><input type="range" id="pr" min=".5" max="1.3" step=".05" value="${p.rate}"><button type="button" class="btn sm" id="test" style="justify-self:start">Nghe thử</button></div>
      </div>
      ${setup ? '<div class="row" style="margin-top:22px"><button class="btn primary">Bắt đầu học</button></div>' : ''}
    </form>
    ${setup ? '' : `
    <section class="panel tint" style="margin-top:20px">
      <h2>Sao lưu và chuyển máy</h2>
      <p class="muted small" style="margin-bottom:12px">Tiến độ chỉ nằm trong trình duyệt này. Sao chép đoạn dữ liệu dưới đây (hoặc tải tệp) để chuyển sang máy khác, rồi dán vào ô và bấm Khôi phục.</p>
      <textarea id="dump" aria-label="Dữ liệu sao lưu"></textarea>
      <div class="row" style="margin-top:10px"><button class="btn sm" id="exp">Tạo bản sao lưu</button><button class="btn sm" id="copy">Sao chép</button><a class="btn sm" id="dl" download="toeic850-backup.json">Tải tệp</a><button class="btn sm" id="imp">Khôi phục từ ô trên</button><label class="btn sm" style="cursor:pointer">Chọn tệp…<input type="file" id="file" accept=".json,application/json" hidden></label></div>
      <div class="row" style="margin-top:18px"><button class="btn sm danger" id="reset">Xoá toàn bộ tiến độ</button><span class="small muted" id="resetMsg"></span></div>
    </section>`}`;
  const st = {...p, focus:[...p.focus]};
  const help = () => {
    const d = Math.ceil((new Date($('#pe').value + 'T00:00:00') - dayStart())/DAY);
    $('#peHelp').textContent = isNaN(d) ? '' : d > 0 ? `Còn ${d} ngày.` : 'Ngày thi đã qua, hãy cập nhật.';
    const remain = TOTAL - counts().learned, per = d > 0 ? Math.max(5, Math.ceil(remain / Math.max(1, d - 10))) : null;
    const v = +$('#pn').value, finishIn = Math.ceil(remain / v);
    $('#pnHelp').textContent = `${per ? `Cần khoảng ${per} từ/ngày để kịp ngày thi. ` : ''}Với ${v} từ/ngày, bạn học hết ${remain} từ còn lại sau ${finishIn} ngày (khoảng ${Math.round(v*1.6+v*0.4)} phút/ngày).`;
  };
  const commit = () => {
    st.current = Math.max(10, Math.min(990, +$('#pc').value || 700));
    st.target = Math.max(10, Math.min(990, +$('#pt').value || 850));
    st.exam = $('#pe').value || p.exam; st.newPerDay = +$('#pn').value; st.rate = +$('#pr').value; st.voice = $('#pv').value;
    $('#pnv').textContent = st.newPerDay; $('#prv').textContent = st.rate;
    help();
    if (!setup) { S.profile = {...st}; save(); renderTop(); }
  };
  $('#pf').oninput = commit; $('#pf').onchange = commit;
  $$('[data-f]').forEach(b => b.onclick = () => { const id = b.dataset.f, i = st.focus.indexOf(id); i < 0 ? st.focus.push(id) : st.focus.splice(i,1); b.setAttribute('aria-pressed', i < 0); commit(); });
  $('#test').onclick = () => { const o = S.profile; S.profile = st; speak('Please submit the quarterly report by Friday.'); S.profile = o; };
  $('#pf').onsubmit = e => { e.preventDefault(); commit(); S.profile = {...st}; save(); toast('Đã tạo lộ trình. Bắt đầu với nhiệm vụ hôm nay!'); go('home'); };
  help();
  if (setup) return;
  const dump = () => { const j = JSON.stringify(S); $('#dump').value = j; try { $('#dl').href = URL.createObjectURL(new Blob([j], {type:'application/json'})); } catch (e) {} };
  dump();
  $('#exp').onclick = () => { dump(); toast('Đã tạo bản sao lưu mới'); };
  $('#copy').onclick = async () => { dump(); try { await navigator.clipboard.writeText($('#dump').value); toast('Đã sao chép'); } catch (e) { $('#dump').select(); toast('Hãy bấm Ctrl/Cmd + C để sao chép'); } };
  const restore = txt => {
    try {
      const d = JSON.parse(txt);
      if (!d || typeof d !== 'object' || !d.cards || !d.profile) throw 0;
      S = Object.assign(fresh(), d); save(); toast('Đã khôi phục tiến độ'); go('home');
    } catch (e) { toast('Dữ liệu sao lưu không hợp lệ'); }
  };
  $('#imp').onclick = () => restore($('#dump').value);
  $('#file').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(restore); };
  let armed = false;
  $('#reset').onclick = () => {
    if (!armed) { armed = true; $('#reset').textContent = 'Bấm lần nữa để xác nhận xoá'; $('#resetMsg').textContent = 'Không thể hoàn tác.'; setTimeout(() => { armed = false; const r = $('#reset'); if (r) { r.textContent = 'Xoá toàn bộ tiến độ'; $('#resetMsg').textContent = ''; } }, 4000); return; }
    S = fresh(); save(); toast('Đã xoá tiến độ'); route();
  };
}

const VIEWS = {home:viewHome, learn:viewLearn, games:viewGames, words:viewWords, profile:viewProfile};
route();
}
