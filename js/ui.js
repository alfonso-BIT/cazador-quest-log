// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §10 — MAIN RENDER                                                      ║
// ║  Propósito: Orquesta el re-dibujado completo del estado de la UI.       ║
// ║  Actualiza player card, XP, stats, tabs activos y todos los módulos.    ║
// ║  Funciones: render(), switchTab(), tick(), toggleAllQuests(),           ║
// ║             escH(), localISO()                                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function render(){
  if(!S) return;
  // ── Player card ──
  document.getElementById('pname').textContent = currentUser ? currentUser.toUpperCase() : (S.name || 'CAZADOR');
  document.getElementById('plvl').textContent='LV.'+S.lvl;
  document.getElementById('prank').textContent=getRank();
  // ── Balance en player card ──
  const pcardBal = document.getElementById('pcardBalance');
  if(pcardBal){
    const bal = getTotalBalance();
    if(S.transactions && S.transactions.length > 0){
      pcardBal.style.display = 'block';
      pcardBal.textContent = (bal >= 0 ? '▲ ' : '▼ ') + formatCOP(Math.abs(bal));
      pcardBal.style.color = bal >= 0 ? 'var(--green)' : 'var(--danger)';
    } else {
      pcardBal.style.display = 'none';
    }
  }
  const pct=Math.min(100,Math.round((S.curXP/S.nextXP)*100));
  document.getElementById('xpbar').style.width=pct+'%';
  document.getElementById('xpdisp').textContent=S.curXP+' / '+S.nextXP+' XP';
  document.getElementById('stTotal').textContent=S.totalXP;
  document.getElementById('stStreak').textContent=S.streak;
  document.getElementById('stComp').textContent=S.totalComp;
  document.getElementById('todayxp').textContent='+'+S.todayXP;
  // ── ShopXP display en pestaña tienda ──
  const shopXPEl = document.getElementById('shopXPDisplay');
  if(shopXPEl) shopXPEl.textContent = S.shopXP || 0;
  const shopTotalEl = document.getElementById('shopTotalXPDisplay');
  if(shopTotalEl) shopTotalEl.textContent = S.totalXP;
  // ── Config inputs ──
  ['D','C','B','A','S'].forEach(r=>{
    const el=document.getElementById('xp-'+r);
    if(el) el.value=XPR[r];
  });
  const mbInp = document.getElementById('minBalInp');
  if(mbInp) mbInp.value = S.minBalance||0;
  updateMinBalStatus();
  updateResetUI();
  updateClassUI();
  // ── Misiones siempre (tab por defecto, datos críticos) ──
  renderDailyMissions();
  // ── Renders condicionales por tab activo ──
  const activeTab = S.activeTab || 'missions';
  if(activeTab === 'missions')   renderAllQuests();
  if(activeTab === 'shop')       renderShop();
  if(activeTab === 'inventory')  renderInventory();
  if(activeTab === 'perfil')     renderPerfil();
  if(activeTab === 'dinero')     renderFinTab();
  // ── Mood siempre visible en el tab de misiones ──
  renderMoodWidget();
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §11 — DAILY MISSIONS RENDER                                            ║
// ║  Propósito: Renderiza las 4 misiones diarias y sus tarjetas.            ║
// ║  El botón 🔀 llama swapDailyMission() para rotar sin borrar del banco.  ║
// ║  Funciones: renderDailyMissions(), renderMissionCard()                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function renderDailyMissions(){
  const el=document.getElementById('mlist');
  const daily=getDailyMissions();
  if(!daily.length){
    el.innerHTML='<div style="text-align:center;color:var(--muted);padding:28px;font-size:calc(12px * var(--fs-scale));letter-spacing:2px;">SIN MISIONES — AÑADE EN CONFIGURAR</div>';
    document.getElementById('progtxt').textContent='0 / 0 misiones mínimas completadas';
    document.getElementById('claimbtn').disabled=true;
    return;
  }
  el.innerHTML=daily.map(m=>renderMissionCard(m,true)).join('');
  const done=daily.filter(m=>m.done).length;
  document.getElementById('progtxt').textContent=done+' / '+daily.length+' misiones mínimas completadas';
  const allDone=daily.length>0&&daily.every(m=>m.done);
  const cb=document.getElementById('claimbtn');
  cb.disabled=!allDone||S.claimed;
  cb.textContent=S.claimed?'◈ RECOMPENSA YA RECLAMADA HOY ◈':'◈ RECLAMAR RECOMPENSA DIARIA ◈';
}

function renderMissionCard(m, fromDaily){
  const xp=m.xp||XPR[m.rank]||50;
  const ico=CAT_LABELS[m.cat]||'⚡';
  const isEditing=editingMissionId===m.id;
  return `
<div class="mcard ${m.done?'done':''} ${isEditing?'editing':''} ${m.fixed?'fixed-mission':''}" id="mc-${m.id}">
  <div class="mtop">
    <div class="mchk ${m.done?'yes':''}" onclick="toggle('${m.id}')">${m.done?'✓':''}</div>
    <div class="mcontent">
      <div class="mname">${escH(m.name)}</div>
      ${m.desc?`<div class="mdesc">${escH(m.desc)}</div>`:''}
      <div class="mfoot">
        <span class="mxp">+${xp} XP</span>
        <span class="mrnk r${m.rank.toLowerCase()}">${m.rank}-RANK</span>
        <span class="mtype">${ico}</span>
        ${m.fixed?'<span class="fixed-badge">FIJA</span>':''}
        <div class="mactions">
          <button class="act-btn edit" onclick="startEditMission('${m.id}',event)">✏</button>
          ${fromDaily
            ? `<button class="act-btn swap" onclick="swapDailyMission('${m.id}',event)" title="🔀 Cambiar por otra misión del banco (aleatoria)">🔀</button>`
            : `<button class="act-btn del" onclick="delMission('${m.id}',event)" title="Eliminar misión">✕</button>`
          }
        </div>
      </div>
    </div>
  </div>
  <div class="inline-edit ${isEditing?'show':''}" id="ie-${m.id}">
    <div class="ie-row"><label class="ie-lbl">Nombre</label><input class="ie-inp" id="ie-name-${m.id}" value="${escH(m.name)}"></div>
    <div class="ie-row"><label class="ie-lbl">Descripción</label><input class="ie-inp" id="ie-desc-${m.id}" value="${escH(m.desc||'')}"></div>
    <div class="ie-grid">
      <div class="ie-row">
        <label class="ie-lbl">Categoría</label>
        <select class="ie-sel" id="ie-cat-${m.id}">
          <option value="salud" ${m.cat==='salud'?'selected':''}>💪 Salud/Sanador</option>
          <option value="guerrero" ${m.cat==='guerrero'?'selected':''}>⚔️ Guerrero</option>
          <option value="estudio" ${m.cat==='estudio'?'selected':''}>📚 Mago</option>
          <option value="lectura" ${m.cat==='lectura'?'selected':''}>📖 Archimago</option>
          <option value="habitos" ${m.cat==='habitos'?'selected':''}>🌟 Asesino</option>
          <option value="creatividad" ${m.cat==='creatividad'?'selected':''}>🎨 Bardo</option>
          <option value="mental" ${m.cat==='mental'?'selected':''}>🧘 Monje</option>
        </select>
      </div>
      <div class="ie-row">
        <label class="ie-lbl">Rango</label>
        <select class="ie-sel" id="ie-rank-${m.id}">
          <option value="D" ${m.rank==='D'?'selected':''}>D — ${XPR.D} XP</option>
          <option value="C" ${m.rank==='C'?'selected':''}>C — ${XPR.C} XP</option>
          <option value="B" ${m.rank==='B'?'selected':''}>B — ${XPR.B} XP</option>
          <option value="A" ${m.rank==='A'?'selected':''}>A — ${XPR.A} XP</option>
          <option value="S" ${m.rank==='S'?'selected':''}>S — ${XPR.S} XP</option>
        </select>
      </div>
    </div>
    <div class="ie-row">
      <label class="ie-lbl">¿Misión fija?</label>
      <select class="ie-sel" id="ie-fixed-${m.id}">
        <option value="0" ${!m.fixed?'selected':''}>No — rotar</option>
        <option value="1" ${m.fixed?'selected':''}>Sí — siempre</option>
      </select>
    </div>
    <div class="ie-btns">
      <button class="ie-btn ok" onclick="saveEditMission('${m.id}')">✓ GUARDAR</button>
      <button class="ie-btn ko" onclick="cancelEditMission()">✕ CANCELAR</button>
      <button class="ie-btn" style="border-color:rgba(255,70,102,.4);color:var(--danger);flex:0.7;" onclick="delMission('${m.id}',event)">🗑 ELIMINAR</button>
    </div>
  </div>
</div>`;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §12 — ALL QUESTS                                                       ║
// ║  Propósito: Lista completa del banco de misiones con búsqueda y filtro  ║
// ║  por categoría. Se muestra expandible bajo las misiones del día.        ║
// ║  Funciones: renderAllQuests(), getTodayISODate(), logDailyMission()     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function renderAllQuests(){
  const el=document.getElementById('allQuestList');
  if(!el) return;
  const q=(document.getElementById('questSearch')||{}).value||'';
  const cat=(document.getElementById('questCatFilter')||{}).value||'';
  let list=S.missions.filter(m=>{
    const matchQ=!q||m.name.toLowerCase().includes(q.toLowerCase())||((m.desc||'').toLowerCase().includes(q.toLowerCase()));
    const matchC=!cat||m.cat===cat;
    return matchQ&&matchC;
  });
  if(!list.length){
    el.innerHTML='<div style="text-align:center;color:var(--muted);padding:28px;font-size:calc(12px * var(--fs-scale));letter-spacing:2px;">SIN RESULTADOS</div>';
    return;
  }
  el.innerHTML=list.map(m=>renderMissionCard(m,false)).join('');
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §13 — MISSION ACTIONS                                                  ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Contiene toda la lógica de interacción sobre misiones:      ║
// ║  marcar/desmarcar, editar inline, eliminar y reclamar recompensa.       ║
// ║                                                                          ║
// ║  ⚠ COMPORTAMIENTO DEL BOTÓN ✕:                                          ║
// ║    · En "MISIONES FIJAS HOY" (fromDaily=true):                          ║
// ║        ✕ llama swapDailyMission() — cambia esa misión por otra          ║
// ║        aleatoria de la misma categoría, sin borrarla del banco.         ║
// ║    · En "BANCO DE MISIONES" (fromDaily=false):                          ║
// ║        ✕ abre el editor inline igual que ✏.                            ║
// ║        El botón 🗑 ELIMINAR aparece dentro del editor.                  ║
// ║                                                                          ║
// ║  Funciones:                                                              ║
// ║   · getTodayISODate()       → fecha local YYYY-MM-DD con resetHour     ║
// ║   · logDailyMission(cat,xp,add) → actualiza S.dailyLog                 ║
// ║   · toggle(id)              → marca/desmarca, ajusta XP y catCounts     ║
// ║   · startEditMission(id,e)  → activa modo edición inline                ║
// ║   · cancelEditMission()     → cierra editor sin guardar                 ║
// ║   · saveEditMission(id)     → guarda cambios del editor inline          ║
// ║   · delMission(id,e)        → elimina con confirm() — desde editor      ║
// ║   · claimDaily()            → bonus diario si todo completado           ║
// ║   · swapDailyMission(id,e)  → sustituye la misión del día por otra     ║
// ║                               aleatoria de la misma categoría           ║
// ║                                                                          ║
// ║  HTML relacionado: .mcard, .inline-edit, .mchk, #claimbtn              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function getTodayISODate(){
  const now = new Date();
  const rh = S.resetHour||0;
  const d = new Date(now);
  if(now.getHours()<rh) d.setDate(d.getDate()-1);
  return localISO(d);
}

