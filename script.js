(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#year').textContent = new Date().getFullYear();

  /* ---------- loader: Plan → Wait → Manage → Review → Repeat ---------- */
  let markReady;
  const pageReady = new Promise(r => (markReady = r));
  (function loader() {
    const el = $('#loader');
    if (!el) { document.body.classList.remove('loading'); document.body.classList.add('ready'); markReady(); return; }
    const words = $$('.ld-words span', el), dotsBox = $('#ldDots');
    dotsBox.innerHTML = '<i></i>'.repeat(28);
    const dots = $$('i', dotsBox);
    const STEP = reduce ? 120 : 460;                 // time each word stays on screen
    const SEQ = STEP * words.length;                  // full word sequence
    const t0 = performance.now();
    let loaded = document.readyState === 'complete', wordIdx = -1, done = false;
    if (!loaded) addEventListener('load', () => (loaded = true), { once: true });

    const showWord = i => words.forEach((w, j) => {
      w.classList.toggle('on', j === i);
      w.classList.toggle('off', j < i);
    });

    function finish() {
      if (done) return; done = true;
      dots.forEach(d => d.classList.add('on'));
      setTimeout(() => {
        el.classList.add('exit');
        document.body.classList.remove('loading');
        document.body.classList.add('ready');
        markReady();
        setTimeout(() => { el.classList.add('gone'); el.setAttribute('aria-hidden', 'true'); }, reduce ? 350 : 1300);
      }, reduce ? 50 : 380);
    }

    function tick(now) {
      if (done) return;
      const t = now - t0;
      const i = Math.min(words.length - 1, Math.floor(t / STEP));
      if (i !== wordIdx) { wordIdx = i; showWord(i); }
      // dots follow the word sequence, but hold the last few until the page has loaded
      const cap = loaded ? 28 : 24;
      const n = Math.min(cap, Math.floor((t / SEQ) * 28));
      dots.forEach((d, k) => d.classList.toggle('on', k < n));
      if (loaded && t >= SEQ) return finish();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setTimeout(finish, 7000);                         // safety net on very slow connections
  })();

  /* ---------- nav: hide on scroll down, progress bar, active link ---------- */
  const nav = $('#nav'), prog = $('#progress'), totop = $('#totop');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 20);
    nav.classList.toggle('hide', y > lastY && y > 400 && !menu.classList.contains('open'));
    totop.classList.toggle('show', y > 900);
    lastY = y;
    routineScroll(); statementScroll();
  };
  totop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  const links = $$('.nav ul a');
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['home','about','routine','learn','tools','contact'].forEach(id => spy.observe(document.getElementById(id)));

  /* ---------- mobile menu ---------- */
  const burger = $('#burger'), menu = $('#mobileMenu');
  const setMenu = open => {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  $$('.rv').forEach(el => io.observe(el));

  /* ---------- hero candlestick chart (illustrative, seeded) ---------- */
  (function chart() {
    const svg = $('#heroChart'); const W = 320, H = 180, N = 22;
    let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    let p = 60; const c = [];
    for (let i = 0; i < N; i++) {
      const o = p, drift = 1.6 + Math.sin(i / 3) * 2.2;
      const cl = o + drift + (rnd() - .45) * 9;
      const hi = Math.max(o, cl) + rnd() * 5, lo = Math.min(o, cl) - rnd() * 5;
      c.push({ o, cl, hi, lo }); p = cl;
    }
    const all = c.flatMap(k => [k.hi, k.lo]), mn = Math.min(...all), mx = Math.max(...all);
    const Y = v => H - 14 - (v - mn) / (mx - mn) * (H - 28);
    const step = W / N, bw = step * .52;
    let g = '';
    for (let i = 1; i < 4; i++) g += `<line x1="0" x2="${W}" y1="${H*i/4}" y2="${H*i/4}" stroke="rgba(243,238,227,.08)" stroke-dasharray="3 5"/>`;
    let line = '';
    c.forEach((k, i) => {
      const x = i * step + step / 2, up = k.cl >= k.o, col = up ? '#F3EEE3' : '#FF5A1F';
      const top = Y(Math.max(k.o, k.cl)), bot = Y(Math.min(k.o, k.cl));
      g += `<g class="cd" style="opacity:0;transform-origin:${x}px ${H}px;transition:opacity .5s ${i*45}ms, transform .6s cubic-bezier(.2,.8,.2,1) ${i*45}ms;transform:scaleY(.2)">
        <line x1="${x}" x2="${x}" y1="${Y(k.hi)}" y2="${Y(k.lo)}" stroke="${col}" stroke-width="1.2" opacity=".7"/>
        <rect x="${x-bw/2}" y="${top}" width="${bw}" height="${Math.max(bot-top,1.5)}" rx="1.5" fill="${up ? 'transparent' : col}" stroke="${col}" stroke-width="1.2"/></g>`;
      line += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + Y((k.o + k.cl) / 2).toFixed(1) + ' ';
    });
    g += `<path id="ma" d="${line}" fill="none" stroke="#FF5A1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg.innerHTML = g;
    const ma = $('#ma'), L = ma.getTotalLength();
    ma.style.strokeDasharray = L; ma.style.strokeDashoffset = L;
    ma.style.transition = 'stroke-dashoffset 2s cubic-bezier(.2,.8,.2,1) .9s';
    pageReady.then(() => setTimeout(() => {
      $$('.cd', svg).forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
      ma.style.strokeDashoffset = 0;
    }, 250));
  })();

  /* ---------- routine: vertical scroll -> horizontal move ---------- */
  const rSec = $('#routine'), rTrack = $('#rTrack'), rBar = $('#rBar'), rNow = $('#rNow');
  function routineScroll() {
    if (innerWidth <= 860) return;
    const r = rSec.getBoundingClientRect();
    const total = rSec.offsetHeight - innerHeight;
    const t = Math.min(Math.max(-r.top / total, 0), 1);
    const dist = rTrack.scrollWidth - innerWidth + 40;
    rTrack.style.transform = `translate3d(${-dist * t}px,0,0)`;
    rBar.style.transform = `scaleX(${t})`;
    rNow.textContent = String(Math.min(4, Math.floor(t * 4.6) + 1)).padStart(2, '0');
  }

  /* ---------- statement: word-by-word highlight ---------- */
  const stmt = $('#stmt');
  stmt.innerHTML = stmt.textContent.split(' ').map(w => {
    const acc = /^\*.*\*$/.test(w);
    return `<span class="w${acc ? ' acc' : ''}">${w.replace(/\*/g, '')}</span>`;
  }).join(' ');
  const words = $$('.w', stmt);
  function statementScroll() {
    const r = stmt.getBoundingClientRect();
    const t = Math.min(Math.max((innerHeight * .85 - r.top) / (r.height + innerHeight * .35), 0), 1);
    const n = Math.round(t * words.length);
    words.forEach((w, i) => w.classList.toggle('lit', i < n));
  }

  /* ---------- learn: topic explorer ---------- */
  const ink = '#17130E', acc = '#FF5A1F';
  const topics = [
    { k: 'Market basics', t: 'How markets actually move', bg: '#CFDCBF',
      p: 'Understand who participates in the market, why prices change and how supply and demand shape every move.',
      l: ['Participants and liquidity', 'Supply, demand and price', 'Sessions, volume and volatility'],
      a: `<svg viewBox="0 0 300 220" fill="none" stroke="${ink}" stroke-width="2"><circle cx="110" cy="110" r="70"/><circle cx="190" cy="110" r="70" stroke="${acc}"/><text x="78" y="115" fill="${ink}" stroke="none" font-family="Space Grotesk" font-size="15">Supply</text><text x="185" y="115" fill="${acc}" stroke="none" font-family="Space Grotesk" font-size="15">Demand</text><circle cx="150" cy="110" r="6" fill="${ink}"/><text x="128" y="205" fill="${ink}" stroke="none" font-family="Fraunces" font-style="italic" font-size="16">price</text></svg>` },
    { k: 'Chart reading', t: 'Read the story in every candle', bg: '#DCD0F4',
      p: 'Learn candlesticks, timeframes and trend direction so a chart becomes a narrative rather than noise.',
      l: ['Candlestick anatomy', 'Multiple timeframes', 'Trend, range and structure'],
      a: `<svg viewBox="0 0 300 220" fill="none" stroke="${ink}" stroke-width="2"><line x1="70" y1="30" x2="70" y2="190"/><rect x="50" y="60" width="40" height="90" rx="4"/><line x1="190" y1="30" x2="190" y2="190" stroke="${acc}"/><rect x="170" y="70" width="40" height="80" rx="4" fill="${acc}" stroke="${acc}"/><g font-family="Space Grotesk" font-size="12" fill="${ink}" stroke="none"><text x="98" y="34">high</text><text x="98" y="64">close</text><text x="98" y="154">open</text><text x="98" y="194">low</text></g></svg>` },
    { k: 'Technical analysis', t: 'Indicators are tools, not signals', bg: '#F6DE8D',
      p: 'Use moving averages and indicators to add context to price — never as a replacement for your own plan.',
      l: ['Moving averages and trend', 'Momentum and divergence', 'Confluence over certainty'],
      a: `<svg viewBox="0 0 300 220" fill="none" stroke-width="2.4" stroke-linecap="round"><path d="M10 170 C60 160 80 90 130 110 S200 50 290 40" stroke="${ink}"/><path d="M10 180 C70 175 100 130 150 128 S230 80 290 70" stroke="${acc}" stroke-dasharray="6 6"/><g fill="${ink}"><circle cx="130" cy="110" r="5"/><circle cx="220" cy="62" r="5"/></g></svg>` },
    { k: 'Price action', t: 'Spot support, resistance and breakouts', bg: '#CFDCBF',
      p: 'Read support, resistance and breakouts straight from the chart, and recognise context before committing.',
      l: ['Key levels and zones', 'Breakouts and retests', 'Patience at decision points'],
      a: `<svg viewBox="0 0 300 220" fill="none" stroke-width="2"><rect x="0" y="50" width="300" height="16" fill="${acc}" opacity=".25" stroke="none"/><rect x="0" y="150" width="300" height="16" fill="${ink}" opacity=".15" stroke="none"/><path d="M10 150 L50 66 L90 150 L130 66 L170 150 L210 66 L240 30 L290 14" stroke="${ink}" stroke-linejoin="round"/><circle cx="240" cy="30" r="6" fill="${acc}" stroke="none"/></svg>` },
    { k: 'Trading psychology', t: 'Master the trader behind the trade', bg: '#DCD0F4',
      p: 'Manage fear and greed, stay patient and follow your plan — especially when emotions are loudest.',
      l: ['Fear, greed and FOMO', 'Handling a losing streak', 'Process over outcome'],
      a: `<svg viewBox="0 0 300 220" fill="none" stroke="${ink}" stroke-width="2"><circle cx="150" cy="110" r="80"/><circle cx="150" cy="110" r="52"/><circle cx="150" cy="110" r="24" fill="${acc}" stroke="${acc}"/><path d="M20 110h60M220 110h60" stroke-dasharray="4 6"/></svg>` },
    { k: 'Risk management', t: 'Protect capital, every time', bg: '#F6DE8D',
      p: 'Position sizing, stop-losses and protecting your capital first. Risk is the one thing you always control.',
      l: ['Position sizing', 'Stop-loss placement', 'Risk-to-reward thinking'],
      a: `<svg viewBox="0 0 300 220" fill="none" stroke-width="2"><rect x="40" y="40" width="220" height="60" rx="8" fill="${ink}" opacity=".12" stroke="none"/><rect x="40" y="100" width="220" height="30" rx="8" fill="${acc}" opacity=".35" stroke="none"/><line x1="20" y1="100" x2="280" y2="100" stroke="${ink}"/><g font-family="Space Grotesk" font-size="13" fill="${ink}"><text x="54" y="74">Target</text><text x="54" y="121">Stop</text><text x="218" y="95">Entry</text></g><path d="M40 190h220" stroke="${ink}" stroke-dasharray="4 6"/></svg>` }
  ];
  const tabs = $('#tabs'), panel = $('#panel');
  tabs.innerHTML = topics.map((t, i) =>
    `<button class="tab" role="tab" id="tab${i}" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${t.k}<small>0${i+1}</small></button>`).join('');
  const tabBtns = $$('.tab', tabs);
  const show = i => {
    const t = topics[i];
    tabBtns.forEach((b, j) => { b.setAttribute('aria-selected', i === j); b.tabIndex = i === j ? 0 : -1; });
    $('#pKick').textContent = `Topic 0${i + 1} — ${t.k}`;
    $('#pTitle').textContent = t.t;
    $('#pText').textContent = t.p;
    $('#pList').innerHTML = t.l.map(x => `<li>${x}</li>`).join('');
    $('#pArt').innerHTML = t.a; $('#pArt').style.background = t.bg;
    panel.setAttribute('aria-labelledby', 'tab' + i);
    panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap');
  };
  tabBtns.forEach((b, i) => {
    b.addEventListener('click', () => show(i));
    b.addEventListener('keydown', e => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return; e.preventDefault();
      const n = (i + d + topics.length) % topics.length; tabBtns[n].focus(); show(n);
    });
  });
  show(0);

  /* ---------- consistency tracker ---------- */
  const KEY = 'st-demo3-tracker';
  let done = [];
  try { done = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) {}
  if (!Array.isArray(done) || done.length !== 28) done = Array(28).fill(false);
  const days = $('#days');
  days.innerHTML = done.map((d, i) => `<button type="button" class="day${d?' on':''}" aria-pressed="${d}" aria-label="Day ${i+1}">${i+1}</button>`).join('');
  const msgs = [
    [0, 'Every streak starts with day one.'], [1, 'Day one done. Show up again tomorrow.'],
    [5, 'A habit is taking shape.'], [10, 'This is what consistency looks like.'],
    [20, 'Discipline, on repeat.'], [28, 'Twenty-eight days. You trained for this.']
  ];
  const stats = () => {
    const n = done.filter(Boolean).length;
    let best = 0, cur = 0; done.forEach(d => { cur = d ? cur + 1 : 0; best = Math.max(best, cur); });
    $('#sDone').textContent = n; $('#sStreak').textContent = best;
    $('#sPct').textContent = Math.round(n / 28 * 100) + '%';
    $('#tMsg').textContent = msgs.filter(m => n >= m[0]).pop()[1];
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {}
  };
  $$('.day', days).forEach((b, i) => b.addEventListener('click', () => {
    done[i] = !done[i]; b.classList.toggle('on', done[i]); b.setAttribute('aria-pressed', done[i]);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); stats();
  }));
  $('#tReset').addEventListener('click', () => {
    done = Array(28).fill(false);
    $$('.day', days).forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', false); });
    stats();
  });
  stats();

  /* ---------- position size calculator ---------- */
  const inr = v => '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const cIn = ['#cCap', '#cRisk', '#cEntry', '#cStop'].map(s => $(s));
  const calc = () => {
    const [cap, risk, entry, stop] = cIn.map(i => parseFloat(i.value));
    $('#cRiskOut').textContent = risk.toFixed(2).replace(/0$/, '') + '%';
    const warn = $('#rWarn'); warn.classList.remove('show');
    const maxRisk = cap * risk / 100, per = Math.abs(entry - stop);
    if (!(cap > 0) || !(entry > 0) || !(stop > 0) || per === 0) {
      ['#rRisk','#rQty','#rPer','#rVal'].forEach(s => $(s).textContent = '—');
      warn.textContent = per === 0 && entry > 0 ? 'Entry and stop-loss can’t be the same price.' : 'Enter positive values to calculate.';
      warn.classList.add('show'); return;
    }
    let qty = Math.floor(maxRisk / per), value = qty * entry;
    if (value > cap) {
      qty = Math.floor(cap / entry); value = qty * entry;
      warn.textContent = 'Position capped by available capital — your stop is very tight.'; warn.classList.add('show');
    }
    $('#rRisk').textContent = inr(maxRisk);
    $('#rQty').textContent = qty.toLocaleString('en-IN');
    $('#rPer').textContent = inr(per);
    $('#rVal').textContent = inr(value);
  };
  cIn.forEach(i => i.addEventListener('input', calc)); calc();

  /* ---------- contact form ---------- */
  $$('.chip').forEach(c => c.addEventListener('click', () => c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true')));
  const form = $('#cForm');
  const check = (el, ok, msg) => { const f = el.closest('.f'); f.classList.toggle('err', !ok); $('.msg', f).textContent = ok ? '' : msg; return ok; };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const n = $('#fName'), m = $('#fEmail'), t = $('#fMsg');
    const ok = [
      check(n, n.value.trim().length > 1, 'Please enter your name.'),
      check(m, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.value.trim()), 'Please enter a valid email.'),
      check(t, t.value.trim().length > 4, 'Tell us a little more.')
    ].every(Boolean);
    if (!ok) return;
    const picks = $$('.chip[aria-pressed="true"]').map(c => c.textContent);
    const okBox = $('#formOk');
    okBox.textContent = `Thanks, ${n.value.trim().split(' ')[0]}! ${picks.length ? 'We noted your interest in ' + picks.join(', ').toLowerCase() + '. ' : ''}(Demo only — nothing was sent.)`;
    okBox.classList.add('show'); form.reset();
  });

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { if (innerWidth <= 860) rTrack.style.transform = ''; onScroll(); });
  onScroll();
})();
