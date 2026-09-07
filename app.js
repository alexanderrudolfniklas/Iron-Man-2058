
(() => {
  'use strict';

  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, {once:true});
    } else {
      fn();
    }
  }

  ready(() => {
    // Smooth in-page navigation for top nav.
    document.querySelectorAll('a[href^="#"]:not([data-view])').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
        history.replaceState(null, '', id);
      });
    });

    // Company Intelligence: one open card at a time.
    const cards = [...document.querySelectorAll('#intel details.intel-details')];
    cards.forEach(card => {
      card.addEventListener('toggle', () => {
        if (!card.open) return;
        cards.forEach(other => {
          if (other !== card) other.open = false;
        });
        // Keep opened card comfortably in view on iPad.
        setTimeout(() => card.scrollIntoView({behavior:'smooth', block:'start'}), 40);
      });
    });

    // Make cards keyboard/touch friendly if summary exists.
    document.querySelectorAll('#intel details > summary').forEach(summary => {
      summary.setAttribute('role', 'button');
      summary.setAttribute('tabindex', '0');
    });

    // Live "last opened" stamp.
    const stamp = document.querySelector('[data-live-stamp]');
    if (stamp) {
      const now = new Date();
      stamp.textContent = now.toLocaleString('de-DE', {
        dateStyle:'short', timeStyle:'short'
      });
    }

    // Prevent accidental double-tap zoom on controls while keeping pinch zoom.
    document.querySelectorAll('button, summary, nav a').forEach(el => {
      el.style.touchAction = 'manipulation';
    });
  });
})();


/* Legacy cockpit logic preserved below */