function logDailyMission(cat, xp, add){
  if(!S.dailyLog) S.dailyLog=[];
  const today = getTodayISODate();
  let entry = S.dailyLog.find(e=>e.date===today);
  if(!entry){ entry={date:today,cats:{},xp:0,missions:0}; S.dailyLog.push(entry); }
  if(!entry.cats) entry.cats={};
  if(add){
    entry.cats[cat]=(entry.cats[cat]||0)+1;
    entry.xp=(entry.xp||0)+xp;
    entry.missions=(entry.missions||0)+1;
  } else {
    entry.cats[cat]=Math.max(0,(entry.cats[cat]||0)-1);
    entry.xp=Math.max(0,(entry.xp||0)-xp);
    entry.missions=Math.max(0,(entry.missions||0)-1);
  }
  // Limit log to last 35 days to save space
  S.dailyLog = S.dailyLog.filter(e=>{
    const d=new Date(e.date); const now=new Date();
    return (now-d)/(1000*60*60*24)<=35;
  });
}

function toggle(id){
  const m=S.missions.find(x=>x.id===id);if(!m)return;
  if(m.done){
    m.done=false;
    gainXP(-(m.xp||XPR[m.rank]||50));
    S.totalComp=Math.max(0,S.totalComp-1);
    if(S.catCounts&&S.catCounts[m.cat]) S.catCounts[m.cat]=Math.max(0,(S.catCounts[m.cat]||1)-1);
    logDailyMission(m.cat, m.xp||XPR[m.rank]||50, false);
  } else {
    m.done=true;
    m.lastDoneDate=getTodayISODate(); // ISO YYYY-MM-DD para comparación exacta
    gainXP(m.xp||XPR[m.rank]||50);
    S.totalComp++;
    if(!S.catCounts) S.catCounts={};
    S.catCounts[m.cat]=(S.catCounts[m.cat]||0)+1;
    logDailyMission(m.cat, m.xp||XPR[m.rank]||50, true);
    notif('+'+(m.xp||XPR[m.rank]||50)+' XP ◈ '+m.name);
  }
  save(); render();
}

function startEditMission(id,e){ e.stopPropagation(); editingMissionId=id; render(); }
function cancelEditMission(){ editingMissionId=null; render(); }

function saveEditMission(id){
  const m=S.missions.find(x=>x.id===id); if(!m)return;
  const name=document.getElementById('ie-name-'+id).value.trim();
  if(!name){notif('⚠ EL NOMBRE NO PUEDE ESTAR VACÍO');return;}
  m.name=name;
  m.desc=document.getElementById('ie-desc-'+id).value.trim();
  m.cat=document.getElementById('ie-cat-'+id).value;
  m.rank=document.getElementById('ie-rank-'+id).value;
  m.xp=XPR[m.rank];
  m.fixed=document.getElementById('ie-fixed-'+id).value==='1';
  editingMissionId=null;
  // reassign daily if needed
  S.dailyAssigned=null; assignDailyMissions();
  save(); render(); notif('◈ MISIÓN ACTUALIZADA ◈');
}

function delMission(id,e){
  e.stopPropagation();
  if(confirm('¿Eliminar esta misión?')){
    const m=S.missions.find(x=>x.id===id);
    if(m&&m.done){gainXP(-(m.xp||XPR[m.rank]||50));S.totalComp=Math.max(0,S.totalComp-1);}
    S.missions=S.missions.filter(x=>x.id!==id);
    if(editingMissionId===id) editingMissionId=null;
    S.dailyAssigned=null; assignDailyMissions();
    save(); render();
  }
}

function claimDaily(){
  const daily=getDailyMissions();
  if(S.claimed||!daily.every(m=>m.done)) return;
  const bonus=Math.floor(60*(1+S.streak*0.12));
  gainXP(bonus); S.claimed=true; save(); render();
  notif('◈ RECOMPENSA DIARIA: +'+bonus+' XP BONUS ◈');
}

// ═══════════════════════════════════════════════════════════════════
// §13b — SWAP DAILY MISSION
// ─────────────────────────────────────────────────────────────────
// Reemplaza una misión del día de hoy por otra aleatoria del banco
// completo. No filtra por categoría — cualquier misión disponible
// (incluidas las recién creadas) puede ser elegida.
//
// Reglas:
//   · La misión actual NO debe estar completada.
//   · Prioridad 1: misiones no asignadas hoy y no completadas hoy.
//   · Prioridad 2: misiones no asignadas hoy (completadas antes, no hoy).
//   · Prioridad 3: cualquier misión del banco no asignada actualmente.
//   · Prioridad 4: sin candidatos → aviso al usuario.
// ═══════════════════════════════════════════════════════════════════
function swapDailyMission(id, e){
  e.stopPropagation();
  if(!S.dailyAssigned || !S.dailyAssigned.ids) return;

  const current = S.missions.find(m => m.id === id);
  if(!current) return;

  // No permitir cambiar una misión ya completada hoy
  if(current.done){
    notif('⚠ NO PUEDES CAMBIAR UNA MISIÓN YA COMPLETADA');
    return;
  }

  // IDs ya asignados hoy (incluyendo la actual que se va a reemplazar)
  const assignedIds = new Set(S.dailyAssigned.ids);
  const todayISO = getTodayISODate();

  // Prioridad 1: no asignada hoy y no completada hoy (incluye misiones recién creadas)
  let candidates = S.missions.filter(m =>
    m.id !== id &&
    !assignedIds.has(m.id) &&
    m.lastDoneDate !== todayISO
  );

  // Prioridad 2: no asignada hoy aunque haya sido completada antes (no hoy)
  if(!candidates.length){
    candidates = S.missions.filter(m =>
      m.id !== id &&
      !assignedIds.has(m.id)
    );
  }

  // Prioridad 3: cualquier misión del banco no asignada en este momento
  // (usa todo el banco completo, sin restricción de categoría)
  if(!candidates.length){
    candidates = S.missions.filter(m => m.id !== id);
  }

  if(!candidates.length){
    notif('⚠ NO HAY OTRAS MISIONES EN EL BANCO');
    return;
  }

  // Elección aleatoria (shuffle para mayor aleatoriedad)
  const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
  const pick = shuffled[0];

  // Sustituir en el slot del día
  const idx = S.dailyAssigned.ids.indexOf(id);
  if(idx !== -1) S.dailyAssigned.ids[idx] = pick.id;

  save();
  render();
  notif('🔀 NUEVA MISIÓN → ' + pick.name);
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §14 — SHOP PERIOD                                                      ║
// ║  Propósito: Gestiona el selector de período de la tienda (día/semana/   ║
// ║  mes) y calcula el XP acumulado para habilitar compras.                 ║
// ║  Funciones: setShopPeriod(), getXPForPeriod(), getPeriodLabel()         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function setShopPeriod(p){
  shopPeriod = p;
  S.shopPeriod = p;
  save();
  ['day','week','month'].forEach(x=>{
    const el=document.getElementById('sp-'+x);
    if(el) el.classList.toggle('active', x===p);
  });
  renderShop();
}

function getXPForPeriod(period){
  if(!S.dailyLog || !S.dailyLog.length) return 0;
  const now = new Date();
  let cutoffStr;
  if(period === 'day'){
    cutoffStr = getTodayISODate();
  } else if(period === 'week'){
    const c = new Date(now); c.setDate(now.getDate()-7);
    cutoffStr = localISO(c);
  } else {
    const c = new Date(now); c.setDate(now.getDate()-30);
    cutoffStr = localISO(c);
  }
  return S.dailyLog
    .filter(e => e.date >= cutoffStr)
    .reduce((sum,e) => sum + (e.xp||0), 0);
}

function getPeriodLabel(period){
  return {day:'HOY', week:'SEMANA', month:'MES'}[period];
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §15 — SHOP AND INVENTORY                                               ║
// ║  Propósito: Grid de objetos de tienda e inventario, lógica de compra,  ║
// ║  modal de confirmación, edición y borrado de ítems.                     ║
// ║  Al comprar con precio COP se registra gasto automático en Dinero.      ║
// ║  Funciones: renderShop(), renderInventory(), renderItemCard(),          ║
// ║             getTotalBalance(), openRedeem(), confirmRedeem(),           ║
// ║             openEditItem(), confirmEditItem(), delItem(),               ║
// ║             deleteInventoryItem(), closeModal()                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function renderShop(){
  const el=document.getElementById('shopGrid'); if(!el) return;
  const shop=S.items.filter(it=>!it.red);
  if(!shop.length){
    el.innerHTML='<div style="color:var(--muted);text-align:center;padding:28px;font-size:calc(12px * var(--fs-scale));grid-column:1/-1;">Añade objetos en CONFIGURAR → TIENDA</div>';
    return;
  }
  el.innerHTML=shop.map(it=>renderItemCard(it,true)).join('');
}

function renderInventory(){
  const el=document.getElementById('invgrid'); if(!el)return;
  const owned=S.items.filter(it=>it.red);
  document.getElementById('invEmpty').style.display=owned.length?'none':'block';
  if(!owned.length){el.innerHTML='';return;}
  el.innerHTML=owned.map(it=>renderItemCard(it,false)).join('');
}

