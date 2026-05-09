// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §02 — MULTI-USER STORAGE                                               ║
// ║  Dependencias: constants.js (XPR, S, currentUser)                      ║
// ║  Consumido por: todos los módulos (todos llaman save()/load())          ║
// ╚══════════════════════════════════════════════════════════════════════════╝

function getUserKey(user){
  return 'sl_v3_' + user.toLowerCase().replace(/\s+/g, '_');
}

function loadState(user){
  try {
    const raw = localStorage.getItem(getUserKey(user));
    if(raw){
      const d = JSON.parse(raw);
      const def = defaultState();
      const merged = Object.assign({}, def, d);
      // Garantizar campos críticos en saves antiguos
      if(!merged.achievements || !merged.achievements.length) merged.achievements = defaultAchievements();
      if(!merged.dailyLog)      merged.dailyLog      = [];
      if(!merged.missions)      merged.missions      = [];
      if(!merged.items)         merged.items         = [];
      if(!merged.catCounts)     merged.catCounts     = {};
      if(!merged.dailyAssigned) merged.dailyAssigned = null;
      if(!merged.transactions)  merged.transactions  = [];
      if(!merged.nTid)          merged.nTid          = 1;
      if(!merged.finPeriod)     merged.finPeriod     = 'day';
      // Migración: shopXP para usuarios existentes
      if(merged.shopXP === undefined || merged.shopXP === null){
        merged.shopXP = merged.totalXP || 0;
      }
      if(merged.xprConfig) XPR = merged.xprConfig;
      return merged;
    }
  } catch(e){ console.warn('Error loading state:', e); }
  return defaultState();
}

function defaultAchievements(){
  return [
    { id:'a1', ico:'🌅', name:'Primer Paso',  desc:'Completa tu primera misión',           type:'totalComp', target:1   },
    { id:'a2', ico:'🔥', name:'Racha de 3',   desc:'Mantén 3 días consecutivos',           type:'streak',    target:3   },
    { id:'a3', ico:'⚡',  name:'Racha de 7',   desc:'7 días sin fallar',                    type:'streak',    target:7   },
    { id:'a4', ico:'💯', name:'Centurión',    desc:'Alcanza 100 misiones completadas',     type:'totalComp', target:100 },
    { id:'a5', ico:'🏆', name:'Elite S',      desc:'Sube al nivel 35',                     type:'level',     target:35  },
    { id:'a6', ico:'💎', name:'Veterano',     desc:'Acumula 500 XP en total',              type:'totalXP',   target:500 },
    { id:'a7', ico:'🎯', name:'Especialista', desc:'Domina una categoría con 20 misiones', type:'catMax',    target:20  },
    { id:'a8', ico:'🛒', name:'Primer Canje', desc:'Canjea tu primer objeto en la tienda', type:'redeem',    target:1   },
  ];
}

function defaultState(){
  return {
    name:'CAZADOR', lvl:1, totalXP:0, curXP:0, nextXP:100,
    streak:0, totalComp:0, todayXP:0, lastDate:'', claimed:false,
    missions:[], items:[], nMid:100, nIid:100, resetHour:0,
    catCounts:{}, dailyAssigned:null, xprConfig:{...XPR},
    dailyLog:[],
    achievements: defaultAchievements(),
    shopPeriod:    'day',
    profilePeriod: 'week',
    activeTab:     'missions',
    transactions:  [],
    nTid:          1,
    finPeriod:     'day',
    minBalance:    0,
    shopXP:        0,
  };
}

function save(){
  if(!currentUser) return;
  S.xprConfig = {...XPR};
  try {
    localStorage.setItem(getUserKey(currentUser), JSON.stringify(S));
    const ind = document.getElementById('saveIndicator');
    if(ind){
      ind.style.opacity = '1';
      clearTimeout(ind._t);
      ind._t = setTimeout(() => { ind.style.opacity = '0'; }, 1500);
    }
  } catch(e){ notif('⚠ ERROR AL GUARDAR — ALMACENAMIENTO LLENO'); }
}
