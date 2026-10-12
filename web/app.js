(function () {
  const CFG = window.APP_CONFIG || {};
  const { PETS, ACCESSORIES, ACC_SVG, drawPet, drawAway, line, STAGE_NAMES } = window.Pets;
  const FOODS = window.FOODS;
  const STORE = 'glotok-state-v1';
  const VERSION = 3;
  const STAGES = ['baby', 'young', 'adult'];
  const STAGE_AT = [0, 10, 30]; // звёздочек до формы
  const NAME_IDEAS = {
    otter: ['Бублик', 'Выдруша', 'Пельмень'],
    weasel: ['Искорка', 'Шустрик', 'Ириска'],
    dachshund: ['Сосиска', 'Батон', 'Колбаска'],
    cat: ['Муся', 'Булочка', 'Персик']
  };
  const ACC_VIEW = {
    bow: '116 28 52 46', scarf: '48 132 104 64', glasses: '54 80 92 40', hat: '36 0 128 82',
    flowers: '44 32 112 46', headphones: '24 26 152 100', crown: '64 14 72 46',
    heart: '120 36 38 34', rose: '118 42 42 34', bowtie: '74 140 52 32', tiara: '60 18 80 46'
  };
  const MEALS = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' };
  const REPEATS = { none: 'Не повторять', daily: 'Каждый день', weekdays: 'По будням', weekly: 'Каждую неделю' };

  const DEFAULT = {
    v: VERSION, onboarded: false,
    settings: {
      pet: null, petName: '', weight: 55, height: 165, age: 22, activity: 'mid', hot: false,
      goal: 1950, goalAuto: true, kcalGoal: 1800, kcalAuto: true,
      sleepStart: '00:00', sleepEnd: '08:00', interval: 90, cups: [150, 250, 330, 500], notify: false,
      waterHours: [11, 14, 17, 20], mealsOn: true, meals: { breakfast: '10:30', lunch: '14:30', dinner: '19:30' }
    },
    settingsAt: {},
    logs: {}, goals: {}, food: {}, customFoods: [], recentFoods: [], tasks: [],
    wear: { head: null, neck: null, face: null },
    letters: {}, signature: '', seenLetter: '', gifts: [], seenGifts: [], sub: null, dirty: false,
    trackFrom: '', seenStage: 0, away: null
  };

  let S = load();
  let tab = 'home', step = 0, drinkingUntil = 0, eatingUntil = 0, lastMood = '', showCustom = false, resetArmed = false;
  let foodQuery = '', foodCat = '', sheet = null, taskWhen = 'none', taskCustom = '', viewDay = null;

  // ---------- storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const s = JSON.parse(raw);
        const st = { ...DEFAULT.settings, ...s.settings };
        st.meals = { ...DEFAULT.settings.meals, ...(s.settings && s.settings.meals) };
        return { ...DEFAULT, ...s, settings: st, wear: { ...DEFAULT.wear, ...s.wear } };
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
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const liters = ml => (ml / 1000).toFixed(ml % 1000 === 0 ? 0 : ml % 100 === 0 ? 1 : 2).replace('.', ',');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]; };
  const days = n => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const dateRu = k => new Date(k + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const norm = s => s.toLowerCase().replace(/ё/g, 'е');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const editing = () => { const a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName); };

  function setS(key, val) { S.settings[key] = val; S.settingsAt[key] = Date.now(); }

  // ---------- вода ----------
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
  const goalDays = () => Object.keys(S.logs).filter(met).length;
  function streak() {
    const d = new Date();
    if (!met(dkey(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (met(dkey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function bestStreak() {
    const list = Object.keys(S.logs).filter(met).sort();
    let best = 0, cur = 0, prev = null;
    for (const k of list) {
      const t = new Date(k + 'T12:00:00').getTime();
      cur = prev && Math.round((t - prev) / 864e5) === 1 ? cur + 1 : 1;
      best = Math.max(best, cur); prev = t;
    }
    return best;
  }
  const levelInfo = () => {
    const g = goalDays(), level = 1 + Math.floor(g / 3);
    return { g, level, next: 3 - g % 3 };
  };
  function recommended(st = S.settings) {
    const add = { low: 0, mid: 300, high: 600 }[st.activity] || 0;
    const ml = st.weight * 30 + add + (st.hot ? 400 : 0);
    return Math.min(4000, Math.max(1200, Math.round(ml / 50) * 50));
  }

  // ---------- еда ----------
  function kcalRecommended(st = S.settings) {
    const bmr = 10 * st.weight + 6.25 * st.height - 5 * st.age - 161;
    const f = { low: 1.2, mid: 1.375, high: 1.55 }[st.activity] || 1.375;
    return Math.max(1200, Math.round(bmr * f / 50) * 50);
  }
  const foodOf = d => S.food[d] || [];
  const kcalOf = d => foodOf(d).reduce((a, x) => a + x.kcal, 0);
  const mealLogged = (m, d = dkey()) => foodOf(d).some(x => x.meal === m);
  function defaultMeal() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 11.5 ? 'breakfast' : h < 16 ? 'lunch' : h < 18 ? 'snack' : h < 23 ? 'dinner' : 'snack';
  }
  function hungryMeal() {
    if (!S.settings.mealsOn) return null;
    const m = nowMin();
    for (const meal of ['dinner', 'lunch', 'breakfast']) {
      const T = toMin(S.settings.meals[meal]);
      if (m >= T && m < T + 150 && !mealLogged(meal)) return meal;
    }
    return null;
  }

  // ---------- формы и побег ----------
  const foodMet = d => kcalOf(d) >= 0.8 * S.settings.kcalGoal;
  function stars() {
    let n = 0;
    for (const d of new Set([...Object.keys(S.logs), ...Object.keys(S.food)])) { if (met(d)) n++; if (foodMet(d)) n++; }
    return n;
  }
  function stageInfo() {
    const s = stars(), idx = s >= STAGE_AT[2] ? 2 : s >= STAGE_AT[1] ? 1 : 0;
    return { stars: s, idx, stage: STAGES[idx], name: STAGE_NAMES[S.settings.pet || 'otter'][idx], next: STAGE_AT[idx + 1] ?? null };
  }
  const dayBefore = i => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); return dkey(d); };
  function awayInfo() {
    if (!S.trackFrom) return null;
    const today = dkey();
    const missed = f => { for (let i = 1; i <= 3; i++) { const d = dayBefore(i); if (d < S.trackFrom || f(d)) return false; } return !f(today); };
    const water = missed(met), food = missed(foodMet);
    return water || food ? { water, food } : null;
  }
  const awayWhat = a => a.water && a.food ? 'воды и еды' : a.water ? 'воды' : 'еды';
  const awayBack = a => a.water && a.food ? 'за один день ты выпьешь норму воды и нормально поешь' : a.water ? 'ты выпьешь норму воды за день' : 'ты нормально поешь за день';
  const awayFix = a => a.water && a.food ? 'выполни сегодня норму воды и поешь хотя бы на 80% нормы' : a.water ? 'выпей сегодня норму воды' : 'поешь сегодня хотя бы на 80% нормы';

  function mood() {
    const now = Date.now();
    if (awayInfo()) return 'away';
    if (now < drinkingUntil) return 'drinking';
    if (inQuiet(nowMin())) return 'sleeping';
    if (now < eatingUntil) return 'goal';
    if (hungryMeal()) return 'hungry';
    if (met(dkey())) return 'goal';
    const mins = (now - Math.max(lastDrink(), wakeTs(now))) / 60000;
    const iv = S.settings.interval;
    if (mins >= iv * 1.75) return 'headache';
    if (mins >= iv) return 'thirsty';
    return 'happy';
  }

  // ---------- дела ----------
  const liveTasks = () => S.tasks.filter(t => !t.deleted);
  function nextDue(t) {
    const d = new Date(t.due), now = Date.now();
    do {
      if (t.repeat === 'weekly') d.setDate(d.getDate() + 7);
      else { d.setDate(d.getDate() + 1); if (t.repeat === 'weekdays') while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); }
    } while (d.getTime() <= now);
    return d.getTime();
  }
  function dueLabel(t) {
    if (!t.due) return '';
    const d = new Date(t.due), today = dkey(), tm = new Date(); tm.setDate(tm.getDate() + 1);
    const k = dkey(d);
    const day = k === today ? 'сегодня' : k === dkey(tm) ? 'завтра' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return `${day}, ${hm(t.due)}`;
  }
  const fromName = () => S.signature || 'от любимого';

  // ---------- синхронизация ----------
  function mergeLWW(a, aAt, b, bAt) {
    const out = { ...a }, at = { ...aAt };
    for (const k of Object.keys(b || {})) {
      if ((bAt[k] || 0) >= (aAt[k] || 0)) { out[k] = b[k]; at[k] = bAt[k] || aAt[k] || 0; }
    }
    return { settings: out, settingsAt: at };
  }
  function mergeTasks(a, b) {
    const m = new Map((a || []).map(t => [t.id, t]));
    for (const t of b || []) { const o = m.get(t.id); if (!o || (t.updatedAt || 0) >= (o.updatedAt || 0)) m.set(t.id, t); }
    const now = Date.now();
    return [...m.values()].filter(t => !(t.deleted && now - t.updatedAt > 30 * 864e5) && !(t.done && now - (t.doneAt || 0) > 60 * 864e5));
  }

  async function api(path, opts = {}) {
    const r = await fetch(CFG.API + path, { ...opts, headers: { 'Content-Type': 'application/json', 'X-App-Key': CFG.APP_KEY } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  let syncTimer;
  function sync() { if (!CFG.API) return; S.dirty = true; save(); clearTimeout(syncTimer); syncTimer = setTimeout(pushState, 700); }
  async function pushState() {
    if (!CFG.API || !S.onboarded) return;
    const since = dkey(new Date(Date.now() - 90 * 864e5));
    const pick = o => Object.fromEntries(Object.entries(o).filter(([k]) => k >= since));
    try {
      const r = await api('/state', {
        method: 'PUT', body: JSON.stringify({
          settings: S.settings, settingsAt: S.settingsAt, logs: pick(S.logs), goals: pick(S.goals),
          food: pick(S.food), customFoods: S.customFoods, recentFoods: S.recentFoods, tasks: S.tasks,
          wear: S.wear, sub: S.sub, trackFrom: S.trackFrom, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, updatedAt: Date.now()
        })
      });
      S.dirty = false;
      applyRemote(r);
    } catch (e) { }
  }
  function applyRemote(r) {
    if (!r || !r.settings) return;
    const before = JSON.stringify([S.settings, S.tasks, S.gifts, S.signature]);
    const m = mergeLWW(S.settings, S.settingsAt, r.settings, r.settingsAt || {});
    S.settings = { ...DEFAULT.settings, ...m.settings }; S.settingsAt = m.settingsAt;
    const d = dkey(); if (S.goals[d]) S.goals[d] = S.settings.goal;
    S.tasks = mergeTasks(S.tasks, r.tasks);
    S.gifts = r.gifts || []; S.signature = r.signature || S.signature;
    save();
    if (before !== JSON.stringify([S.settings, S.tasks, S.gifts, S.signature]) && !editing() && !sheet) render();
    const fresh = S.gifts.find(g => !S.seenGifts.includes(g.gid));
    if (fresh && !sheet) openGift(fresh);
  }
  async function restore() {
    if (!CFG.API || S.onboarded) return false;
    try {
      const { state } = await api('/state');
      if (state && state.settings && state.settings.pet) {
        S = {
          ...S, settings: { ...DEFAULT.settings, ...state.settings }, settingsAt: state.settingsAt || {},
          logs: state.logs || {}, goals: state.goals || {}, food: state.food || {}, customFoods: state.customFoods || [],
          recentFoods: state.recentFoods || [], tasks: state.tasks || [], wear: { ...S.wear, ...state.wear }, onboarded: true, v: VERSION,
          trackFrom: state.trackFrom || dkey(), seenStage: 2
        };
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

  // ---------- уведомления ----------
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
      S.sub = sub.toJSON(); setS('notify', true); save();
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

  // ---------- действия ----------
  const dayK = () => viewDay || dkey();
  // Время записи: для прошлого дня берём тот же час, что сейчас.
  function stampFor(d, list) {
    if (d === dkey()) return Date.now();
    const n = new Date(), t0 = new Date(`${d}T${pad(n.getHours())}:${pad(n.getMinutes())}:00`).getTime();
    let t = t0; while ((list || []).some(x => x.t === t)) t++;
    return t;
  }
  function addDrink(ml) {
    ml = Math.round(ml);
    if (!(ml > 0 && ml <= 3000)) { toast('Укажи объём от 1 до 3000 мл.'); return; }
    const d = dayK(), t = stampFor(d, S.logs[d]);
    const wasMet = met(d);
    (S.logs[d] = S.logs[d] || []).push({ t, ml });
    if (!S.goals[d]) S.goals[d] = S.settings.goal;
    drinkingUntil = Date.now() + 2600;
    save(); render(); clearBadge(); sync();
    toast(`+${ml} мл${viewDay ? ' за ' + dateRu(d) : ''}`, 'Отменить', () => removeDrink(d, t));
    setTimeout(updateStage, 2700);
    if (!viewDay && !wasMet && met(d) && S.seenLetter !== d) {
      S.seenLetter = d; save();
      setTimeout(() => openLetter(d, true), 1800);
    }
  }
  function removeDrink(d, t) {
    S.logs[d] = (S.logs[d] || []).filter(x => x.t !== t);
    if (!S.logs[d].length) delete S.logs[d];
    drinkingUntil = 0; save(); render(); sync();
  }
  function addFood(entry, remember) {
    const d = dayK(), t = stampFor(d, S.food[d]);
    (S.food[d] = S.food[d] || []).push({ t, ...entry });
    if (remember) S.recentFoods = [entry.name, ...S.recentFoods.filter(n => n !== entry.name)].slice(0, 12);
    eatingUntil = Date.now() + 2600;
    closeModal(); foodQuery = ''; foodCat = '';
    save(); render(); clearBadge(); sync();
    toast(`${MEALS[entry.meal]}: +${fmt(entry.kcal)} ккал${viewDay ? ' за ' + dateRu(d) : ''}`, 'Отменить', () => removeFood(d, t));
    setTimeout(updateStage, 2700);
  }
  function removeFood(d, t) {
    S.food[d] = foodOf(d).filter(x => x.t !== t);
    if (!S.food[d].length) delete S.food[d];
    eatingUntil = 0; save(); render(); sync();
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
  function openGift(g) {
    const a = ACCESSORIES.find(x => x.id === g.id);
    if (!a) { S.seenGifts.push(g.gid); save(); return; }
    sheet = { type: 'gift', g };
    showModal(`<div class="paper" role="dialog" aria-label="Подарок">
      <div class="date">Тебе подарок · ${esc(fromName())}</div>
      <svg viewBox="${ACC_VIEW[a.id]}" class="gift-svg" aria-hidden="true">${ACC_SVG[a.id]}</svg>
      <h2 style="text-align:center">${esc(a.name)}</h2>
      ${g.note ? `<p class="text">${esc(g.note)}</p>` : ''}
      <button class="btn" data-act="gift-wear">Надеть на ${esc(S.settings.petName)}</button>
      <button class="btn ghost" data-act="gift-close" style="color:var(--rose);box-shadow:inset 0 0 0 2px var(--rose)">Потом</button></div>`);
  }

  // ---------- мелочи интерфейса ----------
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
  function closeModal() {
    const m = $('#modal'); m.hidden = true; m.innerHTML = '';
    if (sheet && sheet.type === 'gift') { S.seenGifts.push(sheet.g.gid); save(); }
    sheet = null;
    const fresh = S.gifts.find(g => !S.seenGifts.includes(g.gid));
    if (fresh) setTimeout(() => openGift(fresh), 300);
    else setTimeout(checkEvents, 300);
  }

  const ICON = {
    drop: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c-.3 0-.6.1-.8.4C9.4 5.3 5 11 5 14.8A7 7 0 0 0 19 14.8C19 11 14.6 5.3 12.8 2.9a1 1 0 0 0-.8-.4Z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3C9.5 6.5 6 11 6 14.8a6 6 0 0 0 12 0C18 11 14.5 6.5 12 3Z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5" stroke-linecap="round"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8a2 2 0 0 0 2 0V3M8 11v10M5 3v6a3 3 0 0 0 6 0V3"/><path d="M17 21V3c-2 1-3 4-3 7 0 2 1 3 3 3"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/></svg>',
    wardrobe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 11 4.5 7.5Q3 9.5 4.5 11.5L12 11l7.5.5q1.5-2 0-4L12 11Z"/><circle cx="12" cy="11" r="1.8" fill="currentColor"/><path d="M6 15h12M8 19h8" stroke-linecap="round"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
    star: '<svg class="star" viewBox="0 0 24 24" width="14" height="14" fill="#F5B731" aria-label="звёздочек" style="vertical-align:-2px"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11Z"/></svg>'
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
  const petSvg = (state, extra = {}) => drawPet(S.settings.pet || 'otter', state, { wear: S.wear, stage: stageInfo().stage, label: S.settings.petName, ...extra });

  function weekChart(vals, labels, goal, fmtVal, goalLabel, cls) {
    const max = Math.max(goal * 1.2, ...vals);
    const W = 340, H = 180, top = 24, bottom = 26, left = 6, bw = 30, gap = (W - left * 2 - bw * 7) / 6;
    const y = v => top + (H - top - bottom) * (1 - v / max);
    const bars = vals.map((v, i) => {
      const x = left + i * (bw + gap), isToday = i === 6;
      const c = v >= goal ? `bar-met${cls}` : isToday ? `bar-today${cls}` : `bar-miss${cls}`;
      const h = Math.max(v ? 4 : 0, H - bottom - y(v));
      return `<rect x="${x}" y="${H - bottom - h}" width="${bw}" height="${h}" rx="8" class="${c}"/>
        ${v ? `<text x="${x + bw / 2}" y="${H - bottom - h - 6}" text-anchor="middle" class="lbl">${fmtVal(v)}</text>` : ''}
        <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="lbl" ${isToday ? 'style="fill:var(--ink)"' : ''}>${labels[i]}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Неделя по дням">
      <line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" class="grid"/>
      <line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" class="goal-line${cls}" stroke-width="1.5"/>
      ${bars}
      <text x="${W - 2}" y="${y(goal) - 5}" text-anchor="end" class="lbl goal-lbl${cls}">${goalLabel}</text></svg>`;
  }
  function lastWeek() {
    const out = [], wd = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push({ k: dkey(d), label: i ? wd[d.getDay()] : 'сег.' }); }
    return out;
  }

  // ---------- экраны ----------
  function render() {
    const app = $('#app');
    if (!S.onboarded) {
      app.innerHTML = isIOS && !standalone() && !S.browserOk ? installGate() : onboarding();
      return;
    }
    const views = { home: homeView, history: historyView, food: foodView, tasks: tasksView, wardrobe: wardrobeView, settings: settingsView };
    app.innerHTML = `<main class="screen">${views[tab]()}</main>${tabbar()}`;
    lastMood = mood();
    if (!sheet) setTimeout(checkEvents, 0);
  }
  function tabbar() {
    const t = [['home', 'Главная'], ['food', 'Еда'], ['tasks', 'Дела'], ['wardrobe', 'Питомец'], ['settings', 'Настройки']];
    const cur = tab === 'history' ? 'home' : tab;
    const overdue = liveTasks().filter(x => !x.done && x.due && x.due < Date.now()).length;
    return `<nav class="tabbar"><div class="in">${t.map(([id, l]) => `<button data-tab="${id}" ${cur === id ? 'aria-current="page"' : ''}>${ICON[id]}${l}${id === 'tasks' && overdue ? `<i class="dot">${overdue}</i>` : ''}</button>`).join('')}</div></nav>`;
  }
  function stageHTML() {
    const m = mood();
    const G = stageInfo();
    if (m === 'away') {
      const a = awayInfo();
      return `<div class="bubble note">Записка: «Отправляюсь на поиски ${awayWhat(a)}. Вернусь, когда ${awayBack(a)}.»</div>
        <div class="pet-svg">${drawAway(a.water ? 'water' : 'food')}</div>
        <div class="petname"><b>${esc(S.settings.petName)}</b><span>сейчас не дома</span></div>`;
    }
    const seed = Math.floor(Date.now() / 36e5) + (S.logs[dkey()] || []).length;
    return `<div class="bubble">${esc(line(m, S.settings.pet, seed))}</div>
      <div class="pet-svg">${petSvg(m)}</div>
      <div class="petname"><b>${esc(S.settings.petName)}</b><span>${esc(G.name.toLowerCase())}</span></div>`;
  }
  function daySwitch() {
    const dk = dayK(), min = dayBefore(14);
    const opts = [[0, 'Сегодня'], [1, 'Вчера'], [2, 'Позавчера']];
    const custom = viewDay && ![dayBefore(1), dayBefore(2)].includes(viewDay);
    return `<div class="dayswitch">${opts.map(([i, l]) => `<button data-day="${i}" aria-pressed="${dk === dayBefore(i)}">${l}</button>`).join('')}
        <label class="daypick ${custom ? 'on' : ''}"><span>${custom ? dateRu(dk) : 'Другой день'}</span><input type="date" id="day-pick" min="${min}" max="${dkey()}" value="${dk}" aria-label="Выбрать день"></label></div>
      ${viewDay ? `<p class="pastnote">Ты записываешь за <b>${dateRu(dk)}</b>. Всё, что добавишь, попадёт в этот день.</p>` : ''}`;
  }
  function updateStage() {
    const el = $('#stage');
    if (!el) return;
    const m = mood();
    if (m !== lastMood) { el.innerHTML = stageHTML(); lastMood = m; }
  }
  function mealChips(d = dkey()) {
    const hungry = d === dkey() ? hungryMeal() : null;
    return `<div class="meals">${['breakfast', 'lunch', 'dinner', 'snack'].map(m => {
      const k = foodOf(d).filter(x => x.meal === m).reduce((a, x) => a + x.kcal, 0);
      const cls = k ? 'on' : m === hungry ? 'late' : '';
      return `<span class="meal ${cls}">${MEALS[m]}${k ? ` · ${fmt(k)}` : m === hungry ? ' · пора' : ''}</span>`;
    }).join('')}</div>`;
  }

  function homeView() {
    const d = dayK(), isToday = !viewDay, tot = total(d), goal = goalOf(d), pct = Math.min(100, Math.round(tot / goal * 100));
    const rest = Math.max(0, goal - tot), glasses = Math.ceil(rest / 250), last = lastDrink(), st = streak();
    const logs = (S.logs[d] || []).slice().reverse();
    const kc = kcalOf(d), kg = S.settings.kcalGoal, kp = Math.min(100, Math.round(kc / kg * 100));
    const todayTasks = liveTasks().filter(t => !t.done && t.due && dkey(new Date(t.due)) <= dkey()).sort((a, b) => a.due - b.due);
    let letter = '';
    if (CFG.API && isToday) {
      letter = met(d)
        ? `<button class="card letter open" data-act="letter">${envelopeSvg()}<span class="t"><b>Письмо на сегодня</b><span class="muted">Норма выполнена. Нажми, чтобы прочитать.</span></span></button>`
        : `<div class="card letter">${envelopeSvg()}<span class="t"><b>Тебя ждёт письмо</b><span class="muted">Оно откроется, когда выпьешь ещё ${fmt(rest)} мл.</span></span></div>`;
    }
    return `
      <header class="topbar"><h1>Привет, Лера</h1><span class="chip num" style="color:var(--accent)">${ICON.drop}<span style="color:var(--ink)">${days(st)} подряд</span></span></header>
      <section class="stage" id="stage">${stageHTML()}</section>
      ${daySwitch()}
      <section class="progress">
        <div class="row"><span class="big">${fmt(tot)} <small>из ${fmt(goal)} мл</small></span><b class="num">${pct}%</b></div>
        <div class="bar ${tot >= goal ? 'done' : ''}"><i style="width:${pct}%"></i></div>
        <div class="row hint"><span>${rest ? `Осталось ${fmt(rest)} мл, это около ${glasses} ${plural(glasses, ['стакана', 'стаканов', 'стаканов'])}` : (isToday ? 'Норма на сегодня выполнена' : 'Норма за этот день выполнена')}</span><span>${isToday && last ? 'посл. ' + (dkey(new Date(last)) === d ? hm(last) : 'вчера') : ''}</span></div>
      </section>
      <section class="cups">${S.settings.cups.map((ml, i) => `<button class="cup" id="cup-${i}" data-add="${ml}" aria-label="Выпила ${ml} мл">${cupSvg(ml)}<span>${ml}</span></button>`).join('')}</section>
      ${showCustom
        ? `<form class="custom-row" data-form="custom"><input class="input" id="custom-ml" type="number" inputmode="numeric" min="1" max="3000" placeholder="Сколько мл?" aria-label="Свой объём, мл"><button class="btn small" type="submit">Добавить</button></form>`
        : `<div class="linkrow"><button class="btn ghost small" data-act="custom">Другой объём</button><button class="btn soft small" data-tab="history">История воды</button></div>`}
      <button class="card linkcard" data-tab="food">
        <div class="row"><b>Еда${isToday ? '' : ' · ' + dateRu(d)}</b><span class="num">${fmt(kc)} из ${fmt(kg)} ккал</span></div>
        <div class="bar food"><i style="width:${kp}%"></i></div>${mealChips(d)}</button>
      ${todayTasks.length ? `<button class="card linkcard" data-tab="tasks"><div class="row"><b>Дела на сегодня</b><span class="num">${todayTasks.length}</span></div>
        <ul class="mini-tasks">${todayTasks.slice(0, 3).map(t => `<li class="${t.due < Date.now() ? 'late' : ''}">${esc(t.title)}<span>${hm(t.due)}</span></li>`).join('')}</ul></button>` : ''}
      ${letter}
      ${logs.length ? `<section class="card"><h2 class="section-title">Вода ${isToday ? 'сегодня' : 'за ' + dateRu(d)}</h2><ul class="log">${logs.map(x => `<li><span><b>${x.ml} мл</b> <span class="muted">в ${hm(x.t)}</span></span><button class="x" data-del="${x.t}" aria-label="Удалить запись ${x.ml} мл">Удалить</button></li>`).join('')}</ul></section>` : ''}`;
  }

  function historyView() {
    const wk = lastWeek(), vals = wk.map(w => total(w.k));
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / 7);
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
      <header class="topbar"><h1>История воды</h1><button class="btn soft small" data-tab="home">Назад</button></header>
      <section class="stats">
        <div class="stat"><b>${streak()}</b><span>дней подряд сейчас</span></div>
        <div class="stat"><b>${bestStreak()}</b><span>лучшая серия</span></div>
        <div class="stat"><b>${liters(Math.round(avg / 10) * 10)}</b><span>литра в день за неделю</span></div>
      </section>
      <section class="card chart"><h2 class="section-title">Последние 7 дней</h2>
        ${weekChart(vals, wk.map(w => w.label), S.settings.goal, liters, `норма ${liters(S.settings.goal)} л`, '')}</section>
      <section class="card"><h2 class="section-title">Пять недель</h2>
        <div class="cal">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(w => `<span class="wd">${w}</span>`).join('')}${cells}</div>
        <p class="hint">Синий кружок: норма выполнена. Частично закрашенный: сколько выпито от нормы.</p>
      </section>
      ${letters.length ? `<section class="card"><h2 class="section-title">Письма</h2><div class="letters">${letters.map(k => `<details><summary>${dateRu(k)}</summary><p>${esc(S.letters[k])}</p></details>`).join('')}</div></section>` : ''}`;
  }

  // --- еда ---
  function allFoods() {
    return [...S.customFoods.map((f, i) => ({ ...f, key: 'c' + i, cat: 'Моё' })), ...FOODS.list.map((f, i) => ({ ...f, key: 'b' + i }))];
  }
  const foodByKey = k => k[0] === 'c' ? { ...S.customFoods[+k.slice(1)], key: k } : { ...FOODS.list[+k.slice(1)], key: k };
  function foodRow(f) {
    return `<button class="food-row" data-food="${f.key}"><span><b>${esc(f.name)}</b><small>${fmt(f.kcal)} ккал / 100 г${f.portion ? ` · ${esc(f.portion)} ≈ ${f.g} г` : ''}</small></span><i aria-hidden="true">+</i></button>`;
  }
  function foodResults() {
    const q = norm(foodQuery.trim());
    if (q) {
      const words = q.split(/\s+/);
      const hits = allFoods().filter(f => { const n = norm(f.name); return words.every(w => n.includes(w)); })
        .sort((a, b) => (norm(b.name).startsWith(q) - norm(a.name).startsWith(q)) || a.name.length - b.name.length).slice(0, 40);
      return hits.length ? `<div class="food-list">${hits.map(foodRow).join('')}</div>`
        : `<p class="hint">Ничего не нашлось. Добавь своё блюдо кнопкой ниже, оно запомнится.</p>`;
    }
    const cats = ['Моё', ...FOODS.cats].filter(c => c !== 'Моё' || S.customFoods.length);
    const chips = `<div class="chips">${cats.map(c => `<button class="chipbtn" data-cat="${esc(c)}" aria-pressed="${foodCat === c}">${esc(c)}</button>`).join('')}</div>`;
    if (foodCat) return chips + `<div class="food-list">${allFoods().filter(f => f.cat === foodCat).map(foodRow).join('')}</div>`;
    const recent = S.recentFoods.map(n => allFoods().find(f => f.name === n)).filter(Boolean);
    return (recent.length ? `<p class="label">Недавние</p><div class="food-list">${recent.map(foodRow).join('')}</div>` : '') + `<p class="label">Категории</p>` + chips;
  }
  function foodView() {
    const d = dayK(), isToday = !viewDay, kc = kcalOf(d), kg = S.settings.kcalGoal, kp = Math.min(100, Math.round(kc / kg * 100));
    const entries = foodOf(d);
    const wk = lastWeek(), vals = wk.map(w => kcalOf(w.k));
    const hungry = isToday ? hungryMeal() : null;
    return `
      <header class="topbar"><h1>Еда</h1>${hungry ? `<span class="chip" style="color:var(--warn)">${MEALS[hungry]} не отмечен</span>` : ''}</header>
      <section class="progress">
        <div class="row"><span class="big">${fmt(kc)} <small>из ${fmt(kg)} ккал</small></span><b class="num">${kp}%</b></div>
        <div class="bar food"><i style="width:${kp}%"></i></div>
        ${mealChips(d)}
        <p class="hint">${kc >= kg ? (isToday ? 'На сегодня наелась. Молодец!' : 'В этот день наелась.') : isToday ? `Осталось около ${fmt(kg - kc)} ккал, чтобы тебе хватило сил на день.` : `До нормы в этот день не хватило ${fmt(kg - kc)} ккал.`}</p>
      </section>
      ${daySwitch()}
      <section class="card">
        <input class="input" id="food-q" type="search" placeholder="Что ты съела? Например, гречка" value="${esc(foodQuery)}" autocomplete="off" aria-label="Поиск еды">
        <div id="food-results">${foodResults()}</div>
        <button class="btn ghost small" style="align-self:center" data-act="food-custom">Нет в списке? Добавить своё</button>
      </section>
      ${entries.length ? `<section class="card"><h2 class="section-title">${isToday ? 'Сегодня' : dateRu(d)}</h2>${['breakfast', 'lunch', 'dinner', 'snack'].filter(m => entries.some(x => x.meal === m)).map(m => `
        <p class="label">${MEALS[m]}</p><ul class="log">${entries.filter(x => x.meal === m).map(x => `<li><span><b>${esc(x.name)}</b> <span class="muted">${x.g ? x.g + ' г · ' : ''}${fmt(x.kcal)} ккал</span></span><button class="x" data-delfood="${x.t}" aria-label="Удалить ${esc(x.name)}">Удалить</button></li>`).join('')}</ul>`).join('')}</section>` : ''}
      <section class="card chart"><h2 class="section-title">Калории за неделю</h2>
        ${weekChart(vals, wk.map(w => w.label), kg, v => (v / 1000).toFixed(1).replace('.', ','), `норма ${fmt(kg)}`, ' food')}
        <p class="hint">Подписи над столбиками в тысячах ккал.</p></section>`;
  }
  function openFoodSheet(key) {
    const f = foodByKey(key);
    sheet = { type: 'food', f, g: f.g || 100, meal: defaultMeal() };
    renderFoodSheet();
  }
  function renderFoodSheet() {
    const { f, g, meal } = sheet;
    const chips = [[f.portion, f.g], ['100 г', 100], f.portion ? [`2 × ${f.portion}`, f.g * 2] : null, f.portion && f.g >= 40 ? [`½ ${f.portion}`, Math.round(f.g / 2)] : null].filter(c => c && c[0]);
    showModal(`<form class="sheet" data-form="food" role="dialog" aria-label="${esc(f.name)}">
      <div><h2>${esc(f.name)}</h2><p class="muted">${fmt(f.kcal)} ккал на 100 г</p></div>
      <div class="seg">${Object.keys(MEALS).map(m => `<button type="button" data-meal="${m}" aria-pressed="${meal === m}">${MEALS[m]}</button>`).join('')}</div>
      <div class="field"><label for="fg">Сколько грамм${/мл|напит/i.test(f.cat || '') || f.cat === 'Напитки' ? ' (мл)' : ''}</label>
        <div class="stepper"><button type="button" data-gstep="-1" aria-label="Меньше">−</button><input class="input v num" id="fg" type="number" inputmode="decimal" min="1" max="3000" value="${g}"><button type="button" data-gstep="1" aria-label="Больше">+</button></div></div>
      <div class="chips">${chips.map(([l, v]) => `<button type="button" class="chipbtn" data-grams="${v}">${esc(l)} · ${v} г</button>`).join('')}</div>
      <div class="kcal-out"><b id="fk" class="num">${fmt(f.kcal * g / 100)}</b> ккал</div>
      <button class="btn" type="submit">Добавить</button>
      <button class="btn ghost" type="button" data-act="close">Отмена</button></form>`);
  }
  function openCustomSheet() {
    sheet = { type: 'custom', mode: 'per100', meal: defaultMeal() };
    renderCustomSheet();
  }
  function renderCustomSheet(keep = {}) {
    const { mode, meal } = sheet;
    showModal(`<form class="sheet" data-form="customfood" role="dialog" aria-label="Своё блюдо">
      <h2>Своё блюдо</h2>
      <div class="field"><label for="cf-name">Название</label><input class="input" id="cf-name" maxlength="60" required value="${esc(keep.name || foodQuery)}" placeholder="Например, мамины котлеты"></div>
      <div class="seg"><button type="button" data-cmode="per100" aria-pressed="${mode === 'per100'}">Знаю ккал на 100 г</button><button type="button" data-cmode="total" aria-pressed="${mode === 'total'}">Знаю ккал всего</button></div>
      ${mode === 'per100'
        ? `<div class="row2"><div class="field"><label for="cf-kcal">Ккал на 100 г</label><input class="input num" id="cf-kcal" type="number" inputmode="numeric" min="0" max="950" required value="${esc(keep.kcal || '')}"></div>
           <div class="field"><label for="cf-g">Съела грамм</label><input class="input num" id="cf-g" type="number" inputmode="numeric" min="1" max="3000" required value="${esc(keep.g || '')}"></div></div>
           <p class="hint">Блюдо сохранится в «Моё», в следующий раз его можно будет найти поиском.</p>`
        : `<div class="field"><label for="cf-total">Всего ккал</label><input class="input num" id="cf-total" type="number" inputmode="numeric" min="1" max="5000" required value="${esc(keep.total || '')}"></div>`}
      <div class="seg">${Object.keys(MEALS).map(m => `<button type="button" data-meal="${m}" aria-pressed="${meal === m}">${MEALS[m]}</button>`).join('')}</div>
      <button class="btn" type="submit">Добавить</button>
      <button class="btn ghost" type="button" data-act="close">Отмена</button></form>`);
  }

  // --- дела ---
  function taskRow(t) {
    const late = !t.done && t.due && t.due < Date.now();
    return `<li class="task ${t.done ? 'done' : ''}">
      <button class="check" data-toggle="${t.id}" aria-label="${t.done ? 'Вернуть' : 'Выполнено'}: ${esc(t.title)}" aria-pressed="${!!t.done}"></button>
      <button class="task-body" data-edit="${t.id}"><span class="tt">${esc(t.title)}</span>
        <span class="meta">${t.due ? `<span class="${late ? 'late' : ''}">${dueLabel(t)}</span>` : ''}${t.repeat && t.repeat !== 'none' ? `<span>${ICON.repeat} ${REPEATS[t.repeat].toLowerCase()}</span>` : ''}${t.from === 'admin' ? `<span class="from">${ICON.heart} ${esc(fromName())}</span>` : ''}${t.note ? '<span>есть заметка</span>' : ''}</span></button></li>`;
  }
  function tasksView() {
    const live = liveTasks(), now = Date.now(), today = dkey();
    const open = live.filter(t => !t.done);
    const groups = [
      ['Просрочено', open.filter(t => t.due && t.due < now && dkey(new Date(t.due)) < today)],
      ['Сегодня', open.filter(t => t.due && dkey(new Date(t.due)) === today)],
      ['Позже', open.filter(t => t.due && dkey(new Date(t.due)) > today)],
      ['Без срока', open.filter(t => !t.due)]
    ];
    const done = live.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 15);
    const whenChips = [['none', 'Без срока'], ['tonight', 'Сегодня в 19:00'], ['morning', 'Завтра в 9:00'], ['custom', 'Своё время']];
    return `
      <header class="topbar"><h1>Дела</h1><span class="chip num">${open.length} ${plural(open.length, ['дело', 'дела', 'дел'])}</span></header>
      <form class="card" data-form="task">
        <div class="custom-row"><input class="input" id="task-title" maxlength="120" placeholder="Новое дело" autocomplete="off" aria-label="Новое дело"><button class="btn small" type="submit">Добавить</button></div>
        <div class="chips">${whenChips.map(([v, l]) => `<button type="button" class="chipbtn" data-when="${v}" aria-pressed="${taskWhen === v}">${l}</button>`).join('')}</div>
        ${taskWhen === 'custom' ? `<input class="input" id="task-when" type="datetime-local" value="${esc(taskCustom)}" aria-label="Когда напомнить">` : ''}
        <p class="hint">${taskWhen === 'none' ? 'Без напоминания. Время можно поставить потом, нажав на дело.' : 'В это время придёт уведомление.'}</p>
      </form>
      ${groups.filter(([, l]) => l.length).map(([name, l]) => `<section class="tgroup"><p class="label ${name === 'Просрочено' ? 'late' : ''}">${name}</p>
        <ul class="tasks">${l.sort((a, b) => (a.due || a.createdAt || 0) - (b.due || b.createdAt || 0)).map(taskRow).join('')}</ul></section>`).join('')}
      ${!open.length ? `<div class="empty-state">${petSvg('goal')}<p>Все дела сделаны. ${esc(S.settings.petName)} доволен.</p></div>` : ''}
      ${done.length ? `<details class="tgroup"><summary class="label">Выполнено · ${done.length}</summary><ul class="tasks">${done.map(taskRow).join('')}</ul></details>` : ''}`;
  }
  const toLocalInput = ms => { const d = new Date(ms); return `${dkey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  function openTaskSheet(id) {
    const t = S.tasks.find(x => x.id === id);
    if (!t) return;
    sheet = { type: 'task', id, repeat: t.repeat || 'none', del: false };
    renderTaskSheet();
  }
  function renderTaskSheet(keep) {
    const t = S.tasks.find(x => x.id === sheet.id);
    const v = keep || { title: t.title, note: t.note || '', due: t.due ? toLocalInput(t.due) : '' };
    showModal(`<form class="sheet" data-form="taskedit" role="dialog" aria-label="Дело">
      ${t.from === 'admin' ? `<p class="from">${ICON.heart} Это дело для тебя · ${esc(fromName())}</p>` : ''}
      <div class="field"><label for="te-title">Что сделать</label><input class="input" id="te-title" maxlength="120" required value="${esc(v.title)}"></div>
      <div class="field"><label for="te-note">Заметка</label><textarea class="input" id="te-note" rows="3" maxlength="1000">${esc(v.note)}</textarea></div>
      <div class="field"><label for="te-due">Напомнить</label><div class="custom-row"><input class="input" id="te-due" type="datetime-local" value="${esc(v.due)}"><button type="button" class="btn soft small" data-act="te-nodue">Убрать</button></div></div>
      <div class="field"><span class="label">Повтор</span><div class="seg">${Object.keys(REPEATS).map(r => `<button type="button" data-repeat="${r}" aria-pressed="${sheet.repeat === r}">${REPEATS[r]}</button>`).join('')}</div>
        ${sheet.repeat !== 'none' ? '<p class="hint">Для повтора нужно время напоминания. Когда отметишь дело, оно переедет на следующий раз.</p>' : ''}</div>
      <button class="btn" type="submit">Сохранить</button>
      <button class="btn ghost" type="button" data-act="te-delete" style="${sheet.del ? 'background:var(--bad);color:#fff;box-shadow:none' : 'color:var(--bad);box-shadow:inset 0 0 0 2px var(--bad)'}">${sheet.del ? 'Точно удалить? Нажми ещё раз' : 'Удалить дело'}</button>
      <button class="btn ghost" type="button" data-act="close">Отмена</button></form>`);
  }
  const taskFormValues = () => ({ title: $('#te-title').value, note: $('#te-note').value, due: $('#te-due').value });
  function toggleTask(id) {
    const t = S.tasks.find(x => x.id === id);
    if (!t) return;
    const now = Date.now();
    if (t.done) { t.done = false; t.doneAt = null; }
    else if (t.repeat && t.repeat !== 'none' && t.due) {
      t.due = nextDue(t); t.lastDoneAt = now;
      toast(`Готово! Следующий раз: ${dueLabel(t)}`);
    } else { t.done = true; t.doneAt = now; toast('Готово!', 'Вернуть', () => toggleTask(id)); }
    t.updatedAt = now;
    save(); render(); sync();
  }

  // --- гардероб ---
  const unlocked = a => (a.days && goalDays() >= a.days) || S.gifts.some(g => g.id === a.id);
  function wardrobeView() {
    const L = levelInfo(), G = stageInfo(), away = awayInfo();
    return `
      <header class="topbar"><h1>${esc(S.settings.petName)}</h1><span class="chip num">${G.stars} ${ICON.star}</span></header>
      <section class="stage">${away ? `<div class="bubble note">Сейчас ${esc(S.settings.petName)} на поисках ${awayWhat(away)}. Чтобы вернуть, ${awayFix(away)}.</div><div class="pet-svg">${drawAway(away.water ? 'water' : 'food')}</div>` : `<div class="pet-svg">${petSvg('happy')}</div>`}
        <div class="petname"><b>${esc(G.name)}</b><span>${G.next ? `до следующей формы ${G.next - G.stars} ${ICON.star}` : 'самая большая форма'}</span></div></section>
      <section class="forms">${STAGES.map((st, i) => `<div class="form ${i === G.idx ? 'on' : i < G.idx ? 'past' : 'locked'}">${drawPet(S.settings.pet, 'happy', { stage: st })}<b>${esc(STAGE_NAMES[S.settings.pet][i])}</b><small>${i <= G.idx ? (i === G.idx ? 'сейчас' : 'пройдено') : `с ${STAGE_AT[i]} ${ICON.star}`}</small></div>`).join('')}</section>
      ${G.next ? `<div class="bar"><i style="width:${Math.round((G.stars - STAGE_AT[G.idx]) / (G.next - STAGE_AT[G.idx]) * 100)}%"></i></div>` : ''}
      <p class="hint">${ICON.star} за каждый день с нормой воды и ещё одна за каждый день, когда ты поела хотя бы на 80% нормы. Если 3 дня подряд не выполнять норму воды или еды, ${esc(S.settings.petName)} отправится их искать.</p>
      <h2 class="section-title">Гардероб</h2>
      <section class="wardrobe">${ACCESSORIES.map(a => {
        const open = unlocked(a), on = S.wear[a.slot] === a.id, gifted = S.gifts.some(g => g.id === a.id);
        const sub = open ? (on ? 'надето' : gifted ? 'подарок' : 'надеть') : a.gift ? 'только в подарок' : `через ${days(a.days - L.g)}`;
        return `<button class="acc ${open ? '' : 'locked'} ${gifted ? 'gifted' : ''}" data-acc="${a.id}" aria-pressed="${on}" ${open ? '' : 'aria-disabled="true"'}>
          <svg viewBox="${ACC_VIEW[a.id]}" aria-hidden="true">${ACC_SVG[a.id]}</svg><b>${a.name}</b><small>${sub}</small></button>`;
      }).join('')}</section>`;
  }

  // --- настройки ---
  function goalBlock(st) {
    const rec = recommended(st);
    return `
      <div class="field"><span class="label">Вес, кг</span>
        <div class="stepper"><button data-step="weight:-1" aria-label="Меньше">−</button><span class="v">${st.weight}</span><button data-step="weight:1" aria-label="Больше">+</button></div></div>
      <div class="field"><span class="label">Сколько двигаешься</span>
        <div class="seg">${[['low', 'Мало'], ['mid', 'Средне'], ['high', 'Спорт']].map(([v, l]) => `<button data-set="activity:${v}" aria-pressed="${st.activity === v}">${l}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Погода и кофе</span>
        <div class="seg"><button data-set="hot:0" aria-pressed="${!st.hot}">Как обычно</button><button data-set="hot:1" aria-pressed="${st.hot}">Жарко или много кофе</button></div></div>
      <div class="goal-big"><span class="label">Норма воды в день</span>
        <div class="stepper"><button data-step="goal:-100" aria-label="Меньше">−</button><span class="v">${fmt(st.goal)} мл</span><button data-step="goal:100" aria-label="Больше">+</button></div>
        <span class="hint">${st.goal === rec ? 'Посчитано: 30 мл на кг веса плюс активность и погода.' : `По расчёту ${fmt(rec)} мл. <button class="btn small soft" data-set="goalAuto:1">Вернуть расчёт</button>`}</span></div>`;
  }
  function foodBlock(st) {
    const rec = kcalRecommended(st);
    return `
      <div class="row2">
        <div class="field"><span class="label">Рост, см</span><div class="stepper sm"><button data-step="height:-1" aria-label="Меньше">−</button><span class="v">${st.height}</span><button data-step="height:1" aria-label="Больше">+</button></div></div>
        <div class="field"><span class="label">Возраст</span><div class="stepper sm"><button data-step="age:-1" aria-label="Меньше">−</button><span class="v">${st.age}</span><button data-step="age:1" aria-label="Больше">+</button></div></div>
      </div>
      <div class="goal-big food"><span class="label">Сколько нужно съесть в день</span>
        <div class="stepper"><button data-step="kcalGoal:-50" aria-label="Меньше">−</button><span class="v">${fmt(st.kcalGoal)} ккал</span><button data-step="kcalGoal:50" aria-label="Больше">+</button></div>
        <span class="hint">${st.kcalGoal === rec ? 'Посчитано по росту, весу, возрасту и активности. Это норма, чтобы были силы, а не диета.' : `По расчёту ${fmt(rec)} ккал. <button class="btn small soft" data-set="kcalAuto:1">Вернуть расчёт</button>`}</span></div>`;
  }
  function mealBlock(st) {
    return `<div class="setrow"><span>Напоминать поесть</span><div class="seg tight"><button data-set="mealsOn:1" aria-pressed="${st.mealsOn}">Да</button><button data-set="mealsOn:0" aria-pressed="${!st.mealsOn}">Нет</button></div></div>
      ${st.mealsOn ? `<div class="row3">${['breakfast', 'lunch', 'dinner'].map(m => `<div class="field"><label for="meal-${m}">${MEALS[m]}</label><input class="input" id="meal-${m}" type="time" data-mealtime="${m}" value="${st.meals[m]}"></div>`).join('')}</div>
      <p class="hint">Если к этому времени приём пищи не отмечен, ${esc(st.petName || 'питомец')} проголодается и напомнит.</p>` : ''}`;
  }
  function waterHoursBlock(st) {
    const hours = []; for (let h = 8; h <= 22; h++) hours.push(h);
    return `<div class="field"><span class="label">Напоминать о воде в</span>
      <div class="hours">${hours.map(h => `<button data-hour="${h}" aria-pressed="${st.waterHours.includes(h)}">${h}:00</button>`).join('')}</div>
      <p class="hint">Уведомление приходит, только если ты отстаёшь от нормы к этому часу. Выбрано: ${st.waterHours.length}.</p></div>`;
  }
  function settingsView() {
    const st = S.settings, ns = notifStatus();
    return `
      <header class="topbar"><h1>Настройки</h1></header>
      <section class="card"><h2 class="section-title">Питомец</h2>
        <div class="field"><label for="set-name">Имя</label><input class="input" id="set-name" data-input="petName" maxlength="20" value="${esc(st.petName)}"></div>
        <div class="pick-grid">${Object.keys(PETS).map(k => `<button class="pick-pet" data-set="pet:${k}" aria-pressed="${st.pet === k}">${drawPet(k, 'happy', { stage: stageInfo().stage })}<b>${PETS[k].name}</b></button>`).join('')}</div>
      </section>
      <section class="card"><h2 class="section-title">Вода</h2>${goalBlock(st)}${waterHoursBlock(st)}
        <div class="field"><span class="label">Питомец грустит, если не пила</span>
          <div class="seg">${[[60, '1 ч'], [90, '1,5 ч'], [120, '2 ч'], [180, '3 ч']].map(([v, l]) => `<button data-set="interval:${v}" aria-pressed="${st.interval === v}">${l}</button>`).join('')}</div></div></section>
      <section class="card"><h2 class="section-title">Еда</h2>${foodBlock(st)}${mealBlock(st)}</section>
      <section class="card"><h2 class="section-title">Кнопки стаканов, мл</h2>
        <div class="row2">${st.cups.map((ml, i) => `<input class="input num" id="set-cup-${i}" type="number" inputmode="numeric" min="50" max="1500" data-cup="${i}" value="${ml}" aria-label="Стакан ${i + 1}, мл">`).join('')}</div></section>
      <section class="card"><h2 class="section-title">Сон и уведомления</h2>
        <div class="row2">
          <div class="field"><label for="set-sleep">Ложусь</label><input class="input" id="set-sleep" type="time" data-input="sleepStart" value="${st.sleepStart}"></div>
          <div class="field"><label for="set-wake">Встаю</label><input class="input" id="set-wake" type="time" data-input="sleepEnd" value="${st.sleepEnd}"></div>
        </div>
        <p class="hint">Ночью напоминаний о воде и еде нет. Напоминания о делах приходят в то время, которое ты поставила.</p>
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
    const st = S.settings, N = 7;
    const dots = `<div class="dots">${Array.from({ length: N }, (_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
    const back = step > 0 ? `<button class="btn ghost" data-ob="back">Назад</button>` : '';
    let body = '', next = `<button class="btn" data-ob="next">Дальше</button>`;
    if (step === 0) {
      body = `<div class="pick-grid" aria-hidden="true">${Object.keys(PETS).map(k => `<div>${drawPet(k, 'happy')}</div>`).join('')}</div>
        <h1>Привет, Лера!</h1>
        <p>Это приложение сделано специально для тебя. Здесь будет жить маленький друг. Ему, как и тебе, нужны вода и еда: пока ты о себе заботишься, он счастлив, а если забываешь, ему становится плохо.</p>`;
      next = `<button class="btn" data-ob="next">Познакомиться</button>`;
    } else if (step === 1) {
      body = `<h1>Кто будет жить с тобой?</h1>
        <div class="pick-grid">${Object.keys(PETS).map(k => `<button class="pick-pet" data-obpet="${k}" aria-pressed="${st.pet === k}">${drawPet(k, st.pet === k ? 'goal' : 'happy', { stage: 'baby' })}<b>${PETS[k].name}</b><small>${PETS[k].trait}</small></button>`).join('')}</div>`;
      next = `<button class="btn" data-ob="next" ${st.pet ? '' : 'disabled'}>Дальше</button>`;
    } else if (step === 2) {
      body = `<div class="hero-pet">${drawPet(st.pet, 'happy')}</div>
        <h1>Как зовут малыша?</h1>
        <input class="input" id="ob-name" data-input="petName" maxlength="20" placeholder="Имя питомца" value="${esc(st.petName)}" autocomplete="off">
        <div class="seg">${NAME_IDEAS[st.pet].map(n => `<button data-name="${n}" aria-pressed="${st.petName === n}">${n}</button>`).join('')}</div>`;
      next = `<button class="btn" data-ob="next" id="ob-name-next" ${st.petName.trim() ? '' : 'disabled'}>Дальше</button>`;
    } else if (step === 3) {
      body = `<h1>Сколько воды тебе нужно?</h1><p class="muted">Ответь на три вопроса, и я посчитаю норму. Её всегда можно поменять.</p>${goalBlock(st)}`;
    } else if (step === 4) {
      body = `<div class="hero-pet">${drawPet(st.pet, 'hungry')}</div>
        <h1>И про еду</h1><p class="muted">${esc(st.petName)} будет следить, чтобы ты не забывала поесть. Нужны рост и возраст, чтобы посчитать, сколько тебе нужно.</p>${foodBlock(st)}`;
    } else if (step === 5) {
      body = `<div class="hero-pet">${drawPet(st.pet, 'sleeping')}</div>
        <h1>Когда ты спишь?</h1><p class="muted">В это время ${esc(st.petName)} тоже спит и не будет тебя беспокоить.</p>
        <div class="row2">
          <div class="field"><label for="ob-sleep">Ложусь</label><input class="input" id="ob-sleep" type="time" data-input="sleepStart" value="${st.sleepStart}"></div>
          <div class="field"><label for="ob-wake">Встаю</label><input class="input" id="ob-wake" type="time" data-input="sleepEnd" value="${st.sleepEnd}"></div>
        </div>${mealBlock(st)}`;
    } else {
      body = `<div class="hero-pet">${drawPet(st.pet, 'headache')}</div>
        <h1>Разреши ${esc(st.petName)} жаловаться</h1>
        <p class="muted">Если ты отстаёшь от нормы воды или пропускаешь еду, ${esc(st.petName)} пришлёт уведомление. А ещё напомнит о делах. Когда норма воды выполнена, откроется письмо.</p>`;
      next = `<button class="btn" data-ob="push">Включить уведомления</button><button class="btn ghost" data-ob="finish">Позже</button>`;
    }
    return `<div class="ob">${dots}<div class="grow">${body}</div><div class="actions">${next}${back}</div></div>`;
  }
  function finishOnboarding() {
    S.onboarded = true; S.v = VERSION; S.trackFrom = dkey(); S.seenStage = 0; save(); sync(); tab = 'home'; render();
  }
  function whatsNew() {
    sheet = { type: 'news' };
    if ((S.v || 1) >= 2) {
      const G = stageInfo();
      showModal(`<div class="sheet" role="dialog" aria-label="Что нового">
        <div class="forms">${STAGES.map(st => drawPet(S.settings.pet, 'happy', { stage: st })).join('')}</div>
        <h2>${esc(S.settings.petName)} теперь растёт</h2>
        <ul class="steps">
          <li><b>Три формы:</b> ${esc(STAGE_NAMES[S.settings.pet].join(', ').toLowerCase())}. За каждый день с нормой воды и за каждый день, когда ты нормально поела, даётся ${ICON.star}. С ${STAGE_AT[1]} ${ICON.star} юная форма, с ${STAGE_AT[2]} взрослая. У тебя уже ${G.stars}.</li>
          <li><b>Не забывай о себе.</b> Если 3 дня подряд не выполнять норму воды или еды, ${esc(S.settings.petName)} отправится их искать. Чтобы вернуть, выполни эту норму за один день.</li>
          <li><b>Записи за прошлые дни.</b> Забыла отметить вчера? На главной и в еде можно выбрать вчера, позавчера или другой день.</li>
        </ul>
        <button class="btn" data-act="news-ok">Понятно</button></div>`);
      return;
    }
    showModal(`<div class="sheet" role="dialog" aria-label="Что нового">
      <div class="hero-pet small">${petSvg('hungry')}</div>
      <h2>В Глотке теперь есть еда и дела</h2>
      <ul class="steps">
        <li><b>Еда.</b> Ищешь блюдо, вводишь граммы, калории считаются сами. ${esc(S.settings.petName)} проголодается, если ты пропустишь завтрак, обед или ужин.</li>
        <li><b>Дела.</b> Простой список с напоминаниями и повтором.</li>
        <li><b>Вода.</b> Напоминаний стало меньше: только в выбранные часы и только если отстаёшь.</li>
      </ul>
      <p class="muted">Чтобы посчитать, сколько тебе нужно есть, укажи рост и возраст.</p>
      ${foodBlock(S.settings)}
      <button class="btn" data-act="news-ok">Понятно</button></div>`);
  }

  // ---------- рост и побег: показываем один раз ----------
  function checkEvents() {
    if (!S.onboarded || sheet || (S.v || 1) < VERSION) return;
    const G = stageInfo(), away = awayInfo(), name = esc(S.settings.petName);
    let html = '';
    if (away && !S.away) {
      S.away = away;
      html = `<div class="pet-svg">${drawAway(away.water ? 'water' : 'food')}</div><h2>${name} отправляется на поиски ${awayWhat(away)}</h2>
        <p>Три дня подряд норма ${awayWhat(away)} не выполнялась. Чтобы вернуть ${name} домой, ${awayFix(away)}.</p>`;
    } else if (!away && S.away) {
      S.away = null;
      html = `<div class="pet-svg">${petSvg('goal')}</div><h2>${name} снова дома!</h2><p>Спасибо, что позаботилась о себе. Постарайся не пропускать воду и еду.</p>`;
    } else if (G.idx > (S.seenStage || 0)) {
      S.seenStage = G.idx;
      html = `<div class="forms two">${drawPet(S.settings.pet, 'happy', { stage: STAGES[G.idx - 1], wear: S.wear })}${drawPet(S.settings.pet, 'goal', { stage: G.stage, wear: S.wear })}</div>
        <h2>${name} подрастает!</h2><p>Новая форма: <b>${esc(G.name.toLowerCase())}</b>. Это всё благодаря тому, что ты пьёшь воду и нормально ешь.</p>`;
    } else if (G.idx < (S.seenStage || 0)) S.seenStage = G.idx;
    if (!html) { save(); return; }
    save(); sync();
    sheet = { type: 'event' };
    showModal(`<div class="sheet event" role="dialog">${html}<button class="btn" data-act="close">Хорошо</button></div>`);
  }

  // ---------- события ----------
  function applySet(key, val) {
    const st = S.settings;
    if (key === 'activity') setS('activity', val);
    else if (key === 'hot') setS('hot', val === '1');
    else if (key === 'interval') setS('interval', +val);
    else if (key === 'pet') setS('pet', val);
    else if (key === 'goalAuto') setS('goalAuto', true);
    else if (key === 'kcalAuto') setS('kcalAuto', true);
    else if (key === 'mealsOn') setS('mealsOn', val === '1');
    if (st.goalAuto && ['activity', 'hot', 'goalAuto'].includes(key)) setS('goal', recommended());
    if (st.kcalAuto && ['activity', 'kcalAuto'].includes(key)) setS('kcalGoal', kcalRecommended());
    afterSettings();
  }
  function applyStep(key, delta) {
    const st = S.settings;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    if (key === 'weight') setS('weight', clamp(st.weight + delta, 35, 160));
    if (key === 'height') setS('height', clamp(st.height + delta, 130, 210));
    if (key === 'age') setS('age', clamp(st.age + delta, 12, 90));
    if (key === 'goal') { setS('goal', clamp(st.goal + delta, 800, 5000)); setS('goalAuto', st.goal === recommended()); }
    if (key === 'kcalGoal') { setS('kcalGoal', clamp(st.kcalGoal + delta, 1000, 4500)); setS('kcalAuto', st.kcalGoal === kcalRecommended()); }
    if (key === 'weight' && st.goalAuto) setS('goal', recommended());
    if (['weight', 'height', 'age'].includes(key) && st.kcalAuto) setS('kcalGoal', kcalRecommended());
    afterSettings();
  }
  function afterSettings() {
    const d = dkey();
    if (S.goals[d]) S.goals[d] = S.settings.goal;
    save(); if (S.onboarded) sync();
    if (sheet && sheet.type === 'news') whatsNew(); else render();
  }
  function addTask(title) {
    title = title.trim();
    if (!title) return;
    let due = null;
    const d = new Date();
    if (taskWhen === 'tonight') { d.setHours(19, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); due = d.getTime(); }
    if (taskWhen === 'morning') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); due = d.getTime(); }
    if (taskWhen === 'custom') { const v = $('#task-when')?.value; if (v) due = new Date(v).getTime(); }
    const now = Date.now();
    S.tasks.push({ id: uid(), title: title.slice(0, 120), note: '', due, repeat: 'none', done: false, from: 'lera', createdAt: now, updatedAt: now });
    taskWhen = 'none'; taskCustom = '';
    save(); render(); sync();
    setTimeout(() => $('#task-title')?.focus(), 30);
  }

  document.addEventListener('click', async e => {
    const b = e.target.closest('button, [data-act]');
    if (!b) { if (e.target.id === 'modal') closeModal(); return; }
    const ds = b.dataset;
    if (ds.toast) { $('#toast').hidden = true; toastAction && toastAction(); return; }
    if (ds.day != null) { const k = dayBefore(+ds.day); viewDay = k === dkey() ? null : k; render(); return; }
    if (ds.tab) { tab = ds.tab; resetArmed = false; showCustom = false; render(); window.scrollTo(0, 0); return; }
    if (ds.add) { addDrink(+ds.add); return; }
    if (ds.del) { const t = +ds.del; removeDrink(dkey(new Date(t)), t); return; }
    if (ds.delfood) { const t = +ds.delfood; removeFood(dkey(new Date(t)), t); return; }
    if (ds.set) { const [k, v] = ds.set.split(':'); applySet(k, v); return; }
    if (ds.step) { const [k, v] = ds.step.split(':'); applyStep(k, +v); return; }
    if (ds.hour) {
      const h = +ds.hour, list = S.settings.waterHours;
      setS('waterHours', list.includes(h) ? list.filter(x => x !== h) : [...list, h].sort((a, c) => a - c));
      afterSettings(); return;
    }
    if (ds.name) { setS('petName', ds.name); save(); render(); return; }
    if (ds.obpet) {
      if (S.settings.pet !== ds.obpet) setS('petName', '');
      setS('pet', ds.obpet); save(); render(); return;
    }
    if (ds.acc) {
      const a = ACCESSORIES.find(x => x.id === ds.acc);
      if (!unlocked(a)) { toast(a.gift ? `${a.name} бывает только в подарок.` : `${a.name} откроется, когда наберётся ${days(a.days)} с нормой воды.`); return; }
      S.wear[a.slot] = S.wear[a.slot] === a.id ? null : a.id; save(); sync(); render(); return;
    }
    if (ds.cat) { foodCat = foodCat === ds.cat ? '' : ds.cat; $('#food-results').innerHTML = foodResults(); return; }
    if (ds.food) { openFoodSheet(ds.food); return; }
    if (ds.meal && sheet) {
      sheet.meal = ds.meal;
      document.querySelectorAll('[data-meal]').forEach(x => x.setAttribute('aria-pressed', x.dataset.meal === ds.meal));
      return;
    }
    if (ds.grams && sheet) { sheet.g = +ds.grams; $('#fg').value = sheet.g; updateFoodKcal(); return; }
    if (ds.gstep && sheet) {
      const g = +$('#fg').value || 0, st = g < 50 ? 5 : g < 300 ? 10 : 50;
      sheet.g = Math.max(1, Math.round((g + st * +ds.gstep) / st) * st); $('#fg').value = sheet.g; updateFoodKcal(); return;
    }
    if (ds.cmode && sheet) {
      const keep = { name: $('#cf-name').value, kcal: $('#cf-kcal')?.value, g: $('#cf-g')?.value, total: $('#cf-total')?.value };
      sheet.mode = ds.cmode; renderCustomSheet(keep); return;
    }
    if (ds.when) {
      taskWhen = ds.when;
      if (taskWhen === 'custom' && !taskCustom) { const d = new Date(Date.now() + 36e5); d.setMinutes(0); taskCustom = toLocalInput(d.getTime()); }
      const title = $('#task-title').value; render(); $('#task-title').value = title; return;
    }
    if (ds.toggle) { toggleTask(ds.toggle); return; }
    if (ds.edit) { openTaskSheet(ds.edit); return; }
    if (ds.repeat && sheet) { const keep = taskFormValues(); sheet.repeat = ds.repeat; renderTaskSheet(keep); return; }
    if (ds.ob) {
      if (ds.ob === 'next') { step = Math.min(6, step + 1); render(); window.scrollTo(0, 0); }
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
      case 'food-custom': openCustomSheet(); break;
      case 'news-ok': S.v = VERSION; save(); sync(); closeModal(); render(); checkEvents(); break;
      case 'gift-close': closeModal(); break;
      case 'gift-wear': {
        const a = ACCESSORIES.find(x => x.id === sheet.g.id);
        S.wear[a.slot] = a.id; closeModal(); save(); sync(); tab = 'wardrobe'; render(); break;
      }
      case 'te-nodue': $('#te-due').value = ''; break;
      case 'te-delete': {
        if (!sheet.del) { const keep = taskFormValues(); sheet.del = true; renderTaskSheet(keep); break; }
        const t = S.tasks.find(x => x.id === sheet.id);
        if (t) { t.deleted = true; t.updatedAt = Date.now(); }
        closeModal(); save(); render(); sync(); toast('Дело удалено'); break;
      }
      case 'push': if (await enablePush()) toast('Готово! Теперь ' + S.settings.petName + ' сможет напоминать.'); render(); break;
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

  function updateFoodKcal() {
    const g = +$('#fg').value || 0; sheet.g = g;
    $('#fk').textContent = fmt(sheet.f.kcal * g / 100);
  }
  document.addEventListener('input', e => {
    const el = e.target, k = el.dataset.input;
    if (k === 'petName') {
      S.settings.petName = el.value.slice(0, 20); S.settingsAt.petName = Date.now(); save();
      const nb = $('#ob-name-next'); if (nb) nb.disabled = !S.settings.petName.trim();
    }
    if (el.id === 'food-q') { foodQuery = el.value; $('#food-results').innerHTML = foodResults(); }
    if (el.id === 'fg') updateFoodKcal();
    if (el.id === 'task-when') taskCustom = el.value;
  });
  document.addEventListener('change', e => {
    const el = e.target, k = el.dataset.input;
    if (k === 'petName') { if (S.onboarded) sync(); return; }
    if (el.id === 'day-pick') { const v = el.value; if (v && v <= dkey() && v >= dayBefore(14)) { viewDay = v === dkey() ? null : v; render(); } return; }
    if (k === 'sleepStart' || k === 'sleepEnd') { if (el.value) { setS(k, el.value); save(); if (S.onboarded) sync(); } return; }
    if (el.dataset.mealtime) { if (el.value) { setS('meals', { ...S.settings.meals, [el.dataset.mealtime]: el.value }); save(); if (S.onboarded) sync(); } return; }
    if (el.dataset.cup != null) {
      const v = Math.round(+el.value);
      if (v >= 50 && v <= 1500) { const c = [...S.settings.cups]; c[+el.dataset.cup] = v; setS('cups', c); save(); sync(); }
      else { el.value = S.settings.cups[+el.dataset.cup]; toast('Объём стакана: от 50 до 1500 мл.'); }
    }
  });
  document.addEventListener('submit', e => {
    const f = e.target.dataset.form;
    if (!f) return;
    e.preventDefault();
    if (f === 'custom') { const v = +$('#custom-ml').value; if (v > 0) { showCustom = false; addDrink(v); } }
    if (f === 'task') addTask($('#task-title').value);
    if (f === 'food') {
      const g = +$('#fg').value;
      if (!(g > 0 && g <= 3000)) { toast('Укажи вес от 1 до 3000 г.'); return; }
      addFood({ name: sheet.f.name, g: Math.round(g), kcal: Math.round(sheet.f.kcal * g / 100), meal: sheet.meal }, true);
    }
    if (f === 'customfood') {
      const name = $('#cf-name').value.trim().slice(0, 60);
      if (!name) return;
      if (sheet.mode === 'per100') {
        const kcal = Math.round(+$('#cf-kcal').value), g = Math.round(+$('#cf-g').value);
        if (!(kcal >= 0 && g > 0)) { toast('Заполни калорийность и вес.'); return; }
        const i = S.customFoods.findIndex(x => norm(x.name) === norm(name));
        const item = { name, kcal, g, portion: 'порция' };
        if (i >= 0) S.customFoods[i] = item; else S.customFoods.push(item);
        addFood({ name, g, kcal: Math.round(kcal * g / 100), meal: sheet.meal }, true);
      } else {
        const kcal = Math.round(+$('#cf-total').value);
        if (!(kcal > 0)) { toast('Укажи, сколько всего калорий.'); return; }
        addFood({ name, g: 0, kcal, meal: sheet.meal }, false);
      }
    }
    if (f === 'taskedit') {
      const v = taskFormValues(), t = S.tasks.find(x => x.id === sheet.id);
      if (!v.title.trim()) return;
      const due = v.due ? new Date(v.due).getTime() : null;
      if (sheet.repeat !== 'none' && !due) { toast('Чтобы дело повторялось, поставь время напоминания.'); return; }
      Object.assign(t, { title: v.title.trim().slice(0, 120), note: v.note.slice(0, 1000), due, repeat: sheet.repeat, updatedAt: Date.now() });
      closeModal(); save(); render(); sync(); toast('Сохранено');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !S.onboarded) return;
    clearBadge();
    if (viewDay && !sheet) viewDay = null;
    if ((tab === 'home' || tab === 'tasks') && !sheet && !editing()) render();
    pushState();
    refreshSub();
  });
  setInterval(() => { if (S.onboarded && tab === 'home' && document.visibilityState === 'visible') updateStage(); }, 60000);

  // ---------- старт ----------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
    navigator.serviceWorker.addEventListener('message', ev => { if (ev.data?.type === 'push' && S.onboarded && tab === 'home') updateStage(); });
  }
  render();
  (async () => {
    if (!S.onboarded && await restore()) render();
    if (S.onboarded) {
      clearBadge();
      if ((S.v || 1) < VERSION) {
        if ((S.v || 1) < 2) S.settings.kcalGoal = kcalRecommended();
        if (!S.trackFrom) S.trackFrom = dkey();
        S.seenStage = 0; save();
        whatsNew();
      } else checkEvents();
      pushState();
      refreshSub();
      await fetchLetters();
    }
  })();
})();
