// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §03 — LOGIN / LOGOUT                                                   ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Controla el acceso multi-usuario. El login no usa           ║
// ║  contraseña; el nombre de usuario ES la clave de datos.                 ║
// ║                                                                          ║
// ║  Funciones:                                                              ║
// ║   · doLogin()                                                            ║
// ║       Lee #loginUser.value, normaliza, guarda 'sl_current_user' en     ║
// ║       localStorage. Llama loadState() → S. Si S.name sigue siendo      ║
// ║       'CAZADOR' (default) lo reemplaza por el username.                 ║
// ║       Restaura: shopPeriod, currentPeriod, finPeriod, tamaño de        ║
// ║       fuente, selectores de período en UI.                              ║
// ║       Llama checkReset() → render() → switchTab(S.activeTab).          ║
// ║       Muestra notif de bienvenida.                                       ║
// ║                                                                          ║
// ║   · doLogout()                                                           ║
// ║       Pide confirm(). Borra currentUser y S. Elimina                    ║
// ║       'sl_current_user' de localStorage. Muestra #loginOver.           ║
// ║       Oculta #userBar. Limpia el input de usuario.                      ║
// ║                                                                          ║
// ║  HTML relacionado:                                                       ║
// ║   · #loginOver  — overlay full-screen de login                          ║
// ║   · #loginUser  — input de nombre de usuario                            ║
// ║   · #userBar    — barra superior con nombre activo + botón logout       ║
// ║   · #userBarName— span con nombre en mayúsculas                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════
// LOGIN / LOGOUT
// ═══════════════════════════════════════════════════════
function doLogin(){
  const u = document.getElementById('loginUser').value.trim();
  if(!u){ notif('▸ INGRESA UN NOMBRE DE USUARIO'); return; }
  currentUser = u;
  localStorage.setItem('sl_current_user', u);
  S = loadState(u);
  // Si el nombre sigue siendo el default, usar el username
  if(!S.name || S.name === 'CAZADOR') {
    S.name = u.toUpperCase();
    save();
  }
  XPR = S.xprConfig || {D:15,C:30,B:50,A:80,S:120};
  // Restaurar preferencias de UI
  shopPeriod    = S.shopPeriod    || 'day';
  currentPeriod = S.profilePeriod || 'week';
  finPeriod     = S.finPeriod     || 'day';
  document.getElementById('loginOver').classList.remove('show');
  // userBar removed — controls now in player card
  // userBarName removed — name shown via render() in #pname
  // Restaurar tamaño de fuente
  const savedFont=parseInt(localStorage.getItem(getUserKey(u)+'_font'));
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
  // Restaurar tab activo
  if(S.activeTab && S.activeTab !== 'missions') switchTab(S.activeTab);
  notif('▸ BIENVENIDO, ' + u.toUpperCase() + ' ◂');
  // Detección de primer uso: abrir plantilla si el banco está vacío
  if(!S.missions || S.missions.length === 0){
    setTimeout(openTplModal, 400);
  }
}

