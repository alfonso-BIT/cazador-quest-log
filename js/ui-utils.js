// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ui-utils.js — §17 FONT/TAB · PERFIL · RADAR · ACHIEVEMENTS           ║
// ║  Exporta: changeFontSize(), setFont(), applyMobileTypography(),        ║
// ║           switchTab(), toggleAllQuests(), tick(), escH(), localISO(),  ║
// ║           setPeriod(), renderPerfil(), drawRadar(), renderSummary(),   ║
// ║           evalAchievement(), getAchievProgress()                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// ║  §17 — FONT SIZE / TAB CONTROL                                          ║
// ║  Propósito: Control de tamaño de texto (T−/T+), activación de tabs y   ║
// ║  despliegue del banco de misiones. --fs-scale escala toda la tipografía.║
// ║  Funciones: changeFontSize(), setFont(), switchTab(), toggleAllQuests() ║
// ╚══════════════════════════════════════════════════════════════════════════╝
let currentFontSize = 15;
const FONT_MIN = 11, FONT_MAX = 22;
const FONT_BASE = 15; // base px for scale calculation

// ── Tamaños óptimos por dispositivo (Material Design 3 / Apple HIG) ──────────
// Desktop: base 15px  → escala 1.0
// Tablet:  base 15px  → escala 1.0  (pantalla amplia, distancia media)
// Mobile:  base 16px  → escala 1.067 (contenido), inputs 16px (evita zoom iOS)
// Mobile small (<360px): base 14px → escala 0.933
const FONT_DEVICE = { desktop: 15, tablet: 15, mobile: 16, 'mobile-small': 14 };

function changeFontSize(delta){
  currentFontSize = Math.min(FONT_MAX, Math.max(FONT_MIN, currentFontSize + delta));
  document.documentElement.style.setProperty('--base-font', currentFontSize+'px');
  document.documentElement.style.setProperty('--fs-scale', (currentFontSize / FONT_BASE).toFixed(4));
  document.body.style.fontSize = currentFontSize+'px';
  const el = document.getElementById('fontVal');
  if(el) el.textContent = currentFontSize+'px';
  if(currentUser) localStorage.setItem(getUserKey(currentUser)+'_font', currentFontSize);
  // Marcar que el usuario ajustó manualmente — no sobreescribir con detección auto
  document.body.setAttribute('data-font-manual', '1');
}

function setFont(size){
  currentFontSize = size;
  document.documentElement.style.setProperty('--base-font', size+'px');
  document.documentElement.style.setProperty('--fs-scale', (size / FONT_BASE).toFixed(4));
  document.body.style.fontSize = size+'px';
  const el = document.getElementById('fontVal');
  if(el) el.textContent = size+'px';
  if(currentUser) localStorage.setItem(getUserKey(currentUser)+'_font', size);
}

// ── Detección automática de tipografía óptima según dispositivo ───────────────
// Se aplica al inicio. Respeta preferencia manual guardada del usuario.
// Estándares aplicados:
//   · Material Design 3: body ≥14sp, label ≥12sp, microtexto ≥10sp
//   · Apple HIG: Dynamic Type — texto mínimo visible 11pt
//   · WCAG 2.1 AA: ratio de contraste + tamaño mínimo de texto ≥14px normal / ≥11px bold
//   · iOS Safari: inputs ≥16px para evitar zoom automático en focus
function applyMobileTypography(userHasSavedFont){
  // Si el usuario ya tiene tamaño preferido guardado, respetar su elección
  if(userHasSavedFont) return;

  const w = window.innerWidth;
  const isTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
  const isNarrow = w <= 480;
  const isTiny   = w <= 360;

  let deviceType, targetSize;
  if(isTiny){
    deviceType = 'mobile-small';
    targetSize = FONT_DEVICE['mobile-small']; // 14px
  } else if(isNarrow || isTouch){
    deviceType = 'mobile';
    targetSize = FONT_DEVICE['mobile'];        // 16px
  } else if(w <= 1024){
    deviceType = 'tablet';
    targetSize = FONT_DEVICE['tablet'];        // 15px
  } else {
    deviceType = 'desktop';
    targetSize = FONT_DEVICE['desktop'];       // 15px
  }

  // Aplicar solo si difiere del tamaño actual para evitar reflujo innecesario
  if(targetSize !== currentFontSize){
    setFont(targetSize);
  }

  // Exponer variables CSS adicionales para que responsive.css las use
  // --mob-body: tamaño de cuerpo en móvil (contenido principal)
  // --mob-label: etiquetas y metadatos
  // --mob-micro: microtextos (badges, fechas, lettering)
  // --mob-input: inputs (16px fijo para evitar zoom iOS)
  // --mob-title: títulos de sección
  // --mob-hero: valores grandes (nivel, XP total)
  const root = document.documentElement;
  if(isNarrow || isTouch){
    root.style.setProperty('--mob-body',  '14px');
    root.style.setProperty('--mob-label', '12px');
    root.style.setProperty('--mob-micro', '10px');
    root.style.setProperty('--mob-input', '16px');
    root.style.setProperty('--mob-title', '11px');
    root.style.setProperty('--mob-hero',  isTiny ? '18px' : '22px');
    document.body.setAttribute('data-mob', isTouch ? 'touch' : 'narrow');
  } else {
    // Desktop/tablet — usar variables neutras que no fuercen nada
    root.style.setProperty('--mob-body',  'inherit');
    root.style.setProperty('--mob-label', 'inherit');
    root.style.setProperty('--mob-micro', 'inherit');
    root.style.setProperty('--mob-input', 'inherit');
    root.style.setProperty('--mob-title', 'inherit');
    root.style.setProperty('--mob-hero',  'inherit');
  }

  return deviceType;
}