function renderItemCard(it, isShop){
  const shopXP = S.shopXP || 0;
  const locked = shopXP < it.cost && !it.red;
  const pct = Math.min(100, Math.round((shopXP / it.cost) * 100));
  const rc = {common:'rcom', rare:'rrare', epic:'rep', legendary:'rleg'}[it.rar];

  // Period progress (solo en tienda, no en inventario de canjeados)
  let periodBlock = '';
  if(isShop && !it.red){
    const periodXP   = getXPForPeriod(shopPeriod);
    const periodPct  = Math.min(100, Math.round((periodXP / it.cost) * 100));
    const xpPerDay   = periodXP / (shopPeriod==='day'?1:shopPeriod==='week'?7:30);
    const remaining  = Math.max(0, it.cost - shopXP);
    const daysLeft   = (shopXP >= it.cost || xpPerDay <= 0) ? 0 : Math.ceil(remaining / xpPerDay);
    const lbl        = getPeriodLabel(shopPeriod);
    const col        = periodPct >= 100 ? 'var(--gold)' : periodPct >= 50 ? 'var(--blue)' : 'rgba(0,100,200,0.6)';
    const pace       = shopPeriod==='day'
      ? (periodXP > 0 ? `+${periodXP} XP hoy` : 'Sin XP hoy')
      : (xpPerDay > 0 && daysLeft > 0 ? `~${daysLeft} días restantes` : periodXP >= it.cost ? '¡Meta alcanzable!' : 'Sin datos aún');

    periodBlock = `
  <div class="item-progress-detail">
    <div class="ipd-row">
      <span class="ipd-lbl">XP ESTA ${lbl}</span>
      <span class="ipd-val" style="color:${col}">${periodXP} / ${it.cost}</span>
    </div>
    <div class="ipd-bar"><div class="ipd-barfill" style="width:${periodPct}%;background:${col}"></div></div>
    <div style="display:flex;justify-content:space-between;">
      <span style="font-size:calc(9px * var(--fs-scale));color:var(--muted);letter-spacing:1px;">${pace}</span>
      <span style="font-family:'Orbitron',monospace;font-size:calc(9px * var(--fs-scale));color:${periodPct>=100?'var(--gold)':'var(--muted)'};">${periodPct}%</span>
    </div>
  </div>`;
  }

  const totalBal  = getTotalBalance();
  const minBal    = S ? (S.minBalance||0) : 0;
  const itemPrice = it.realPrice||0;
  const balBlocked = minBal > 0 && (totalBal <= minBal || (itemPrice > 0 && (totalBal - itemPrice) < minBal));

  return `
<div class="icard ${locked && isShop ? 'locked' : ''}"
  style="${it.red ? 'border-color:rgba(74,222,128,0.35);' : ((!locked && isShop) ? 'border-color:rgba(240,192,64,0.3);' : '')}">
  <div class="irarity ${rc}">${RARLBL[it.rar].toUpperCase()}</div>
  <div class="iico">${it.ico}</div>
  <div class="iname">${escH(it.name)}</div>
  ${it.price ? `<div class="iprice">${escH(it.price)}</div>` : ''}
  <div class="icost"><span class="icostval">${it.cost}</span><span class="icostlbl"> XP tienda</span></div>
  ${isShop && !it.red ? `
  <div class="ibar"><div class="ibarfill" style="width:${pct}%;background:${pct>=100?'var(--gold)':'var(--blue)'}"></div></div>
  <div class="ipct" style="font-size:9px;color:var(--muted);text-align:right;margin-top:2px;">TIENDA: ${shopXP} / ${it.cost} XP</div>` : ''}
  ${periodBlock}
  ${it.red ? `<div class="idate">📦 Creado: ${it.createdDate||'—'}<br>🏆 Ganado: ${it.redDate||'—'}</div>` : ''}
  ${it.red ? '<div class="iunlbdg">✓ OBTENIDO</div>' : (locked && isShop ? '<div class="ilock">🔒</div>' : (!it.red && isShop && balBlocked ? '<div class="ilock" style="color:var(--danger);font-size:10px;letter-spacing:1px;font-family:\'Orbitron\',monospace;">💰 BLOQ.</div>' : '<div class="ilock" style="color:var(--gold)">★</div>'))}
  ${isShop && !it.red && balBlocked ? `<div style="font-size:calc(8px * var(--fs-scale));color:var(--danger);letter-spacing:1px;text-align:center;margin-top:4px;opacity:.8;">Tope mín: ${formatCOP(minBal)}</div>` : ''}
  <div class="icard-actions">
    ${isShop && !it.red ? `<button class="act-btn edit" style="flex:1;text-align:center;" onclick="openEditItem('${it.id}')">✏</button>` : ''}
    ${isShop && !locked && !it.red ? `<button class="act-btn save" style="flex:1;text-align:center;${balBlocked?'opacity:.35;cursor:not-allowed;':''}\" onclick="${balBlocked?'notif(\'⚠ BALANCE EN EL TOPE MÍNIMO\')':'openRedeem(\''+it.id+'\')'}">★ COMPRAR</button>` : ''}
    ${isShop ? `<button class="act-btn del" onclick="delItem('${it.id}')">✕</button>` : ''}
    ${!isShop && it.red ? `<button class="act-btn del" style="margin-top:6px;width:100%;text-align:center;font-size:10px;letter-spacing:1px;padding:5px 8px;" onclick="deleteInventoryItem('${it.id}')" title="Eliminar del inventario permanentemente (sin recuperar XP ni dinero)">🗑 ELIMINAR OBJETO</button>` : ''}
  </div>
</div>`;
}

// Calcula el balance real acumulado (todos los movimientos, sin filtro de período)
function getTotalBalance(){
  if(!S||!S.transactions) return 0;
  return S.transactions.reduce((s,t)=> t.type==='income' ? s+t.amt : s-t.amt, 0);
}

function openRedeem(id){
  const it=S.items.find(x=>x.id===id);
  if(!it||it.red) return;
  const shopXP = S.shopXP || 0;
  if(shopXP < it.cost) return;

  const totalBal   = getTotalBalance();
  const minBal     = S.minBalance||0;
  const itemPrice  = it.realPrice||0; // precio real en COP si está configurado como número
  const afterBuy   = totalBal - itemPrice;
  const blocked    = minBal > 0 && totalBal <= minBal;
  const blockedAfter = minBal > 0 && itemPrice > 0 && afterBuy < minBal;

  pendingId=id;
  document.getElementById('modT').textContent='◈ COMPRAR OBJETO';

  let balanceInfo = '';
  if(minBal > 0){
    balanceInfo = `<div style="margin-top:10px;padding:8px 10px;background:rgba(0,10,25,0.8);border:1px solid rgba(0,100,200,0.2);font-size:11px;line-height:1.8;">
      <div style="color:var(--muted);letter-spacing:1px;font-size:9px;font-family:'Orbitron',monospace;margin-bottom:4px;">◈ COLCHÓN DE SEGURIDAD</div>
      <div>Balance actual: <span style="color:${totalBal>=0?'var(--green)':'var(--danger)'};font-family:'Orbitron',monospace;">${formatCOP(totalBal)}</span></div>
      <div>Tope mínimo: <span style="color:var(--gold);font-family:'Orbitron',monospace;">${formatCOP(minBal)}</span></div>
      ${itemPrice>0?`<div>Balance tras compra: <span style="color:${afterBuy>=minBal?'var(--green)':'var(--danger)'};;font-family:'Orbitron',monospace;">${formatCOP(afterBuy)}</span></div>`:''}
    </div>`;
  }

  document.getElementById('modB').innerHTML=
    `<div style="font-size:32px;margin-bottom:8px;">${it.ico}</div>`
    +`<div style="font-size:16px;font-weight:600;color:var(--bright);margin-bottom:8px;">${escH(it.name)}</div>`
    +(it.price?`<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Precio real: ${escH(it.price)}</div>`:'')
    +`<div>Costo: <span style="color:var(--gold);font-family:'Orbitron',monospace;">${it.cost} XP tienda</span></div>`
    +`<div style="margin-top:6px;font-size:12px;color:var(--muted);">XP tienda disponible: <span style="color:var(--gold);font-family:'Orbitron',monospace;">${shopXP}</span></div>`
    +`<div style="font-size:11px;color:var(--blue);margin-top:4px;letter-spacing:1px;">▸ Tu nivel (LV.${S.lvl}) y barra de XP no cambiarán.</div>`
    +balanceInfo
    +(blocked ? `<div style="margin-top:10px;padding:8px 10px;background:rgba(255,30,60,0.07);border:1px solid rgba(255,30,60,0.35);border-left:3px solid var(--danger);color:#ff8899;font-size:11px;letter-spacing:1px;">⚠ Tu balance total (${formatCOP(totalBal)}) está en el tope mínimo o por debajo. No puedes comprar hasta superar el colchón de ${formatCOP(minBal)}.</div>` : '')
    +(blockedAfter && !blocked ? `<div style="margin-top:10px;padding:8px 10px;background:rgba(255,30,60,0.07);border:1px solid rgba(255,30,60,0.35);border-left:3px solid var(--danger);color:#ff8899;font-size:11px;letter-spacing:1px;">⚠ Esta compra dejaría tu balance por debajo del colchón de ${formatCOP(minBal)}. Necesitas más dinero disponible.</div>` : '');

  const canBuy = !blocked && !blockedAfter;
  document.getElementById('modActs').innerHTML=`
<button class="mbtn ok" ${canBuy?'':'disabled style="opacity:.35;cursor:not-allowed"'} onclick="${canBuy?'confirmRedeem()':'void(0)'}">CONFIRMAR</button>
<button class="mbtn no" onclick="closeModal()">CANCELAR</button>`;
  document.getElementById('modal').classList.add('show');
}

function confirmRedeem(){
  if(!pendingId) return;
  const it=S.items.find(x=>x.id===pendingId);
  if(!it||it.red){ closeModal(); return; }

  // Verificar shopXP disponible (moneda de tienda — no afecta nivel)
  if((S.shopXP||0) < it.cost){
    notif('⚠ XP DE TIENDA INSUFICIENTE');
    closeModal(); return;
  }

  // Re-check minBalance guard
  const totalBal  = getTotalBalance();
  const minBal    = S.minBalance||0;
  const itemPrice = it.realPrice||0;
  if(minBal > 0 && totalBal <= minBal){ notif('⚠ BALANCE EN EL TOPE MÍNIMO — COMPRA BLOQUEADA'); closeModal(); return; }
  if(minBal > 0 && itemPrice > 0 && (totalBal - itemPrice) < minBal){ notif('⚠ ESTA COMPRA VIOLARÍA EL COLCHÓN DE SEGURIDAD'); closeModal(); return; }

  // Descontar de shopXP ÚNICAMENTE — totalXP, lvl, curXP y nextXP no se tocan
  S.shopXP = Math.max(0, (S.shopXP||0) - it.cost);
  it.red = true;
  it.redDate = new Date().toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'});

  // ── Registrar gasto automático en módulo Dinero ──────────────────
  // Solo si el objeto tiene precio real en COP (it.realPrice > 0).
  // Se crea una transacción tipo 'expense' con categoría 'compras'
  // y se marca con la bandera autoShop:true para identificarla.
  if(itemPrice > 0){
    if(!S.transactions) S.transactions = [];
    if(!S.nTid) S.nTid = 1;
    const now = new Date();
    S.transactions.push({
      id:       't' + S.nTid++,
      desc:     it.ico + ' ' + it.name,
      amt:      itemPrice,
      type:     'expense',
      cat:      'compras',
      ico:      it.ico || '🛍️',
      ts:       Date.now(),
      date:     localISO(now),
      autoShop: true   // bandera para saber que fue generada por tienda
    });
    if(S.transactions.length > 500) S.transactions = S.transactions.slice(-500);
  }

  save(); render(); notif('◈ ' + it.ico + ' ' + it.name + ' — OBTENIDO ◈' + (itemPrice > 0 ? ' · ' + formatCOP(itemPrice) + ' registrados en Dinero' : ''));
  closeModal();
}

function openEditItem(id){
  const it=S.items.find(x=>x.id===id); if(!it) return;
  pendingId=id;
  document.getElementById('modT').textContent='✏ EDITAR OBJETO';
  document.getElementById('modB').innerHTML=`
<div class="edit-item-form">
  <div class="ie-row"><label class="ie-lbl">Nombre</label><input class="ie-inp" id="ei-name" value="${escH(it.name)}"></div>
  <div class="ie-grid">
    <div class="ie-row"><label class="ie-lbl">Emoji</label><input class="ie-inp" id="ei-ico" value="${escH(it.ico)}" style="font-size:20px;text-align:center" maxlength="4"></div>
    <div class="ie-row"><label class="ie-lbl">Costo XP</label><input type="number" class="ie-inp" id="ei-cost" value="${it.cost}" min="1"></div>
  </div>
  <div class="ie-row"><label class="ie-lbl">Precio real</label><input class="ie-inp" id="ei-price" value="${escH(it.price||'')}"></div>
  <div class="ie-row"><label class="ie-lbl">Rareza</label>
    <select class="ie-sel" id="ei-rar">
      <option value="common" ${it.rar==='common'?'selected':''}>Común</option>
      <option value="rare" ${it.rar==='rare'?'selected':''}>Raro</option>
      <option value="epic" ${it.rar==='epic'?'selected':''}>Épico</option>
      <option value="legendary" ${it.rar==='legendary'?'selected':''}>Legendario</option>
    </select>
  </div>
</div>`;
  document.getElementById('modActs').innerHTML=`
<button class="mbtn ok" onclick="confirmEditItem()">GUARDAR</button>
<button class="mbtn no" onclick="closeModal()">CANCELAR</button>`;
  document.getElementById('modal').classList.add('show');
}

function confirmEditItem(){
  const it=S.items.find(x=>x.id===pendingId); if(!it) return;
  const name=document.getElementById('ei-name').value.trim();
  const cost=parseInt(document.getElementById('ei-cost').value);
  if(!name||!cost||cost<1){notif('⚠ COMPLETA NOMBRE Y COSTO');return;}
  it.name=name; it.ico=document.getElementById('ei-ico').value.trim()||'🎁';
  it.cost=cost;
  const priceRaw2=document.getElementById('ei-price').value.trim();
  it.price=priceRaw2;
  it.realPrice=parseFloat(priceRaw2.replace(/[^\d,.]/g,'').replace(',','.')) || 0;
  it.rar=document.getElementById('ei-rar').value;
  save(); render(); notif('◈ OBJETO ACTUALIZADO ◈'); closeModal();
}

function delItem(id){
  if(confirm('¿Eliminar este objeto?')){
    S.items=S.items.filter(x=>x.id!==id);
    save(); render(); notif('◈ OBJETO ELIMINADO ◈');
  }
}

// ─────────────────────────────────────────────────────────────────
// deleteInventoryItem — Elimina un objeto del inventario (ya canjeado).
// ⚠ No devuelve XP ni dinero. El objeto desaparece del array S.items.
// Para que vuelva a aparecer en tienda hay que recrearlo en Configurar.
// ─────────────────────────────────────────────────────────────────
function deleteInventoryItem(id){
  const it = S.items.find(x => x.id === id);
  if(!it || !it.red) return;
  const priceInfo = it.realPrice > 0 ? '\nPrecio pagado: ' + formatCOP(it.realPrice) : '';
  if(!confirm('¿Eliminar "' + it.name + '" del inventario?\n\n⚠ Esta acción es permanente.\nNo se recupera el XP (' + it.cost + ' XP) ni el dinero invertido.' + priceInfo)) return;
  S.items = S.items.filter(x => x.id !== id);
  save();
  renderInventory();
  notif('🗑 ' + it.name + ' — ELIMINADO DEL INVENTARIO');
}

function closeModal(){ document.getElementById('modal').classList.remove('show'); pendingId=null; }


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §16 — CONFIGURATION                                                    ║
// ║  Propósito: CRUD de misiones y objetos de tienda, configuración de XP   ║
// ║  por rango, nombre de usuario, colchón de seguridad, editor de logros,  ║
// ║  y reset completo del sistema.                                           ║
// ║  Funciones: addMission(), addItem(), toggleNameForm(), saveName(),       ║
// ║             saveRanks(), saveMinBalance(), updateMinBalStatus(),         ║
// ║             renderAchievEditor(), updateAchiev(), updateAchievType(),    ║
// ║             delAchiev(), addAchiev(), resetAll()                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function addMission(){
  const n=document.getElementById('mNameInp').value.trim();
  if(!n){notif('▸ INGRESA UN NOMBRE PARA LA MISIÓN');return;}
  const rank=document.getElementById('mRankInp').value;
  const m={
    id:'m'+S.nMid++, name:n,
    desc:document.getElementById('mDescInp').value.trim(),
    cat:document.getElementById('mCatInp').value,
    rank, xp:XPR[rank], done:false, fixed:document.getElementById('mFixedInp').value==='1',
    createdDate:new Date().toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'}),
    lastDoneDate:null
  };
  S.missions.push(m);
  document.getElementById('mNameInp').value='';
  document.getElementById('mDescInp').value='';
  S.dailyAssigned=null; assignDailyMissions();
  save();
  switchTab('missions'); // primero cambia el tab
  render();              // luego renderiza ya con el tab activo
  notif('▸ MISIÓN AÑADIDA: '+n);
}

function addItem(){
  const n=document.getElementById('iNameInp').value.trim();
  const c=parseInt(document.getElementById('iCostInp').value);
  if(!n||!c||c<1){notif('▸ COMPLETA NOMBRE Y COSTO EN XP');return;}
  const priceRaw = document.getElementById('iPriceInp').value.trim();
  // Parse numeric value from price string (strip non-digits except dots/commas)
  const priceNum = parseFloat(priceRaw.replace(/[^\d,.]/g,'').replace(',','.')) || 0;
  const it={
    id:'i'+S.nIid++, name:n,
    ico:document.getElementById('iIcoInp').value.trim()||'🎁',
    cost:c, price:priceRaw, realPrice:priceNum,
    rar:document.getElementById('iRarInp').value, red:false,
    createdDate:new Date().toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'})
  };
  S.items.push(it);
  document.getElementById('iNameInp').value='';
  document.getElementById('iIcoInp').value='';
  document.getElementById('iCostInp').value='';
  document.getElementById('iPriceInp').value='';
  save();
  switchTab('shop'); // primero cambia el tab
  render();          // luego renderiza ya con el tab activo
  notif('▸ OBJETO AÑADIDO A LA TIENDA');
}

function toggleNameForm(){
  const box = document.getElementById('nameFormBox');
  const isOpen = box.style.display !== 'none';
  box.style.display = isOpen ? 'none' : 'block';
  if(!isOpen){
    const inp = document.getElementById('nameInp');
    inp.value = S.name || '';
    setTimeout(()=>inp.focus(),80);
  }
}

function saveName(){
  const n=document.getElementById('nameInp').value.trim();
  if(!n){notif('▸ INGRESA TU NOMBRE');return;}
  S.name=n.toUpperCase();
  document.getElementById('nameInp').value='';
  document.getElementById('nameFormBox').style.display='none';
  save(); render(); notif('▸ PERFIL ACTUALIZADO — '+S.name);
}

function saveRanks(){
  ['D','C','B','A','S'].forEach(r=>{
    const v=parseInt(document.getElementById('xp-'+r).value);
    if(v>0) XPR[r]=v;
  });
  S.xprConfig={...XPR};
  // update existing missions xp
  S.missions.forEach(m=>{m.xp=XPR[m.rank];});
  save(); render(); notif('◈ RANGOS ACTUALIZADOS ◈');
}

function saveMinBalance(){
  const inp = document.getElementById('minBalInp');
  if(!inp) return;
  const val = parseFloat(inp.value);
  S.minBalance = (!isNaN(val) && val >= 0) ? val : 0;
  save();
  updateMinBalStatus();
  notif('◈ TOPE MÍNIMO GUARDADO: '+(S.minBalance>0?formatCOP(S.minBalance):'SIN LÍMITE')+' ◈');
}

function updateMinBalStatus(){
  const el = document.getElementById('minBalStatus'); if(!el) return;
  const minBal = S.minBalance||0;
  const totalBal = getTotalBalance();
  if(minBal <= 0){
    el.style.display='none';
    return;
  }
  const free = totalBal - minBal;
  el.style.display='block';
  el.innerHTML = `<span style="color:var(--muted);font-size:calc(9px * var(--fs-scale));letter-spacing:1px;">ESTADO ACTUAL — </span>`
    +`Balance total: <span style="color:${totalBal>=0?'var(--green)':'var(--danger)'};;font-family:'Orbitron',monospace;">${formatCOP(totalBal)}</span> &nbsp;|&nbsp; `
    +`Tope mínimo: <span style="color:var(--gold);font-family:'Orbitron',monospace;">${formatCOP(minBal)}</span> &nbsp;|&nbsp; `
    +`Disponible para gastar: <span style="color:${free>0?'var(--blue)':'var(--danger)'};font-family:'Orbitron',monospace;">${formatCOP(Math.max(0,free))}</span>`
    +(free<=0?` <span style="color:var(--danger);margin-left:6px;font-size:calc(9px * var(--fs-scale));">⚠ BLOQUEADO</span>`:'');
}

function resetAll(){
  if(confirm('¿Reiniciar TODO el sistema? Perderás todo el progreso permanentemente.')){
    if(currentUser) localStorage.removeItem(getUserKey(currentUser));
    S = defaultState();
    // Reset module-level UI state vars
    shopPeriod = 'day';
    currentPeriod = 'week';
    finPeriod = 'day';
    finType = 'expense';
    finCat = 'comida';
    editingMissionId = null;
    pendingId = null;
    save();
    switchTab('missions');
    render();
    notif('▸ SISTEMA REINICIADO');
  }
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §17 — FONT SIZE / TAB CONTROL                                          ║
// ║  Propósito: Control de tamaño de texto (T−/T+), activación de tabs y   ║
// ║  despliegue del banco de misiones. --fs-scale escala toda la tipografía.║
// ║  Funciones: changeFontSize(), setFont(), switchTab(), toggleAllQuests() ║
// ╚══════════════════════════════════════════════════════════════════════════╝
let currentFontSize = 15;
const FONT_MIN = 11, FONT_MAX = 22;
const FONT_BASE = 15; // base px for scale calculation

function changeFontSize(delta){
  currentFontSize = Math.min(FONT_MAX, Math.max(FONT_MIN, currentFontSize + delta));
  document.documentElement.style.setProperty('--base-font', currentFontSize+'px');
  document.documentElement.style.setProperty('--fs-scale', (currentFontSize / FONT_BASE).toFixed(4));
  document.body.style.fontSize = currentFontSize+'px';
  const el = document.getElementById('fontVal');
  if(el) el.textContent = currentFontSize+'px';
  if(currentUser) localStorage.setItem(getUserKey(currentUser)+'_font', currentFontSize);
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

// ═══════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════
function switchTab(tab){
  // redirect legacy 'allquests' calls → open missions + expand bank
  if(tab === 'allquests'){ switchTab('missions'); toggleAllQuests(true); return; }
  const tabs=['missions','shop','inventory','perfil','dinero'];
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',tabs[i]===tab));
  document.querySelectorAll('.tabcontent').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  // Render each tab on demand
  if(tab==='missions')   renderAllQuests();
  if(tab==='shop')       renderShop();
  if(tab==='inventory')  renderInventory();
  if(tab==='perfil')     renderPerfil();
  if(tab==='config')     renderAchievEditor();
  if(tab==='dinero')     renderFinTab();
  // Persist active tab only when it actually changes
  if(S && S.activeTab !== tab){
    S.activeTab = tab;
    save();
  }
}

function toggleAllQuests(forceOpen){
  const panel = document.getElementById('allQuestsPanel');
  const btn   = document.getElementById('allQuestsToggleBtn');
  if(!panel) return;
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


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §18 — FINANCE MODULE                                                   ║
// ║  Propósito: Registra y visualiza gastos e ingresos. Calcula el balance  ║
// ║  total y lo muestra en la player card. Respeta el colchón de seguridad. ║
// ║  Funciones: formatCOP(), setFinPeriod(), setFinType(), selectFinCat(),  ║
// ║             getFinCutoff(), getFinTransactions(), addTransaction(),      ║
// ║             delTransaction(), renderFinChartBars(), renderFinCatChart(), ║
// ║             renderFinTab(), renderFinTxList()                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
let finPeriod = 'day';
let finType   = 'expense';
let finCat    = 'comida';

const FIN_CAT_LABELS = {
  comida:'Comida', transporte:'Transporte', salud:'Salud',
  ocio:'Ocio', compras:'Compras', educacion:'Educación',
  hogar:'Hogar', otro:'Otro', ingreso:'Ingreso'
};
// Emojis para usar en la gráfica "HOY" en lugar de texto recortado
const FIN_CAT_EMOJI = {
  comida:'🍔', transporte:'🚌', salud:'💊',
  ocio:'🎮', compras:'🛒', educacion:'📚',
  hogar:'🏠', otro:'📦', ingreso:'💵'
};
const FIN_CAT_COLORS = {
  comida:'#f0c040', transporte:'#60a5fa', salud:'#4ade80',
  ocio:'#c084fc', compras:'#ff6b35', educacion:'#a855f7',
  hogar:'#94a3b8', otro:'#6b7280', ingreso:'#4ade80'
};

function formatCOP(n){
  // Siempre valor exacto, sin abreviaciones K/M — requisito de precisión
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('es-CO');
}

function setFinPeriod(p){
  finPeriod = p;
  if(S){ S.finPeriod = p; save(); }
  ['day','week','month'].forEach(x=>{
    const el=document.getElementById('fp-'+x);
    if(el) el.classList.toggle('active', x===p);
  });
  renderFinTab();
}

function setFinType(t){
  finType = t;
  const eb = document.getElementById('fin-btn-expense');
  const ib = document.getElementById('fin-btn-income');
  const ab = document.getElementById('finAddBtn');
  const cg = document.getElementById('finCatGrid');
  if(eb) eb.className = 'fin-type-btn' + (t==='expense'?' active-expense':'');
  if(ib) ib.className = 'fin-type-btn' + (t==='income'?' active-income':'');
  if(cg) cg.style.opacity = t==='income'?'0.35':'1';
  if(cg) cg.style.pointerEvents = t==='income'?'none':'auto';
  if(ab){
    if(t==='income'){
      ab.textContent='+ REGISTRAR INGRESO';
      ab.style.borderColor='rgba(74,222,128,0.5)';
      ab.style.color='#4ade80';
    } else {
      ab.textContent='+ REGISTRAR GASTO';
      ab.style.borderColor='rgba(255,68,102,0.5)';
      ab.style.color='#ff6688';
    }
  }
}

function selectFinCat(el){
  document.querySelectorAll('.fin-cat-btn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  finCat = el.dataset.cat;
}

function getFinCutoff(period){
  const now = new Date();
  if(period==='day') return new Date(now.getFullYear(),now.getMonth(),now.getDate());
  if(period==='week'){ const d=new Date(now); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d; }
  const d=new Date(now); d.setDate(d.getDate()-29); d.setHours(0,0,0,0); return d;
}

function getFinTransactions(period){
  if(!S||!S.transactions) return [];
  const cutoff = getFinCutoff(period).getTime();
  return S.transactions.filter(t=>t.ts>=cutoff).sort((a,b)=>b.ts-a.ts);
}

function addTransaction(){
  const desc = (document.getElementById('finDesc').value||'').trim();
  const amt  = parseFloat(document.getElementById('finAmt').value);
  const ico  = (document.getElementById('finIco').value||'').trim();
  if(!desc){ notif('▸ INGRESA UNA DESCRIPCIÓN'); return; }
  if(!amt||amt<=0){ notif('▸ INGRESA UN MONTO VÁLIDO'); return; }
  if(!S.transactions) S.transactions=[];
  if(!S.nTid) S.nTid=1;
  const now2 = new Date();
  const localDate = localISO(now2);
  const tx = {
    id: 't'+S.nTid++,
    desc, amt, type: finType,
    cat: finType==='income' ? 'ingreso' : finCat,
    ico: ico || (finType==='income'?'💵':'💸'),
    ts: Date.now(),
    date: localDate
  };
  S.transactions.push(tx);
  // Keep max 500 transactions (oldest first)
  if(S.transactions.length>500) S.transactions=S.transactions.slice(-500);
  document.getElementById('finDesc').value='';
  document.getElementById('finAmt').value='';
  document.getElementById('finIco').value='';
  save();
  renderFinTab();
  notif((finType==='income'?'▲ INGRESO: ':'▼ GASTO: ')+formatCOP(amt)+' — '+desc);
}

function delTransaction(id){
  if(!S.transactions) return;
  S.transactions = S.transactions.filter(t=>t.id!==id);
  save(); renderFinTab();
  notif('▸ MOVIMIENTO ELIMINADO');
}

// ── Charts ──
function renderFinChartBars(txs, period){
  const el = document.getElementById('finChartBars'); if(!el) return;
  // Build day buckets
  const now = new Date();
  const buckets = [];
  let numDays = period==='day'?1:period==='week'?7:30;

  for(let i=numDays-1;i>=0;i--){
    const d = new Date(now); d.setDate(now.getDate()-i); d.setHours(0,0,0,0);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const lbl = numDays===1 ? 'HOY' : d.toLocaleDateString('es-CO',{day:'numeric',month:'short'}).toUpperCase();
    buckets.push({iso, lbl, income:0, expense:0});
  }

  txs.forEach(t=>{
    const b = buckets.find(b=>b.iso===t.date);
    if(!b) return;
    if(t.type==='income') b.income+=t.amt;
    else b.expense+=t.amt;
  });

  const maxVal = Math.max(...buckets.map(b=>Math.max(b.income,b.expense)), 1);

  if(numDays===1){
    // Single day: category breakdown bars
    const catTotals = {};
    txs.filter(t=>t.type==='expense').forEach(t=>{ catTotals[t.cat]=(catTotals[t.cat]||0)+t.amt; });
    const cats = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
    if(!cats.length){ el.innerHTML='<div class="fin-empty" style="padding:14px">Sin gastos hoy.</div>'; return; }
    const maxC = cats[0][1];
    el.innerHTML = cats.map(([cat,amt])=>`
      <div class="fin-bar-row">
        <div class="fin-bar-lbl" title="${FIN_CAT_LABELS[cat]||cat}">${FIN_CAT_EMOJI[cat]||'📦'}</div>
        <div class="fin-bar-track"><div class="fin-bar-fill-exp" style="width:${Math.round(amt/maxC*100)}%"></div></div>
        <div class="fin-bar-val">${formatCOP(amt)}</div>
      </div>`).join('');
    return;
  }

  // Multi-day bars: show income (green) and expense (red) side by side using simple HTML bars
  el.innerHTML = buckets.map(b=>`
    <div style="margin-bottom:7px;">
      <div style="font-size:8px;color:var(--muted);letter-spacing:1px;margin-bottom:3px;">${b.lbl}</div>
      ${b.income>0?`<div class="fin-bar-row" style="margin-bottom:3px;">
        <div style="font-size:8px;color:var(--green);width:22px;flex-shrink:0;">ING</div>
        <div class="fin-bar-track"><div class="fin-bar-fill-inc" style="width:${Math.round(b.income/maxVal*100)}%"></div></div>
        <div class="fin-bar-val" style="color:var(--green);">${formatCOP(b.income)}</div>
      </div>`:''}
      ${b.expense>0?`<div class="fin-bar-row">
        <div style="font-size:8px;color:var(--danger);width:22px;flex-shrink:0;">GAS</div>
        <div class="fin-bar-track"><div class="fin-bar-fill-exp" style="width:${Math.round(b.expense/maxVal*100)}%"></div></div>
        <div class="fin-bar-val" style="color:var(--danger);">${formatCOP(b.expense)}</div>
      </div>`:''}
      ${b.income===0&&b.expense===0?`<div style="font-size:9px;color:rgba(96,130,180,0.3);padding-left:26px;letter-spacing:1px;">SIN MOVIMIENTOS</div>`:''}
    </div>`).join('');
}

function renderFinCatChart(txs){
  const el = document.getElementById('finCatChart'); if(!el) return;
  const catTotals = {};
  txs.filter(t=>t.type==='expense').forEach(t=>{ catTotals[t.cat]=(catTotals[t.cat]||0)+t.amt; });
  const cats = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  if(!cats.length){ el.innerHTML='<div class="fin-empty" style="padding:10px">Sin gastos en este período.</div>'; return; }
  const total = cats.reduce((s,[,v])=>s+v,0);
  const maxC = cats[0][1];
  el.innerHTML = cats.map(([cat,amt])=>{
    const col = FIN_CAT_COLORS[cat]||'#60a5fa';
    const pct = Math.round(amt/total*100);
    return `<div class="fin-bar-row">
      <div class="fin-bar-lbl" style="width:56px;font-size:8px;" title="${FIN_CAT_LABELS[cat]||cat}">${FIN_CAT_EMOJI[cat]||'📦'} ${(FIN_CAT_LABELS[cat]||cat).slice(0,5).toUpperCase()}</div>
      <div class="fin-bar-track"><div style="height:100%;background:${col};width:${Math.round(amt/maxC*100)}%;transition:width .7s;"></div></div>
      <div class="fin-bar-val" style="color:${col};width:68px;">${formatCOP(amt)} <span style="color:var(--muted);font-size:7px;">${pct}%</span></div>
    </div>`;
  }).join('');
}

function renderFinTab(){
  if(!S) return;
  // Restore period preference
  finPeriod = S.finPeriod || 'day';
  ['day','week','month'].forEach(x=>{
    const el=document.getElementById('fp-'+x);
    if(el) el.classList.toggle('active', x===finPeriod);
  });

  const txs = getFinTransactions(finPeriod);
  const income  = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amt,0);
  const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amt,0);
  const balance = income - expense;

  const incEl = document.getElementById('finIncome');
  const expEl = document.getElementById('finExpense');
  const balEl = document.getElementById('finBalance');
  if(incEl) incEl.textContent = formatCOP(income);
  if(expEl) expEl.textContent = formatCOP(expense);
  if(balEl){
    balEl.textContent = formatCOP(balance);
    balEl.style.color = balance<0?'var(--danger)':balance>0?'var(--green)':'var(--bright)';
  }

  renderFinChartBars(txs, finPeriod);
  renderFinCatChart(txs);
  renderFinTxList(txs);
}

function renderFinTxList(txs){
  const el = document.getElementById('finTxList'); if(!el) return;
  if(!txs.length){
    el.innerHTML='<div class="fin-empty">Sin movimientos en este período.<br><span style="font-size:10px;opacity:.5">Registra tu primer movimiento arriba.</span></div>';
    return;
  }
  el.innerHTML = '<div class="fin-txlist">'+txs.map(t=>{
    const isInc = t.type==='income';
    const d = new Date(t.ts);
    const dateStr = d.toLocaleDateString('es-CO',{day:'numeric',month:'short'}).toUpperCase()
      +' '+d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
    return `<div class="fin-tx">
      <div class="fin-tx-ico">${t.ico||'💸'}</div>
      <div class="fin-tx-info">
        <div class="fin-tx-name">${escH(t.desc)}</div>
        <div class="fin-tx-meta">${(FIN_CAT_LABELS[t.cat]||t.cat).toUpperCase()} — ${dateStr}</div>
      </div>
      <div class="fin-tx-amt ${isInc?'pos':'neg'}">${isInc?'+':'-'}${formatCOP(t.amt)}</div>
      <button class="fin-tx-del" onclick="delTransaction('${t.id}')">✕</button>
    </div>`;
  }).join('')+'</div>';
}

// ═══════════════════════════════════════════════════════
// ESTADO DE ÁNIMO (MOOD)
// ═══════════════════════════════════════════════════════
// mood 0=pésimo 1=mal 2=regular 3=bien 4=excelente
// XP otorgado por registrar el ánimo (independiente del valor)
const MOOD_XP = [20, 20, 20, 20, 20];
const MOOD_LABELS = ['PÉSIMO','MAL','REGULAR','BIEN','EXCELENTE'];


function setMood(val){
  // Ensure the day is current before logging mood
  checkReset();
  const today = getTodayISODate();
  if(!S.dailyLog) S.dailyLog=[];
  let entry = S.dailyLog.find(e=>e.date===today);
  if(!entry){ entry={date:today,cats:{},xp:0,missions:0}; S.dailyLog.push(entry); }

  const prevMood = entry.mood;
  const hadMood = (prevMood !== undefined && prevMood !== null);

  // Revert previous mood XP if already set today
  if(hadMood){
    const prevXp = MOOD_XP[prevMood]||0;
    gainXP(-prevXp);
    S.totalComp = Math.max(0, S.totalComp-1);
    if(S.catCounts&&S.catCounts['mental']) S.catCounts['mental']=Math.max(0,(S.catCounts['mental']||1)-1);
    entry.cats['mental']=Math.max(0,(entry.cats['mental']||0)-1);
    entry.xp=Math.max(0,(entry.xp||0)-prevXp);
  }

  // Save new mood
  entry.mood = val;
  const xp = MOOD_XP[val];
  gainXP(xp);
  if(!entry.cats) entry.cats={};
  entry.cats['mental']=(entry.cats['mental']||0)+1;
  entry.xp=(entry.xp||0)+xp;
  if(!hadMood){
    S.totalComp++;
    if(!S.catCounts) S.catCounts={};
    S.catCounts['mental']=(S.catCounts['mental']||0)+1;
  }

  // Limit log to 35 days
  S.dailyLog = S.dailyLog.filter(e=>{
    return (new Date()-new Date(e.date))/(1000*60*60*24)<=35;
  });

  save();
  render(); // render() already calls renderMoodWidget() internally
  notif('▸ ESTADO MENTAL: ' + MOOD_LABELS[val] + ' +' + xp + ' XP MENTAL');
}

function getTodayMood(){
  if(!S.dailyLog) return null;
  const today = getTodayISODate();
  const entry = S.dailyLog.find(e=>e.date===today);
  return (entry && entry.mood !== undefined) ? entry.mood : null;
}

function renderMoodWidget(){
  const todayMood = getTodayMood();
  // Reset all buttons
  for(let i=0;i<5;i++){
    const btn = document.getElementById('mood-'+i);
    if(!btn) continue;
    btn.className = 'mood-btn';
    if(todayMood===i) btn.classList.add('selected', 'sel-'+i);
  }
  // Show saved indicator
  const saved = document.getElementById('moodSaved');
  const badge = document.getElementById('moodXpBadge');
  if(saved){
    saved.classList.toggle('show', todayMood!==null);
    if(todayMood!==null) saved.textContent = '▸ HOY TE SENTISTE: ' + MOOD_LABELS[todayMood] + ' — REGISTRADO';
  }
  if(badge && todayMood!==null){
    badge.textContent = '+'+MOOD_XP[todayMood]+' XP';
    badge.classList.add('show');
  } else if(badge){
    badge.classList.remove('show');
  }
}

// Hook renderMoodWidget into render — called directly at end of render()
// (no wrapper needed; renderMoodWidget is called explicitly in render)

// ═══════════════════════════════════════════════════════
// INICIO
// ═══════════════════════════════════════════════════════
const savedUser = localStorage.getItem('sl_current_user');
if(savedUser){
  currentUser=savedUser;
  S=loadState(savedUser);
  XPR=S.xprConfig||{D:15,C:30,B:50,A:80,S:120};
  // Restaurar preferencias de UI
  shopPeriod    = S.shopPeriod    || 'day';
  currentPeriod = S.profilePeriod || 'week';
  finPeriod     = S.finPeriod     || 'day';
  // userBar removed — controls now in player card
  // userBarName removed — name shown via render() in #pname
  // Restaurar tamaño de fuente
  const savedFont=parseInt(localStorage.getItem(getUserKey(savedUser)+'_font'));
  if(savedFont){ currentFontSize=savedFont; setFont(savedFont); }
  // Restaurar selectors de período
  ['day','week','month'].forEach(x=>{
    const el=document.getElementById('sp-'+x);
    if(el) el.classList.toggle('active', x===shopPeriod);
  });
  const ptW=document.getElementById('pt-week');
  const ptM=document.getElementById('pt-month');
  if(ptW) ptW.classList.toggle('active', currentPeriod==='week');
  if(ptM) ptM.classList.toggle('active', currentPeriod==='month');
  checkReset();
  render();
  // Restaurar tab activo (después del render para que el contenido esté listo)
  if(S.activeTab && S.activeTab !== 'missions') switchTab(S.activeTab);
} else {
  document.getElementById('loginOver').classList.add('show');
}

// Tick siempre activo — muestra el reloj aunque no haya sesión
tick();
setInterval(tick,1000);

// ═══════════════════════════════════════════════════════
// EMOJI PICKER — sistema global reutilizable
// Uso: epToggle('panel-id') para abrir/cerrar
//      epBind('panel-id', inputId) para enlazar panel con campo
// ═══════════════════════════════════════════════════════

const EP_CATS = [
  { key:'todo',     label:'Todos' },
  { key:'actividad',label:'💪 Actividad' },
  { key:'estudio',  label:'📚 Estudio' },
  { key:'salud',    label:'❤️ Salud' },
  { key:'comida',   label:'🍔 Comida' },
  { key:'objetos',  label:'🎁 Objetos' },
  { key:'dinero',   label:'💰 Dinero' },
  { key:'viajes',   label:'✈️ Viajes' },
  { key:'hogar',    label:'🏠 Hogar' },
  { key:'naturaleza',label:'🌿 Natura' },
  { key:'simbolos', label:'⭐ Símbolos' },
  { key:'caras',    label:'😀 Caras' },
];

const EP_DATA = [
  // actividad
  {e:'💪',k:'actividad'},{e:'🏃',k:'actividad'},{e:'🧘',k:'actividad'},{e:'🚴',k:'actividad'},
  {e:'🏋️',k:'actividad'},{e:'⚽',k:'actividad'},{e:'🏊',k:'actividad'},{e:'🎯',k:'actividad'},
  {e:'🥊',k:'actividad'},{e:'🧗',k:'actividad'},{e:'🤸',k:'actividad'},{e:'⚔️',k:'actividad'},
  {e:'🗡️',k:'actividad'},{e:'🏹',k:'actividad'},{e:'🎮',k:'actividad'},{e:'🕹️',k:'actividad'},
  {e:'🎲',k:'actividad'},{e:'🎭',k:'actividad'},{e:'🎨',k:'actividad'},{e:'🎵',k:'actividad'},
  {e:'🎸',k:'actividad'},{e:'🎤',k:'actividad'},{e:'🏆',k:'actividad'},{e:'🥇',k:'actividad'},
  {e:'🥈',k:'actividad'},{e:'🥉',k:'actividad'},{e:'🎖️',k:'actividad'},{e:'🏅',k:'actividad'},
  // estudio
  {e:'📚',k:'estudio'},{e:'📖',k:'estudio'},{e:'📝',k:'estudio'},{e:'✏️',k:'estudio'},
  {e:'🖊️',k:'estudio'},{e:'📐',k:'estudio'},{e:'📏',k:'estudio'},{e:'🔬',k:'estudio'},
  {e:'🔭',k:'estudio'},{e:'💡',k:'estudio'},{e:'🧠',k:'estudio'},{e:'🎓',k:'estudio'},
  {e:'🏫',k:'estudio'},{e:'💻',k:'estudio'},{e:'🖥️',k:'estudio'},{e:'📊',k:'estudio'},
  {e:'📈',k:'estudio'},{e:'📉',k:'estudio'},{e:'🔮',k:'estudio'},{e:'⚗️',k:'estudio'},
  {e:'🧪',k:'estudio'},{e:'🧫',k:'estudio'},{e:'📡',k:'estudio'},{e:'⚙️',k:'estudio'},
  // salud
  {e:'❤️',k:'salud'},{e:'💚',k:'salud'},{e:'💙',k:'salud'},{e:'💛',k:'salud'},
  {e:'🩺',k:'salud'},{e:'💊',k:'salud'},{e:'🩹',k:'salud'},{e:'🧬',k:'salud'},
  {e:'🏥',k:'salud'},{e:'😴',k:'salud'},{e:'🛏️',k:'salud'},{e:'🧠',k:'salud'},
  {e:'🫀',k:'salud'},{e:'🫁',k:'salud'},{e:'🦷',k:'salud'},{e:'👁️',k:'salud'},
  {e:'💉',k:'salud'},{e:'🔬',k:'salud'},{e:'☯️',k:'salud'},{e:'🧘',k:'salud'},
  // comida
  {e:'🍔',k:'comida'},{e:'🍕',k:'comida'},{e:'🌮',k:'comida'},{e:'🍜',k:'comida'},
  {e:'🍣',k:'comida'},{e:'🥗',k:'comida'},{e:'🍎',k:'comida'},{e:'🍌',k:'comida'},
  {e:'🍓',k:'comida'},{e:'☕',k:'comida'},{e:'🧃',k:'comida'},{e:'🍺',k:'comida'},
  {e:'🎂',k:'comida'},{e:'🍦',k:'comida'},{e:'🍫',k:'comida'},{e:'🥐',k:'comida'},
  {e:'🥤',k:'comida'},{e:'🍷',k:'comida'},{e:'🥩',k:'comida'},{e:'🥑',k:'comida'},
  // objetos
  {e:'🎁',k:'objetos'},{e:'🎀',k:'objetos'},{e:'🎊',k:'objetos'},{e:'🎉',k:'objetos'},
  {e:'👑',k:'objetos'},{e:'💎',k:'objetos'},{e:'💍',k:'objetos'},{e:'👜',k:'objetos'},
  {e:'👟',k:'objetos'},{e:'🕶️',k:'objetos'},{e:'🎧',k:'objetos'},{e:'📱',k:'objetos'},
  {e:'⌚',k:'objetos'},{e:'🚗',k:'objetos'},{e:'✈️',k:'objetos'},{e:'🛒',k:'objetos'},
  {e:'🧸',k:'objetos'},{e:'🪄',k:'objetos'},{e:'🗝️',k:'objetos'},{e:'🔑',k:'objetos'},
  {e:'🪙',k:'objetos'},{e:'🏠',k:'objetos'},{e:'🛋️',k:'objetos'},{e:'🖼️',k:'objetos'},
  // dinero
  {e:'💰',k:'dinero'},{e:'💵',k:'dinero'},{e:'💸',k:'dinero'},{e:'💳',k:'dinero'},
  {e:'🏦',k:'dinero'},{e:'💹',k:'dinero'},{e:'📊',k:'dinero'},{e:'💲',k:'dinero'},
  {e:'🤑',k:'dinero'},{e:'💱',k:'dinero'},{e:'🪙',k:'dinero'},{e:'🏧',k:'dinero'},
  // viajes
  {e:'✈️',k:'viajes'},{e:'🚂',k:'viajes'},{e:'🚀',k:'viajes'},{e:'🏖️',k:'viajes'},
  {e:'🏔️',k:'viajes'},{e:'🗺️',k:'viajes'},{e:'🧳',k:'viajes'},{e:'🌍',k:'viajes'},
  {e:'🗼',k:'viajes'},{e:'🗽',k:'viajes'},{e:'🏰',k:'viajes'},{e:'⛩️',k:'viajes'},
  {e:'🌅',k:'viajes'},{e:'🌉',k:'viajes'},{e:'🎡',k:'viajes'},{e:'🚢',k:'viajes'},
  // hogar
  {e:'🏠',k:'hogar'},{e:'🛋️',k:'hogar'},{e:'🛏️',k:'hogar'},{e:'🚿',k:'hogar'},
  {e:'🛁',k:'hogar'},{e:'🍽️',k:'hogar'},{e:'🔧',k:'hogar'},{e:'🔨',k:'hogar'},
  {e:'🧹',k:'hogar'},{e:'🧺',k:'hogar'},{e:'🧻',k:'hogar'},{e:'💡',k:'hogar'},
  {e:'📦',k:'hogar'},{e:'🪴',k:'hogar'},{e:'🖼️',k:'hogar'},{e:'🕯️',k:'hogar'},
  {e:'🪞',k:'hogar'},{e:'🚪',k:'hogar'},{e:'🪟',k:'hogar'},{e:'🧴',k:'hogar'},
  // naturaleza
  {e:'🌿',k:'naturaleza'},{e:'🌱',k:'naturaleza'},{e:'🌸',k:'naturaleza'},{e:'🌺',k:'naturaleza'},
  {e:'🌻',k:'naturaleza'},{e:'🍀',k:'naturaleza'},{e:'🌳',k:'naturaleza'},{e:'🌲',k:'naturaleza'},
  {e:'🦁',k:'naturaleza'},{e:'🐺',k:'naturaleza'},{e:'🦅',k:'naturaleza'},{e:'🐉',k:'naturaleza'},
  {e:'🌙',k:'naturaleza'},{e:'⭐',k:'naturaleza'},{e:'☀️',k:'naturaleza'},{e:'🌈',k:'naturaleza'},
  {e:'⚡',k:'naturaleza'},{e:'🔥',k:'naturaleza'},{e:'💧',k:'naturaleza'},{e:'❄️',k:'naturaleza'},
  {e:'🌊',k:'naturaleza'},{e:'🌪️',k:'naturaleza'},{e:'🦋',k:'naturaleza'},{e:'🐾',k:'naturaleza'},
  // simbolos
  {e:'⭐',k:'simbolos'},{e:'🌟',k:'simbolos'},{e:'✨',k:'simbolos'},{e:'💫',k:'simbolos'},
  {e:'🔥',k:'simbolos'},{e:'⚡',k:'simbolos'},{e:'❤️',k:'simbolos'},{e:'💯',k:'simbolos'},
  {e:'✅',k:'simbolos'},{e:'❌',k:'simbolos'},{e:'⚠️',k:'simbolos'},{e:'🔔',k:'simbolos'},
  {e:'🔒',k:'simbolos'},{e:'🔓',k:'simbolos'},{e:'📌',k:'simbolos'},{e:'🗺️',k:'simbolos'},
  {e:'⚔️',k:'simbolos'},{e:'🛡️',k:'simbolos'},{e:'⚙️',k:'simbolos'},{e:'🎯',k:'simbolos'},
  {e:'♾️',k:'simbolos'},{e:'☯️',k:'simbolos'},{e:'🔮',k:'simbolos'},{e:'💠',k:'simbolos'},
  {e:'🔱',k:'simbolos'},{e:'⚜️',k:'simbolos'},{e:'🌀',k:'simbolos'},{e:'🔴',k:'simbolos'},
  {e:'🟡',k:'simbolos'},{e:'🟢',k:'simbolos'},{e:'🔵',k:'simbolos'},{e:'⬛',k:'simbolos'},
  // caras
  {e:'😀',k:'caras'},{e:'😎',k:'caras'},{e:'🤩',k:'caras'},{e:'😤',k:'caras'},
  {e:'😠',k:'caras'},{e:'😤',k:'caras'},{e:'🤯',k:'caras'},{e:'😴',k:'caras'},
  {e:'🤔',k:'caras'},{e:'😈',k:'caras'},{e:'👿',k:'caras'},{e:'💀',k:'caras'},
  {e:'👾',k:'caras'},{e:'🤖',k:'caras'},{e:'👻',k:'caras'},{e:'🦸',k:'caras'},
  {e:'🦹',k:'caras'},{e:'🧙',k:'caras'},{e:'🧝',k:'caras'},{e:'🧜',k:'caras'},
  {e:'🥷',k:'caras'},{e:'💂',k:'caras'},{e:'🧟',k:'caras'},{e:'🧛',k:'caras'},
];

// Estado del picker
const _ep = { open: null, bindings: {} };

// Registra qué input recibe el emoji de un panel dado
function epBind(panelId, inputId){ _ep.bindings[panelId] = inputId; }

// Inicializa categorías y grilla de un panel
function epInit(panelId){
  const catsEl = document.getElementById(panelId+'-cats');
  const gridEl = document.getElementById(panelId+'-grid');
  if(!catsEl || !gridEl) return;
  // Render cat buttons
  catsEl.innerHTML = EP_CATS.map(c=>
    `<button class="ep-cat-btn${c.key==='todo'?' active':''}" onclick="epSetCat('${panelId}','${c.key}',this)">${c.label}</button>`
  ).join('');
  epRenderGrid(panelId, 'todo', '');
}

function epRenderGrid(panelId, cat, query){
  const gridEl = document.getElementById(panelId+'-grid');
  if(!gridEl) return;
  const q = (query||'').toLowerCase();
  let items = EP_DATA;
  if(cat && cat !== 'todo') items = items.filter(x=>x.k===cat);
  if(q) items = items.filter(x=>x.e.includes(q)||x.k.includes(q));
  if(!items.length){
    gridEl.innerHTML = '<div class="ep-empty">Sin resultados</div>';
    return;
  }
  gridEl.innerHTML = items.map(x=>
    `<button class="ep-emoji-btn" onclick="epSelect('${panelId}','${x.e}')">${x.e}</button>`
  ).join('');
}

function epSetCat(panelId, cat, btn){
  document.querySelectorAll('#'+panelId+'-cats .ep-cat-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const searchEl = document.getElementById(panelId)?.querySelector('.ep-search');
  epRenderGrid(panelId, cat, searchEl?searchEl.value:'');
  if(searchEl) searchEl.dataset.cat = cat;
}

function epSearch(inp, panelId){
  const cat = inp.dataset.cat || 'todo';
  epRenderGrid(panelId, cat, inp.value);
}

function epSelect(panelId, emoji){
  // Intentar binding registrado primero
  const inputId = _ep.bindings[panelId];
  if(inputId){
    const el = document.getElementById(inputId);
    if(el){ el.value = emoji; el.dispatchEvent(new Event('input')); }
  } else {
    // Fallback: buscar el input hermano dentro del mismo ep-wrap
    const panel = document.getElementById(panelId);
    if(panel){
      const wrap = panel.closest('.ep-wrap');
      if(wrap){
        const inp = wrap.querySelector('input[type="text"], input:not([type]), input[id]');
        if(inp){ inp.value = emoji; inp.dispatchEvent(new Event('input')); }
      }
    }
  }
  epClose();
}

function epToggle(panelId){
  const panel = document.getElementById(panelId);
  if(!panel) return;
  const isOpen = panel.classList.contains('open');
  // Cerrar todos
  document.querySelectorAll('.ep-panel.open').forEach(p=>p.classList.remove('open'));
  _ep.open = null;
  if(!isOpen){
    // Inicializar si es la primera vez
    if(!panel.dataset.epInited){
      panel.dataset.epInited = '1';
      epInit(panelId);
    }
    panel.classList.add('open');
    _ep.open = panelId;
    // Focus en search
    const s = panel.querySelector('.ep-search');
    if(s) setTimeout(()=>s.focus(),80);
  }
}

function epClose(){
  document.querySelectorAll('.ep-panel.open').forEach(p=>p.classList.remove('open'));
  _ep.open = null;
}

// Cerrar picker al hacer click fuera
document.addEventListener('click', function(e){
  if(_ep.open && !e.target.closest('.ep-wrap') && !e.target.classList.contains('ep-open-btn')){
    epClose();
  }
}, true);

// ═══════════════════════════════════════════════════════
// PLANTILLA DE MISIONES — MODAL
// ═══════════════════════════════════════════════════════
// tplToggle(card)      — selecciona/deselecciona una tarjeta
// tplSelectAll()       — selecciona todas
// tplDeselectAll()     — deselecciona todas
// tplUpdateCounter()   — actualiza el contador y estado del botón
// openTplModal()       — abre el modal (resetea selección)
// closeTplModal()      — cierra sin importar
// importTemplates()    — añade al banco S.missions las seleccionadas

function tplToggle(card){
  card.classList.toggle('selected');
  tplUpdateCounter();
}

function tplSelectAll(){
  document.querySelectorAll('.tpl-card').forEach(c=>c.classList.add('selected'));
  tplUpdateCounter();
}

function tplDeselectAll(){
  document.querySelectorAll('.tpl-card').forEach(c=>c.classList.remove('selected'));
  tplUpdateCounter();
}

function tplUpdateCounter(){
  const n = document.querySelectorAll('.tpl-card.selected').length;
  const counter = document.getElementById('tplCounter');
  const btn = document.getElementById('tplImportBtn');
  if(counter) counter.textContent = n + (n===1?' seleccionada':' seleccionadas');
  if(btn) btn.disabled = n === 0;
}

function openTplModal(tab){
  // Al abrir: seleccionar todas las cards por defecto
  document.querySelectorAll('.tpl-card').forEach(c=>c.classList.add('selected'));
  tplUpdateCounter();
  const overlay = document.getElementById('tplOverlay');
  if(overlay){ overlay.classList.add('show'); overlay.scrollTop=0; }
  // Ir a la tab indicada (por defecto: tutorial para nuevos, import desde config)
  switchTplTab(tab || 'tutorial');
}

function switchTplTab(tab){
  // Actualizar botones
  document.querySelectorAll('.tpl-modal-tab').forEach(btn=>{
    btn.classList.toggle('active', btn.id === 'tplTab-'+tab);
  });
  // Actualizar paneles
  document.querySelectorAll('.tpl-modal-panel').forEach(panel=>{
    panel.classList.toggle('active', panel.id === 'tplPanel-'+tab);
  });
}

function closeTplModal(){
  const overlay = document.getElementById('tplOverlay');
  if(overlay) overlay.classList.remove('show');
}

function importTemplates(){
  const selected = document.querySelectorAll('.tpl-card.selected');
  if(!selected.length){ notif('⚠ SELECCIONA AL MENOS UNA MISIÓN'); return; }
  let added = 0;
  selected.forEach(card=>{
    const name = card.querySelector('.tpl-name').textContent.trim();
    const desc = card.querySelector('.tpl-desc').textContent.trim();
    const cat  = card.dataset.cat;
    const rank = card.dataset.rank;
    const fixed= card.dataset.fixed === '1';
    // Evitar duplicados por nombre exacto
    const exists = S.missions.some(m=>m.name===name);
    if(!exists){
      S.missions.push({
        id: 'm'+S.nMid++,
        name, desc, cat, rank,
        xp: XPR[rank] || 30,
        fixed,
        done: false,
        createdDate: new Date().toLocaleDateString('es-CO',{year:'numeric',month:'2-digit',day:'2-digit'}),
        lastDoneDate: null
      });
      added++;
    }
  });
  S.dailyAssigned = null;
  assignDailyMissions();
  save();
  render();
  closeTplModal();
  notif('◈ ' + added + ' MISIONES AÑADIDAS AL BANCO ◈');
}

// ═══════════════════════════════════════════════════════
// TOOLTIP TOGGLE
// ═══════════════════════════════════════════════════════
function tipToggle(btn){
  const detail = btn.nextElementSibling;
  if(!detail || !detail.classList.contains('tip-detail')) return;
  // Save original label on first interaction
  if(!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
  const isOpen = detail.classList.contains('open');
  detail.classList.toggle('open', !isOpen);
  btn.textContent = isOpen ? btn.dataset.label : 'ⓘ CERRAR';
}

// ═══════════════════════════════════════════════════════
// DEVICE DETECTION — Responsive Adaptive UI
// ═══════════════════════════════════════════════════════
(function initDeviceDetection() {
  const banner  = document.getElementById('deviceBanner');
  const label   = document.getElementById('deviceLabel');

  const BREAKPOINTS = { mobile: 480, tablet: 768, desktop: Infinity };

  function getDeviceType() {
    const w = window.innerWidth;
    const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    if (w < BREAKPOINTS.mobile)  return 'mobile';
    if (w < BREAKPOINTS.tablet)  return 'tablet';
    return 'desktop';
  }

  function getDeviceIcon(type) {
    return { mobile: '📱', tablet: '💻', desktop: '🖥️' }[type];
  }

  function getDeviceText(type) {
    const w = window.innerWidth;
    const texts = {
      mobile:  `MÓVIL — ${w}px`,
      tablet:  `TABLET — ${w}px`,
      desktop: `ESCRITORIO — ${w}px`,
    };
    return texts[type];
  }

  let lastType = null;

  function updateDevice() {
    const type = getDeviceType();
    if (type === lastType) return;
    lastType = type;

    // Update banner class
    banner.className = `device-banner ${type}`;
    label.textContent = `${getDeviceIcon(type)} ${getDeviceText(type)}`;

    // Apply body data-attribute for JS-driven responsive logic
    document.body.setAttribute('data-device', type);

    // Adaptive: hide tabs scroll hint after first interaction on desktop
    if (type === 'desktop') {
      const tabsWrapper = document.querySelector('.tabs-wrapper');
      if (tabsWrapper) tabsWrapper.style.setProperty('--hint', 'none');
    }

    // Auto-adjust font size for tiny screens (< 360px)
    if (window.innerWidth < 360 && typeof setFont === 'function') {
      if (!document.body.getAttribute('data-font-adjusted')) {
        document.body.setAttribute('data-font-adjusted', '1');
        setFont(13);
      }
    }
  }

  // Update on load and resize (debounced)
  updateDevice();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateDevice();
      // Update label text dynamically on resize
      if (lastType) label.textContent = `${getDeviceIcon(lastType)} ${getDeviceText(lastType)}`;
    }, 120);
  });

  // Orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(updateDevice, 300);
  });

  // Fade out banner after 4 seconds
  setTimeout(() => {
    banner.style.transition = 'opacity 1s ease';
    banner.style.opacity = '0.3';
  }, 4000);

  // Show banner again on resize
  window.addEventListener('resize', () => {
    banner.style.opacity = '0.75';
    clearTimeout(banner._fadeTimer);
    banner._fadeTimer = setTimeout(() => {
      banner.style.opacity = '0.3';
    }, 2500);
  });
})();
