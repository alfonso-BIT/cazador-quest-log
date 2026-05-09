// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ui-actions.js — §13 MISSION ACTIONS · §14 SHOP PERIOD                ║
// ║                  §15 SHOP & INVENTORY · §16 CONFIGURATION              ║
// ║  Exporta: toggle(), startEditMission(), saveEditMission(), delMission(),║
// ║           claimDaily(), swapDailyMission(), setShopPeriod(),           ║
// ║           renderShop(), renderInventory(), renderItemCard(),           ║
// ║           getTotalBalance(), openRedeem(), confirmRedeem(),            ║
// ║           confirmEditItem(), delItem(), deleteInventoryItem(),         ║
// ║           addMission(), addItem(), saveName(), saveRanks(), resetAll() ║
// ╚══════════════════════════════════════════════════════════════════════════╝
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
    save(); renderWithFlash();
    if(typeof FX!=='undefined') FX.questComplete(id, m.xp||XPR[m.rank]||50);
    return;
  }
  save(); renderWithFlash();
}

function startEditMission(id,e){ e.stopPropagation(); editingMissionId=id; renderWithFlash(); }
function cancelEditMission(){ editingMissionId=null; renderWithFlash(); }

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
  save(); renderWithFlash(); notif('◈ MISIÓN ACTUALIZADA ◈');
}

function delMission(id,e){
  e.stopPropagation();
  if(confirm('¿Eliminar esta misión?')){
    const m=S.missions.find(x=>x.id===id);
    if(m&&m.done){gainXP(-(m.xp||XPR[m.rank]||50));S.totalComp=Math.max(0,S.totalComp-1);}
    S.missions=S.missions.filter(x=>x.id!==id);
    if(editingMissionId===id) editingMissionId=null;
    S.dailyAssigned=null; assignDailyMissions();
    save(); renderWithFlash();
  }
}

function claimDaily(){
  const daily=getDailyMissions();
  if(S.claimed||!daily.every(m=>m.done)) return;
  const bonus=Math.floor(60*(1+S.streak*0.12));
  gainXP(bonus); S.claimed=true; save(); renderWithFlash();
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
  renderWithFlash();
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
<div class="icard ${locked && isShop ? 'locked' : ''}" id="ic-${it.id}"
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

  save(); renderWithFlash(); notif('◈ ' + it.ico + ' ' + it.name + ' — OBTENIDO ◈' + (itemPrice > 0 ? ' · ' + formatCOP(itemPrice) + ' registrados en Dinero' : ''));
  // Efecto visual de compra
  if(typeof FX !== 'undefined'){
    const icoEl = document.querySelector('.modal .modtitle');
    FX.purchase(icoEl, it.name);
  }
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
  save(); renderWithFlash(); notif('◈ OBJETO ACTUALIZADO ◈'); closeModal();
}

function delItem(id){
  if(confirm('¿Eliminar este objeto?')){
    S.items=S.items.filter(x=>x.id!==id);
    save(); renderWithFlash(); notif('◈ OBJETO ELIMINADO ◈');
  }
}

// ─────────────────────────────────────────────────────────────────
// deleteInventoryItem — Abre modal gamer de confirmación antes de borrar.
// ⚠ No devuelve XP ni dinero. El objeto desaparece del array S.items.
// Para que vuelva a aparecer en tienda hay que recrearlo en Configurar.
// ─────────────────────────────────────────────────────────────────
let _delInvId = null;
function deleteInventoryItem(id){
  const it = S.items.find(x => x.id === id);
  if(!it || !it.red) return;
  _delInvId = id;
  document.getElementById('delInvName').textContent = it.ico ? it.ico + ' ' + it.name : it.name;
  const price = it.realPrice > 0 ? ' · ' + formatCOP(it.realPrice) + ' pagados' : '';
  document.getElementById('delInvBody').textContent = 'Costo: ' + it.cost + ' XP' + price + ' · El XP y dinero no se recuperan.';
  document.getElementById('delInvModal').classList.add('show');
}
function confirmDelInv(){
  const id = _delInvId; _delInvId = null;
  closDelInv();
  const it = S.items.find(x => x.id === id);
  if(!it) return;
  const cardEl = document.getElementById('ic-' + id);
  if(typeof FX !== 'undefined') FX.itemRemoved(cardEl, it.name);
  S.items = S.items.filter(x => x.id !== id);
  save(); renderWithFlash();
  notif('🗑 ' + it.name + ' — ELIMINADO DEL INVENTARIO');
}
function closDelInv(){ document.getElementById('delInvModal').classList.remove('show'); _delInvId = null; }

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
  renderWithFlash();     // luego renderiza ya con el tab activo
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
  renderWithFlash(); // luego renderiza ya con el tab activo
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
  save(); renderWithFlash(); notif('▸ PERFIL ACTUALIZADO — '+S.name);
}

function saveRanks(){
  ['D','C','B','A','S'].forEach(r=>{
    const v=parseInt(document.getElementById('xp-'+r).value);
    if(v>0) XPR[r]=v;
  });
  S.xprConfig={...XPR};
  // update existing missions xp
  S.missions.forEach(m=>{m.xp=XPR[m.rank];});
  save(); renderWithFlash(); notif('◈ RANGOS ACTUALIZADOS ◈');
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
    renderWithFlash();
    notif('▸ SISTEMA REINICIADO');
  }
}

// ╔══════════════════════════════════════════════════════════════════════════╗