function doLogout(){
  currentUser = null;
  S = null;
  localStorage.removeItem('sl_current_user');
  const loginOver = document.getElementById('loginOver');
  if(loginOver) loginOver.classList.add('show');
  // Clear inputs for fresh entry
  const inp = document.getElementById('loginUser');
  const pass = document.getElementById('loginPass');
  if(inp) inp.value = '';
  if(pass) pass.value = '';
  setTimeout(()=>{ if(inp) inp.focus(); }, 100);
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §04 — DAILY ROTATION                                                   ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Selecciona automáticamente 4 misiones diarias del banco     ║
// ║  completo, garantizando variedad de categorías y rotación equitativa.   ║
// ║                                                                          ║
// ║  Funciones:                                                              ║
// ║   · getTodayKey() → string                                              ║
// ║       Genera clave única del día considerando S.resetHour.              ║
// ║       Si hora actual < resetHour, se considera "ayer todavía".          ║
// ║       Formato: 'Thu May 01 2025_h6' (fecha + hora de reset).           ║
// ║                                                                          ║
// ║   · assignDailyMissions()                                               ║
// ║       Solo ejecuta si la clave del día cambió (evita re-asignar).      ║
// ║       Algoritmo de prioridad (TARGET = 4):                              ║
// ║         1. Misiones fixed → siempre incluidas primero                   ║
// ║         2. Una misión por cada DAILY_CAT (la menos-recientemente hecha) ║
// ║         3. Resto sin categoría (least-recently-done) hasta llegar a 4  ║
// ║         4. Si aún faltan, recicla misiones ya usadas                    ║
// ║       Helper interno pickBest(pool): ordena por lastDoneDate ascendente ║
// ║       para priorizar las que llevan más tiempo sin hacerse.             ║
// ║       Guarda resultado en S.dailyAssigned = {key, ids[]}.              ║
// ║                                                                          ║
// ║   · getDailyMissions() → array de misiones                             ║
// ║       Mapea S.dailyAssigned.ids a objetos misión reales.                ║
// ║       Filtra nulls (misiones eliminadas después de asignar).            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════
// DAILY ROTATION — 4 misiones mínimas (1 por categoría principal)
// ═══════════════════════════════════════════════════════
function getTodayKey(){
  const now = new Date();
  const rh = S.resetHour||0;
  const d = new Date(now);
  if(now.getHours()<rh) d.setDate(d.getDate()-1);
  return d.toDateString()+'_h'+rh;
}

function assignDailyMissions(){
  const todayKey = getTodayKey();
  if(S.dailyAssigned && S.dailyAssigned.key === todayKey) return;

  // ── Fecha de ayer en ISO local (para excluir misiones ya usadas ayer) ──
  const todayISO = getTodayISODate();
  const yesterdayDate = new Date();
  const rh = S.resetHour || 0;
  if(new Date().getHours() < rh) yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayISO = localISO(yesterdayDate);

  // ── Utilidades ──────────────────────────────────────────────────────────

  // Shuffle Fisher-Yates para aleatoriedad real
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  // ¿Fue esta misión asignada ayer? (evitar repetición inmediata)
  function usedYesterday(m){
    return S.dailyAssigned && S.dailyAssigned.prevKey &&
           Array.isArray(S.dailyAssigned.prevIds) &&
           S.dailyAssigned.prevIds.includes(m.id);
  }

  // Selecciona una misión aleatoria del pool:
  // Prioridad 1: misiones que NO se hicieron ayer
  // Prioridad 2: misiones que no se completaron hoy (lastDoneDate !== todayISO)
  // Prioridad 3: cualquier disponible (si el pool es muy pequeño)
  function pickRandom(pool, used){
    const avail = pool.filter(m => !used.has(m.id));
    if(!avail.length) return null;
    // Excluir las de ayer si hay alternativas
    const notYesterday = avail.filter(m => !usedYesterday(m));
    const candidates = notYesterday.length ? notYesterday : avail;
    // Excluir las ya completadas hoy si hay alternativas
    const notDoneToday = candidates.filter(m => m.lastDoneDate !== todayISO);
    const final = notDoneToday.length ? notDoneToday : candidates;
    // Elegir aleatoriamente del set final
    return shuffle(final)[0];
  }

  const assigned = { key: todayKey, ids: [], prevKey: S.dailyAssigned?.key||null, prevIds: S.dailyAssigned?.ids||[] };
  const used = new Set();

  // ── Paso 1: Misiones fijas (siempre aparecen, hasta llenar TARGET) ──────
  const TARGET = 4;
  S.missions.filter(m=>m.fixed).forEach(m=>{
    if(assigned.ids.length < TARGET && !used.has(m.id)){
      assigned.ids.push(m.id);
      used.add(m.id);
    }
  });

  // ── Paso 2: Una misión aleatoria por cada DAILY_CAT ──────────────────────
  // Orden aleatorio de categorías para que no siempre aparezca en el mismo orden
  const catOrder = shuffle(DAILY_CATS.slice());
  catOrder.forEach(cat=>{
    if(assigned.ids.length >= TARGET) return;
    // No duplicar si una misión fija ya cubre esta categoría
    if(S.missions.some(m=>m.fixed && m.cat===cat && used.has(m.id))) return;
    const pool = S.missions.filter(m=>m.cat===cat && !m.fixed);
    const pick = pickRandom(pool, used);
    if(pick){ assigned.ids.push(pick.id); used.add(pick.id); }
  });

  // ── Paso 3: Si faltan slots, rellenar de cualquier categoría (aleatoriamente) ──
  if(assigned.ids.length < TARGET){
    const remaining = shuffle(S.missions.filter(m=>!m.fixed && !used.has(m.id)));
    // Preferir las que no se hicieron ayer
    const notYest = remaining.filter(m=>!usedYesterday(m));
    const pool3 = notYest.length ? notYest : remaining;
    for(const m of pool3){
      if(assigned.ids.length >= TARGET) break;
      assigned.ids.push(m.id); used.add(m.id);
    }
  }

  // ── Paso 4: Último recurso — cualquier misión restante ──────────────────
  if(assigned.ids.length < TARGET){
    for(const m of S.missions.filter(m=>!used.has(m.id))){
      if(assigned.ids.length >= TARGET) break;
      assigned.ids.push(m.id); used.add(m.id);
    }
  }

  S.dailyAssigned = assigned;
  save();
}

function getDailyMissions(){
  if(!S.dailyAssigned || !S.dailyAssigned.ids) return [];
  return S.dailyAssigned.ids.map(id=>S.missions.find(m=>m.id===id)).filter(Boolean);
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §05 — RESET                                                            ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Maneja el ciclo diario: detecta cambio de día, actualiza   ║
// ║  racha, aplica penalización, reinicia misiones y asigna las del día.   ║
// ║                                                                          ║
// ║  Funciones:                                                              ║
// ║   · checkReset()                                                         ║
// ║       Compara S.lastDate con getTodayKey().                             ║
// ║       Si cambió (nuevo día):                                             ║
// ║         — Verifica si el día anterior fue consecutivo → streak++        ║
// ║         — Si no hubo XP ese día → streak = 0                           ║
// ║         — Si misiones incompletas y hubo actividad → muestra #penbar   ║
// ║           (auto-oculta en 10s)                                          ║
// ║         — Resetea: m.done=false en todas, todayXP=0, claimed=false     ║
// ║         — Llama assignDailyMissions() para el nuevo día                 ║
// ║       Si NO cambió: solo llama assignDailyMissions() (idempotente).    ║
// ║                                                                          ║
// ║   · changeResetHour(delta)                                              ║
// ║       Mueve S.resetHour ±1 hora (circular 0-23). Guarda y actualiza UI.║
// ║                                                                          ║
// ║   · updateResetUI()                                                      ║
// ║       Sincroniza #resetHourLbl y #rhVal con S.resetHour actual.        ║
// ║                                                                          ║
// ║  HTML relacionado:                                                       ║
// ║   · #penbar    — barra roja de penalización por misiones incompletas    ║
// ║   · #resetHourLbl — label "RESET A LAS HH:00"                          ║
// ║   · #rhVal     — valor numérico de la hora de reset                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════
function checkReset(){
  const key = getTodayKey();
  // Always hide penalty bar on page load — it will re-show if needed
  const penbar = document.getElementById('penbar');
  if(penbar) penbar.style.display='none';

  if(S.lastDate !== key){
    if(S.lastDate){
      // streak check — build yesterday's key using same resetHour offset as getTodayKey
      const rh = S.resetHour||0;
      const now2 = new Date();
      const base = new Date(now2);
      if(now2.getHours()<rh) base.setDate(base.getDate()-1); // same offset as getTodayKey
      base.setDate(base.getDate()-1); // go one day back from the "today" anchor
      const prevKey = base.toDateString()+'_h'+rh;
      if(S.lastDate===prevKey) S.streak++;
      else if(S.todayXP===0) S.streak=0;
      // penalty — only show if yesterday had activity but not all missions done
      const daily = getDailyMissions();
      const doneMin = daily.filter(m=>m.done).length;
      if(doneMin < Math.min(4,daily.length) && S.todayXP>0){
        if(penbar){
          penbar.style.display='block';
          // Auto-hide after 10 seconds
          setTimeout(()=>{ penbar.style.display='none'; }, 10000);
        }
      }
    }
    S.missions.forEach(m=>m.done=false);
    S.todayXP=0; S.claimed=false; S.lastDate=key;
    // Assign new daily missions
    S.dailyAssigned = null;
    assignDailyMissions();
    save();
  } else {
    assignDailyMissions();
  }
}

function changeResetHour(delta){
  S.resetHour = ((S.resetHour||0)+delta+24)%24;
  save(); updateResetUI();
  notif('⚙ RESET A LAS ' + String(S.resetHour).padStart(2,'0') + ':00');
}

function updateResetUI(){
  const rh = S.resetHour||0;
  const s = String(rh).padStart(2,'0')+':00';
  const lbl=document.getElementById('resetHourLbl');
  if(lbl)lbl.textContent='RESET A LAS '+s;
  const rv=document.getElementById('rhVal');
  if(rv)rv.textContent=s;
}

