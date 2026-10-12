// Сервер Глотка: хранит данные, отправляет напоминания и отдаёт письма.
// Хранилище KV:
//   state             — данные приложения (настройки, вода, еда, дела, подписка на пуши)
//   notify            — служебное: какие напоминания уже отправлены
//   gifts             — подарки из гардероба [{gid, id, note, at}]
//   letter:YYYY-MM-DD — письмо на день
//   signature         — подпись под письмами

const PET_NAMES = { otter: 'Выдра', weasel: 'Ласка', dachshund: 'Такса', cat: 'Кошка' };
const ACC_NAMES = {
  bow: 'Бантик', scarf: 'Шарфик', glasses: 'Очки', hat: 'Шапочка', flowers: 'Венок', headphones: 'Наушники', crown: 'Корона',
  heart: 'Заколка-сердце', rose: 'Роза', bowtie: 'Бабочка', tiara: 'Диадема'
};

const WATER = {
  1: {
    otter: ['Лера, у меня пересохли усы. Выпьем по стаканчику?', 'Мы немного отстаём по воде. Может, водички?'],
    weasel: ['Лер, я хочу пить. Давай вместе по глоточку?', 'Чувствую себя сушёной лаской. Водички?'],
    dachshund: ['Лера, язык уже наружу. Водички?', 'Смотрю на тебя жалобными глазами. Попьём?'],
    cat: ['Моя миска пустая. Твой стакан, кажется, тоже.', 'Мяу. Это значит «вода». Перевожу.']
  },
  2: {
    otter: ['Голова начинает болеть… Мы сильно отстаём по воде. Налей стаканчик!', 'Лежу со льдом на голове. Лера, мне срочно надо попить.'],
    weasel: ['Ой, в висках стучит. Лера, мне срочно нужна вода!', 'Голова болит так, что даже вредничать не могу. Стаканчик?'],
    dachshund: ['Уши гудят, голова болит. Один стакан, и я снова виляю хвостом.', 'Хвост не виляет, голова тяжёлая. Воды бы…'],
    cat: ['Мрр… голова раскалывается. Даже обидеться сил нет. Попей воды.', 'Голова болит. Драматично падаю на диван. Нужна вода.']
  }
};
const MEAL_Q = { breakfast: 'Ты сегодня завтракала?', lunch: 'Ты пообедала?', dinner: 'Ты поужинала?' };
const HUNGRY = {
  otter: ['У меня уже урчит в животике. Покушай, пожалуйста!', 'Выдры едят много раз в день. Давай и ты!'],
  weasel: ['Я голодная, и ты наверняка тоже. Давай поедим чего-нибудь нормального!', 'Без еды я не прыгаю. Покушай, пожалуйста.'],
  dachshund: ['Я уже сижу у миски и жду. Пойдём кушать!', 'Таксы без еды грустят. Покорми нас обеих!'],
  cat: ['Я требую еды. И тебе тоже. Это не обсуждается.', 'Мяу. Время еды. Не заставляй меня скидывать вещи со стола.']
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Key, X-Admin-Key',
  'Access-Control-Max-Age': '86400'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const pick = list => list[Math.floor(Math.random() * list.length)];

// ---------- слияние изменений от Леры и из админки ----------
function mergeLWW(a = {}, aAt = {}, b = {}, bAt = {}) {
  const out = { ...a }, at = { ...aAt };
  for (const k of Object.keys(b)) if ((bAt[k] || 0) >= (aAt[k] || 0)) { out[k] = b[k]; at[k] = bAt[k] || aAt[k] || 0; }
  return { settings: out, settingsAt: at };
}
function mergeTasks(a = [], b = []) {
  const m = new Map(a.map(t => [t.id, t]));
  for (const t of b) { const o = m.get(t.id); if (!o || (t.updatedAt || 0) >= (o.updatedAt || 0)) m.set(t.id, t); }
  const now = Date.now();
  return [...m.values()].filter(t => !(t.deleted && now - t.updatedAt > 30 * 864e5) && !(t.done && now - (t.doneAt || 0) > 60 * 864e5));
}
const reply = async (env, state) => ({
  settings: state.settings, settingsAt: state.settingsAt || {}, tasks: state.tasks || [],
  gifts: (await env.KV.get('gifts', 'json')) || [], signature: (await env.KV.get('signature')) || ''
});

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const p = url.pathname;
    const isApp = req.headers.get('X-App-Key') === env.APP_KEY;
    const isAdmin = !!env.ADMIN_KEY && req.headers.get('X-Admin-Key') === env.ADMIN_KEY;

    try {
      if (p === '/') return json({ ok: true, name: 'glotok' });

      // --- приложение Леры ---
      if (p === '/state' || p === '/letters' || p === '/test') {
        if (!isApp) return json({ error: 'forbidden' }, 403);
        if (p === '/state' && req.method === 'GET') return json({ state: await env.KV.get('state', 'json') });
        if (p === '/state' && req.method === 'PUT') {
          const body = await req.json();
          const prev = (await env.KV.get('state', 'json')) || {};
          const m = mergeLWW(prev.settings, prev.settingsAt, body.settings, body.settingsAt);
          const state = { ...body, settings: m.settings, settingsAt: m.settingsAt, tasks: mergeTasks(prev.tasks, body.tasks) };
          // Подписку не затираем пустым значением: Safari и приложение с экрана «Домой» живут раздельно.
          if (!state.sub && prev.sub) state.sub = prev.sub;
          await env.KV.put('state', JSON.stringify(state));
          return json(await reply(env, state));
        }
        if (p === '/letters') {
          const today = url.searchParams.get('today') || '9999-12-31';
          return json({ letters: await lettersUpTo(env, today), signature: (await env.KV.get('signature')) || '' });
        }
        if (p === '/test' && req.method === 'POST') {
          const state = await env.KV.get('state', 'json');
          if (!state?.sub) return json({ error: 'no subscription' }, 400);
          const r = await sendPush(env, state.sub, { title: state.settings?.petName || 'Питомец', body: 'Привет, Лера! Я умею присылать уведомления. Не забывай пить воду и кушать!', tag: 'test' });
          return json({ ok: r.ok, status: r.status });
        }
      }

      // --- админка ---
      if (p.startsWith('/admin')) {
        if (!isAdmin) return json({ error: 'forbidden' }, 403);
        const state = (await env.KV.get('state', 'json')) || null;
        const saveState = s => env.KV.put('state', JSON.stringify(s));

        if (p === '/admin/overview' && req.method === 'GET') {
          return json({
            state: summary(state), letters: await lettersUpTo(env, '9999-12-31'),
            signature: (await env.KV.get('signature')) || '', gifts: (await env.KV.get('gifts', 'json')) || []
          });
        }
        if (p === '/admin/letter' && req.method === 'PUT') {
          const { date, text } = await req.json();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'bad date' }, 400);
          if (text && text.trim()) await env.KV.put('letter:' + date, text.slice(0, 4000));
          else await env.KV.delete('letter:' + date);
          return json({ ok: true });
        }
        if (p === '/admin/signature' && req.method === 'PUT') {
          const { signature } = await req.json();
          await env.KV.put('signature', String(signature || '').slice(0, 60));
          return json({ ok: true });
        }
        if (p === '/admin/nudge' && req.method === 'POST') {
          if (!state?.sub) return json({ error: 'no subscription' }, 400);
          const { text } = await req.json().catch(() => ({}));
          const r = await sendPush(env, state.sub, { title: state.settings?.petName || 'Питомец', body: text?.trim() || 'Лера, тебе передали: попей, пожалуйста, воды!', tag: 'nudge', badge: 1 });
          return json({ ok: r.ok, status: r.status });
        }
        if (!state) return json({ error: 'Лера ещё не открывала приложение' }, 400);

        if (p === '/admin/settings' && req.method === 'PUT') {
          const { settings } = await req.json();
          const allowed = ['goal', 'goalAuto', 'kcalGoal', 'kcalAuto', 'waterHours', 'mealsOn', 'meals', 'sleepStart', 'sleepEnd', 'interval'];
          const now = Date.now();
          state.settingsAt = state.settingsAt || {};
          for (const k of allowed) if (k in settings) { state.settings[k] = settings[k]; state.settingsAt[k] = now; }
          await saveState(state);
          return json({ ok: true, state: summary(state) });
        }
        if (p === '/admin/task' && req.method === 'PUT') {
          const { task } = await req.json();
          if (!task?.id || !task.title && !task.deleted) return json({ error: 'bad task' }, 400);
          const prev = (state.tasks || []).find(t => t.id === task.id);
          const t = { ...(prev || { from: 'admin', createdAt: Date.now(), done: false, repeat: 'none' }), ...task, updatedAt: Date.now() };
          state.tasks = mergeTasks(state.tasks, [t]);
          await saveState(state);
          return json({ ok: true, state: summary(state) });
        }
        if (p === '/admin/gift' && req.method === 'POST') {
          const { id, note, remove } = await req.json();
          if (!ACC_NAMES[id]) return json({ error: 'unknown item' }, 400);
          let gifts = (await env.KV.get('gifts', 'json')) || [];
          if (remove) gifts = gifts.filter(g => g.id !== id);
          else if (!gifts.some(g => g.id === id)) {
            gifts.push({ gid: id + '-' + Date.now().toString(36), id, note: String(note || '').slice(0, 300), at: Date.now() });
            if (state.sub) await deliver(env, state, { title: 'Тебе подарок!', body: `${state.settings?.petName || 'Питомец'} получает: ${ACC_NAMES[id]}. Загляни в приложение.`, tag: 'gift', badge: 1 });
          }
          await env.KV.put('gifts', JSON.stringify(gifts));
          return json({ ok: true, gifts });
        }
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkReminders(env));
  }
};

