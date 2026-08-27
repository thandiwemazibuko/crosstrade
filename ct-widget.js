/* ============================================================================
   CrossTrade Swap Widget — embeddable shortcode script
   ----------------------------------------------------------------------------
   Usage (one line on any site):

   <script src="https://your-domain.com/ct-widget.js"
           data-ref="YOUR-REF-CODE"
           data-theme="dark"
           data-from="USD" data-to="NGN"
           data-amount="500"></script>

   Every swap through your embed pays you 30% of the CrossTrade fee (level 1).
   The partner who referred YOU earns 20% (level 2), and their referrer 10%
   (level 3). Data is stored in the visitor's browser (localStorage) — this is
   a simulated environment; no real funds move.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- market data (mirrors the main CrossTrade app) ---------- */
  const ASSETS = {
    XLM:  {name:'Stellar Lumens', px:0.1187, kind:'crypto'},
    USDC: {name:'USD Coin',       px:1.00,   kind:'crypto'},
    AQUA: {name:'Aquarius',       px:0.0011, kind:'crypto'},
    yXLM: {name:'Ultra Stellar',  px:0.1325, kind:'crypto'},
    BTC:  {name:'Bitcoin (wrapped)', px:67230, kind:'crypto'},
    ETH:  {name:'Ethereum (wrapped)',px:3512,  kind:'crypto'},
    USDT: {name:'Tether USD',     px:1.00,   kind:'crypto'},
    XRP:  {name:'Ripple (wrapped)', px:0.62,  kind:'crypto'},
    BNB:  {name:'BNB (wrapped)',   px:615,    kind:'crypto'},
    USD:  {name:'US Dollar',        px:1.00,   kind:'fiat', flag:'🇺🇸'},
    EUR:  {name:'Euro',             px:1.08,   kind:'fiat', flag:'🇪🇺'},
    GBP:  {name:'British Pound',    px:1.27,   kind:'fiat', flag:'🇬🇧'},
    NGN:  {name:'Nigerian Naira',   px:0.00066,kind:'fiat', flag:'🇳🇬'},
    ZAR:  {name:'South African Rand',px:0.055, kind:'fiat', flag:'🇿🇦'},
    KES:  {name:'Kenyan Shilling',  px:0.0077, kind:'fiat', flag:'🇰🇪'},
    GHS:  {name:'Ghanaian Cedi',    px:0.066,  kind:'fiat', flag:'🇬🇭'},
    MWK:  {name:'Malawian Kwacha',  px:0.00058,kind:'fiat', flag:'🇲🇼'},
    MZN:  {name:'Mozambican Metical',px:0.0156,kind:'fiat', flag:'🇲🇿'},
    BRL:  {name:'Brazilian Real',   px:0.19,   kind:'fiat', flag:'🇧🇷'},
    PHP:  {name:'Philippine Peso',  px:0.017,  kind:'fiat', flag:'🇵🇭'},
  };
  const SYMS = Object.keys(ASSETS);

  /* ---------- platform fee + referral split ---------- */
  const FEE_RATE   = 0.008;                    /* 0.8% CrossTrade fee per swap */
  const REF_LEVELS = [0.30, 0.20, 0.10];       /* L1 / L2 / L3 share of the fee */

  /* ---------- referral storage (shared with the embed dashboard) ---------- */
  const store = {
    read(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch (e) { return fallback; }
    },
    write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  };
  const K_CODES = 'ct-ref-codes', K_EARN = 'ct-ref-earnings', K_SWAPS = 'ct-widget-swaps';

  function creditReferrals(refCode, feeUsd, swapRef, pair) {
    if (!refCode) return [];
    const codes = store.read(K_CODES, {});
    const earn  = store.read(K_EARN, []);
    const paid  = [];
    let cursor  = refCode;
    for (let level = 1; level <= 3 && cursor; level++) {
      const amt = feeUsd * REF_LEVELS[level - 1];
      earn.push({ code: cursor, level, amount: amt, currency: 'USD', swapRef, pair, ts: Date.now() });
      paid.push({ code: cursor, level, amount: amt });
      cursor = (codes[cursor] && codes[cursor].parent) || null;
    }
    store.write(K_EARN, earn);
    return paid;
  }

  /* ---------- helpers ---------- */
  const usdOf   = (sym, amt) => amt * ASSETS[sym].px;
  const convert = (from, to, amt) => usdOf(from, amt) / ASSETS[to].px;
  const fmt = (n, sym) => {
    const d = ASSETS[sym].px >= 100 ? 2 : ASSETS[sym].px >= 0.01 ? 2 : ASSETS[sym].px >= 0.001 ? 4 : 6;
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const newRef = () => 'CT-W' + Math.random().toString(36).slice(2, 8).toUpperCase();

  /* ---------- widget styles (scoped inside shadow DOM) ---------- */
  const CSS = `
    :host { all: initial; display: block; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
    .ctw {
      width: 100%; max-width: 400px; border-radius: 18px; padding: 18px;
      font-family: 'Inter', system-ui, sans-serif; color: var(--ink);
      background: var(--bg); border: 1px solid var(--line);
      --grad: linear-gradient(135deg, #6a48f2, #a86fff 55%, #fc9fdf);
    }
    .ctw.dark { --bg:#0b0714; --bg2:#141026; --ink:#f3f0ff; --muted:#9a93b8; --line:rgba(168,111,255,.22); --fld:#171129; }
    .ctw.light { --bg:#ffffff; --bg2:#f6f3ff; --ink:#17122b; --muted:#6d6690; --line:rgba(106,72,242,.25); --fld:#f3f0fc; }
    .head { display:flex; align-items:center; gap:9px; margin-bottom:14px; }
    .logo { width:26px; height:26px; border-radius:8px; background:var(--grad); display:flex; align-items:center; justify-content:center;
            font-family:'Bebas Neue', sans-serif; font-size:16px; color:#fff; letter-spacing:.5px; }
    .brand { font-family:'Bebas Neue', sans-serif; font-size:19px; letter-spacing:2.5px; color:var(--ink); }
    .brand small { font-size:10px; letter-spacing:1.5px; color:var(--muted); display:block; margin-top:-3px; font-family:'Inter',sans-serif; font-weight:600; }
    .refpill { margin-left:auto; font-size:9.5px; font-weight:700; letter-spacing:.8px; color:#a86fff;
               border:1px solid rgba(168,111,255,.4); padding:3px 8px; border-radius:99px; white-space:nowrap; }
    .box { background:var(--fld); border:1px solid var(--line); border-radius:13px; padding:11px 13px; }
    .box label { font-size:10px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:var(--muted); display:block; margin-bottom:6px; }
    .row { display:flex; align-items:center; gap:10px; }
    input.amt { flex:1; min-width:0; background:none; border:none; outline:none; color:var(--ink);
                font-family:'JetBrains Mono', monospace; font-size:21px; font-weight:600; }
    input.amt::placeholder { color:var(--muted); opacity:.55; }
    select.cur { background:var(--bg2); color:var(--ink); border:1px solid var(--line); border-radius:99px;
                 padding:6px 10px; font-size:12.5px; font-weight:700; outline:none; cursor:pointer; max-width:118px; }
    .usd { font-size:11px; color:var(--muted); font-family:'JetBrains Mono', monospace; margin-top:5px; }
    .flip { display:flex; justify-content:center; margin:-6px 0; position:relative; z-index:1; }
    .flip button { width:32px; height:32px; border-radius:50%; border:1px solid var(--line); background:var(--bg2);
                   color:#a86fff; font-size:15px; cursor:pointer; transition:transform .25s; line-height:1; }
    .flip button:hover { transform:rotate(180deg); }
    .meta { margin:12px 2px 0; font-size:11.5px; color:var(--muted); }
    .meta div { display:flex; justify-content:space-between; padding:3px 0; }
    .meta b { color:var(--ink); font-family:'JetBrains Mono', monospace; font-weight:600; }
    .dest { margin-top:12px; }
    .dest input { width:100%; background:var(--fld); border:1px solid var(--line); border-radius:11px; padding:10px 12px;
                  color:var(--ink); font-size:12.5px; outline:none; font-family:'Inter',sans-serif; }
    .dest input::placeholder { color:var(--muted); opacity:.6; }
    .go { width:100%; margin-top:13px; border:none; border-radius:13px; padding:13px; cursor:pointer;
          background:var(--grad); color:#fff; font-size:13.5px; font-weight:800; letter-spacing:1.2px; text-transform:uppercase;
          transition:opacity .2s, transform .1s; }
    .go:hover { opacity:.92; } .go:active { transform:scale(.985); }
    .go:disabled { opacity:.55; cursor:default; }
    .foot { margin-top:11px; text-align:center; font-size:10px; color:var(--muted); letter-spacing:.4px; }
    .foot a { color:#a86fff; text-decoration:none; font-weight:700; }
    /* success state */
    .done { text-align:center; padding:26px 8px 10px; }
    .check { width:52px; height:52px; margin:0 auto 14px; border-radius:50%; background:var(--grad);
             display:flex; align-items:center; justify-content:center; font-size:24px; color:#fff; }
    .done h3 { font-family:'Bebas Neue', sans-serif; font-size:22px; letter-spacing:1.5px; color:var(--ink); margin-bottom:6px; }
    .done p { font-size:12px; color:var(--muted); line-height:1.55; }
    .done .ref { font-family:'JetBrains Mono', monospace; color:var(--ink); font-weight:600; }
    .earn { margin:13px 0 3px; background:var(--fld); border:1px solid var(--line); border-radius:11px; padding:10px 12px; text-align:left; }
    .earn div { display:flex; justify-content:space-between; font-size:11px; color:var(--muted); padding:2.5px 0; }
    .earn b { color:#2fd47e; font-family:'JetBrains Mono', monospace; font-weight:600; }
    .again { margin-top:14px; background:none; border:1px solid var(--line); color:var(--ink); border-radius:11px;
             padding:9px 18px; font-size:12px; font-weight:700; cursor:pointer; }
    .spin { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff;
            border-radius:50%; animation:ctw-rot .7s linear infinite; vertical-align:-2px; margin-right:7px; }
    @keyframes ctw-rot { to { transform:rotate(360deg); } }
    @media (max-width:420px){ .ctw{ max-width:100%; } }
  `;

  /* ---------- widget markup ---------- */
  function buildWidget(host, cfg) {
    const shadow = host.attachShadow({ mode: 'open' });

    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap';

    const style = document.createElement('style');
    style.textContent = CSS;

    const root = document.createElement('div');
    root.className = 'ctw ' + (cfg.theme === 'light' ? 'light' : 'dark');

    const opts = (sel) => SYMS.map(s =>
      `<option value="${s}" ${s === sel ? 'selected' : ''}>${ASSETS[s].flag ? ASSETS[s].flag + ' ' : ''}${s}</option>`).join('');

    root.innerHTML = `
      <div class="head">
        <div class="logo">C</div>
        <div class="brand">CROSSTRADE<small>INSTANT SWAP</small></div>
        ${cfg.ref ? `<div class="refpill" title="This embed earns referral income">REF · ${cfg.ref}</div>` : ''}
      </div>
      <div class="swapview">
        <div class="box">
          <label>You send</label>
          <div class="row">
            <input class="amt" id="wAmtIn" type="number" min="0" step="any" value="${cfg.amount}" placeholder="0.00">
            <select class="cur" id="wFrom">${opts(cfg.from)}</select>
          </div>
          <div class="usd" id="wUsdIn"></div>
        </div>
        <div class="flip"><button id="wFlip" title="Flip pair" type="button">⇅</button></div>
        <div class="box">
          <label>They receive</label>
          <div class="row">
            <input class="amt" id="wAmtOut" type="text" readonly placeholder="0.00">
            <select class="cur" id="wTo">${opts(cfg.to)}</select>
          </div>
          <div class="usd" id="wUsdOut"></div>
        </div>
        <div class="meta">
          <div><span>Rate</span><b id="wRate"></b></div>
          <div><span>CrossTrade fee (0.8%)</span><b id="wFee"></b></div>
          <div><span>Settlement</span><b>~5 sec · Stellar</b></div>
        </div>
        <div class="dest"><input id="wDest" type="text" placeholder="Recipient wallet address or bank account"></div>
        <button class="go" id="wGo" type="button">Swap now</button>
      </div>
      <div class="foot">Powered by <a href="https://crosstrade.app" target="_blank" rel="noopener">CrossTrade</a> · site owner earns 30% referral · simulated demo</div>
    `;

    shadow.append(fonts, style, root);

    /* ---------- behaviour ---------- */
    const $ = id => shadow.getElementById(id);
    const amtIn = $('wAmtIn'), amtOut = $('wAmtOut'), from = $('wFrom'), to = $('wTo');

    function quote() {
      const a = parseFloat(amtIn.value) || 0;
      const f = from.value, t = to.value;
      if (!a || f === t) { amtOut.value = ''; $('wUsdIn').textContent = ''; $('wUsdOut').textContent = '';
        $('wRate').textContent = f === t ? 'pick two different currencies' : ''; $('wFee').textContent = ''; return null; }
      const gross = convert(f, t, a);
      const feeUsd = usdOf(f, a) * FEE_RATE;
      const net = convert(f, t, a * (1 - FEE_RATE));
      amtOut.value = fmt(net, t);
      $('wUsdIn').textContent  = '≈ ' + money(usdOf(f, a));
      $('wUsdOut').textContent = '≈ ' + money(usdOf(t, net));
      $('wRate').textContent   = `1 ${f} = ${fmt(convert(f, t, 1), t)} ${t}`;
      $('wFee').textContent    = money(feeUsd) + (cfg.ref ? ` · you earn ${money(feeUsd * REF_LEVELS[0])}` : '');
      return { a, f, t, net, feeUsd };
    }

    amtIn.addEventListener('input', quote);
    from.addEventListener('change', quote);
    to.addEventListener('change', quote);
    $('wFlip').addEventListener('click', () => {
      const f = from.value; from.value = to.value; to.value = f; quote();
    });

    $('wGo').addEventListener('click', () => {
      const q = quote();
      if (!q) return;
      const btn = $('wGo');
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"></span>Settling on Stellar…';
      setTimeout(() => {
        const swapRef = newRef();
        const paid = creditReferrals(cfg.ref, q.feeUsd, swapRef, `${q.f}→${q.t}`);
        const swaps = store.read(K_SWAPS, []);
        swaps.push({ ref: swapRef, from: q.f, to: q.t, amount: q.a, received: q.net,
                     feeUsd: q.feeUsd, widgetRef: cfg.ref || null, dest: $('wDest').value || '—', ts: Date.now() });
        store.write(K_SWAPS, swaps);

        const view = root.querySelector('.swapview');
        view.innerHTML = `
          <div class="done">
            <div class="check">✓</div>
            <h3>SWAP COMPLETE</h3>
            <p>Sent <span class="ref">${fmt(q.a, q.f)} ${q.f}</span> → recipient gets
               <span class="ref">${fmt(q.net, q.t)} ${q.t}</span><br>
               Reference <span class="ref">${swapRef}</span> · settled in ~4.8s</p>
            ${paid.length ? `<div class="earn">
              ${paid.map(p => `<div><span>Level ${p.level} referral · ${p.code}</span><b>+${money(p.amount)}</b></div>`).join('')}
            </div>` : ''}
            <button class="again" id="wAgain" type="button">New swap</button>
          </div>`;
        $('wAgain').addEventListener('click', () => {
          /* rebuild the widget fresh */
          host.innerHTML = '';
          buildWidget(host, cfg);
        });
      }, 1600);
    });

    quote();
  }

  /* ---------- boot: find every embed tag ---------- */
  function boot() {
    /* pattern 1: <script src=".../ct-widget.js" data-...></script> */
    document.querySelectorAll('script[src*="ct-widget.js"]').forEach(s => {
      if (s.dataset.ctMounted) return;
      s.dataset.ctMounted = '1';
      const host = document.createElement('div');
      host.className = 'ct-swap-widget';
      s.parentNode.insertBefore(host, s.nextSibling);
      buildWidget(host, {
        ref:    (s.dataset.ref || '').trim().toUpperCase() || null,
        theme:  (s.dataset.theme || 'dark').toLowerCase(),
        from:   (s.dataset.from || 'USD').toUpperCase(),
        to:     (s.dataset.to || 'NGN').toUpperCase(),
        amount: s.dataset.amount || '500',
      });
    });
    /* pattern 2: <div class="ct-swap-widget" data-...></div> */
    document.querySelectorAll('div.ct-swap-widget:not([data-ct-mounted])').forEach(d => {
      d.dataset.ctMounted = '1';
      buildWidget(d, {
        ref:    (d.dataset.ref || '').trim().toUpperCase() || null,
        theme:  (d.dataset.theme || 'dark').toLowerCase(),
        from:   (d.dataset.from || 'USD').toUpperCase(),
        to:     (d.dataset.to || 'NGN').toUpperCase(),
        amount: d.dataset.amount || '500',
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
