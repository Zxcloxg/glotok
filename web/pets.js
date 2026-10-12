// Рисунки питомцев (SVG), их реплики и аксессуары.
(function () {
  const PETS = {
    otter:     { name: 'Выдра', trait: 'живёт в воде, ей без неё никак', fur: '#8C5E3F', light: '#EAD0AE', dark: '#5E3B26', nose: '#2E1D14', inner: '#C99A78' },
    weasel:    { name: 'Ласка', trait: 'шустрая и немного вредная', fur: '#B8672F', light: '#FFF4E6', dark: '#8A4518', nose: '#3A2016', inner: '#E9A98A' },
    dachshund: { name: 'Такса', trait: 'длинная, верная, вечно голодная', fur: '#B8612C', light: '#E9B47E', dark: '#6E3413', nose: '#1F1512', inner: '#6E3413' },
    cat:       { name: 'Кошка', trait: 'делает вид, что ей всё равно', fur: '#F0A150', light: '#FFF3E3', dark: '#C9722A', nose: '#E88A8A', inner: '#F7B6B0' }
  };

  // Реплики. {n} заменяется на имя питомца.
  const LINES = {
    happy: {
      otter: ['Плаваю в счастье! Так держать.', 'Усы мокрые, настроение отличное.', 'Мы с тобой отличная команда.'],
      weasel: ['Шёрстка блестит, настроение прыгучее!', 'Я бодрая и шустрая. Спасибо тебе!', 'Прыг-скок! Всё хорошо.'],
      dachshund: ['Хвост крутится как пропеллер!', 'Я самая счастливая такса на свете.', 'Гулять? Пить? Всё хочу!'],
      cat: ['Мурчу. Всё идёт по плану.', 'Можешь меня погладить. Разрешаю.', 'Жизнь хороша, когда в миске вода.']
    },
    goal: {
      otter: ['Норма выполнена! Лера, ты чудо!', 'Мы сегодня молодцы. Плывём отдыхать.'],
      weasel: ['Норма есть! Я горжусь тобой, Лера!', 'Ура-ура! Можно и попрыгать.'],
      dachshund: ['Норма выполнена! Облизываю тебя в знак благодарности.', 'Лучшая хозяйка на свете!'],
      cat: ['Норма выполнена. Я довольна. Это редкость.', 'Мрр. Сегодня ты заслужила мурчание.']
    },
    thirsty: {
      otter: ['Во рту как в пустыне. Может, по стаканчику?', 'Усы подсыхают… Лера, водички?', 'Давно не плавали. Хоть стаканчик бы!'],
      weasel: ['Я бы не отказалась от глоточка. А ты?', 'Лер, пить хочется. Давай вместе?', 'Чувствую себя сушёной лаской.'],
      dachshund: ['Язык уже наружу. Водички, а?', 'Смотрю на тебя самыми жалобными глазами.', 'Пить хочу-у-у. Совсем чуть-чуть.'],
      cat: ['Моя миска пустая. Твоя, кажется, тоже.', 'Я не настаиваю. Но я очень хочу пить.', 'Мяу. Это означает «вода». Перевожу.']
    },
    headache: {
      otter: ['Голова раскалывается… Выдрам без воды совсем плохо!', 'Лежу со льдом на голове. Налей стаканчик, пожалуйста.', 'Всё кружится… Лера, мне срочно надо попить.'],
      weasel: ['Ой-ой, в висках стучит. Налей стаканчик, мне срочно надо.', 'Голова болит так, что даже вредничать не могу.', 'Лер, спаси. Один стакан воды, и я в порядке.'],
      dachshund: ['Уши гудят, голова болит. Один глоточек, и я снова виляю хвостом.', 'Хвост не виляет. Голова тяжёлая. Воды бы…', 'Лежу на коврике с больной головой. Попьём?'],
      cat: ['Мрр… голова тяжёлая, даже обидеться сил нет. Попей воды.', 'Голова болит. Драматично падаю на диван.', 'Я бы сбросила что-нибудь со стола, но сил нет. Нужна вода.']
    },
    drinking: {
      otter: ['Буль-буль-буль… ааах, хорошо!'],
      weasel: ['Глоть-глоть! Голова уже проходит.'],
      dachshund: ['Хлюп-хлюп-хлюп! Спасибо!'],
      cat: ['Лак-лак-лак. Ладно, признаю, было нужно.']
    },
    hungry: {
      otter: ['Животик урчит… Лера, ты сегодня кушала?', 'Выдры едят много раз в день. А ты?', 'Пахнет рыбкой… или мне кажется? Пора поесть!'],
      weasel: ['Я голодная как волк. Пойдём покушаем?', 'Лер, без еды я не прыгаю. И ты тоже.', 'Урчит в животе так, что слышно соседям.'],
      dachshund: ['Сижу у миски с самым грустным видом. Покушаем?', 'Пора кушать! Я даже хвостом виляю от голода.', 'Без еды у таксы кончается длина. Покорми нас!'],
      cat: ['Я требую еды. И тебе тоже. Это не обсуждается.', 'Мяу. Время еды прошло, а миска пуста.', 'Смотрю на холодильник. Ты тоже посмотри.']
    },
    sleeping: {
      otter: ['Сплю в обнимку с камушком. Доброй ночи, Лера.'],
      weasel: ['Сплю, свернувшись калачиком. Спокойной ночи!'],
      dachshund: ['Сплю и дёргаю лапками. Сладких снов!'],
      cat: ['Сплю. Не будить до утра. Мур.']
    }
  };

  // Аксессуары открываются за дни, когда норма выполнена.
  const ACCESSORIES = [
    { id: 'bow',        slot: 'head', name: 'Бантик',    days: 1 },
    { id: 'scarf',      slot: 'neck', name: 'Шарфик',    days: 3 },
    { id: 'glasses',    slot: 'face', name: 'Очки',      days: 5 },
    { id: 'hat',        slot: 'head', name: 'Шапочка',   days: 7 },
    { id: 'flowers',    slot: 'head', name: 'Венок',     days: 10 },
    { id: 'headphones', slot: 'head', name: 'Наушники',  days: 14 },
    { id: 'crown',      slot: 'head', name: 'Корона',    days: 30 },
    // Только в подарок из админки.
    { id: 'heart',      slot: 'head', name: 'Заколка-сердце', gift: true },
    { id: 'rose',       slot: 'head', name: 'Роза',       gift: true },
    { id: 'bowtie',     slot: 'neck', name: 'Бабочка',    gift: true },
    { id: 'tiara',      slot: 'head', name: 'Диадема',    gift: true }
  ];

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = n >> 8 & 255, b = n & 255;
    const t = amt > 0 ? 255 : 0, p = Math.abs(amt);
    r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function grad(id, c) {
    return `<radialGradient id="${id}" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="${shade(c, .38)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -.3)}"/></radialGradient>`;
  }

  const INK = '#1D1718';
  function eyes(state, es = 1) {
    const at = (x, inner) => `<g transform="translate(${x} 100) scale(${es})">${inner}</g>`;
    if (state === 'happy' || state === 'goal') {
      const e = `<circle r="10" fill="${INK}"/><circle cx="3.5" cy="-3.5" r="3.6" fill="#fff"/><circle cx="-3" cy="3.5" r="1.6" fill="#fff" opacity=".8"/>`;
      return `<g class="eyes">${at(74, e)}${at(126, e)}</g>`;
    }
    if (state === 'hungry') {
      const e = `<circle r="12" fill="${INK}"/><circle cx="4" cy="-4" r="4.6" fill="#fff"/><circle cx="-4" cy="4" r="2.4" fill="#fff"/><circle cx="5" cy="4" r="1.4" fill="#fff" opacity=".8"/>`;
      return `<g class="eyes">${at(74, e)}${at(126, e)}</g><path d="M62 84 L84 88 M138 84 L116 88" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    }
    if (state === 'thirsty') {
      const e = `<path d="M-10 0 A10 10 0 0 0 10 0 Z" fill="${INK}"/><circle cx="3" cy="3" r="2.2" fill="#fff"/><path d="M-11 -1 Q0 -4 11 -1" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      return at(74, e) + at(126, e);
    }
    if (state === 'headache') {
      const s = `stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
      return at(74, `<path d="M-7 -7 L6 0 L-7 7" ${s}/>`) + at(126, `<path d="M7 -7 L-6 0 L7 7" ${s}/>`);
    }
    const s = `stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"`;
    if (state === 'sleeping') return at(74, `<path d="M-9 -1 Q0 7 9 -1" ${s}/>`) + at(126, `<path d="M-9 -1 Q0 7 9 -1" ${s}/>`);
    return at(74, `<path d="M-9 3 Q0 -8 9 3" ${s}/>`) + at(126, `<path d="M-9 3 Q0 -8 9 3" ${s}/>`);
  }
  function mouth(state) {
    const ink = '#3A2420', s = `stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"`;
    if (state === 'happy') return `<path d="M88 124 Q94 132 100 124 Q106 132 112 124" ${s}/>`;
    if (state === 'goal') return `<path d="M88 123 Q100 140 112 123 Z" fill="${ink}"/><path d="M93 131 Q100 136 107 131" fill="#F07F8A"/>`;
    if (state === 'thirsty') return `<ellipse cx="100" cy="129" rx="7" ry="6" fill="${ink}"/><ellipse cx="100" cy="135" rx="5.5" ry="5" fill="#F07F8A"/>`;
    if (state === 'headache') return `<path d="M87 130 Q93 125 100 130 Q107 135 113 130" ${s}/>`;
    if (state === 'sleeping') return `<path d="M95 126 Q100 129 105 126" ${s}/>`;
    if (state === 'hungry') return `<path d="M90 126 Q100 136 110 126 Z" fill="${ink}"/><path d="M108 129 q3 8 0 11 q-3 -3 0 -11z" fill="#9ED8F2"/>`;
    return `<circle cx="100" cy="127" r="3.5" fill="${ink}"/>`;
  }
  function tail(k, P, u) {
    if (k === 'otter') return `<ellipse cx="150" cy="190" rx="32" ry="11" transform="rotate(-18 150 190)" fill="${u('dark')}"/>`;
    if (k === 'weasel') return `<path d="M128 186 Q170 184 168 138" stroke="${u('fur')}" stroke-width="15" fill="none" stroke-linecap="round"/><circle cx="168" cy="136" r="9" fill="${P.dark}"/>`;
    if (k === 'dachshund') return `<path d="M172 162 Q192 150 188 132" stroke="${u('fur')}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    return `<path d="M138 188 Q188 186 172 128" stroke="${u('fur')}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M178 150 l-12 -2 M176 138 l-11 1" stroke="${P.dark}" stroke-width="4" stroke-linecap="round"/>`;
  }
  function body(k, P, u) {
    if (k === 'dachshund') {
      return `<ellipse cx="122" cy="168" rx="62" ry="30" fill="${u('fur')}"/>
        <ellipse cx="116" cy="178" rx="40" ry="16" fill="${u('light')}" opacity=".8"/>
        ${[70, 92, 146, 168].map(x => `<ellipse cx="${x}" cy="196" rx="11" ry="8" fill="${u('dark')}"/>`).join('')}`;
    }
    const rx = k === 'weasel' ? 36 : 46, ry = k === 'weasel' ? 42 : 38;
    return `<ellipse cx="100" cy="164" rx="${rx}" ry="${ry}" fill="${u('fur')}"/>
      <ellipse cx="100" cy="172" rx="${rx - 18}" ry="${ry - 12}" fill="${u('light')}"/>
      <ellipse cx="80" cy="199" rx="14" ry="8" fill="${u('dark')}"/><ellipse cx="120" cy="199" rx="14" ry="8" fill="${u('dark')}"/>`;
  }
  function earsBack(k, P, u) {
    if (k === 'otter') return `<circle cx="50" cy="66" r="14" fill="${u('fur')}"/><circle cx="150" cy="66" r="14" fill="${u('fur')}"/><circle cx="52" cy="68" r="7" fill="${P.inner}"/><circle cx="148" cy="68" r="7" fill="${P.inner}"/>`;
    if (k === 'weasel') return `<circle cx="56" cy="54" r="15" fill="${u('fur')}"/><circle cx="144" cy="54" r="15" fill="${u('fur')}"/><circle cx="57" cy="56" r="8" fill="${P.inner}"/><circle cx="143" cy="56" r="8" fill="${P.inner}"/>`;
    if (k === 'cat') return `<path d="M48 72 L56 22 L90 50 Z" fill="${u('fur')}" stroke="${P.fur}" stroke-width="8" stroke-linejoin="round"/><path d="M152 72 L144 22 L110 50 Z" fill="${u('fur')}" stroke="${P.fur}" stroke-width="8" stroke-linejoin="round"/><path d="M58 60 L61 34 L80 50 Z" fill="${P.inner}"/><path d="M142 60 L139 34 L120 50 Z" fill="${P.inner}"/>`;
    return '';
  }
  function earsFront(k, P, u) {
    if (k !== 'dachshund') return '';
    return `<ellipse cx="44" cy="108" rx="17" ry="38" transform="rotate(14 44 108)" fill="${u('dark')}"/><ellipse cx="156" cy="108" rx="17" ry="38" transform="rotate(-14 156 108)" fill="${u('dark')}"/>`;
  }
  function face(k, P, u) {
    if (k === 'otter') return `<ellipse cx="100" cy="122" rx="36" ry="25" fill="${u('light')}"/>
      <g fill="${P.dark}" opacity=".55"><circle cx="84" cy="122" r="1.6"/><circle cx="80" cy="128" r="1.6"/><circle cx="86" cy="130" r="1.6"/><circle cx="116" cy="122" r="1.6"/><circle cx="120" cy="128" r="1.6"/><circle cx="114" cy="130" r="1.6"/></g>`;
    if (k === 'weasel') return `<ellipse cx="100" cy="128" rx="46" ry="26" fill="${u('light')}"/>`;
    if (k === 'dachshund') return `<ellipse cx="100" cy="124" rx="32" ry="24" fill="${u('light')}"/><ellipse cx="100" cy="72" rx="16" ry="20" fill="${P.light}" opacity=".35"/>`;
    return `<ellipse cx="89" cy="124" rx="15" ry="12" fill="${u('light')}"/><ellipse cx="111" cy="124" rx="15" ry="12" fill="${u('light')}"/>
      <path d="M100 52 v12 M88 55 l3 10 M112 55 l-3 10" stroke="${P.dark}" stroke-width="4" stroke-linecap="round"/>
      <path d="M60 122 h-20 M61 130 l-18 5 M140 122 h20 M139 130 l18 5" stroke="${P.dark}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
  }

  const ACC_SVG = {
    bow: `<g transform="translate(142 50) rotate(20)"><path d="M0 0 L-18 -11 Q-22 0 -18 11 Z" fill="#F06C9B"/><path d="M0 0 L18 -11 Q22 0 18 11 Z" fill="#F06C9B"/><circle r="5.5" fill="#D94F82"/></g>`,
    scarf: `<path d="M58 140 Q100 164 142 140 L145 153 Q100 178 55 153 Z" fill="#E4575B"/><path d="M116 158 l6 30 l15 -3 l-5 -29 Z" fill="#C9434A"/><path d="M72 150 l2 9 M92 156 l1 9 M112 155 l-1 9 M130 149 l-2 9" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`,
    glasses: `<g><circle cx="74" cy="100" r="16" fill="#fff" opacity=".18"/><circle cx="126" cy="100" r="16" fill="#fff" opacity=".18"/><g fill="none" stroke="#2B2B2B" stroke-width="3.5"><circle cx="74" cy="100" r="16"/><circle cx="126" cy="100" r="16"/><path d="M90 97 Q100 91 110 97"/></g></g>`,
    hat: `<path d="M48 70 Q50 18 100 16 Q150 18 152 70 Z" fill="#6C8CD5"/><path d="M70 30 Q72 50 70 66 M100 20 V66 M130 30 Q128 50 130 66" stroke="#5575C0" stroke-width="3" fill="none"/><rect x="42" y="60" width="116" height="17" rx="8.5" fill="#5575C0"/><circle cx="100" cy="14" r="11" fill="#F4F6FB"/>`,
    flowers: [[58, 66, '#F48FB1'], [76, 52, '#FFD166'], [100, 46, '#F48FB1'], [124, 52, '#9AD0EC'], [142, 66, '#FFD166']]
      .map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${(6 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(6 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="5" fill="${c}"/>`).join('')}<circle r="3.5" fill="#FFF6D6"/></g>`).join('')
      + `<path d="M62 66 Q100 36 138 66" stroke="#6DBF7B" stroke-width="3" fill="none" opacity=".8"/>`,
    headphones: `<path d="M42 100 Q42 34 100 34 Q158 34 158 100" fill="none" stroke="#3B3F4A" stroke-width="7" stroke-linecap="round"/><rect x="30" y="86" width="22" height="34" rx="10" fill="#F28AA0"/><rect x="148" y="86" width="22" height="34" rx="10" fill="#F28AA0"/>`,
    heart: `<g transform="translate(140 54) rotate(15)"><path d="M0 7 C-15 -4 -8 -17 0 -9 C8 -17 15 -4 0 7Z" fill="#E4575B"/><path d="M-6 -9 q-3 3 -1 6" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/></g>`,
    rose: `<g transform="translate(144 60)"><path d="M-6 6 q-14 8 -17 -3 q10 -3 17 3z" fill="#5DAA62"/><circle r="12" fill="#D93B57"/><path d="M-7 -1 q7 -9 14 0 q-7 7 -14 0z M-3 3 q3 -4 6 0" stroke="#A5203A" stroke-width="2" fill="none"/></g>`,
    bowtie: `<g transform="translate(100 156)"><path d="M0 0 L-21 -11 L-21 11 Z" fill="#7B5CC8"/><path d="M0 0 L21 -11 L21 11 Z" fill="#7B5CC8"/><rect x="-6" y="-7" width="12" height="14" rx="4" fill="#5E43A6"/></g>`,
    tiara: `<path d="M64 60 Q100 30 136 60" fill="none" stroke="#C9D3E0" stroke-width="4" stroke-linecap="round"/><path d="M82 48 L89 30 L95 43 L100 22 L105 43 L111 30 L118 48" fill="#E6ECF5" stroke="#AFBBCB" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="36" r="4" fill="#7FD0F0"/><circle cx="89" cy="40" r="2.5" fill="#F48FB1"/><circle cx="111" cy="40" r="2.5" fill="#F48FB1"/>`,
    crown: `<path d="M72 54 L76 26 L90 42 L100 20 L110 42 L124 26 L128 54 Z" fill="#F5C542" stroke="#D9A21B" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="44" r="4.5" fill="#E4575B"/><circle cx="84" cy="48" r="3" fill="#6C8CD5"/><circle cx="116" cy="48" r="3" fill="#6C8CD5"/>`
  };

  function extras(state) {
    if (state === 'happy') return `<g fill="#FFD166"><path d="M160 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/><path d="M34 88 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/></g>`;
    if (state === 'goal') return `<g class="spark" fill="#FFD166"><path d="M160 36 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/><path d="M30 80 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/><path d="M172 100 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/></g><path d="M30 40 l6 4 M26 54 l8 0" stroke="#F48FB1" stroke-width="3" stroke-linecap="round"/>`;
    if (state === 'thirsty') return `<g class="drop"><path d="M156 62 q-7 10 0 14 q7 -4 0 -14z" fill="#7CC7E8"/></g><path d="M36 60 q4 -6 0 -12 M44 56 q4 -6 0 -12" stroke="#E9A25E" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;
    if (state === 'headache') return `
      <g transform="rotate(-12 100 46)"><rect x="70" y="34" width="60" height="24" rx="12" fill="#9ED8F2"/><rect x="70" y="34" width="60" height="24" rx="12" fill="none" stroke="#5FAFD4" stroke-width="2"/><path d="M76 42 h18" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/></g>
      <g class="spin"><path d="M100 -2 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#FFC24D"/><circle cx="130" cy="36" r="4" fill="#FFC24D"/><circle cx="70" cy="36" r="3" fill="#FFC24D"/></g>
      <path d="M162 84 l12 -6 M165 96 h13 M162 108 l12 6" stroke="#E0685E" stroke-width="3.5" stroke-linecap="round"/>`;
    if (state === 'hungry') return `
      <g class="rumble" stroke="#E9A25E" stroke-width="3" fill="none" stroke-linecap="round"><path d="M46 158 q-6 6 0 12 M38 154 q-8 10 0 20"/><path d="M154 158 q6 6 0 12 M162 154 q8 10 0 20"/></g>
      <g transform="translate(26 92) rotate(-14)"><rect x="-2" y="0" width="4" height="30" rx="2" fill="#AFBBCB"/><path d="M-7 -14 v10 q0 6 7 6 q7 0 7 -6 v-10 M0 -14 v10" stroke="#AFBBCB" stroke-width="3" fill="none" stroke-linecap="round"/></g>
      <g transform="translate(174 92) rotate(14)"><rect x="-2" y="2" width="4" height="28" rx="2" fill="#AFBBCB"/><ellipse cx="0" cy="-6" rx="7" ry="10" fill="#AFBBCB"/></g>`;
    if (state === 'sleeping') return `<g class="zzz" fill="#8FA8D8" font-family="Comfortaa, Nunito, sans-serif" font-weight="700"><text x="148" y="54" font-size="22">z</text><text x="164" y="36" font-size="16">z</text><text x="176" y="22" font-size="11">z</text></g>`;
    return `
      <path d="M110 128 L122 150" stroke="#F0718A" stroke-width="4" stroke-linecap="round"/>
      <path d="M78 146 h44 l-5 50 h-34z" fill="#DDF2FA" opacity=".85" stroke="#9CCFE4" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M81 164 h38 l-3 30 h-32z" fill="#58B7E0"/>
      <path d="M86 156 v30" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  }

  let uid = 0;
  // Три формы: малыш, юная, взрослая. Пропорции головы и тела меняются.
  const STAGE = {
    baby:  { body: 0.72, head: 0.98, hy: 24, eye: 1.22, k: 0.8 },
    young: { body: 1,    head: 1,    hy: 0,  eye: 1,    k: 0.9 },
    adult: { body: 1.12, head: 0.92, hy: -5, eye: 0.95, k: 1 }
  };
  const STAGE_NAMES = {
    otter: ['Выдрёнок', 'Юная выдра', 'Взрослая выдра'],
    weasel: ['Ласочка-малышка', 'Юная ласка', 'Взрослая ласка'],
    dachshund: ['Щенок таксы', 'Юная такса', 'Взрослая такса'],
    cat: ['Котёнок', 'Юная кошка', 'Взрослая кошка']
  };
  // opts: { wear: {head, neck, face}, stage: 'baby'|'young'|'adult', label }
  function drawPet(k, state, opts = {}) {
    const P = PETS[k] || PETS.otter;
    const id = 'p' + (++uid);
    const u = n => `url(#${id}-${n})`;
    const wear = opts.wear || {};
    const G = STAGE[opts.stage] || STAGE.young;
    const scale = G.k;
    const cheeks = state === 'headache' ? '#C9B3B0' : '#F4978E';
    const paws = state === 'drinking' ? `<circle cx="78" cy="170" r="10" fill="${u('fur')}"/><circle cx="122" cy="170" r="10" fill="${u('fur')}"/>` : '';
    const acc = slot => wear[slot] && ACC_SVG[wear[slot]] && !(slot === 'neck' && wear.neck === 'bowtie') ? ACC_SVG[wear[slot]] : '';
    const bowtie = wear.neck === 'bowtie' ? ACC_SVG.bowtie : '';
    const hideHead = state === 'headache';
    const sx = k === 'dachshund' ? 118 : 100;
    const bodyT = `translate(${100 - 100 * G.body} ${205 - 205 * G.body}) scale(${G.body})`;
    const headT = `translate(${100 - 100 * G.head} ${100 - 100 * G.head + G.hy}) scale(${G.head})`;
    const curl = opts.stage === 'baby' ? `<path d="M93 50 q-5 -13 7 -14 q9 1 4 10" stroke="${P.dark}" stroke-width="4.5" fill="none" stroke-linecap="round"/>` : '';
    return `<svg viewBox="-6 -8 212 223" role="img" aria-label="${opts.label || P.name}">
    <defs>${grad(id + '-fur', P.fur)}${grad(id + '-light', P.light)}${grad(id + '-dark', P.dark)}
      <filter id="${id}-sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0B2530" flood-opacity=".18"/></filter></defs>
    <ellipse cx="${sx}" cy="206" rx="${(k === 'dachshund' ? 80 : 56) * scale * G.body}" ry="7" fill="#0B2530" opacity=".13"/>
    <g transform="translate(${100 - 100 * scale} ${205 - 205 * scale}) scale(${scale})">
    <g class="pet ${state}" filter="url(#${id}-sh)">
      <g transform="${bodyT}">${tail(k, P, u)}${body(k, P, u)}</g>
      <g transform="${headT}">
      ${acc('neck')}
      ${earsBack(k, P, u)}
      <ellipse cx="100" cy="100" rx="${k === 'weasel' ? 56 : 62}" ry="54" fill="${u('fur')}"/>
      ${face(k, P, u)}
      ${earsFront(k, P, u)}
      ${curl}
      <ellipse cx="74" cy="70" rx="20" ry="11" transform="rotate(-25 74 70)" fill="#fff" opacity=".28"/>
      <ellipse cx="60" cy="118" rx="10" ry="6" fill="${cheeks}" opacity="${opts.stage === 'baby' ? .8 : .55}"/><ellipse cx="140" cy="118" rx="10" ry="6" fill="${cheeks}" opacity="${opts.stage === 'baby' ? .8 : .55}"/>
      ${eyes(state, G.eye)}
      <ellipse cx="100" cy="113" rx="${k === 'dachshund' ? 10 : 8}" ry="${k === 'dachshund' ? 7 : 5.5}" fill="${P.nose}"/><ellipse cx="97" cy="111" rx="2.6" ry="1.6" fill="#fff" opacity=".6"/>
      ${mouth(state)}
      ${bowtie}
      ${state === 'sleeping' ? '' : acc('face')}
      ${hideHead ? '' : acc('head')}
      ${extras(state)}
      ${paws}
      </g>
    </g></g></svg>`;
  }

  // Пустое место, когда питомец ушёл: миска и следы лапок.
  function drawAway(reason) {
    const water = reason !== 'food';
    const paw = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})" fill="#8C7A6B" opacity=".55"><ellipse cx="0" cy="3" rx="5" ry="4"/><circle cx="-5" cy="-4" r="2"/><circle cx="0" cy="-6" r="2"/><circle cx="5" cy="-4" r="2"/></g>`;
    return `<svg viewBox="-6 -8 212 223" role="img" aria-label="Питомец ушёл">
      <ellipse cx="60" cy="196" rx="40" ry="6" fill="#0B2530" opacity=".12"/>
      <path d="M26 170 h68 l-8 24 h-52 z" fill="#E7EEF2" stroke="#AFBBCB" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M30 170 h60" stroke="${water ? '#9ED8F2' : '#E9C79A'}" stroke-width="4" stroke-linecap="round" opacity=".5"/>
      ${paw(112, 186, 70)}${paw(132, 176, 80)}${paw(150, 186, 70)}${paw(170, 174, 80)}${paw(190, 184, 70)}
      <g transform="translate(118 92) rotate(6)"><rect x="-34" y="-30" width="68" height="56" rx="6" fill="#FFFBF3" stroke="#E7D8C2" stroke-width="2"/>
        <path d="M-22 -14 h44 M-22 -2 h36 M-22 10 h40" stroke="#C9B8A2" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="-30" r="4" fill="#E86F8E"/></g>
    </svg>`;
  }

  function line(state, k, seed) {
    const list = (LINES[state] || LINES.happy)[k] || LINES.happy.otter;
    return list[Math.abs(seed | 0) % list.length];
  }

  window.Pets = { PETS, LINES, ACCESSORIES, drawPet, drawAway, line, ACC_SVG, STAGE_NAMES };
})();