async function lettersUpTo(env, maxDate) {
  const out = {};
  let cursor;
  do {
    const list = await env.KV.list({ prefix: 'letter:', cursor });
    for (const k of list.keys) {
      const d = k.name.slice(7);
      if (d <= maxDate) out[d] = await env.KV.get(k.name);
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return out;
}

// ---------- время ----------
function localNow(tz, date = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(date).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute };
}
const toMin = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
function inQuiet(min, st) {
  const a = toMin(st.sleepStart), b = toMin(st.sleepEnd);
  if (a === b) return false;
  return a < b ? (min >= a && min < b) : (min >= a || min < b);
}
const sum = (list, f) => (list || []).reduce((a, x) => a + (x[f] || 0), 0);

// Звёздочки, форма питомца и побег (та же логика, что в приложении).
const STAGE_NAMES = ['малыш', 'юная форма', 'взрослая форма'];
function petStatus(state) {
  const st = state.settings || {};
  const wMet = d => sum(state.logs?.[d], 'ml') >= (state.goals?.[d] || st.goal || 2000);
  const fMet = d => sum(state.food?.[d], 'kcal') >= 0.8 * (st.kcalGoal || 1800);
  let stars = 0;
  for (const d of new Set([...Object.keys(state.logs || {}), ...Object.keys(state.food || {})])) { if (wMet(d)) stars++; if (fMet(d)) stars++; }
  const idx = stars >= 30 ? 2 : stars >= 10 ? 1 : 0;
  let away = null;
  if (state.trackFrom) {
    const today = localNow(state.tz).date;
    const missed = f => {
      for (let i = 1; i <= 3; i++) { const d = localNow(state.tz, new Date(Date.now() - i * 864e5)).date; if (d < state.trackFrom || f(d)) return false; }
      return !f(today);
    };
    const water = missed(wMet), food = missed(fMet);
    if (water || food) away = { water, food };
  }
  return { stars, stage: STAGE_NAMES[idx], stageKey: ['baby', 'young', 'adult'][idx], away };
}
const awayWhat = a => a.water && a.food ? 'воды и еды' : a.water ? 'воды' : 'еды';
const awayFix = a => a.water && a.food ? 'выпей сегодня норму воды и нормально поешь' : a.water ? 'выпей сегодня норму воды' : 'нормально поешь сегодня';

function summary(state) {
  if (!state) return null;
  const st = state.settings || {};
  const { date } = localNow(state.tz);
  let last = 0;
  for (const d in state.logs || {}) for (const x of state.logs[d]) last = Math.max(last, x.t);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = localNow(state.tz, new Date(Date.now() - i * 864e5)).date;
    days.push({ date: d, ml: sum(state.logs?.[d], 'ml'), goal: state.goals?.[d] || st.goal, kcal: sum(state.food?.[d], 'kcal') });
  }
  let level = 0;
  for (const d in state.logs || {}) if (sum(state.logs[d], 'ml') >= (state.goals?.[d] || st.goal)) level++;
  return {
    pet: st.pet, petName: st.petName, date, goal: state.goals?.[date] || st.goal, today: sum(state.logs?.[date], 'ml'), last,
    food: state.food?.[date] || [], kcalGoal: st.kcalGoal, days, goalDays: level, wear: state.wear || {},
    tasks: (state.tasks || []).filter(t => !t.deleted), notify: !!state.sub, tz: state.tz, pet2: petStatus(state),
    settings: {
      goal: st.goal, kcalGoal: st.kcalGoal, waterHours: st.waterHours || [11, 14, 17, 20], mealsOn: st.mealsOn !== false,
      meals: st.meals || { breakfast: '10:30', lunch: '14:30', dinner: '19:30' }, sleepStart: st.sleepStart, sleepEnd: st.sleepEnd, interval: st.interval
    }
  };
}