(() => {
  'use strict';
  const CFG = {
    invested: 9045.37,
    stockCost: 4465.40, etfCost: 3379.98, btcCost: 1199.99,
    etfShares: 35.3982, btcQty: 0.0142484,
    holdings: { MSFT:{shares:3,cost:1288.20}, ADP:{shares:4,cost:991.80}, KO:{shares:14,cost:1078.98}, 'BNP.PA':{shares:10,cost:1036.20} },
    tickers: [
      ['MSFT','USD'],['V','USD'],['AVGO','USD'],['SPGI','USD'],['ADP','USD'],['ASML','USD'],['SU.PA','EUR'],['JNJ','USD'],['ABBV','USD'],['MDT','USD'],['KO','USD'],['PEP','USD'],['PG','USD'],['MCD','USD'],['ALV.DE','EUR'],['MUV2.DE','EUR'],['BNP.PA','EUR'],['AI.PA','EUR'],['DTE.DE','EUR'],['NEE','USD']
    ],
    etfTicker:'EUNL.DE', btcTicker:'BTC-EUR', fxTicker:'EURUSD=X'
  };
  const $=id=>document.getElementById(id);
  const eur=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2});
  const num=(v,d=2)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
  const signed=(v,suffix=' €')=>(v>=0?'+':'−')+num(Math.abs(v),2)+suffix;
  const pct=v=>(v>=0?'+':'−')+num(Math.abs(v),2)+' %';
  function cls(el,v){ if(!el)return; el.classList.remove('pos','neg'); el.classList.add(v>=0?'pos':'neg'); }
  function yahooURLs(symbol){
    const y='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?interval=1d&range=5d&includePrePost=false';
    return [y,'https://corsproxy.io/?url='+encodeURIComponent(y),'https://api.allorigins.win/raw?url='+encodeURIComponent(y)];
  }
  async function getChart(symbol){
    let last;
    for(const u of yahooURLs(symbol)){
      try{
        const r=await fetch(u,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
        const j=await r.json(); const x=j?.chart?.result?.[0]; if(!x) throw new Error('keine Daten');
        const m=x.meta||{}, q=x.indicators?.quote?.[0]?.close||[];
        const closes=q.filter(Number.isFinite);
        const price=Number.isFinite(m.regularMarketPrice)?m.regularMarketPrice:closes.at(-1);
        const prev=Number.isFinite(m.chartPreviousClose)?m.chartPreviousClose:(closes.length>1?closes.at(-2):price);
        if(!Number.isFinite(price)) throw new Error('kein Kurs');
        return {price,prev,changePct:prev?((price/prev)-1)*100:0,currency:m.currency||'',time:m.regularMarketTime||Date.now()/1000};
      }catch(e){last=e}
    }
    throw last||new Error('Abruf fehlgeschlagen');
  }
  function setStatus(txt,kind='warn'){ const e=$('liveStatus'); e.textContent=txt; e.classList.remove('live-ok','live-warn','live-bad'); e.classList.add('live-'+kind); }
  function topRows(){ return [...document.querySelectorAll('#top20 tbody tr')]; }
  function updateTopRow(i,data,eurUsd){
    const row=topRows()[i], cur=CFG.tickers[i][1]; if(!row)return;
    const eurPrice=cur==='USD'?data.price/eurUsd:data.price;
    const cells=row.children;
    cells[5].textContent=eur.format(eurPrice);
    cells[6].textContent=pct(data.changePct); cells[6].style.color=data.changePct>=0?'var(--ok)':'#ff6868'; cells[6].style.fontWeight='800';
    const sym=CFG.tickers[i][0], h=CFG.holdings[sym];
    if(h){
      const val=h.shares*eurPrice, gain=val-h.cost, gp=gain/h.cost*100;
      cells[8].textContent=eur.format(val);
      cells[9].innerHTML='<span class="'+(gain>=0?'pos':'neg')+'">'+signed(gain)+' / '+pct(gp)+'</span>';
    }
  }
  function updateIntel(i,data){
    const box=$('intel-'+(i+1)); if(!box)return;
    const p=box.querySelector('.quote-price'), c=box.querySelector('.quote-change'), small=box.querySelector('.chart-placeholder small');
    if(p) p.textContent=num(data.price,2)+' '+(data.currency||CFG.tickers[i][1]);
    if(c){ c.textContent=pct(data.changePct)+' · LIVE'; c.classList.remove('positive','negative'); c.classList.add(data.changePct>=0?'positive':'negative'); }
    if(small) small.textContent='Live-Markt-Snapshot · automatisch geladen';
  }
  function updatePortfolioBox(i,eurPrice){
    const sym=CFG.tickers[i][0], h=CFG.holdings[sym]; if(!h)return; const box=$('intel-'+(i+1)); if(!box)return;
    const rows=[...box.querySelectorAll('.portfolio-box .row')]; const val=h.shares*eurPrice, gain=val-h.cost, gp=gain/h.cost*100;
    if(rows[2]) rows[2].querySelector('b').textContent=eur.format(val);
    if(rows[3]){ const b=rows[3].querySelector('b'); b.textContent=signed(gain)+' / '+pct(gp); b.className=gain>=0?'pos':'neg'; }
  }
  const RANGE={"1M":['1mo','1d'],"3M":['3mo','1d'],"1J":['1y','1d'],"5J":['5y','1wk'],"MAX":['max','1mo']};
  // Offline fallback: verified MSFT monthly closes from Sep 2025-Aug 2026 + 04.09.2026 snapshot.
  const EMBEDDED_HISTORY={MSFT:[['2025-09-30',517.95],['2025-10-31',517.81],['2025-11-30',492.01],['2025-12-31',483.62],['2026-01-31',430.29],['2026-02-28',392.74],['2026-03-31',370.17],['2026-04-30',407.78],['2026-05-29',450.24],['2026-06-30',373.02],['2026-07-31',464.72],['2026-08-28',513.53],['2026-09-04',499.70]].map(x=>({t:Date.parse(x[0]+'T12:00:00Z'),v:x[1]}))};
  async function getHistory(symbol,rangeKey){
    const [range,interval]=RANGE[rangeKey]||RANGE['1J'];
    const y='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?interval='+interval+'&range='+range+'&includePrePost=false&events=div%2Csplits';
    const urls=[y,'https://corsproxy.io/?url='+encodeURIComponent(y),'https://api.allorigins.win/raw?url='+encodeURIComponent(y)];
    let last;
    for(const u of urls){try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();const x=j?.chart?.result?.[0];if(!x)throw new Error('keine Daten');const ts=x.timestamp||[];const q=x.indicators?.quote?.[0]?.close||[];const pts=ts.map((t,i)=>({t:t*1000,v:q[i]})).filter(p=>Number.isFinite(p.v));if(pts.length<2)throw new Error('zu wenige Daten');return {pts,currency:x.meta?.currency||''};}catch(e){last=e}}
    throw last||new Error('Abruf fehlgeschlagen');
  }
  function makeMarketChart(box,i){
    if(!box||box.dataset.chartReady)return;box.dataset.chartReady='1';
    const qp=box.querySelector('.quote-box'); if(!qp)return;
    const old=qp.querySelector('.chart-placeholder');
    const wrap=document.createElement('div');wrap.className='market-chart';wrap.innerHTML='<div class="market-chart-controls">'+Object.keys(RANGE).map(k=>'<button type="button" data-r="'+k+'"'+(k==='1J'?' class="active"':'')+'>'+k+'</button>').join('')+'</div><div class="market-chart-stage"><div class="market-chart-loading">Kursverlauf wird geladen …</div></div><div class="market-chart-meta"><span class="mc-period">1 Jahr</span><span class="mc-change">—</span></div><div class="market-chart-tooltip"></div>';
    if(old) old.insertAdjacentElement('afterend',wrap); else qp.appendChild(wrap);
    wrap.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{wrap.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));loadAndDrawChart(box,i,b.dataset.r);}));
    loadAndDrawChart(box,i,'1J');
  }
  async function loadAndDrawChart(box,i,rk){
    const wrap=box.querySelector('.market-chart'),stage=wrap?.querySelector('.market-chart-stage');if(!wrap||!stage)return;stage.innerHTML='<div class="market-chart-loading">Kursverlauf wird geladen …</div>';
    try{const h=await getHistory(CFG.tickers[i][0],rk);drawMarketChart(wrap,h.pts,h.currency,rk);const fb=box.querySelector('.chart-placeholder');if(fb)fb.style.display='none';}catch(e){const sym=CFG.tickers[i][0],fbPts=EMBEDDED_HISTORY[sym];if(fbPts&&fbPts.length>1){drawMarketChart(wrap,fbPts,CFG.tickers[i][1],'1J');wrap.querySelector('.mc-period').textContent='1 Jahr · offline eingebettet';wrap.querySelectorAll('.market-chart-controls button').forEach(b=>{b.disabled=b.dataset.r!=='1J';b.title=b.disabled?'Offline derzeit nur 1J eingebettet':''});const fb=box.querySelector('.chart-placeholder');if(fb)fb.style.display='none';}else{stage.innerHTML='<div class="market-chart-loading">Historische Kursdaten auf diesem Gerät noch nicht offline eingebettet</div>';}}
  }
  function drawMarketChart(wrap,pts,currency,rk){
    const stage=wrap.querySelector('.market-chart-stage'),W=680,H=150,pad={l:10,r:10,t:10,b:18};const vals=pts.map(p=>p.v),min=Math.min(...vals),max=Math.max(...vals),span=Math.max(max-min,1e-9);const x=n=>pad.l+n/(pts.length-1)*(W-pad.l-pad.r),y=v=>pad.t+(max-v)/span*(H-pad.t-pad.b);
    const line=pts.map((p,n)=>(n?'L':'M')+x(n).toFixed(1)+','+y(p.v).toFixed(1)).join(' ');const area=line+' L'+x(pts.length-1).toFixed(1)+','+(H-pad.b)+' L'+x(0).toFixed(1)+','+(H-pad.b)+' Z';
    const first=pts[0].v,last=pts.at(-1).v,chg=(last/first-1)*100;const d0=new Date(pts[0].t),d1=new Date(pts.at(-1).t);const fd=d=>d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
    stage.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Interaktiver Kursverlauf"><defs><linearGradient id="mcGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#d5a73f"/><stop offset="100%" stop-color="#d5a73f" stop-opacity="0"/></linearGradient></defs><line class="mc-grid" x1="10" x2="670" y1="35" y2="35"/><line class="mc-grid" x1="10" x2="670" y1="75" y2="75"/><line class="mc-grid" x1="10" x2="670" y1="115" y2="115"/><path class="mc-area" d="'+area+'"/><path class="mc-line" d="'+line+'"/><line class="mc-cross" x1="0" x2="0" y1="10" y2="132" style="display:none"/><circle class="mc-dot" cx="0" cy="0" r="4" style="display:none"/><text class="mc-label" x="10" y="146">'+fd(d0)+'</text><text class="mc-label" x="670" y="146" text-anchor="end">'+fd(d1)+'</text></svg>';
    wrap.querySelector('.mc-period').textContent=({'1M':'1 Monat','3M':'3 Monate','1J':'1 Jahr','5J':'5 Jahre','MAX':'Maximal'})[rk]||rk;const mc=wrap.querySelector('.mc-change');mc.textContent=(chg>=0?'+':'−')+num(Math.abs(chg),2)+' % · Hoch '+num(max,2)+' · Tief '+num(min,2);mc.style.color=chg>=0?'var(--ok)':'#ff6868';
    const svg=stage.querySelector('svg'),cross=svg.querySelector('.mc-cross'),dot=svg.querySelector('.mc-dot'),tip=wrap.querySelector('.market-chart-tooltip');
    function pick(ev){const rect=svg.getBoundingClientRect(),px=Math.max(0,Math.min(rect.width,ev.clientX-rect.left)),idx=Math.round(px/rect.width*(pts.length-1)),p=pts[idx],sx=x(idx),sy=y(p.v);cross.style.display='';cross.setAttribute('x1',sx);cross.setAttribute('x2',sx);dot.style.display='';dot.setAttribute('cx',sx);dot.setAttribute('cy',sy);tip.style.display='block';tip.textContent=new Date(p.t).toLocaleDateString('de-DE')+' · '+num(p.v,2)+' '+currency;tip.style.left=(sx/W*100)+'%';tip.style.top=(sy/H*150+10)+'px';}
    svg.addEventListener('pointermove',pick);svg.addEventListener('pointerdown',pick);svg.addEventListener('pointerleave',()=>{if(!matchMedia('(pointer:coarse)').matches){cross.style.display='none';dot.style.display='none';tip.style.display='none';}});
  }
  document.querySelectorAll('.intel-details').forEach((box,i)=>box.addEventListener('toggle',()=>{if(box.open)makeMarketChart(box,i);},{passive:true}));

  async function refresh(){
    const btn=$('liveRefresh'); btn.disabled=true; setStatus('LIVE · lädt…','warn');
    try{
      const fx=await getChart(CFG.fxTicker); const eurUsd=fx.price;
      const jobs=CFG.tickers.map(([s])=>getChart(s).then(d=>({ok:true,d})).catch(e=>({ok:false,e})));
      const extra=[getChart(CFG.etfTicker),getChart(CFG.btcTicker)];
      const [stocks,etf,btc]=await Promise.all([Promise.all(jobs),...extra]);
      let stockValue=0, ok=0;
      stocks.forEach((r,i)=>{ if(!r.ok)return; ok++; updateTopRow(i,r.d,eurUsd); updateIntel(i,r.d); const cur=CFG.tickers[i][1], ep=cur==='USD'?r.d.price/eurUsd:r.d.price; updatePortfolioBox(i,ep); const h=CFG.holdings[CFG.tickers[i][0]]; if(h) stockValue+=h.shares*ep; });
      // Held stock fallback if one of the held tickers failed: preserve baseline proportion rather than falsify a live total.
      const heldOk=['MSFT','ADP','KO','BNP.PA'].every(sym=>{const i=CFG.tickers.findIndex(x=>x[0]===sym); return stocks[i]?.ok});
      const etfValue=CFG.etfShares*etf.price; const btcValue=CFG.btcQty*btc.price;
      if(heldOk){
        const total=stockValue+etfValue+btcValue, gain=total-CFG.invested, perf=gain/CFG.invested*100;
        $('kpiTotalValue').textContent=eur.format(total); $('kpiGain').textContent=signed(gain); cls($('kpiGain'),gain); $('kpiPerf').textContent=pct(perf); cls($('kpiPerf'),perf);
        $('kpiStocks').textContent=eur.format(stockValue); const sg=stockValue-CFG.stockCost; $('kpiStocksSub').innerHTML='Einstand '+eur.format(CFG.stockCost)+' · Ergebnis <span class="'+(sg>=0?'pos':'neg')+'">'+signed(sg)+'</span>';
        $('kpiEtf').textContent=eur.format(etfValue); const eg=etfValue-CFG.etfCost; $('kpiEtfSub').innerHTML='Einstand '+eur.format(CFG.etfCost)+' · <span class="'+(eg>=0?'pos':'neg')+'">'+signed(eg)+' / '+pct(eg/CFG.etfCost*100)+'</span>';
        $('kpiBtc').textContent=eur.format(btcValue); const bg=btcValue-CFG.btcCost; $('kpiBtcSub').innerHTML='Einstand '+eur.format(CFG.btcCost)+' · <span class="'+(bg>=0?'pos':'neg')+'">'+signed(bg)+' / '+pct(bg/CFG.btcCost*100)+'</span>';
      }
      const now=new Date(); const stamp=now.toLocaleString('de-DE',{dateStyle:'short',timeStyle:'medium'}); $('liveStamp').textContent='Zuletzt aktualisiert: '+stamp+' · '+ok+'/20 Aktien'; $('kpiTotalStamp').textContent='Aktien + ETF + Bitcoin · Live-Abruf '+stamp;
      setStatus(ok===20?'LIVE · aktuell':'LIVE · '+ok+'/20 Kurse','ok');
      document.querySelector('main').classList.add('live-flash'); setTimeout(()=>document.querySelector('main').classList.remove('live-flash'),600);
    }catch(e){
      console.error(e); setStatus('LIVE · Verbindung fehlgeschlagen','bad'); $('liveStamp').textContent='Baseline bleibt sichtbar · erneut versuchen';
    }finally{btn.disabled=false}
  }
  $('liveRefresh')?.addEventListener('click',refresh);
  window.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,250));
})();


