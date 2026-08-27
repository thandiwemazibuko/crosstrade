/* ============================================================================
   CrossTrade Swap · Buy · Sell Widget — embeddable shortcode script
   ----------------------------------------------------------------------------
   Usage (one line on any site):

   <script src="https://your-domain.com/ct-widget.js"
           data-ref="YOUR-REF-CODE"
           data-theme="dark"
           data-mode="swap"
           data-from="USD" data-to="NGN"
           data-amount="500"></script>

   The widget embeds the full CrossTrade exchange card: Swap (any pair),
   Buy (fiat → crypto via card / bank / PayPal / VALR / Revolut / MoMo) and
   Sell (crypto → fiat to a bank account). Every trade through your embed pays
   you 30% of the CrossTrade fee (level 1); the partner who referred YOU earns
   20% (level 2) and their referrer 10% (level 3). Simulated environment —
   no real funds move; data is stored in the visitor's browser.
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
  const SYMS    = Object.keys(ASSETS);
  const FIAT    = SYMS.filter(s => ASSETS[s].kind === 'fiat');
  const CRYPTO  = SYMS.filter(s => ASSETS[s].kind === 'crypto');

  /* ---------- fees (mirror the main app) ---------- */
  const FEES = { pool: 0.003, corridor: 0.01, sell: 0.008 };
  const PAY_METHODS = {
    card:   {label:'Debit / Credit Card',   fee:0.018, speed:'instant'},
    bank:   {label:'Bank Transfer',         fee:0.005, speed:'~1 day'},
    paypal: {label:'PayPal',                fee:0.025, speed:'instant'},
    valr:   {label:'VALR',                  fee:0.010, speed:'instant'},
    revolut:{label:'Revolut',               fee:0.009, speed:'instant'},
    momo:   {label:'MoMo · Mobile Money',   fee:0.012, speed:'instant'},
  };
  const REF_LEVELS = [0.30, 0.20, 0.10];       /* L1 / L2 / L3 share of the fee */

  /* ---------- platform settlement accounts (mirror the main app) ---------- */
  const ADMIN_ACCOUNTS = {
    USD:{bank:'Mercury Bank · CrossTrade Settlement LLC', name:'CrossTrade Escrow — USD', acct:'US12 3456 7890 1234 5678 90', rail:'Wire / ACH'},
    EUR:{bank:'CrossTrade Europe BV', name:'CrossTrade Escrow — EUR', acct:'DE89 3704 0044 0532 0130 00', rail:'SEPA'},
    GBP:{bank:'CrossTrade UK Ltd', name:'CrossTrade Escrow — GBP', acct:'GB29 NWBK 6016 1331 9268 19', rail:'Faster Payments'},
    NGN:{bank:'CrossTrade NG · Kuda Microfinance', name:'CrossTrade Escrow — NGN', acct:'2001 3344 55', rail:'NIP transfer'},
    ZAR:{bank:'CrossTrade ZA · Standard Bank', name:'CrossTrade Escrow — ZAR', acct:'ZA45 0800 1234 5678 9012 34', rail:'EFT / PayShap'},
    KES:{bank:'CrossTrade KE · Equity Bank', name:'CrossTrade Escrow — KES', acct:'0470 1234 5678', rail:'PesaLink / M-Pesa'},
    GHS:{bank:'CrossTrade GH · Stanbic Ghana', name:'CrossTrade Escrow — GHS', acct:'9040 0055 6677', rail:'GhIPSS instant'},
    MWK:{bank:'CrossTrade MW · National Bank of Malawi', name:'CrossTrade Escrow — MWK', acct:'1002 3344 5566', rail:'EFT'},
    MZN:{bank:'CrossTrade MZ · BCI Moçambique', name:'CrossTrade Escrow — MZN', acct:'1188 4455 6677 001', rail:'SIMO / EFT'},
    BRL:{bank:'CrossTrade BR · Banco Inter', name:'CrossTrade Escrow — BRL', acct:'BR97 0036 0305 0001 0000 9795 493P 1', rail:'Pix'},
    PHP:{bank:'CrossTrade PH · BDO Unibank', name:'CrossTrade Escrow — PHP', acct:'0011 2233 4455', rail:'InstaPay'},
  };
  /* escrow wallets for crypto-side deposits */
  const ADMIN_WALLETS = {
    XLM:{name:'CrossTrade Escrow — XLM', addr:'GCCTRXLMESCROW7QF4K2HOLDPENDINGSCREEN7WALLETXXXX'},
    USDC:{name:'CrossTrade Escrow — USDC', addr:'GCCTRUSDCESCROW9K3M7HOLDPENDINGSCREEN9WALLETXXXX'},
    AQUA:{name:'CrossTrade Escrow — AQUA', addr:'GCCTRAQUAESCROW4P8N2HOLDPENDINGSCREEN4WALLETXXXX'},
    yXLM:{name:'CrossTrade Escrow — yXLM', addr:'GCCTRYXLMSCROW6T2W9HOLDPENDINGSCREEN6WALLETXXXX'},
    BTC:{name:'CrossTrade Escrow — BTC', addr:'bc1qctradeescrow7k9holdpendingscreeningwallet0x'},
    ETH:{name:'CrossTrade Escrow — ETH', addr:'0xC7055TradeEscrow9K3HoldPendingScreeningWallet42'},
    USDT:{name:'CrossTrade Escrow — USDT', addr:'0xC7055TradeEscrowUSDT7HoldPendingScreeningWlt88'},
    XRP:{name:'CrossTrade Escrow — XRP', addr:'rCrossTradeEscrowXRP9HoldPendingScreeningWltXx'},
    BNB:{name:'CrossTrade Escrow — BNB', addr:'0xC7055TradeEscrowBNB4HoldPendingScreeningWlt21'},
  };
  /* admin console overrides (accounts / wallets / fees) */
  try {
    const ovAcc = store.read('ct-admin-accounts', null);
    if (ovAcc) Object.keys(ovAcc).forEach(k => { if (ADMIN_ACCOUNTS[k]) ADMIN_ACCOUNTS[k] = {...ADMIN_ACCOUNTS[k], ...ovAcc[k]}; });
    const ovWal = store.read('ct-admin-wallets', null);
    if (ovWal) Object.keys(ovWal).forEach(k => { if (ADMIN_WALLETS[k]) ADMIN_WALLETS[k] = {...ADMIN_WALLETS[k], ...ovWal[k]}; });
    const ovFee = store.read('ct-admin-fees', null);
    if (ovFee) {
      if (ovFee.corridor != null) FEES.corridor = ovFee.corridor / 100;
      if (ovFee.sell != null) FEES.sell = ovFee.sell / 100;
      if (ovFee.pool != null) FEES.pool = ovFee.pool / 100;
      if (ovFee.methods) Object.keys(ovFee.methods).forEach(k => { if (PAY_METHODS[k]) PAY_METHODS[k].fee = ovFee.methods[k] / 100; });
    }
  } catch (e) {}

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
  const isFiat  = sym => ASSETS[sym].kind === 'fiat';
  const fmt = (n, sym) => {
    const d = isFiat(sym) ? 2 : ASSETS[sym].px >= 100 ? 2 : ASSETS[sym].px >= 0.01 ? 4 : 6;
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  const money  = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const newRef = () => 'CT-W' + Math.random().toString(36).slice(2, 8).toUpperCase();

  /* push the trade into the admin console escrow queue (same shape as the app) */
  function pushToAdminQueue(rec) {
    try {
      const q = store.read('ct-admin-queue', []);
      q.unshift(rec);
      store.write('ct-admin-queue', q.slice(0, 50));
    } catch (e) {}
  }

  /* ---------- widget styles (scoped inside shadow DOM) ---------- */
  const CSS = `
    :host { all: initial; display: block; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
    .ctw {
      width: 100%; max-width: 420px; border-radius: 18px; padding: 18px;
      font-family: 'Inter', system-ui, sans-serif; color: var(--ink);
      background: var(--bg); border: 1px solid var(--line);
      --grad: linear-gradient(135deg, #6a48f2, #a86fff 55%, #fc9fdf);
    }
    .ctw.dark { --bg:#0b0714; --bg2:#141026; --ink:#f3f0ff; --muted:#9a93b8; --line:rgba(168,111,255,.22); --fld:#171129; }
    .ctw.light { --bg:#ffffff; --bg2:#f6f3ff; --ink:#17122b; --muted:#6d6690; --line:rgba(106,72,242,.25); --fld:#f3f0fc; }
    .head { display:flex; align-items:center; gap:9px; margin-bottom:12px; }
    .logo { width:26px; height:26px; border-radius:8px; background:var(--grad); display:flex; align-items:center; justify-content:center;
            font-family:'Bebas Neue', sans-serif; font-size:16px; color:#fff; letter-spacing:.5px; }
    .brand { font-family:'Bebas Neue', sans-serif; font-size:19px; letter-spacing:2.5px; color:var(--ink); }
    .brand small { font-size:9px; letter-spacing:1.5px; color:var(--muted); display:block; margin-top:-3px; font-family:'Inter',sans-serif; font-weight:600; }
    .refpill { margin-left:auto; font-size:9.5px; font-weight:700; letter-spacing:.8px; color:#a86fff;
               border:1px solid rgba(168,111,255,.4); padding:3px 8px; border-radius:99px; white-space:nowrap; }
    .tabs { display:flex; gap:4px; background:var(--fld); border:1px solid var(--line); border-radius:11px; padding:4px; margin-bottom:13px; }
    .tabs button { flex:1; border:none; background:none; color:var(--muted); font-size:12px; font-weight:700; padding:7px 0;
                   border-radius:8px; cursor:pointer; font-family:'Inter',sans-serif; transition:all .2s; }
    .tabs button.on { background:var(--bg2); color:var(--ink); box-shadow:inset 0 0 0 1px var(--line); }
    .box { background:var(--fld); border:1px solid var(--line); border-radius:13px; padding:11px 13px; }
    .box label { font-size:10px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:var(--muted); display:block; margin-bottom:6px; }
    .row { display:flex; align-items:center; gap:10px; }
    input.amt { flex:1; min-width:0; background:none; border:none; outline:none; color:var(--ink);
                font-family:'JetBrains Mono', monospace; font-size:21px; font-weight:600; }
    input.amt::placeholder { color:var(--muted); opacity:.55; }
    select.cur { background:var(--bg2); color:var(--ink); border:1px solid var(--line); border-radius:99px;
                 padding:6px 10px; font-size:12.5px; font-weight:700; outline:none; cursor:pointer; max-width:122px; }
    .usd { font-size:11px; color:var(--muted); font-family:'JetBrains Mono', monospace; margin-top:5px; }
    .flip { display:flex; justify-content:center; margin:-6px 0; position:relative; z-index:1; }
    .flip button { width:32px; height:32px; border-radius:50%; border:1px solid var(--line); background:var(--bg2);
                   color:#a86fff; font-size:15px; cursor:pointer; transition:transform .25s; line-height:1; }
    .flip button:hover { transform:rotate(180deg); }
    .extra { margin-top:11px; }
    .extra .box { padding:10px 13px; }
    .paysel { width:100%; background:var(--bg2); color:var(--ink); border:1px solid var(--line); border-radius:10px;
              padding:9px 11px; font-size:12.5px; font-weight:600; outline:none; cursor:pointer; }
    .flds input { width:100%; background:var(--bg2); border:1px solid var(--line); border-radius:9px; padding:9px 11px;
                  color:var(--ink); font-size:12px; outline:none; font-family:'Inter',sans-serif; margin-top:6px; }
    .flds input:first-child { margin-top:0; }
    .flds input::placeholder, .dest input::placeholder { color:var(--muted); opacity:.6; }
    .meta { margin:12px 2px 0; font-size:11.5px; color:var(--muted); }
    .meta div { display:flex; justify-content:space-between; padding:3px 0; }
    .meta b { color:var(--ink); font-family:'JetBrains Mono', monospace; font-weight:600; text-align:right; }
    .dest { margin-top:12px; }
    .dest input { width:100%; background:var(--fld); border:1px solid var(--line); border-radius:11px; padding:10px 12px;
                  color:var(--ink); font-size:12.5px; outline:none; font-family:'Inter',sans-serif; }
    .go { width:100%; margin-top:13px; border:none; border-radius:13px; padding:13px; cursor:pointer;
          background:var(--grad); color:#fff; font-size:13px; font-weight:800; letter-spacing:1px; text-transform:uppercase;
          transition:opacity .2s, transform .1s; font-family:'Inter',sans-serif; }
    .go:hover { opacity:.92; } .go:active { transform:scale(.985); }
    .go:disabled { opacity:.55; cursor:default; }
    .foot { margin-top:11px; text-align:center; font-size:10px; color:var(--muted); letter-spacing:.4px; }
    .foot a { color:#a86fff; text-decoration:none; font-weight:700; }
    /* success state */
    .done { text-align:center; padding:22px 6px 8px; }
    .check { width:52px; height:52px; margin:0 auto 14px; border-radius:50%; background:var(--grad);
             display:flex; align-items:center; justify-content:center; font-size:24px; color:#fff; }
    .done h3 { font-family:'Bebas Neue', sans-serif; font-size:21px; letter-spacing:1.5px; color:var(--ink); margin-bottom:6px; }
    .done p { font-size:12px; color:var(--muted); line-height:1.55; }
    .done .ref { font-family:'JetBrains Mono', monospace; color:var(--ink); font-weight:600; }
    .escrow { margin-top:12px; font-size:10.5px; color:var(--muted); border:1px dashed var(--line); border-radius:10px; padding:8px 11px; line-height:1.5; }
    .earn { margin:13px 0 3px; background:var(--fld); border:1px solid var(--line); border-radius:11px; padding:10px 12px; text-align:left; }
    .earn div { display:flex; justify-content:space-between; font-size:11px; color:var(--muted); padding:2.5px 0; }
    .earn b { color:#2fd47e; font-family:'JetBrains Mono', monospace; font-weight:600; }
    .again { margin-top:14px; background:none; border:1px solid var(--line); color:var(--ink); border-radius:11px;
             padding:9px 18px; font-size:12px; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; }
    .spin { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff;
            border-radius:50%; animation:ctw-rot .7s linear infinite; vertical-align:-2px; margin-right:7px; }
    @keyframes ctw-rot { to { transform:rotate(360deg); } }
    /* rate-lock countdown chip */
    .lock { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:11px;
            background:var(--fld); border:1px solid var(--line); border-radius:10px; padding:8px 12px;
            font-size:11px; color:var(--muted); }
    .lock b { font-family:'JetBrains Mono', monospace; font-weight:600; color:var(--ink); font-size:12.5px; }
    .lock.live b { color:#2fd47e; }
    .lock.warn { border-color:rgba(252,159,223,.55); }
    .lock.warn b { color:#fc9fdf; }
    .lock.expired b { color:#ff7b7b; }
    .lock .re { background:none; border:1px solid var(--line); color:#a86fff; border-radius:8px; padding:3px 10px;
                font-size:10.5px; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; }
    /* settlement / deposit panel on success */
    .dep { margin:13px 0 0; background:var(--fld); border:1px solid var(--line); border-radius:11px; padding:12px 13px; text-align:left; }
    .dep .dh { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
    .dep .dt { font-size:9.5px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:#a86fff; }
    .dep .cpb { background:none; border:1px solid var(--line); color:#a86fff; border-radius:7px; padding:2px 9px;
                font-size:10px; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; }
    .dep .dr { display:flex; justify-content:space-between; gap:14px; font-size:11px; color:var(--muted); padding:3px 0; }
    .dep .dr b { color:var(--ink); font-family:'JetBrains Mono', monospace; font-weight:600; text-align:right; word-break:break-all; }
    @media (max-width:440px){ .ctw{ max-width:100%; } }
  `;

  /* ---------- per-mode defaults and currency rules ---------- */
  const MODE_DEFAULTS = {
    swap: { from: 'USD',  to: 'NGN'  },
    buy:  { from: 'USD',  to: 'XLM'  },
    sell: { from: 'XLM',  to: 'ZAR'  },
  };
  function allowed(mode, side) {
    if (mode === 'swap') return SYMS;
    if (mode === 'buy')  return side === 'from' ? FIAT : CRYPTO;
    return side === 'from' ? CRYPTO : FIAT; /* sell */
  }
  const feeRateFor = st =>
    st.mode === 'buy'  ? PAY_METHODS[st.payMethod].fee :
    st.mode === 'sell' ? FEES.sell :
    (isFiat(st.from) && isFiat(st.to)) ? FEES.corridor : FEES.pool;
  const feeNameFor = st =>
    st.mode === 'buy'  ? 'ramp fee' :
    st.mode === 'sell' ? 'off-ramp fee' :
    (isFiat(st.from) && isFiat(st.to)) ? 'corridor fee' : 'pool fee';

  /* ---------- widget ---------- */
  function buildWidget(host, cfg) {
    const shadow = host.attachShadow({ mode: 'open' });

    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap';

    const style = document.createElement('style');
    style.textContent = CSS;

    const root = document.createElement('div');
    root.className = 'ctw ' + (cfg.theme === 'light' ? 'light' : 'dark');

    const st = {
      mode: ['swap', 'buy', 'sell'].includes(cfg.mode) ? cfg.mode : 'swap',
      from: MODE_DEFAULTS[cfg.mode] && allowed(cfg.mode, 'from').includes(cfg.from) ? cfg.from : (MODE_DEFAULTS[cfg.mode] || MODE_DEFAULTS.swap).from,
      to:   MODE_DEFAULTS[cfg.mode] && allowed(cfg.mode, 'to').includes(cfg.to)     ? cfg.to   : (MODE_DEFAULTS[cfg.mode] || MODE_DEFAULTS.swap).to,
      payMethod: 'card',
    };

    root.innerHTML = `
      <div class="head">
        <div class="logo">C</div>
        <div class="brand">CROSSTRADE<small>SWAP · BUY · SELL</small></div>
        ${cfg.ref ? `<div class="refpill" title="This embed earns referral income">REF · ${cfg.ref}</div>` : ''}
      </div>
      <div class="tabs">
        <button data-m="swap" type="button">Swap</button>
        <button data-m="buy"  type="button">Buy</button>
        <button data-m="sell" type="button">Sell</button>
      </div>
      <div class="swapview"></div>
      <div class="foot">Powered by <a href="https://crosstrade.app" target="_blank" rel="noopener">CrossTrade</a> · <a href="https://crosstrade.app/embed.html" target="_blank" rel="noopener">get this widget</a> · simulated demo</div>
    `;

    shadow.append(fonts, style, root);
    const $ = sel => shadow.querySelector(sel);
    const view = root.querySelector('.swapview');

    /* ---------- 60-minute rate lock countdown ---------- */
    const LOCK_MS = 60 * 60 * 1000;
    let lockExp = Date.now() + LOCK_MS, lockTimer = null, lockBox = null;
    const lockLeft = () => Math.max(0, lockExp - Date.now());
    function tickLock() {
      if (!lockBox || !lockBox.isConnected) { clearInterval(lockTimer); lockTimer = null; return; }
      const ms = lockLeft();
      const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
      const b = lockBox.querySelector('b');
      if (b) b.textContent = ms ? `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : 'expired';
      lockBox.classList.toggle('warn', ms > 0 && ms < 5 * 60000);
      lockBox.classList.toggle('expired', !ms);
      const re = lockBox.querySelector('.re');
      if (re) re.style.display = ms ? 'none' : '';
      const lbl = lockBox.querySelector('span');
      if (lbl) lbl.textContent = ms ? 'Rate locked — trade expires in' : 'Rate lock expired';
    }
    function mountLock() {
      lockBox = $('#wLock');
      if (!lockBox) return;
      if (!lockTimer) lockTimer = setInterval(tickLock, 1000);
      tickLock();
    }
    function refreshLock() {
      lockExp = Date.now() + LOCK_MS;
      if (lockBox && lockBox.isConnected) tickLock();
    }

    const opts = (list, sel) => list.map(s =>
      `<option value="${s}" ${s === sel ? 'selected' : ''}>${ASSETS[s].flag ? ASSETS[s].flag + ' ' : ''}${s}</option>`).join('');

    /* ---------- form ---------- */
    function renderForm() {
      const ff = st.mode === 'swap' && isFiat(st.from) && isFiat(st.to);
      const needRecipients = ff || st.mode === 'sell';
      const extra = st.mode === 'buy' ? `
        <div class="extra"><div class="box">
          <label>Pay with</label>
          <select class="paysel" id="wPay">
            ${Object.keys(PAY_METHODS).map(k => `<option value="${k}" ${k === st.payMethod ? 'selected' : ''}>${PAY_METHODS[k].label} · ${(PAY_METHODS[k].fee * 100).toFixed(1)}% · ${PAY_METHODS[k].speed}</option>`).join('')}
          </select>
        </div></div>`
      : needRecipients ? `
        <div class="extra"><div class="box">
          <label>${ff ? 'Recipient details' : 'Payout account'}</label>
          <div class="flds">
            <input id="wRcpName" placeholder="Recipient full name">
            <input id="wRcpAcct" placeholder="Account number / IBAN / mobile money">
            <input id="wRcpBank" placeholder="Bank / provider name">
          </div>
        </div></div>` : '';

      view.innerHTML = `
        <div class="box">
          <label>${st.mode === 'buy' ? 'You pay' : 'You send'}</label>
          <div class="row">
            <input class="amt" id="wAmtIn" type="number" min="0" step="any" value="${cfg.amount}" placeholder="0.00">
            <select class="cur" id="wFrom">${opts(allowed(st.mode, 'from'), st.from)}</select>
          </div>
          <div class="usd" id="wUsdIn"></div>
        </div>
        ${st.mode === 'swap' ? '<div class="flip"><button id="wFlip" title="Flip pair" type="button">⇅</button></div>' : '<div style="height:10px"></div>'}
        <div class="box">
          <label>${st.mode === 'sell' ? 'You receive (fiat)' : 'They receive'}</label>
          <div class="row">
            <input class="amt" id="wAmtOut" type="text" readonly placeholder="0.00">
            <select class="cur" id="wTo">${opts(allowed(st.mode, 'to'), st.to)}</select>
          </div>
          <div class="usd" id="wUsdOut"></div>
        </div>
        ${extra}
        <div class="meta">
          <div><span>Rate</span><b id="wRate"></b></div>
          <div><span id="wFeeLbl">Fee</span><b id="wFee"></b></div>
          <div><span>Settlement</span><b>~5 sec · Stellar</b></div>
        </div>
        <div class="lock live" id="wLock"><span>Rate locked — trade expires in</span><b>60:00</b><button class="re" type="button" style="display:none">Refresh rate</button></div>
        ${st.mode !== 'sell' && !ff ? '<div class="dest"><input id="wDest" type="text" placeholder="Recipient wallet address or bank account"></div>' : ''}
        <button class="go" id="wGo" type="button"></button>
      `;

      $('#wAmtIn').addEventListener('input', quote);
      $('#wFrom').addEventListener('change', e => { st.from = e.target.value; if (st.mode === 'swap') renderForm(); else quote(); });
      $('#wTo').addEventListener('change', e => { st.to = e.target.value; if (st.mode === 'swap') renderForm(); else quote(); });
      const pay = $('#wPay'); if (pay) pay.addEventListener('change', e => { st.payMethod = e.target.value; quote(); });
      const flip = $('#wFlip'); if (flip) flip.addEventListener('click', () => { const f = st.from; st.from = st.to; st.to = f; renderForm(); });
      $('#wGo').addEventListener('click', submit);
      const reBtn = $('#wLock .re');
      if (reBtn) reBtn.addEventListener('click', refreshLock);
      mountLock();
      quote();
    }

    /* ---------- quote ---------- */
    function quote() {
      const a = parseFloat(($('#wAmtIn') || {}).value) || 0;
      const outEl = $('#wAmtOut');
      const f = st.from, t = st.to;
      if (!a || a <= 0 || f === t) {
        outEl.value = ''; $('#wUsdIn').textContent = ''; $('#wUsdOut').textContent = '';
        $('#wRate').textContent = f === t ? 'pick two different currencies' : '—';
        $('#wFee').textContent = ''; updateCta(0); return null;
      }
      const rate = feeRateFor(st);
      const feeUsd = usdOf(f, a) * rate;
      const net = convert(f, t, a * (1 - rate));
      outEl.value = fmt(net, t);
      $('#wUsdIn').textContent  = '≈ ' + money(usdOf(f, a));
      $('#wUsdOut').textContent = '≈ ' + money(usdOf(t, net));
      $('#wRate').textContent   = `1 ${f} ≈ ${fmt(convert(f, t, 1), t)} ${t}`;
      $('#wFeeLbl').textContent = `${feeNameFor(st)} (${(rate * 100).toFixed(1)}%)`;
      $('#wFee').textContent    = money(feeUsd) + (cfg.ref ? ` · you earn ${money(feeUsd * REF_LEVELS[0])}` : '');
      updateCta(a);
      return { a, f, t, net, feeUsd, rate };
    }

    function updateCta(a) {
      const btn = $('#wGo');
      if (!btn) return;
      const ff = st.mode === 'swap' && isFiat(st.from) && isFiat(st.to);
      const label = !a || a <= 0 ? 'Enter an amount'
        : st.mode === 'buy'  ? `Buy ${st.to} with ${st.from}`
        : st.mode === 'sell' ? `Sell ${st.from} for ${st.to}`
        : ff ? `Send ${st.from} · Receive ${st.to}`
        : `Swap ${st.from} → ${st.to}`;
      btn.textContent = label;
      btn.disabled = !a || a <= 0 || st.from === st.to;
    }

    /* ---------- submit ---------- */
    function submit() {
      const q = quote();
      if (!q) return;
      const ff = st.mode === 'swap' && isFiat(q.f) && isFiat(q.t);
      const rcp = {
        name: ($('#wRcpName') || {}).value ? $('#wRcpName').value.trim() : '',
        acct: ($('#wRcpAcct') || {}).value ? $('#wRcpAcct').value.trim() : '',
        bank: ($('#wRcpBank') || {}).value ? $('#wRcpBank').value.trim() : '',
      };
      const dest = ($('#wDest') || {}).value ? $('#wDest').value.trim() : '';
      if ((ff || st.mode === 'sell') && (!rcp.name || !rcp.acct || !rcp.bank)) {
        ['#wRcpName', '#wRcpAcct', '#wRcpBank'].forEach(sel => {
          const el = $(sel);
          if (el && !el.value.trim()) { el.style.borderColor = '#fc9fdf'; setTimeout(() => el.style.borderColor = '', 1200); }
        });
        return;
      }
      const btn = $('#wGo');
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"></span>Settling on Stellar…';

      setTimeout(() => {
        const swapRef = newRef();
        const pair = `${q.f}→${q.t}`;
        const paid = creditReferrals(cfg.ref, q.feeUsd, swapRef, pair);

        /* record for the referral dashboard */
        const swaps = store.read(K_SWAPS, []);
        swaps.push({ ref: swapRef, mode: st.mode, from: q.f, to: q.t, amount: q.a, received: q.net,
                     feeUsd: q.feeUsd, widgetRef: cfg.ref || null,
                     dest: dest || rcp.acct || '—', ts: Date.now() });
        store.write(K_SWAPS, swaps);

        /* record for the admin console escrow queue */
        pushToAdminQueue({
          ref: swapRef, t: Date.now(), type: ff ? 'fiat' : st.mode,
          fromSym: q.f, fromAmt: q.a, toSym: q.t, toAmt: q.net,
          sender: { name: 'Widget embed' + (cfg.ref ? ' · ' + cfg.ref : ''), acct: dest || 'widget' },
          recipient: (ff || st.mode === 'sell') ? rcp : { name: 'Self · wallet', acct: dest || '—', bank: '—' },
          status: 'pending',
        });

        const title = ff ? 'TRANSFER BOOKED'
          : st.mode === 'sell' ? 'SELL ORDER BOOKED'
          : st.mode === 'buy'  ? 'PURCHASE BOOKED' : 'SWAP COMPLETE';
        const sub = ff
          ? `Sent <span class="ref">${fmt(q.a, q.f)} ${q.f}</span> → <span class="ref">${rcp.name}</span> at ${rcp.bank} receives <span class="ref">${fmt(q.net, q.t)} ${q.t}</span>`
          : st.mode === 'sell'
          ? `Sold <span class="ref">${fmt(q.a, q.f)} ${q.f}</span> → <span class="ref">${rcp.name}</span> at ${rcp.bank} receives <span class="ref">${fmt(q.net, q.t)} ${q.t}</span>`
          : st.mode === 'buy'
          ? `Paid <span class="ref">${fmt(q.a, q.f)} ${q.f}</span> via ${PAY_METHODS[st.payMethod].label} → you receive <span class="ref">${fmt(q.net, q.t)} ${q.t}</span>`
          : `Sent <span class="ref">${fmt(q.a, q.f)} ${q.f}</span> → recipient gets <span class="ref">${fmt(q.net, q.t)} ${q.t}</span>`;

        /* deposit instructions: settlement account (fiat in) or escrow wallet (crypto in) */
        const acc = isFiat(q.f) ? ADMIN_ACCOUNTS[q.f] : null;
        const wal = !isFiat(q.f) ? ADMIN_WALLETS[q.f] : null;
        const depPanel = acc ? `
          <div class="dep">
            <div class="dh"><span class="dt">Deposit to — CrossTrade settlement account</span><button class="cpb" id="wCopyAcct" type="button">Copy account no.</button></div>
            <div class="dr"><span>Bank</span><b>${acc.bank}</b></div>
            <div class="dr"><span>Account name</span><b>${acc.name}</b></div>
            <div class="dr"><span>Account number</span><b>${acc.acct}</b></div>
            <div class="dr"><span>Pay via</span><b>${acc.rail}</b></div>
            <div class="dr"><span>Reference</span><b style="color:#a86fff">${swapRef}</b></div>
          </div>`
        : wal ? `
          <div class="dep">
            <div class="dh"><span class="dt">Send to — CrossTrade escrow wallet</span><button class="cpb" id="wCopyAcct" type="button">Copy address</button></div>
            <div class="dr"><span>Wallet</span><b>${wal.name}</b></div>
            <div class="dr"><span>Address</span><b style="font-size:9.5px">${wal.addr}</b></div>
            <div class="dr"><span>Memo / reference</span><b style="color:#a86fff">${swapRef}</b></div>
          </div>` : '';

        view.innerHTML = `
          <div class="done">
            <div class="check">✓</div>
            <h3>${title}</h3>
            <p>${sub}<br>Reference <span class="ref">${swapRef}</span></p>
            <div class="lock live" id="wLock"><span>Rate locked — trade expires in</span><b>60:00</b><button class="re" type="button" style="display:none">Refresh rate</button></div>
            ${depPanel}
            <div class="escrow">Funds are held in the CrossTrade escrow ${isFiat(q.f) ? 'settlement account' : 'wallet'} for compliance screening — released to the destination on approval, refunded if rejected.</div>
            ${paid.length ? `<div class="earn">
              ${paid.map(p => `<div><span>Level ${p.level} referral · ${p.code}</span><b>+${money(p.amount)}</b></div>`).join('')}
            </div>` : ''}
            <button class="again" id="wAgain" type="button">New ${st.mode === 'buy' ? 'purchase' : st.mode === 'sell' ? 'sale' : 'swap'}</button>
          </div>`;
        const copyBtn = $('#wCopyAcct');
        if (copyBtn && acc) copyBtn.addEventListener('click', () => {
          navigator.clipboard && navigator.clipboard.writeText(acc.acct).then(() => { copyBtn.textContent = 'Copied ✓'; setTimeout(() => copyBtn.textContent = 'Copy account no.', 1500); });
        });
        if (copyBtn && wal) copyBtn.addEventListener('click', () => {
          navigator.clipboard && navigator.clipboard.writeText(wal.addr).then(() => { copyBtn.textContent = 'Copied ✓'; setTimeout(() => copyBtn.textContent = 'Copy address', 1500); });
        });
        const reBtn2 = $('#wLock .re');
        if (reBtn2) reBtn2.addEventListener('click', refreshLock);
        mountLock();
        $('#wAgain').addEventListener('click', () => { refreshLock(); renderForm(); });
      }, 1600);
    }

    /* ---------- tabs ---------- */
    root.querySelectorAll('.tabs button').forEach(b => {
      if (b.dataset.m === st.mode) b.classList.add('on');
      b.addEventListener('click', () => {
        st.mode = b.dataset.m;
        const d = MODE_DEFAULTS[st.mode];
        if (!allowed(st.mode, 'from').includes(st.from)) st.from = d.from;
        if (!allowed(st.mode, 'to').includes(st.to))     st.to   = d.to;
        if (st.from === st.to) { st.from = d.from; st.to = d.to; }
        root.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
        renderForm();
      });
    });

    renderForm();
  }

  /* ---------- boot: find every embed tag ---------- */
  function boot() {
    /* pattern 1: <script src=".../ct-widget.js" data-...></script> */
    document.querySelectorAll('script[src*="ct-widget.js"][data-ref]').forEach(s => {
      if (s.dataset.ctMounted) return;
      s.dataset.ctMounted = '1';
      const host = document.createElement('div');
      host.className = 'ct-swap-widget';
      s.parentNode.insertBefore(host, s.nextSibling);
      buildWidget(host, {
        ref:    (s.dataset.ref || '').trim().toUpperCase() || null,
        theme:  (s.dataset.theme || 'dark').toLowerCase(),
        mode:   (s.dataset.mode || 'swap').toLowerCase(),
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
        mode:   (d.dataset.mode || 'swap').toLowerCase(),
        from:   (d.dataset.from || 'USD').toUpperCase(),
        to:     (d.dataset.to || 'NGN').toUpperCase(),
        amount: d.dataset.amount || '500',
      });
    });
  }
  /* allow host pages to re-scan after dynamically adding embed tags */
  window.__ctBoot = boot;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