// ---------- напоминания (раз в 5 минут) ----------
async function checkReminders(env) {
  const state = await env.KV.get('state', 'json');
  if (!state?.sub || !state.settings) return;
  const st = state.settings;
  const now = Date.now();
  const { date, min } = localNow(state.tz);
  const pet = PET_NAMES[st.pet] ? st.pet : 'otter';
  const title = st.petName || PET_NAMES[pet];

  let n = (await env.KV.get('notify', 'json')) || {};
  if (n.date !== date) n = { date, water: [], meals: [], tasks: n.tasks || {} };
  n.tasks = n.tasks || {};
  const queue = [];

  // Дела: в назначенное время, даже ночью (время она ставит сама).
  for (const t of state.tasks || []) {
    if (t.deleted || t.done || !t.due || t.due > now || now - t.due > 6 * 36e5) continue;
    if (n.tasks[t.id] === t.due) continue;
    n.tasks[t.id] = t.due;
    queue.push({ title, body: `Напоминаю: ${t.title}`, tag: 'task-' + t.id, badge: 1 });
  }
  // Чистим старые отметки о делах.
  for (const id in n.tasks) if (now - n.tasks[id] > 7 * 864e5) delete n.tasks[id];

  if (!inQuiet(min, st)) {
    // Еда: если к назначенному времени приём пищи не отмечен.
    if (st.mealsOn !== false) {
      const meals = st.meals || { breakfast: '10:30', lunch: '14:30', dinner: '19:30' };
      const food = state.food?.[date] || [];
      for (const m of ['breakfast', 'lunch', 'dinner']) {
        const T = toMin(meals[m]);
        if (min < T || min >= T + 55 || n.meals.includes(m)) continue;
        n.meals.push(m);
        if (!food.some(x => x.meal === m)) queue.push({ title, body: `${MEAL_Q[m]} ${pick(HUNGRY[pet])}`, tag: 'meal', badge: 1 });
      }
    }
    // Вода: только в выбранные часы и только если отстаёт от нормы.
    const total = sum(state.logs?.[date], 'ml');
    const goal = state.goals?.[date] || st.goal || 2000;
    const wake = toMin(st.sleepEnd), sleep = toMin(st.sleepStart);
    const awake = ((sleep - wake + 1440) % 1440) || 1440;
    const away = petStatus(state).away;
    for (const h of st.waterHours || [11, 14, 17, 20]) {
      if (min < h * 60 || min >= h * 60 + 55 || n.water.includes(h)) continue;
      n.water.push(h);
      if (away && n.away !== date) {
        n.away = date;
        queue.push({ title, body: `${title} отправляется на поиски ${awayWhat(away)}. Чтобы вернуть, ${awayFix(away)}.`, tag: 'away', badge: 1 });
        continue;
      }
      if (total >= goal) continue;
      const expected = goal * Math.min(1, ((min - wake + 1440) % 1440) / awake);
      if (total < expected * 0.85) {
        const level = total < expected * 0.5 ? 2 : 1;
        queue.push({ title, body: pick(WATER[level][pet]), tag: 'thirst', badge: 1 });
      }
    }
  }

  await env.KV.put('notify', JSON.stringify(n));
  for (const msg of queue) await deliver(env, state, msg);
}