// ═══════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════
function switchTab(tab){
  // redirect legacy 'allquests' calls → open missions + expand bank
  if(tab === 'allquests'){ switchTab('missions'); toggleAllQuests(true); return; }
  // Only nav-bar tabs get the .active highlight (perfil and config use icon buttons)
  const navTabs=['missions','shop','inventory','dinero','biblioteca'];
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',navTabs[i]===tab));
  document.querySelectorAll('.tabcontent').forEach(c=>c.classList.remove('active'));
  const tabEl = document.getElementById('tab-'+tab);
  if(tabEl) tabEl.classList.add('active');
  // Icon buttons (⚙️ config, 📊 perfil) — highlight the active one
  document.querySelectorAll('.pcard-icon-btn').forEach(btn=>{
    const t = btn.getAttribute('onclick')||'';
    const match = t.match(/switchTab\('(\w+)'\)/);
    if(match) btn.classList.toggle('active-tab', match[1]===tab);
  });
  // Render each tab on demand
  if(tab==='missions')   renderAllQuests();
  if(tab==='shop')       renderShop();
  if(tab==='inventory')  renderInventory();
  if(tab==='perfil')     renderPerfil();
  if(tab==='dinero')     renderFinTab();
  if(tab==='datos')      renderDatosTab();
  if(tab==='biblioteca') renderBiblioteca();
  // Persist active tab only when it actually changes
  if(S && S.activeTab !== tab){
    S.activeTab = tab;
    save();
  }
}

function toggleAllQuests(forceOpen){
  const panel = document.getElementById('allQuestsPanel');
  const btn   = document.getElementById('allQuestsToggleBtn');
  if(!panel || !btn) return;
  const isOpen = panel.style.display !== 'none';
  const open   = forceOpen !== undefined ? forceOpen : !isOpen;
  panel.style.display = open ? 'block' : 'none';
  btn.textContent = open ? '−' : '+';
  btn.style.borderColor = open ? 'rgba(0,170,255,0.7)' : 'rgba(0,170,255,0.4)';
  if(open) renderAllQuests();
}

