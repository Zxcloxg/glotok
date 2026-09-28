// Сервер Глотка: хранит данные, отправляет напоминания и отдаёт письма.
// Хранилище KV:
//   state          — данные из приложения (настройки, записи, подписка на пуши)
//   notify         — служебное: что и когда уже отправили
//   letter:YYYY-MM-DD — письмо на день
//   signature      — подпись под письмами

const PET_NAMES = { otter: 'Выдра', weasel: 'Ласка', dachshund: 'Такса', cat: 'Кошка' };

const MESSAGES = {
  1: {
    otter: ['Лера, у меня пересохли усы. Выпьем по стаканчику?', 'Во рту как в пустыне. Может, водички?'],
    weasel: ['Лер, я хочу пить. Давай вместе по глоточку?', 'Чувствую себя сушёной лаской. Водички?'],
    dachshund: ['Лера, язык уже наружу. Водички?', 'Смотрю на тебя жалобными глазами. Попьём?'],
    cat: ['Моя миска пустая. Твой стакан, кажется, тоже.', 'Мяу. Это значит «вода». Перевожу.']
  },
  2: {
    otter: ['Голова начинает болеть… Выдрам без воды совсем плохо. Налей стаканчик!', 'Лежу со льдом на голове. Лера, мне срочно надо попить.'],
    weasel: ['Ой, в висках стучит. Лера, мне срочно нужна вода!', 'Голова болит так, что даже вредничать не могу. Стаканчик?'],
    dachshund: ['Уши гудят, голова болит. Один стакан, и я снова виляю хвостом.', 'Хвост не виляет, голова тяжёлая. Воды бы…'],
    cat: ['Мрр… голова раскалывается. Даже обидеться сил нет. Попей воды.', 'Голова болит. Драматично падаю на диван. Нужна вода.']
  },
  3: {
    otter: ['Лежу пластом с мокрым полотенцем на голове. Только вода меня спасёт!', 'Лера, я уже почти сушёная выдра. Стакан воды, срочно!'],
    weasel: ['Я уже лежу с грелкой на голове. Лера, ну пожалуйста, стакан воды!', 'Всё кружится… Лер, спаси меня стаканом воды!'],
    dachshund: ['Голова болит ужасно. Лежу на коврике и скулю. Спаси меня стаканом воды!', 'Лера, я очень-очень хочу пить. Правда. Один стакан!'],
    cat: ['Всё, я падаю в обморок. Драматично. Прямо на клавиатуру. Попей воды!', 'Я бы сбросила что-нибудь со стола, но сил нет. Воды!']
  },
  morning: {
    otter: ['Доброе утро, Лера! Начнём день со стакана воды?'],
    weasel: ['Доброе утро! Прыг-скок к стакану воды?'],
    dachshund: ['Доброе утро! Я уже проснулась и жду тебя со стаканом воды.'],
    cat: ['Утро. Я проснулась. Ты тоже. Значит, пора пить воду.']
  }
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Key, X-Admin-Key',
  'Access-Control-Max-Age': '86400'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const p = url.pathname;
    const isApp = req.headers.get('X-App-Key') === env.APP_KEY;
    const isAdmin = !!env.ADMIN_KEY && req.headers.get('X-Admin-Key') === env.ADMIN_KEY;

    try {
      if (p === '/' ) return json({ ok: true, name: 'glotok' });

      // --- приложение Леры ---
      if (p.startsWith('/state') || p === '/letters' || p === '/test') {
        if (!isApp) return json({ error: 'forbidden' }, 403);
        if (p === '/state' && req.method === 'GET') return json({ state: await env.KV.get('state', 'json') });
        if (p === '/state' && req.method === 'PUT') {
          const body = await req.json();
          const prev = (await env.KV.get('state', 'json')) || {};
          // Подписку не затираем пустым значением: Safari и приложение с экрана «Домой» живут раздельно.
          if (!body.sub && prev.sub) body.sub = prev.sub;
          await env.KV.put('state', JSON.stringify(body));
          return json({ ok: true });
        }
        if (p === '/letters') {
          const today = url.searchParams.get('today') || '9999-12-31';
          return json({ letters: await lettersUpTo(env, today), signature: (await env.KV.get('signature')) || '' });
        }
        if (p === '/test' && req.method === 'POST') {
          const state = await env.KV.get('state', 'json');
          if (!state?.sub) return json({ error: 'no subscription' }, 400);
          const name = state.settings?.petName || 'Питомец';
          const r = await sendPush(env, state.sub, { title: name, body: 'Привет, Лера! Я умею присылать уведомления. Не забывай пить воду!', tag: 'test' });
          return json({ ok: r.ok, status: r.status });
        }
      }

      // --- страница для писем ---
      if (p.startsWith('/admin')) {
        if (!isAdmin) return json({ error: 'forbidden' }, 403);
        if (p === '/admin/overview' && req.method === 'GET') {
          const state = await env.KV.get('state', 'json');
          const letters = await lettersUpTo(env, '9999-12-31');
          return json({ state: summary(state), letters, signature: (await env.KV.get('signature')) || '' });
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
          const state = await env.KV.get('state', 'json');
          if (!state?.sub) return json({ error: 'no subscription' }, 400);
          const { text } = await req.json().catch(() => ({}));
          const name = state.settings?.petName || 'Питомец';
          const r = await sendPush(env, state.sub, { title: name, body: text?.trim() || 'Лера, тебе передали: попей, пожалуйста, воды!', tag: 'nudge', badge: 1 });
          return json({ ok: r.ok, status: r.status });
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

function summary(state) {
  if (!state) return null;
  const st = state.settings || {};
  const { date } = localNow(state.tz);
  const today = (state.logs?.[date] || []).reduce((a, x) => a + x.ml, 0);
  let last = 0;
  for (const d in state.logs || {}) for (const x of state.logs[d]) last = Math.max(last, x.t);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = localNow(state.tz, new Date(Date.now() - i * 864e5)).date;
    days.push({ date: d, ml: (state.logs?.[d] || []).reduce((a, x) => a + x.ml, 0), goal: state.goals?.[d] || st.goal });
  }
  return { pet: st.pet, petName: st.petName, goal: state.goals?.[date] || st.goal, today, date, last, days, notify: !!state.sub, tz: state.tz };
}

// ---------- умные напоминания ----------
async function checkReminders(env) {
  const state = await env.KV.get('state', 'json');
  if (!state?.sub || !state.settings) return;
  const st = state.settings;
  const now = Date.now();
  const { date, min } = localNow(state.tz);
  if (inQuiet(min, st)) return;

  const todayLogs = state.logs?.[date] || [];
  const total = todayLogs.reduce((a, x) => a + x.ml, 0);
  const goal = state.goals?.[date] || st.goal || 2000;
  if (total >= goal) return;

  let last = 0;
  for (const d in state.logs || {}) for (const x of state.logs[d]) last = Math.max(last, x.t);
  const sinceWake = (min - toMin(st.sleepEnd) + 1440) % 1440;
  const wakeTs = now - sinceWake * 60000;
  const base = Math.max(last, wakeTs);
  const mins = (now - base) / 60000;
  const iv = st.interval || 90;

  let n = (await env.KV.get('notify', 'json')) || {};
  const pet = PET_NAMES[st.pet] ? st.pet : 'otter';
  const title = st.petName || PET_NAMES[pet];
  const pick = list => list[Math.floor(Math.random() * list.length)];

  // Утреннее «доброе утро», если ещё ничего не выпито.
  if (!todayLogs.length && sinceWake >= 20 && sinceWake < 60 && n.morning !== date) {
    n.morning = date;
    await env.KV.put('notify', JSON.stringify(n));
    await deliver(env, state, { title, body: pick(MESSAGES.morning[pet]), tag: 'thirst' });
    return;
  }

  const level = mins >= iv * 2.5 ? 3 : mins >= iv * 1.75 ? 2 : mins >= iv ? 1 : 0;
  if (!level) return;
  if (n.base !== base) n = { ...n, base, level: 0, at: 0, repeats: 0 };

  let send = false;
  if (level > n.level) send = true;
  else if (level === 3 && now - n.at >= iv * 60000 && (n.repeats || 0) < 3) { send = true; n.repeats = (n.repeats || 0) + 1; }
  if (!send) return;

  n.level = level; n.at = now;
  await env.KV.put('notify', JSON.stringify(n));
  await deliver(env, state, { title, body: pick(MESSAGES[level][pet]), tag: 'thirst', badge: level });
}

async function deliver(env, state, payload) {
  const r = await sendPush(env, state.sub, payload);
  if (r.status === 404 || r.status === 410) {
    // Подписка больше не действует (приложение удалили или отключили уведомления).
    state.sub = null;
    await env.KV.put('state', JSON.stringify(state));
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