(()=>{const root=document.querySelector('#intel-1 .native-market');if(!root)return;const tip=root.querySelector('.native-tooltip');root.querySelectorAll('.native-hit').forEach(p=>{const show=()=>{tip.textContent=p.dataset.date+' · '+Number(p.dataset.price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' USD';root.querySelectorAll('.native-dot').forEach(d=>d.style.r='2.5');};p.addEventListener('pointerdown',show);p.addEventListener('pointerenter',show);});})();


(()=>{
 const tip=document.getElementById('egTip');
 document.querySelectorAll('#egPts .eg-hit').forEach(p=>{
   const show=()=>{ if(tip) tip.innerHTML=p.dataset.date+'<br>'+p.dataset.price; };
   p.addEventListener('pointerenter',show); p.addEventListener('pointerdown',show); p.addEventListener('click',show);
 });
 document.querySelectorAll('.eg-range-row button').forEach(b=>b.addEventListener('click',()=>{
   document.querySelectorAll('.eg-range-row button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
 }));
})();

/* === FINAL hosted-app router: one tab = one real view === */
(() => {
  function initFinalRouter(){
    const main = document.querySelector('main.w');
    const nav = [...document.querySelectorAll('nav.tabs a[data-view]')];
    if(!main || !nav.length) return;

    // Build four genuinely independent views that did not exist in the legacy page.
    const mk = (view, title, html) => {
      const sec=document.createElement('section');
      sec.className='sec app-generated-view';
      sec.dataset.appView=view;
      sec.innerHTML='<h2>'+title+'</h2>'+html;
      return sec;
    };
    const firstExisting=document.getElementById('eg-dashboard');
    const dashboard=mk('dashboard','Mission Control', `
      <div class="grid">
        <article class="card"><div class="label">Investiertes Kapital</div><div class="big">9.045,37 €</div><div class="pos">+9,01 % Gesamtperformance</div></article>
        <article class="card"><div class="label">Portfolio aktuell</div><div class="big">9.859,95 €</div><div class="muted">Aktien + ETF + Bitcoin</div></article>
        <article class="card"><div class="label">Monatlicher Autopilot</div><div class="big gold">2.200 €</div><div class="muted">ETF 1.000 € · Top 20 1.000 € · Bitcoin 200 €</div></article>
        <article class="card"><div class="label">2058 · 7-%-Modell</div><div class="big">≈ 3,09 Mio. €</div><div class="muted">Langfristiges Basisszenario</div></article>
        <article class="card half"><div class="label">Portfolio-Aufteilung heute</div><div class="row"><span>Aktien</span><b>4.352,54 €</b></div><div class="row"><span>ETF</span><b>4.528,35 €</b></div><div class="row"><span>Bitcoin</span><b>979,06 €</b></div></article>
        <article class="card half"><div class="label">Nächste Aktion</div><div class="big">10.10.2026</div><div class="call">Nächster Aktienkauf: <b>1.000 €</b><br><span class="muted">Aus den Top 20 nach Bewertung, Qualität und Depotgewicht.</span></div></article>
      </div>`);
    const etf=mk('assets','ETF + Bitcoin · Core & Satellite', `<div class="grid"><article class="card half"><div class="label">ETF · aktueller Wert</div><div class="big">4.528,35 €</div><div class="row"><span>Einstand</span><b>3.379,98 €</b></div><div class="row"><span>Ergebnis</span><b class="pos">+1.148,37 € / +33,98 %</b></div></article><article class="card half"><div class="label">Autopilot</div><div class="big gold">1.000 € / Monat</div><div class="row"><span>Anteile</span><b>35,3982</b></div><div class="call">Globaler Core-Baustein des Iron-Man-2058-Portfolios.</div></article></div>`);
    const bitcoin=mk('bitcoin','Bitcoin', `<div class="grid"><article class="card half"><div class="label">Bitcoin · aktueller Wert</div><div class="big">979,06 €</div><div class="row"><span>Bestand</span><b>0,0142484 BTC</b></div><div class="row"><span>Einstand</span><b>1.199,99 €</b></div><div class="row"><span>Ergebnis</span><b class="neg">−220,93 € / −18,41 %</b></div></article><article class="card half"><div class="label">Autopilot</div><div class="big gold">200 € / Monat</div><div class="row"><span>Ø Einstand</span><b>84.219,98 € / BTC</b></div><div class="call">Langfristige Beimischung · 9,1 % des monatlichen Autopiloten.</div></article></div>`);
    const buys=mk('buys','Käufe', `<div class="grid"><article class="card full"><div class="label">Bisher erfasste Aktienkäufe</div><div class="row"><span>ADP · 4 Stück à 247,95 €</span><b>991,80 €</b></div><div class="row"><span>Coca-Cola · 14 Stück à 77,07 €</span><b>1.078,98 €</b></div><div class="row"><span>BNP Paribas · 10 Stück à 103,62 €</span><b>1.036,20 €</b></div><div class="row"><span>Microsoft · 3 Stück à 429,40 €</span><b>1.288,20 €</b></div><div class="call">Nächster Aktienkauf: <b>1.000 € · 10.10.2026</b></div></article></div>`);
    [dashboard,etf,bitcoin,buys].reverse().forEach(v=>main.insertBefore(v,firstExisting));

    const routes={
      dashboard:[dashboard,document.getElementById('capital'),document.getElementById('overview')],
      top20:[document.getElementById('eg-dashboard')], assets:[etf,bitcoin], buys:[buys],
      dividends:[document.getElementById('div')],
      market:[document.getElementById('intel')], goals:[document.getElementById('future')], lab:[document.getElementById('lab')]
    };
    const all=[...document.querySelectorAll('[data-app-section]'),...document.querySelectorAll('.app-generated-view')];
    // Decorative separators belong to the legacy long page and are hidden in app mode.
    main.querySelectorAll(':scope > hr').forEach(hr=>hr.style.display='none');

    function show(view,writeHash=true){
      if(!routes[view]) view='dashboard';
      const visible=new Set(routes[view].filter(Boolean));
      all.forEach(el=>{ el.style.setProperty('display',visible.has(el)?'':'none','important'); });
      nav.forEach(a=>{
        const on=a.dataset.view===view;
        a.classList.toggle('app-active',on);
        a.setAttribute('aria-current',on?'page':'false');
      });
      document.body.dataset.currentView=view;
      if(writeHash) history.replaceState(null,'','#'+view);
      window.scrollTo(0,0);
    }
    nav.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();show(a.dataset.view);},true));
    // Always open Mission Control first on a fresh/reloaded app launch.
    // Navigation still updates the hash while the user moves through the cockpit.
    show('dashboard',true);
    window.addEventListener('hashchange',()=>{
      const v=location.hash.replace(/^#(?:view=)?/,'');
      if(routes[v]) show(v,false);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initFinalRouter,{once:true});
  else initFinalRouter();
})();