// ═══════════════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════════════
function tick(){
  const now=new Date();
  const sysTimeEl=document.getElementById('sysTime');
  if(sysTimeEl){
    sysTimeEl.textContent=
      now.toLocaleDateString('es-CO',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).toUpperCase()
      +' — '+now.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  const rh=(S&&S.resetHour)||0;
  const md=new Date(now); md.setHours(rh,0,0,0);
  if(md<=now) md.setDate(md.getDate()+1);
  const diff=md-now;
  const hh=String(Math.floor(diff/3600000)).padStart(2,'0');
  const mm=String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
  const ss=String(Math.floor((diff%60000)/1000)).padStart(2,'0');
  const rcd=document.getElementById('rcd');
  if(rcd) rcd.textContent=hh+':'+mm+':'+ss;
}

function escH(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// Returns YYYY-MM-DD using LOCAL time (avoids UTC offset bugs for users in Colombia / other TZ)
function localISO(d){ const dt=d||new Date(); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; }

// ═══════════════════════════════════════════════════════
// PERFIL — RADAR + ESTADÍSTICAS
// ═══════════════════════════════════════════════════════
// currentPeriod declared at top-level scope

function setPeriod(p){
  currentPeriod = p;
  S.profilePeriod = p;
  save();
  document.getElementById('pt-week').classList.toggle('active', p==='week');
  document.getElementById('pt-month').classList.toggle('active', p==='month');
  renderPerfil();
}

// Obtiene conteo REAL de misiones por categoría filtrando dailyLog por fechas
function getCatDataForPeriod(){
  if(!S.dailyLog || !S.dailyLog.length) return {};
  const now = new Date();
  const cutoff = new Date(now);
  if(currentPeriod === 'week'){
    cutoff.setDate(now.getDate() - 7);
  } else {
    cutoff.setDate(now.getDate() - 30);
  }
  const cutoffStr = localISO(cutoff);
  const result = {};
  S.dailyLog.forEach(entry=>{
    if(entry.date >= cutoffStr){
      const cats = entry.cats||{};
      Object.entries(cats).forEach(([cat,n])=>{
        result[cat]=(result[cat]||0)+n;
      });
    }
  });
  return result;
}

// Obtiene XP y misiones totales del período desde dailyLog
function getPeriodTotals(){
  if(!S.dailyLog || !S.dailyLog.length) return {xp:0, missions:0};
  const now = new Date();
  const cutoff = new Date(now);
  if(currentPeriod === 'week') cutoff.setDate(now.getDate()-7);
  else cutoff.setDate(now.getDate()-30);
  const cutoffStr = localISO(cutoff);
  let xp=0, missions=0;
  S.dailyLog.forEach(e=>{
    if(e.date>=cutoffStr){ xp+=(e.xp||0); missions+=(e.missions||0); }
  });
  return {xp, missions};
}


function renderPerfil(){
  if(!S) return;
  // Hero
  const cls = detectClass();
  document.getElementById('profileName').textContent = S.name;
  document.getElementById('profileLvl').textContent = 'LV.'+S.lvl;
  document.getElementById('profileClass').textContent = cls ? '▸ '+cls.emoji+' '+cls.name : '▸ CAZADOR INDEPENDIENTE';
  document.getElementById('profileAvatar').textContent = cls ? cls.avatar : '⚔️';

  const catData = getCatDataForPeriod();
  const cats = ['salud','guerrero','estudio','lectura','habitos','creatividad','mental'];
  const labels = ['💪 SALUD','⚔️ GUERRERO','📚 ESTUDIO','📖 LECTURA','🌟 HÁBITOS','🎨 CREATIVIDAD','🧘 MENTAL'];
  const colors = ['#4ade80','#ff6b35','#c084fc','#a855f7','#94a3b8','#f0c040','#60a5fa'];

  const vals = cats.map(c => catData[c]||0);
  const maxVal = Math.max(...vals, 1);

  drawRadar(vals, maxVal, labels, colors);
  renderCatBars(cats, labels, colors, vals, maxVal);
  renderSummary();
  renderAchievements();
  renderMoodHistory();
}

function renderMoodHistory(){
  const el = document.getElementById('moodHistory'); if(!el) return;
  if(!S) return;
  const FACES = ['😭','😔','😐','😄','🤩'];
  const LABELS_S = ['PÉSIMO','MAL','REGULAR','BIEN','EXCELENTE'];
  const COLORS = ['#ff4466','#f0a040','#f0c040','#4ade80','#c084fc'];

  // Get last 14 days with mood data
  if(!S.dailyLog || !S.dailyLog.length){
    el.innerHTML='<div style="text-align:center;color:var(--muted);font-size:11px;padding:12px;">Aún no hay registros de ánimo. ¡Empieza hoy en la pestaña MISIONES!</div>';
    return;
  }

  const now = new Date();
  const days = [];
  for(let i=13;i>=0;i--){
    const d = new Date(now);
    d.setDate(now.getDate()-i);
    const iso = localISO(d);
    const entry = S.dailyLog.find(e=>e.date===iso);
    const mood = entry&&entry.mood!==undefined ? entry.mood : null;
    const dayLabel = d.toLocaleDateString('es-CO',{weekday:'short',day:'numeric'}).toUpperCase();
    days.push({iso, mood, label:dayLabel});
  }

  // Filter only current period
  const cutoff = new Date(now);
  if(currentPeriod==='week') cutoff.setDate(now.getDate()-7);
  else cutoff.setDate(now.getDate()-30);
  const cutoffStr = localISO(cutoff);

  // Weekly average
  const withMood = days.filter(d=>d.mood!==null && d.iso>=cutoffStr);
  const avg = withMood.length ? (withMood.reduce((s,d)=>s+d.mood,0)/withMood.length) : null;
  const avgLabel = avg!==null ? FACES[Math.round(avg)]+' '+LABELS_S[Math.round(avg)] : 'N/A';

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px;">
      <span style="font-family:'Orbitron',monospace;font-size:9px;color:#60a5fa;letter-spacing:2px;">ÚLTIMOS 14 DÍAS</span>
      <span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--muted);letter-spacing:1px;">PROMEDIO: <span style="color:var(--bright)">${avgLabel}</span></span>
    </div>
    <div style="display:flex;gap:4px;align-items:flex-end;justify-content:space-between;height:60px;">
      ${days.map(d=>{
        const inPeriod = d.iso>=cutoffStr;
        if(d.mood===null){
          return `<div title="${d.label}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
            <div style="flex:1;border-bottom:1px dashed rgba(0,100,200,0.15);width:100%;"></div>
            <div style="font-size:7px;color:rgba(96,144,176,0.3);letter-spacing:0;text-align:center;line-height:1.2;">${d.label.split(' ')[0]}</div>
          </div>`;
        }
        const h = [12,24,38,52,60][d.mood];
        const col = COLORS[d.mood];
        const op = inPeriod ? 1 : 0.35;
        return `<div title="${d.label}: ${LABELS_S[d.mood]}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:default;opacity:${op};">
          <div style="font-size:${10+d.mood*2}px;line-height:1;">${FACES[d.mood]}</div>
          <div style="width:100%;height:${h}px;background:${col};opacity:0.55;border-radius:1px;"></div>
          <div style="font-size:7px;color:rgba(96,144,176,0.6);letter-spacing:0;text-align:center;line-height:1.2;">${d.label.split(' ')[0]}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function drawRadar(vals, maxVal, labels, colors){
  const svg = document.getElementById('radarSVG');
  const cx=160, cy=148, R=100, n=vals.length;
  const rings = [0.25,0.5,0.75,1];
  const angles = vals.map((_,i)=>( (2*Math.PI*i/n) - Math.PI/2 ));

  function pt(r,a){ return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; }

  let html = '';

  // Rings
  rings.forEach(ring=>{
    const pts = angles.map(a=>pt(R*ring,a).join(',')).join(' ');
    html += `<polygon points="${pts}" fill="none" stroke="rgba(0,100,200,0.2)" stroke-width="1"/>`;
  });

  // Axes
  angles.forEach((a,i)=>{
    const [x,y] = pt(R,a);
    html += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(0,100,200,0.18)" stroke-width="1"/>`;
  });

  // Data polygon
  const dataR = vals.map(v=>R*(v/maxVal));
  const polyPts = angles.map((a,i)=>pt(dataR[i],a).join(',')).join(' ');
  html += `<polygon points="${polyPts}" fill="rgba(0,170,255,0.12)" stroke="#00aaff" stroke-width="2" stroke-linejoin="round"/>`;

  // Data dots
  angles.forEach((a,i)=>{
    const [x,y] = pt(dataR[i],a);
    html += `<circle cx="${x}" cy="${y}" r="5" fill="${colors[i]}" stroke="#020810" stroke-width="1.5"/>`;
    // Glow dot
    html += `<circle cx="${x}" cy="${y}" r="9" fill="${colors[i]}" opacity="0.18"/>`;
  });

  // Labels
  const LABEL_R = R + 22;
  angles.forEach((a,i)=>{
    const [x,y] = pt(LABEL_R,a);
    const anchor = Math.cos(a) > 0.1 ? 'start' : Math.cos(a) < -0.1 ? 'end' : 'middle';
    const dy = Math.sin(a) > 0.1 ? 4 : Math.sin(a) < -0.1 ? -4 : 0;
    const parts = labels[i].split(' ');
    const icon = parts[0];
    const lbl = parts[1]||'';
    html += `<text x="${x}" y="${y+dy}" text-anchor="${anchor}" font-family="Rajdhani,sans-serif" font-size="10" font-weight="700" fill="${colors[i]}" letter-spacing="1">${icon} ${lbl}</text>`;
    // Value
    if(vals[i]>0){
      const [vx,vy] = pt(dataR[i],a);
      html += `<text x="${vx}" y="${vy-9}" text-anchor="middle" font-family="Orbitron,monospace" font-size="9" fill="#e8f4ff">${vals[i]}</text>`;
    }
  });

  // Center label
  html += `<text x="${cx}" y="${cy+4}" text-anchor="middle" font-family="Orbitron,monospace" font-size="10" fill="rgba(0,170,255,0.5)" letter-spacing="2">XP</text>`;

  svg.innerHTML = html;
}

function renderCatBars(cats, labels, colors, vals, maxVal){
  const el = document.getElementById('catBars'); if(!el) return;
  const icons = ['💪','⚔️','📚','📖','🌟','🎨','🧘'];
  const names = ['SALUD','GUERRERO','ESTUDIO','LECTURA','HÁBITOS','CREATIVIDAD','MENTAL'];
  el.innerHTML = cats.map((c,i)=>{
    const pct = maxVal>0 ? Math.round((vals[i]/maxVal)*100) : 0;
    return `<div class="sbar-row">
      <div class="sbar-ico">${icons[i]}</div>
      <div class="sbar-lbl" style="color:${colors[i]};font-size:9px;letter-spacing:1px;">${names[i]}</div>
      <div class="sbar-track">
        <div class="sbar-fill" style="width:${pct}%;background:${colors[i]};"></div>
      </div>
      <div class="sbar-val">${vals[i]}</div>
    </div>`;
  }).join('');
}

function renderSummary(){
  const el = document.getElementById('summaryGrid'); if(!el) return;
  const period = currentPeriod==='week'?'SEMANA':'MES';
  const totals = getPeriodTotals();
  const catData = getCatDataForPeriod();
  const topIcons = {salud:'💪',guerrero:'⚔️',estudio:'📚',lectura:'📖',habitos:'🌟',creatividad:'🎨',mental:'🧘'};
  const topCat = Object.entries(catData).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0];
  const topLabel = topCat ? (topIcons[topCat[0]]||'⚡')+' '+(topCat[0].toUpperCase()) : 'N/A';

  el.innerHTML = `
    <div class="smbox"><div class="smval" style="color:var(--gold)">${totals.xp}</div><div class="smkey">XP ESTA ${period}</div></div>
    <div class="smbox"><div class="smval" style="color:var(--green)">${totals.missions}</div><div class="smkey">MISIONES ${period}</div></div>
    <div class="smbox"><div class="smval" style="color:var(--blue)">${S.streak}</div><div class="smkey">RACHA DÍAS</div></div>
    <div class="smbox"><div class="smval" style="font-size:calc(13px * var(--fs-scale));letter-spacing:0;">${topLabel}</div><div class="smkey">CAT. DOMINANTE</div></div>
  `;
}

function evalAchievement(a){
  const cc = S.catCounts||{};
  switch(a.type){
    case 'totalComp': return S.totalComp >= a.target;
    case 'streak':    return S.streak >= a.target;
    case 'level':     return S.lvl >= a.target;
    case 'totalXP':   return S.totalXP >= a.target;
    case 'catMax':    return Object.values(cc).some(v=>v>=a.target);
    case 'redeem':    return S.items.some(it=>it.red);
    case 'custom':    return false; // custom achievements are manual
    default:          return false;
  }
}

function getAchievProgress(a){
  const cc = S.catCounts||{};
  switch(a.type){
    case 'totalComp': return {cur:S.totalComp,   max:a.target};
    case 'streak':    return {cur:S.streak,       max:a.target};
    case 'level':     return {cur:S.lvl,          max:a.target};
    case 'totalXP':   return {cur:S.totalXP,      max:a.target};
    case 'catMax':    return {cur:Math.max(0,...Object.values(cc),0), max:a.target};
    case 'redeem':    return {cur:S.items.filter(it=>it.red).length, max:a.target};
    default:          return {cur:0, max:a.target};
  }
}