async function deliver(env, state, payload) {
  const r = await sendPush(env, state.sub, payload);
  if (r.status === 404 || r.status === 410) {
    // Подписка больше не действует (приложение удалили или отключили уведомления).
    const cur = await env.KV.get('state', 'json');
    if (cur && cur.sub?.endpoint === state.sub.endpoint) { cur.sub = null; await env.KV.put('state', JSON.stringify(cur)); }
  }
}

// ---------- Web Push (RFC 8291 + VAPID RFC 8292) ----------
const enc = new TextEncoder();
const b64u = {
  enc(buf) {
    let s = '';
    for (const x of new Uint8Array(buf)) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  }
};
function concat(...arrs) {
  const out = new Uint8Array(arrs.reduce((a, b) => a + b.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}
async function vapidHeader(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const head = b64u.enc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u.enc(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT })));
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body));
  return `vapid t=${head}.${body}.${b64u.enc(sig)}, k=${env.VAPID_PUBLIC}`;
}
async function encryptPayload(sub, text) {
  const uaPub = b64u.dec(sub.keys.p256dh);
  const auth = b64u.dec(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(enc.encode(text), new Uint8Array([2]))));
  const header = new Uint8Array(21 + asPub.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPub.length;
  header.set(asPub, 21);
  return concat(header, ct);
}
async function sendPush(env, sub, payload) {
  const body = await encryptPayload(sub, JSON.stringify(payload));
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(sub.endpoint, env),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '7200',
      Urgency: 'high'
    },
    body
  });
}
