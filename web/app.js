(function () {
  const CFG = window.APP_CONFIG || {};
  const { PETS, ACCESSORIES, ACC_SVG, drawPet, line } = window.Pets;
  const STORE = 'glotok-state-v1';
  const NAME_IDEAS = {
    otter: ['Бублик', 'Выдруша', 'Пельмень'],
    weasel: ['Искорка', 'Шустрик', 'Ириска'],
    dachshund: ['Сосиска', 'Батон', 'Колбаска'],
    cat: ['Муся', 'Булочка', 'Персик']
  };
  const ACC_VIEW = {
    bow: '116 28 52 46', scarf: '48 132 104 64', glasses: '54 80 92 40', hat: '36 0 128 82',
    flowers: '44 32 112 46', headphones: '24 26 152 100', crown: '64 14 72 46'
  };

  const DEFAULT = {
    v: 1, onboarded: false,
    settings: {
      pet: null, petName: '', weight: 55, activity: 'mid', hot: false, goal: 1950, goalAuto: true,
      sleepStart: '00:00', sleepEnd: '08:00', interval: 90, cups: [150, 250, 330, 500], notify: false
    },
    logs: {}, goals: {}, wear: { head: null, neck: null, face: null },
    letters: {}, signature: '', seenLetter: '', sub: null, dirty: false
  };

  let S = load();
  let tab = 'today', step = 0, drinkingUntil = 0, lastMood = '', showCustom = false, resetArmed = false;

  // ---------- storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const s = JSON.parse(raw);
        return { ...DEFAULT, ...s, settings: { ...DEFAULT.settings, ...s.settings }, wear: { ...DEFAULT.wear, ...s.wear } };
      }
    } catch (e) { }
    return JSON.parse(JSON.stringify(DEFAULT));
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { } }

  // ---------- helpers ----------
  const $ = sel => document.querySelector(sel);
  const pad = n => String(n).padStart(2, '0');
  const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toMin = s => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const liters = ml => (ml / 1000).toFixed(ml % 1000 === 0 ? 0 : ml % 100 === 0 ? 1 : 2).replace('.', ',');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]; };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const dateRu = k => new Date(k + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const total = d => (S.logs[d] || []).reduce((a, x) => a + x.ml, 0);
  const goalOf = d => S.goals[d] || S.settings.goal;
  const met = d => total(d) >= goalOf(d);
  function lastDrink() { let m = 0; for (const d in S.logs) for (const x of S.logs[d]) if (x.t > m) m = x.t; return m; }
  function inQuiet(min) {
    const a = toMin(S.settings.sleepStart), b = toMin(S.settings.sleepEnd);
    if (a === b) return false;
    return a < b ? (min >= a && min < b) : (min >= a || min < b);
  }
  function wakeTs(now) {
    const d = new Date(now), min = d.getHours() * 60 + d.getMinutes();
    const diff = (min - toMin(S.settings.sleepEnd) + 1440) % 1440;
    return now - diff * 60000 - d.getSeconds() * 1000;
  }
  function mood() {
    const now = Date.now();
    if (now < drinkingUntil) return 'drinking';
    const d = new Date();
    if (inQuiet(d.getHours() * 60 + d.getMinutes())) return 'sleeping';
    if (met(dkey())) return 'goal';
    const mins = (now - Math.max(lastDrink(), wakeTs(now))) / 60000;
    const iv = S.settings.interval;
    if (mins >= iv * 1.75) return 'headache';
    if (mins >= iv) return 'thirsty';
    return 'happy';
  }
  const goalDays = () => Object.keys(S.logs).filter(met).length;
  function streak() {
    const d = new Date();
    if (!met(dkey(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (met(dkey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function bestStreak() {
    const days = Object.keys(S.logs).filter(met).sort();
    let best = 0, cur = 0, prev = null;
    for (const k of days) {
      const t = new Date(k + 'T12:00:00').getTime();
      cur = prev && Math.round((t - prev) / 864e5) === 1 ? cur + 1 : 1;
      best = Math.max(best, cur); prev = t;
    }
    return best;
  }
  const levelInfo = () => {
    const g = goalDays(), level = 1 + Math.floor(g / 3);
    return { g, level, next: 3 - g % 3, scale: 0.84 + Math.min(level - 1, 7) / 7 * 0.16 };
  };
  function recommended(st = S.settings) {
    const add = { low: 0, mid: 300, high: 600 }[st.activity] || 0;
    const ml = st.weight * 30 + add + (st.hot ? 400 : 0);
    return Math.min(4000, Math.max(1200, Math.round(ml / 50) * 50));
  }
  const petSvg = (state, extra = {}) => drawPet(S.settings.pet || 'otter', state, { wear: S.wear, scale: levelInfo().scale, label: S.settings.petName, ...extra });

  // ---------- server ----------
  async function api(path, opts = {}) {
    const r = await fetch(CFG.API + path, { ...opts, headers: { 'Content-Type': 'application/json', 'X-App-Key': CFG.APP_KEY } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  let syncTimer;
  function sync() { if (!CFG.API) return; S.dirty = true; save(); clearTimeout(syncTimer); syncTimer = setTimeout(pushState, 700); }
  async function pushState() {
    if (!CFG.API) return;
    const since = dkey(new Date(Date.now() - 90 * 864e5));
    const pick = o => Object.fromEntries(Object.entries(o).filter(([k]) => k >= since));
    try {
      await api('/state', {
        method: 'PUT', body: JSON.stringify({
          settings: S.settings, logs: pick(S.logs), goals: pick(S.goals), wear: S.wear, sub: S.sub,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone, updatedAt: Date.now()
        })
      });
      S.dirty = false; save();
    } catch (e) { }
  }
  async function restore() {
    if (!CFG.API || S.onboarded) return false;
    try {
      const { state } = await api('/state');
      if (state && state.settings && state.settings.pet) {
        S = { ...S, settings: { ...S.settings, ...state.settings }, logs: state.logs || {}, goals: state.goals || {}, wear: { ...S.wear, ...state.wear }, onboarded: true };
        save(); return true;
      }
    } catch (e) { }
    return false;
  }
  async function fetchLetters() {
    if (!CFG.API) return;
    try {
      const r = await api('/letters?today=' + dkey());
      S.letters = r.letters || {}; S.signature = r.signature || ''; save();
    } catch (e) { }
  }

  // ---------- notifications ----------
  function b64uToU8(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }
  async function enablePush() {
    if (!pushSupported()) {
      toast(isIOS && !standalone() ? 'Сначала добавь Глоток на экран «Домой» и открой оттуда.' : 'Этот браузер не умеет присылать уведомления.');
      return false;
    }
    if (!CFG.API || !CFG.VAPID_PUBLIC) { toast('Сервер напоминаний ещё не подключён.'); return false; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Уведомления запрещены. Включить: Настройки iPhone → Уведомления → Глоток.'); render(); return false; }
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(CFG.VAPID_PUBLIC) });
      S.sub = sub.toJSON(); S.settings.notify = true; save();
      await pushState();
      return true;
    } catch (e) {
      toast('Не получилось включить напоминания. Попробуй ещё раз.');
      return false;
    }
  }
  async function refreshSub() {
    if (!pushSupported() || Notification.permission !== 'granted' || !CFG.VAPID_PUBLIC) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub && S.settings.notify) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(CFG.VAPID_PUBLIC) });
      if (sub && (!S.sub || S.sub.endpoint !== sub.endpoint)) { S.sub = sub.toJSON(); sync(); }
    } catch (e) { }
  }
  const notifStatus = () => {
    if (!CFG.API) return { ok: false, text: 'Сервер не подключён' };
    if (!pushSupported()) return { ok: false, text: isIOS && !standalone() ? 'Нужно открыть с экрана «Домой»' : 'Не поддерживается' };
    if (Notification.permission === 'denied') return { ok: false, text: 'Запрещены в настройках iPhone' };
    if (Notification.permission === 'granted' && S.sub) return { ok: true, text: 'Включены' };
    return { ok: false, text: 'Выключены' };
  };
  const clearBadge = () => { try { navigator.clearAppBadge && navigator.clearAppBadge().catch(() => { }); } catch (e) { } };

  // ---------- actions ----------
  function addDrink(ml) {
    ml = Math.round(ml);
    if (!(ml > 0 && ml <= 3000)) { toast('Укажи объём от 1 до 3000 мл.'); return; }
    const d = dkey(), t = Date.now();
    const wasMet = met(d);
    (S.logs[d] = S.logs[d] || []).push({ t, ml });
    if (!S.goals[d]) S.goals[d] = S.settings.goal;
    drinkingUntil = t + 2600;
    save(); render(); clearBadge(); sync();
    toast(`+${ml} мл`, 'Отменить', () => removeDrink(d, t));
    setTimeout(updateStage, 2700);
    if (!wasMet && met(d) && S.seenLetter !== d) {
      S.seenLetter = d; save();
      setTimeout(() => openLetter(d, true), 1800);
    }
  }
  function removeDrink(d, t) {
    S.logs[d] = (S.logs[d] || []).filter(x => x.t !== t);
    if (!S.logs[d].length) delete S.logs[d];
    drinkingUntil = 0; save(); render(); sync();
  }
  async function openLetter(d, celebrate) {
    showModal(`<div class="paper"><div class="date">${celebrate ? 'Норма выполнена · ' : ''}${dateRu(d)}</div><p class="text muted">Открываю письмо…</p></div>`);
    await fetchLetters();
    const text = S.letters[d];
    const pet = S.settings.petName || PETS[S.settings.pet]?.name;
    showModal(`<div class="paper" role="dialog" aria-label="Письмо">
      <div class="date">${celebrate ? 'Норма выполнена · ' : ''}${dateRu(d)}</div>
      ${envelopeSvg(true)}
      <p class="text">${text ? esc(text) : `Сегодня письмо ещё в пути. Но ${esc(pet)} уверен: тобой очень гордятся.`}</p>
      <p class="sign">${text ? esc(S.signature || 'Твой') : esc(pet)}</p>
      <button class="btn" data-act="close">Закрыть</button></div>`);
  }

  // ---------- ui bits ----------
  let toastTimer, toastAction;
  function toast(msg, actLabel, act) {
    const el = $('#toast');
    toastAction = act || null;
    el.innerHTML = `<span>${esc(msg)}</span>${actLabel ? `<button data-toast="1">${esc(actLabel)}</button>` : ''}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, actLabel ? 5000 : 3500);
  }
  function showModal(html) { const m = $('#modal'); m.innerHTML = html; m.hidden = false; }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

  const ICON = {
    drop: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c-.3 0-.6.1-.8.4C9.4 5.3 5 11 5 14.8A7 7 0 0 0 19 14.8C19 11 14.6 5.3 12.8 2.9a1 1 0 0 0-.8-.4Z"/></svg>',
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3C9.5 6.5 6 11 6 14.8a6 6 0 0 0 12 0C18 11 14.5 6.5 12 3Z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5" stroke-linecap="round"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V12M10 20V6M15 20v-9M20 20V9"/></svg>',
    wardrobe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 11 4.5 7.5Q3 9.5 4.5 11.5L12 11l7.5.5q1.5-2 0-4L12 11Z"/><circle cx="12" cy="11" r="1.8" fill="currentColor"/><path d="M6 15h12M8 19h8" stroke-linecap="round"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>'
  };
  function cupSvg(ml) {
    const h = Math.min(1, ml / 500);
    const top = 34 - h * 26;
    return `<svg viewBox="0 0 30 38" aria-hidden="true"><path d="M3 3h24l-3 32H6Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" opacity=".55"/><path d="M${3 + (top - 3) * 3 / 32 + 1.5} ${top}H${27 - (top - 3) * 3 / 32 - 1.5}l-2.3 ${34 - top}H6.8Z" fill="#58B7E0"/></svg>`;
  }
  function envelopeSvg(open) {
    return open
      ? `<svg viewBox="0 0 120 60" width="96" height="48" aria-hidden="true" style="align-self:center"><path d="M10 26 60 4l50 22v30H10Z" fill="#F3D9C6"/><rect x="22" y="12" width="76" height="38" rx="4" fill="#fff"/><path d="M34 24h52M34 32h40" stroke="#E0C9B8" stroke-width="3" stroke-linecap="round"/><path d="M10 26v30h100V26L60 44Z" fill="#F7C9B7"/><path d="M60 38c-4-6-12-2-8 4l8 7 8-7c4-6-4-10-8-4Z" fill="var(--rose)"/></svg>`
      : `<svg viewBox="0 0 52 40" aria-hidden="true"><rect x="2" y="4" width="48" height="32" rx="6" fill="#F7C9B7"/><path d="M4 8 26 24 48 8" fill="none" stroke="#E7A68E" stroke-width="3" stroke-linejoin="round"/><path d="M26 30c-2.5-3.5-7.5-1-5 2.5l5 4.5 5-4.5c2.5-3.5-2.5-6-5-2.5Z" fill="var(--rose)"/></svg>`;
  }

  // ---------- views ----------
  function render() {
    const app = $('#app');
    if (!S.onboarded) {
      app.innerHTML = isIOS && !standalone() && !S.browserOk ? installGate() : onboarding();
      return;
    }
    const views = { today: todayView, history: historyView, wardrobe: wardrobeView, settings: settingsView };
    app.innerHTML = `<main class="screen">${views[tab]()}</main>${tabbar()}`;
    lastMood = mood();
  }
  function tabbar() {
    const t = [['today', 'Сегодня'], ['history', 'История'], ['wardrobe', 'Гардероб'], ['settings', 'Настройки']];
    return `<nav class="tabbar"><div class="in">${t.map(([id, l]) => `<button data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}>${ICON[id]}${l}</button>`).join('')}</div></nav>`;
  }
  function stageHTML() {
    const m = mood();
    const seed = Math.floor(Date.now() / 36e5) + (S.logs[dkey()] || []).length;
    const L = levelInfo();
    return `<div class="bubble">${esc(line(m, S.settings.pet, seed))}</div>
      <div class="pet-svg">${petSvg(m)}</div>
      <div class="petname"><b>${esc(S.settings.petName)}</b><span>уровень ${L.level}</span></div>`;
  }
  function updateStage() {
    const el = $('#stage');
    if (!el) return;
    const m = mood();
    if (m !== lastMood) { el.innerHTML = stageHTML(); lastMood = m; }
  }
  function todayView() {
    const d = dkey(), tot = total(d), goal = goalOf(d), pct = Math.min(100, Math.round(tot / goal * 100));
    const rest = Math.max(0, goal - tot), glasses = Math.ceil(rest / 250), last = lastDrink(), st = streak();
    const logs = (S.logs[d] || []).slice().reverse();
    let letter = '';
    if (CFG.API) {
      letter = met(d)
        ? `<button class="card letter open" data-act="letter">${envelopeSvg()}<span class="t"><b>Письмо на сегодня</b><span class="muted">Норма выполнена. Нажми, чтобы прочитать.</span></span></button>`
        : `<div class="card letter">${envelopeSvg()}<span class="t"><b>Тебя ждёт письмо</b><span class="muted">Оно откроется, когда выпьешь ещё ${fmt(rest)} мл.</span></span></div>`;
    }
    return `
      <header class="topbar"><h1>Привет, Лера</h1><span class="chip num" style="color:var(--accent)">${ICON.drop}<span style="color:var(--ink)">${st} ${plural(st, ['день', 'дня', 'дней'])} подряд</span></span></header>
      <section class="stage" id="stage">${stageHTML()}</section>
      <section class="progress">
        <div class="row"><span class="big">${fmt(tot)} <small>из ${fmt(goal)} мл</small></span><b class="num">${pct}%</b></div>
        <div class="bar ${tot >= goal ? 'done' : ''}"><i style="width:${pct}%"></i></div>
        <div class="row hint"><span>${rest ? `Осталось ${fmt(rest)} мл, это около ${glasses} ${plural(glasses, ['стакана', 'стаканов', 'стаканов'])}` : 'Норма на сегодня выполнена'}</span><span>${last ? 'посл. ' + (dkey(new Date(last)) === d ? hm(last) : 'вчера') : ''}</span></div>
      </section>
      <section class="cups">${S.settings.cups.map((ml, i) => `<button class="cup" id="cup-${i}" data-add="${ml}" aria-label="Выпила ${ml} мл">${cupSvg(ml)}<span>${ml}</span></button>`).join('')}</section>
      ${showCustom
        ? `<form class="custom-row" data-form="custom"><input class="input" id="custom-ml" type="number" inputmode="numeric" min="1" max="3000" placeholder="Сколько мл?" aria-label="Свой объём, мл"><button class="btn small" type="submit">Добавить</button></form>`
        : `<button class="btn ghost small" style="align-self:center" data-act="custom">Другой объём</button>`}
      ${letter}
      ${logs.length ? `<section class="card"><h2 class="section-title">Сегодня</h2><ul class="log">${logs.map(x => `<li><span><b>${x.ml} мл</b> <span class="muted">в ${hm(x.t)}</span></span><button class="x" data-del="${x.t}" aria-label="Удалить запись ${x.ml} мл">Удалить</button></li>`).join('')}</ul></section>` : ''}`;
  }

  function historyView() {
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    const vals = days.map(d => total(dkey(d)));
    const goal = S.settings.goal;
    const max = Math.max(goal * 1.2, ...vals);
    const W = 340, H = 180, top = 24, bottom = 26, left = 6, bw = 30, gap = (W - left * 2 - bw * 7) / 6;
    const y = v => top + (H - top - bottom) * (1 - v / max);
    const wd = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const bars = days.map((d, i) => {
      const k = dkey(d), v = vals[i], x = left + i * (bw + gap), isToday = i === 6;
      const cls = met(k) ? 'bar-met' : isToday ? 'bar-today' : 'bar-miss';
      const h = Math.max(v ? 4 : 0, H - bottom - y(v));
      return `<rect x="${x}" y="${H - bottom - h}" width="${bw}" height="${h}" rx="8" class="${cls}"/>
        ${v ? `<text x="${x + bw / 2}" y="${H - bottom - h - 6}" text-anchor="middle" class="lbl">${liters(v)}</text>` : ''}
        <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="lbl" ${isToday ? 'style="fill:var(--ink)"' : ''}>${isToday ? 'сег.' : wd[d.getDay()]}</text>`;
    }).join('');
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / 7);

    // календарь: 5 недель, с понедельника
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - 28);
    let cells = '';
    for (let i = 0; i < 35; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = dkey(d);
      if (d > today) { cells += '<span class="d empty"></span>'; continue; }
      const p = Math.min(100, Math.round(total(k) / goalOf(k) * 100));
      const cls = met(k) ? 'met' : p > 0 ? 'part' : '';
      cells += `<span class="d ${cls} ${k === dkey() ? 'today' : ''}" style="--p:${p}%" title="${dateRu(k)}: ${fmt(total(k))} мл">${d.getDate()}</span>`;
    }
    const letters = Object.keys(S.letters || {}).filter(k => met(k)).sort().reverse();
    return `
      <header class="topbar"><h1>История</h1></header>
      <section class="stats">
        <div class="stat"><b>${streak()}</b><span>дней подряд сейчас</span></div>
        <div class="stat"><b>${bestStreak()}</b><span>лучшая серия</span></div>
        <div class="stat"><b>${liters(Math.round(avg / 10) * 10)}</b><span>литра в день за неделю</span></div>
      </section>
      <section class="card chart"><h2 class="section-title">Последние 7 дней</h2>
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Выпито по дням за неделю">
          <line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" class="grid"/>
          <line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" class="goal-line" stroke-width="1.5"/>
          ${bars}
          <text x="${W - 2}" y="${y(goal) - 5}" text-anchor="end" class="lbl" style="fill:var(--accent)">норма ${liters(goal)} л</text>
        </svg>
      </section>
      <section class="card"><h2 class="section-title">Пять недель</h2>
        <div class="cal">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(w => `<span class="wd">${w}</span>`).join('')}${cells}</div>
        <p class="hint">Синий кружок: норма выполнена. Частично закрашенный: сколько выпито от нормы.</p>
      </section>
      ${letters.length ? `<section class="card"><h2 class="section-title">Письма</h2><div class="letters">${letters.map(k => `<details><summary>${dateRu(k)}</summary><p>${esc(S.letters[k])}</p></details>`).join('')}</div></section>` : ''}`;
  }

  function wardrobeView() {
    const L = levelInfo();
    return `
      <header class="topbar"><h1>Гардероб</h1><span class="chip num">уровень ${L.level}</span></header>
      <section class="stage"><div class="pet-svg">${petSvg('happy')}</div>
        <div class="petname"><b>${esc(S.settings.petName)}</b><span>${L.g} ${plural(L.g, ['день', 'дня', 'дней'])} с нормой</span></div></section>
      <section class="level"><div class="bar"><i style="width:${(3 - L.next) / 3 * 100}%"></i></div>
        <p class="hint">Ещё ${L.next} ${plural(L.next, ['день', 'дня', 'дней'])} с выполненной нормой, и ${esc(S.settings.petName)} подрастёт до уровня ${L.level + 1}.</p></section>
      <section class="wardrobe">${ACCESSORIES.map(a => {
        const open = L.g >= a.days, on = S.wear[a.slot] === a.id;
        return `<button class="acc ${open ? '' : 'locked'}" data-acc="${a.id}" aria-pressed="${on}" ${open ? '' : 'aria-disabled="true"'}>
          <svg viewBox="${ACC_VIEW[a.id]}" aria-hidden="true">${ACC_SVG[a.id]}</svg><b>${a.name}</b>
          <small>${open ? (on ? 'надето' : 'надеть') : `откроется через ${a.days - L.g} ${plural(a.days - L.g, ['день', 'дня', 'дней'])}`}</small></button>`;
      }).join('')}</section>`;
  }

  function goalBlock(st, prefix) {
    const rec = recommended(st);
    return `
      <div class="field"><span class="label">Вес, кг</span>
        <div class="stepper"><button data-step="${prefix}weight:-1" aria-label="Меньше">−</button><span class="v">${st.weight}</span><button data-step="${prefix}weight:1" aria-label="Больше">+</button></div></div>
      <div class="field"><span class="label">Сколько двигаешься</span>
        <div class="seg">${[['low', 'Мало'], ['mid', 'Средне'], ['high', 'Спорт']].map(([v, l]) => `<button data-set="${prefix}activity:${v}" aria-pressed="${st.activity === v}">${l}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Погода и кофе</span>
        <div class="seg"><button data-set="${prefix}hot:0" aria-pressed="${!st.hot}">Как обычно</button><button data-set="${prefix}hot:1" aria-pressed="${st.hot}">Жарко или много кофе</button></div></div>
      <div class="goal-big"><span class="label">Твоя норма в день</span>
        <div class="stepper"><button data-step="${prefix}goal:-100" aria-label="Меньше">−</button><span class="v">${fmt(st.goal)} мл</span><button data-step="${prefix}goal:100" aria-label="Больше">+</button></div>
        <span class="hint">${st.goal === rec ? 'Посчитано: 30 мл на кг веса плюс активность и погода.' : `По расчёту ${fmt(rec)} мл. <button class="btn small soft" data-set="${prefix}goalAuto:1">Вернуть расчёт</button>`}</span></div>`;
  }

  function settingsView() {
    const st = S.settings, ns = notifStatus();
    return `
      <header class="topbar"><h1>Настройки</h1></header>
      <section class="card"><h2 class="section-title">Питомец</h2>
        <div class="field"><label for="set-name">Имя</label><input class="input" id="set-name" data-input="petName" maxlength="20" value="${esc(st.petName)}"></div>
        <div class="pick-grid">${Object.keys(PETS).map(k => `<button class="pick-pet" data-set="pet:${k}" aria-pressed="${st.pet === k}">${drawPet(k, 'happy')}<b>${PETS[k].name}</b></button>`).join('')}</div>
      </section>
      <section class="card"><h2 class="section-title">Норма воды</h2>${goalBlock(st, '')}</section>
      <section class="card"><h2 class="section-title">Кнопки стаканов, мл</h2>
        <div class="row2">${st.cups.map((ml, i) => `<input class="input num" id="set-cup-${i}" type="number" inputmode="numeric" min="50" max="1500" data-cup="${i}" value="${ml}" aria-label="Стакан ${i + 1}, мл">`).join('')}</div></section>
      <section class="card"><h2 class="section-title">Сон и напоминания</h2>
        <div class="row2">
          <div class="field"><label for="set-sleep">Ложусь</label><input class="input" id="set-sleep" type="time" data-input="sleepStart" value="${st.sleepStart}"></div>
          <div class="field"><label for="set-wake">Встаю</label><input class="input" id="set-wake" type="time" data-input="sleepEnd" value="${st.sleepEnd}"></div>
        </div>
        <div class="field"><span class="label">Напомнить, если не пила</span>
          <div class="seg">${[[60, '1 ч'], [90, '1,5 ч'], [120, '2 ч'], [180, '3 ч']].map(([v, l]) => `<button data-set="interval:${v}" aria-pressed="${st.interval === v}">${l}</button>`).join('')}</div></div>
        <p class="hint">Ночью питомец спит и не пишет. Когда норма выполнена, напоминаний тоже не будет.</p>
        <div class="setrow"><span>Уведомления</span><span class="status ${ns.ok ? 'ok' : 'bad'}">${ns.text}</span></div>
        ${ns.ok ? `<button class="btn soft" data-act="test">Прислать пробное уведомление</button>` : `<button class="btn" data-act="push">Включить уведомления</button>`}
        ${isIOS && !standalone() ? installSteps() : ''}
      </section>
      <section class="card"><h2 class="section-title">Данные</h2>
        <p class="hint">Всё хранится на этом телефоне, копия лежит на сервере. Если удалить приложение и поставить заново, данные вернутся.</p>
        <button class="btn ${resetArmed ? '' : 'ghost'}" style="${resetArmed ? 'background:var(--bad);color:#fff' : 'color:var(--bad);box-shadow:inset 0 0 0 2px var(--bad)'}" data-act="reset">${resetArmed ? 'Точно стереть всё? Нажми ещё раз' : 'Начать заново'}</button>
      </section>`;
  }

  function installSteps() {
    return `<ol class="steps">
      <li>Открой эту страницу в <b>Safari</b>.</li>
      <li>Нажми кнопку «Поделиться» (квадрат со стрелкой вверх).</li>
      <li>Выбери «На экран „Домой“» и нажми «Добавить».</li>
      <li>Открой Глоток с экрана «Домой».</li></ol>`;
  }
  function installGate() {
    return `<div class="ob">
      <div class="hero-pet">${drawPet('otter', 'happy')}</div>
      <h1>Привет, Лера!</h1>
      <p>Чтобы питомец мог присылать тебе уведомления, поставь Глоток на экран «Домой». Это займёт полминуты.</p>
      ${installSteps()}
      <p class="hint">Если приложение уже на экране «Домой», просто открой его оттуда.</p>
      <div class="grow"></div>
      <div class="actions"><button class="btn ghost" data-act="browser">Продолжить в браузере</button></div></div>`;
  }

  function onboarding() {
    const st = S.settings, N = 6;
    const dots = `<div class="dots">${Array.from({ length: N }, (_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
    const back = step > 0 ? `<button class="btn ghost" data-ob="back">Назад</button>` : '';
    let body = '', next = '';
    if (step === 0) {
      body = `<div class="pick-grid" aria-hidden="true">${Object.keys(PETS).map(k => `<div>${drawPet(k, 'happy')}</div>`).join('')}</div>
        <h1>Привет, Лера!</h1>
        <p>Это приложение сделано специально для тебя. Здесь будет жить маленький друг. Ему, как и тебе, нужна вода: пока ты пьёшь, он счастлив, а если забываешь, у него начинает болеть голова.</p>`;
      next = `<button class="btn" data-ob="next">Познакомиться</button>`;
    } else if (step === 1) {
      body = `<h1>Кто будет жить с тобой?</h1>
        <div class="pick-grid">${Object.keys(PETS).map(k => `<button class="pick-pet" data-obpet="${k}" aria-pressed="${st.pet === k}">${drawPet(k, st.pet === k ? 'goal' : 'happy')}<b>${PETS[k].name}</b><small>${PETS[k].trait}</small></button>`).join('')}</div>`;
      next = `<button class="btn" data-ob="next" ${st.pet ? '' : 'disabled'}>Дальше</button>`;
    } else if (step === 2) {
      body = `<div class="hero-pet">${drawPet(st.pet, 'happy')}</div>
        <h1>Как зовут малыша?</h1>
        <input class="input" id="ob-name" data-input="petName" maxlength="20" placeholder="Имя питомца" value="${esc(st.petName)}" autocomplete="off">
        <div class="seg">${NAME_IDEAS[st.pet].map(n => `<button data-name="${n}" aria-pressed="${st.petName === n}">${n}</button>`).join('')}</div>`;
      next = `<button class="btn" data-ob="next" id="ob-name-next" ${st.petName.trim() ? '' : 'disabled'}>Дальше</button>`;
    } else if (step === 3) {
      body = `<h1>Сколько воды тебе нужно?</h1><p class="muted">Ответь на три вопроса, и я посчитаю норму. Её всегда можно поменять.</p>${goalBlock(st, '')}`;
      next = `<button class="btn" data-ob="next">Дальше</button>`;
    } else if (step === 4) {
      body = `<div class="hero-pet">${drawPet(st.pet, 'sleeping')}</div>
        <h1>Когда ты спишь?</h1><p class="muted">В это время ${esc(st.petName)} тоже спит и не будет тебя беспокоить.</p>
        <div class="row2">
          <div class="field"><label for="ob-sleep">Ложусь</label><input class="input" id="ob-sleep" type="time" data-input="sleepStart" value="${st.sleepStart}"></div>
          <div class="field"><label for="ob-wake">Встаю</label><input class="input" id="ob-wake" type="time" data-input="sleepEnd" value="${st.sleepEnd}"></div>
        </div>
        <div class="field"><span class="label">Напомнить, если не пила</span>
          <div class="seg">${[[60, '1 ч'], [90, '1,5 ч'], [120, '2 ч'], [180, '3 ч']].map(([v, l]) => `<button data-set="interval:${v}" aria-pressed="${st.interval === v}">${l}</button>`).join('')}</div></div>`;
      next = `<button class="btn" data-ob="next">Дальше</button>`;
    } else {
      body = `<div class="hero-pet">${drawPet(st.pet, 'headache')}</div>
        <h1>Разреши ${esc(st.petName)} жаловаться</h1>
        <p class="muted">Если ты долго не пьёшь, ${esc(st.petName)} пришлёт уведомление. Чем дольше без воды, тем сильнее у него болит голова. Когда норма выполнена, откроется письмо.</p>`;
      next = `<button class="btn" data-ob="push">Включить уведомления</button><button class="btn ghost" data-ob="finish">Позже</button>`;
    }
    return `<div class="ob">${dots}<div class="grow">${body}</div><div class="actions">${next}${back}</div></div>`;
  }

  function finishOnboarding() {
    S.onboarded = true; save(); sync(); tab = 'today'; render();
  }

  // ---------- events ----------
  function applySet(key, val) {
    const st = S.settings;
    if (key === 'activity') st.activity = val;
    else if (key === 'hot') st.hot = val === '1';
    else if (key === 'interval') st.interval = +val;
    else if (key === 'pet') st.pet = val;
    else if (key === 'goalAuto') st.goalAuto = true;
    if (['activity', 'hot', 'goalAuto'].includes(key) && st.goalAuto) st.goal = recommended();
    onGoalChange();
  }
  function applyStep(key, delta) {
    const st = S.settings;
    if (key === 'weight') { st.weight = Math.min(160, Math.max(35, st.weight + delta)); if (st.goalAuto) st.goal = recommended(); }
    if (key === 'goal') { st.goal = Math.min(5000, Math.max(800, st.goal + delta)); st.goalAuto = st.goal === recommended(); }
    onGoalChange();
  }
  function onGoalChange() {
    const d = dkey();
    if (S.goals[d]) S.goals[d] = S.settings.goal;
    save(); if (S.onboarded) sync(); render();
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('button, [data-act]');
    if (!b) { if (e.target.id === 'modal') closeModal(); return; }
    const ds = b.dataset;
    if (ds.toast) { $('#toast').hidden = true; toastAction && toastAction(); return; }
    if (ds.tab) { tab = ds.tab; resetArmed = false; showCustom = false; render(); window.scrollTo(0, 0); return; }
    if (ds.add) { addDrink(+ds.add); return; }
    if (ds.del) { const t = +ds.del; removeDrink(dkey(new Date(t)), t); return; }
    if (ds.set) { const [k, v] = ds.set.split(':'); applySet(k, v); return; }
    if (ds.step) { const [k, v] = ds.step.split(':'); applyStep(k, +v); return; }
    if (ds.name) { S.settings.petName = ds.name; save(); render(); return; }
    if (ds.obpet) {
      if (S.settings.pet !== ds.obpet) S.settings.petName = '';
      S.settings.pet = ds.obpet; save(); render(); return;
    }
    if (ds.acc) {
      const a = ACCESSORIES.find(x => x.id === ds.acc);
      if (goalDays() < a.days) { toast(`${a.name} откроется, когда наберётся ${a.days} ${plural(a.days, ['день', 'дня', 'дней'])} с нормой.`); return; }
      S.wear[a.slot] = S.wear[a.slot] === a.id ? null : a.id; save(); sync(); render(); return;
    }
    if (ds.ob) {
      if (ds.ob === 'next') { step = Math.min(5, step + 1); render(); window.scrollTo(0, 0); }
      else if (ds.ob === 'back') { step = Math.max(0, step - 1); render(); }
      else if (ds.ob === 'push') { await enablePush(); finishOnboarding(); }
      else if (ds.ob === 'finish') finishOnboarding();
      return;
    }
    switch (ds.act) {
      case 'close': closeModal(); break;
      case 'custom': showCustom = true; render(); setTimeout(() => $('#custom-ml')?.focus(), 50); break;
      case 'letter': openLetter(dkey(), false); break;
      case 'browser': S.browserOk = true; save(); render(); break;
      case 'push': if (await enablePush()) toast('Готово! Теперь ' + S.settings.petName + ' сможет напоминать о воде.'); render(); break;
      case 'test':
        try { await api('/test', { method: 'POST', body: '{}' }); toast('Отправлено. Уведомление придёт через пару секунд.'); }
        catch (err) { toast('Не удалось отправить. Проверь интернет и попробуй ещё раз.'); }
        break;
      case 'reset':
        if (!resetArmed) { resetArmed = true; render(); setTimeout(() => { resetArmed = false; if (tab === 'settings') render(); }, 4000); break; }
        try { localStorage.removeItem(STORE); } catch (err) { }
        S = JSON.parse(JSON.stringify(DEFAULT)); S.browserOk = true; step = 0; resetArmed = false; render();
        break;
    }
  });

  document.addEventListener('input', e => {
    const k = e.target.dataset.input;
    if (k === 'petName') {
      S.settings.petName = e.target.value.slice(0, 20); save();
      const nb = $('#ob-name-next'); if (nb) nb.disabled = !S.settings.petName.trim();
    }
  });
  document.addEventListener('change', e => {
    const el = e.target, k = el.dataset.input;
    if (k === 'petName') { if (S.onboarded) sync(); return; }
    if (k === 'sleepStart' || k === 'sleepEnd') { if (el.value) { S.settings[k] = el.value; save(); if (S.onboarded) sync(); } return; }
    if (el.dataset.cup != null) {
      const v = Math.round(+el.value);
      if (v >= 50 && v <= 1500) { S.settings.cups[+el.dataset.cup] = v; save(); sync(); }
      else { el.value = S.settings.cups[+el.dataset.cup]; toast('Объём стакана: от 50 до 1500 мл.'); }
    }
  });
  document.addEventListener('submit', e => {
    if (e.target.dataset.form === 'custom') {
      e.preventDefault();
      const v = +$('#custom-ml').value;
      if (v > 0) { showCustom = false; addDrink(v); }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !S.onboarded) return;
    clearBadge();
    if (tab === 'today') render();
    if (S.dirty) pushState();
    refreshSub();
  });
  setInterval(() => { if (S.onboarded && tab === 'today' && document.visibilityState === 'visible') updateStage(); }, 60000);

  // ---------- start ----------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
    navigator.serviceWorker.addEventListener('message', ev => { if (ev.data?.type === 'push' && S.onboarded && tab === 'today') updateStage(); });
  }
  render();
  (async () => {
    if (!S.onboarded && await restore()) render();
    if (S.onboarded) {
      clearBadge();
      if (S.dirty) pushState();
      refreshSub();
      await fetchLetters();
    }
  })();
})();
