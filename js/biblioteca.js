// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  §20 — BIBLIOTECA                                                        ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║  Propósito: Tab de seguimiento de libros estilo Kindle.                  ║
// ║  Integrado con S (estado global), save(), renderWithFlash(), escH().    ║
// ║                                                                          ║
// ║  S.books[] = [{ id, title, author, ico, status, progress,               ║
// ║                 pages, notes, addedAt, finishedAt, cat }]               ║
// ║                                                                          ║
// ║  Estados: 'reading' | 'done' | 'wishlist' | 'paused'                   ║
// ║                                                                          ║
// ║  Funciones públicas:                                                     ║
// ║   · renderBiblioteca()   — renderiza tab completo                        ║
// ║   · openBookModal(id?)   — abre modal de añadir/editar                  ║
// ║   · saveBook()           — guarda desde modal                            ║
// ║   · deleteBook(id)       — elimina libro                                 ║
// ║   · updateBookProgress(id, pct) — actualiza progreso rápido             ║
// ║   · libSetFilter(f)      — cambia filtro activo                         ║
// ║   · libSetView(v)        — cambia vista (grid/list)                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── Estado local del tab ──────────────────────────────────────────────────
let _libFilter   = 'all';   // 'all' | 'reading' | 'done' | 'wishlist' | 'paused'
let _libView     = 'grid';  // 'grid' | 'list'
let _libSearch   = '';
let _libEditId   = null;    // id del libro en edición (null = nuevo)

// ── Emojis de portada disponibles ─────────────────────────────────────────
const BOOK_EMOJIS = ['📚','📖','📕','📗','📘','📙','📔','📒','📓','🔮','⚔️','🧬','🎭','🗺️','🔭','🧪','🎨','🧠','⚡','🌌'];

// ── Categorías de libro ────────────────────────────────────────────────────
const BOOK_CATS = {
  ficcion:    '🗡️ Ficción',
  noFiccion:  '📊 No Ficción',
  ciencia:    '🔬 Ciencia',
  historia:   '🏛️ Historia',
  desarrollo: '🧠 Desarrollo',
  filosofia:  '☯️ Filosofía',
  otro:       '📂 Otro',
};

// ── Logros de lectura (independientes de logros de misiones) ───────────────
function libDefaultAchievements(){
  return [
    // ── CANTIDAD DE LIBROS COMPLETADOS ───────────────────────────────────
    { id:'lb1',  ico:'🌱', name:'Primer Capítulo',    desc:'Completa tu primer libro',          type:'done',    target:1   },
    { id:'lb2',  ico:'📚', name:'Biblioteca Básica',  desc:'Lee 5 libros completos',            type:'done',    target:5   },
    { id:'lb3',  ico:'🔥', name:'Lector Voraz',       desc:'Lee 10 libros completos',           type:'done',    target:10  },
    { id:'lb4',  ico:'💎', name:'Gran Lector',        desc:'Lee 25 libros completos',           type:'done',    target:25  },
    { id:'lb5',  ico:'👑', name:'Maestro de Páginas', desc:'Lee 50 libros completos',           type:'done',    target:50  },
    { id:'lb6',  ico:'🌌', name:'Leyenda Literaria',  desc:'Lee 100 libros completos',          type:'done',    target:100 },
    { id:'lb7',  ico:'⚡', name:'Centelleante',       desc:'Lee 3 libros completos',            type:'done',    target:3   },
    { id:'lb8',  ico:'🎯', name:'Constante',          desc:'Lee 15 libros completos',           type:'done',    target:15  },
    { id:'lb9',  ico:'🚀', name:'Lanzado',            desc:'Lee 20 libros completos',           type:'done',    target:20  },
    { id:'lb10', ico:'🔱', name:'Erudito',            desc:'Lee 35 libros completos',           type:'done',    target:35  },
    // ── LIBROS AÑADIDOS / COLECCIÓN ──────────────────────────────────────
    { id:'lb11', ico:'📝', name:'Coleccionista',      desc:'Añade 3 libros a tu biblioteca',   type:'added',   target:3   },
    { id:'lb12', ico:'🗂️', name:'Archivero',         desc:'Añade 10 libros a tu biblioteca',  type:'added',   target:10  },
    { id:'lb13', ico:'🏛️', name:'Bibliófilo',        desc:'Añade 25 libros a tu biblioteca',  type:'added',   target:25  },
    { id:'lb14', ico:'🌐', name:'Enciclopedista',    desc:'Añade 50 libros a tu biblioteca',  type:'added',   target:50  },
    { id:'lb15', ico:'♾️', name:'Infinito',          desc:'Añade 100 libros a tu biblioteca', type:'added',   target:100 },
    // ── DIVERSIDAD DE CATEGORÍAS ──────────────────────────────────────────
    { id:'lb16', ico:'🗺️', name:'Explorador',       desc:'Lee libros de 2 categorías',        type:'cats',    target:2   },
    { id:'lb17', ico:'🧭', name:'Viajero',           desc:'Lee libros de 3 categorías',        type:'cats',    target:3   },
    { id:'lb18', ico:'🌍', name:'Cosmopolita',       desc:'Lee libros de 4 categorías',        type:'cats',    target:4   },
    { id:'lb19', ico:'✨', name:'Polímata',          desc:'Lee libros de 5 categorías',        type:'cats',    target:5   },
    { id:'lb20', ico:'🎭', name:'Renacentista',      desc:'Lee libros de todas las categorías',type:'cats',    target:7   },
    // ── PROGRESO ─────────────────────────────────────────────────────────
    { id:'lb21', ico:'📖', name:'A Medias',          desc:'Llega al 50% en un libro',          type:'half',    target:1   },
    { id:'lb22', ico:'🔖', name:'Marcapáginas',      desc:'Llega al 50% en 3 libros',          type:'half',    target:3   },
    { id:'lb23', ico:'📏', name:'Perseverante',      desc:'Llega al 50% en 5 libros',          type:'half',    target:5   },
    { id:'lb24', ico:'🧩', name:'Casi Ahí',          desc:'Llega al 50% en 10 libros',         type:'half',    target:10  },
    // ── PÁGINAS LEÍDAS ────────────────────────────────────────────────────
    { id:'lb25', ico:'📄', name:'Primeras Hojas',    desc:'Acumula 500 páginas leídas',        type:'pages',   target:500   },
    { id:'lb26', ico:'📃', name:'Maratón de Páginas',desc:'Acumula 1 000 páginas leídas',      type:'pages',   target:1000  },
    { id:'lb27', ico:'📜', name:'Devorador',         desc:'Acumula 2 500 páginas leídas',      type:'pages',   target:2500  },
    { id:'lb28', ico:'🗞️', name:'Biblionauta',      desc:'Acumula 5 000 páginas leídas',      type:'pages',   target:5000  },
    { id:'lb29', ico:'📰', name:'Inmortal',          desc:'Acumula 10 000 páginas leídas',     type:'pages',   target:10000 },
    // ── POR CATEGORÍA: FICCIÓN ───────────────────────────────────────────
    { id:'lb30', ico:'🗡️', name:'Aventurero',       desc:'Lee 2 libros de Ficción',           type:'catDone', target:2,  cat:'ficcion'    },
    { id:'lb31', ico:'⚔️', name:'Héroe de Papel',   desc:'Lee 5 libros de Ficción',           type:'catDone', target:5,  cat:'ficcion'    },
    { id:'lb32', ico:'🛡️', name:'Épico',            desc:'Lee 10 libros de Ficción',          type:'catDone', target:10, cat:'ficcion'    },
    // ── POR CATEGORÍA: NO FICCIÓN ────────────────────────────────────────
    { id:'lb33', ico:'📊', name:'Analista',          desc:'Lee 2 libros de No Ficción',        type:'catDone', target:2,  cat:'noFiccion'  },
    { id:'lb34', ico:'🏅', name:'Periodista',        desc:'Lee 5 libros de No Ficción',        type:'catDone', target:5,  cat:'noFiccion'  },
    { id:'lb35', ico:'🎖️', name:'Documentalista',  desc:'Lee 10 libros de No Ficción',       type:'catDone', target:10, cat:'noFiccion'  },
    // ── POR CATEGORÍA: CIENCIA ───────────────────────────────────────────
    { id:'lb36', ico:'🔬', name:'Aprendiz Científico',desc:'Lee 2 libros de Ciencia',         type:'catDone', target:2,  cat:'ciencia'    },
    { id:'lb37', ico:'🧪', name:'Científico',        desc:'Lee 5 libros de Ciencia',           type:'catDone', target:5,  cat:'ciencia'    },
    { id:'lb38', ico:'🔭', name:'Premio Nobel',      desc:'Lee 10 libros de Ciencia',          type:'catDone', target:10, cat:'ciencia'    },
    // ── POR CATEGORÍA: HISTORIA ──────────────────────────────────────────
    { id:'lb39', ico:'🏛️', name:'Cronista',         desc:'Lee 2 libros de Historia',          type:'catDone', target:2,  cat:'historia'   },
    { id:'lb40', ico:'📜', name:'Historiador',       desc:'Lee 5 libros de Historia',          type:'catDone', target:5,  cat:'historia'   },
    // ── POR CATEGORÍA: DESARROLLO ────────────────────────────────────────
    { id:'lb41', ico:'🧠', name:'En Crecimiento',    desc:'Lee 2 libros de Desarrollo',        type:'catDone', target:2,  cat:'desarrollo' },
    { id:'lb42', ico:'💡', name:'Archimago',         desc:'Lee 5 libros de Desarrollo',        type:'catDone', target:5,  cat:'desarrollo' },
    { id:'lb43', ico:'🏆', name:'Sensei',            desc:'Lee 10 libros de Desarrollo',       type:'catDone', target:10, cat:'desarrollo' },
    // ── POR CATEGORÍA: FILOSOFÍA ─────────────────────────────────────────
    { id:'lb44', ico:'☯️', name:'Pensador',          desc:'Lee 2 libros de Filosofía',         type:'catDone', target:2,  cat:'filosofia'  },
    { id:'lb45', ico:'🌀', name:'Filósofo',          desc:'Lee 5 libros de Filosofía',         type:'catDone', target:5,  cat:'filosofia'  },
    // ── LIBROS EN LISTA DE DESEOS ─────────────────────────────────────────
    { id:'lb46', ico:'🔖', name:'Soñador',           desc:'Ten 3 libros en lista de deseos',  type:'wishlist', target:3  },
    { id:'lb47', ico:'💭', name:'Ambicioso',         desc:'Ten 10 libros en lista de deseos', type:'wishlist', target:10 },
    // ── RACHAS Y VELOCIDAD ────────────────────────────────────────────────
    { id:'lb48', ico:'⚡', name:'Sprint Literario',  desc:'Completa 2 libros en un mes',       type:'monthDone', target:2 },
    { id:'lb49', ico:'🌪️', name:'Torbellino',       desc:'Completa 3 libros en un mes',       type:'monthDone', target:3 },
    { id:'lb50', ico:'🌟', name:'Imparable',         desc:'Completa 5 libros en un mes',       type:'monthDone', target:5 },
  ];
}

// ── Migración: añade books[] si no existe ─────────────────────────────────
function libEnsureState(){
  if(!S.books)              S.books              = [];
  if(!S.libAchievements || S.libAchievements.length < 50)
                            S.libAchievements    = libDefaultAchievements();
  if(!S.libAchievCompleted) S.libAchievCompleted = {};
  if(!S.nBid)               S.nBid               = 1;
}

// ── Evaluación de logro de lectura ────────────────────────────────────────
function _libMonthDone(){
  // Libros terminados en el mes natural actual
  if(!S.books) return 0;
  const now = new Date();
  const ym  = now.getFullYear()*100 + now.getMonth();
  return S.books.filter(b=>{
    if(b.status!=='done'||!b.finishedAt) return false;
    const d = new Date(b.finishedAt);
    return d.getFullYear()*100+d.getMonth()===ym;
  }).length;
}
function _libTotalPages(){
  if(!S.books) return 0;
  return S.books.filter(b=>b.status==='done').reduce((s,b)=>s+(b.pages||0),0);
}
function evalLibAchievement(a){
  if(!S.books) return false;
  const done = S.books.filter(b=>b.status==='done');
  const all  = S.books;
  switch(a.type){
    case 'done':      return done.length >= a.target;
    case 'added':     return all.length  >= a.target;
    case 'half':      return all.filter(b=>b.progress>=50).length >= a.target;
    case 'cats':      return new Set(done.map(b=>b.cat)).size >= a.target;
    case 'catDone':   return done.filter(b=>b.cat===a.cat).length >= a.target;
    case 'pages':     return _libTotalPages() >= a.target;
    case 'wishlist':  return all.filter(b=>b.status==='wishlist').length >= a.target;
    case 'monthDone': return _libMonthDone() >= a.target;
    default:          return false;
  }
}
function getLibAchievProgress(a){
  if(!S.books) return {cur:0, max:a.target};
  const done = S.books.filter(b=>b.status==='done');
  const all  = S.books;
  switch(a.type){
    case 'done':      return {cur:done.length, max:a.target};
    case 'added':     return {cur:all.length,  max:a.target};
    case 'half':      return {cur:all.filter(b=>b.progress>=50).length, max:a.target};
    case 'cats':      return {cur:new Set(done.map(b=>b.cat)).size, max:a.target};
    case 'catDone':   return {cur:done.filter(b=>b.cat===a.cat).length, max:a.target};
    case 'pages':     return {cur:_libTotalPages(), max:a.target};
    case 'wishlist':  return {cur:all.filter(b=>b.status==='wishlist').length, max:a.target};
    case 'monthDone': return {cur:_libMonthDone(), max:a.target};
    default:          return {cur:0, max:a.target};
  }
}

// ── Estadísticas rápidas ──────────────────────────────────────────────────
function libStats(){
  if(!S.books) return {total:0, done:0, reading:0, pages:0};
  const done    = S.books.filter(b=>b.status==='done').length;
  const reading = S.books.filter(b=>b.status==='reading').length;
  const pages   = S.books.filter(b=>b.status==='done')
                          .reduce((sum,b)=>sum+(b.pages||0),0);
  return { total:S.books.length, done, reading, pages };
}

// ── Filtrar + buscar ──────────────────────────────────────────────────────
function libFiltered(){
  if(!S.books) return [];
  return S.books.filter(b=>{
    const matchFilter = _libFilter==='all' || b.status===_libFilter;
    const q = _libSearch.toLowerCase().trim();
    const matchSearch = !q ||
      (b.title||'').toLowerCase().includes(q) ||
      (b.author||'').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
}

// ── Colores por estado ─────────────────────────────────────────────────────
function libStatusColor(status){
  const map = { reading:'#f0c040', done:'#4ade80', wishlist:'#c084fc', paused:'#94a3b8' };
  return map[status] || '#00aaff';
}
function libStatusLabel(status){
  const map = { reading:'LEYENDO', done:'TERMINADO', wishlist:'LISTA DESEOS', paused:'PAUSADO' };
  return map[status] || status;
}
function libStatusIcon(status){
  const map = { reading:'📖', done:'✅', wishlist:'🔖', paused:'⏸️' };
  return map[status] || '📚';
}

// ══════════════════════════════════════════════════════
// RENDER PRINCIPAL
// ══════════════════════════════════════════════════════
function renderBiblioteca(){
  const el = document.getElementById('tab-biblioteca');
  if(!el) return;
  libEnsureState();

  const stats    = libStats();
  const books    = libFiltered();
  const reading  = S.books.filter(b=>b.status==='reading');
  const currentBook = reading.length ? reading[0] : null;

  el.innerHTML = `
    <!-- Estadísticas rápidas -->
    <div class="shdr"><div class="sline"></div><span class="stitle">📚 <span class="txt-short">LIBROS</span><span class="txt-full">BIBLIOTECA — REGISTRO DE LECTURA</span></span><div class="sline"></div></div>

    <div class="lib-stats-row" style="margin-bottom:14px;">
      <div class="lib-stat">
        <span class="lib-stat-num">${stats.total}</span>
        <span class="lib-stat-lbl">TOTAL</span>
      </div>
      <div class="lib-stat">
        <span class="lib-stat-num">${stats.reading}</span>
        <span class="lib-stat-lbl">LEYENDO</span>
      </div>
      <div class="lib-stat">
        <span class="lib-stat-num">${stats.done}</span>
        <span class="lib-stat-lbl">LEÍDOS</span>
      </div>
      <div class="lib-stat">
        <span class="lib-stat-num" style="font-size:calc(11px * var(--fs-scale))">${stats.pages>0?stats.pages.toLocaleString('es-CO'):'—'}</span>
        <span class="lib-stat-lbl">PÁGINAS</span>
      </div>
    </div>

    <!-- Leyendo ahora (hero card) -->
    ${currentBook ? renderLibCurrentHero(currentBook) : ''}

    <!-- Toolbar: buscar + filtros + vista -->
    <div class="lib-toolbar">
      <input class="lib-search" placeholder="🔍 Buscar título o autor..." value="${escH(_libSearch)}"
             oninput="_libSearch=this.value;renderBiblioteca()">
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${['all','reading','done','wishlist','paused'].map(f=>`
          <button class="lib-filter-btn${_libFilter===f?' active':''}" onclick="libSetFilter('${f}')">
            ${f==='all'?'TODO':libStatusLabel(f).split(' ')[0]}
          </button>`).join('')}
      </div>
      <div class="lib-view-toggle">
        <button class="lib-view-btn${_libView==='grid'?' active':''}" onclick="libSetView('grid')" title="Galería">▦</button>
        <button class="lib-view-btn${_libView==='list'?' active':''}" onclick="libSetView('list')" title="Lista">☰</button>
      </div>
    </div>

    <!-- Grid / lista de libros -->
    ${books.length
      ? `<div class="lib-grid${_libView==='list'?' list-view':''}">${
          books.map(b => _libView==='list' ? renderLibListCard(b) : renderLibGridCard(b)).join('')
        }</div>`
      : `<div class="lib-empty">
           <span class="lib-empty-icon">📚</span>
           ${S.books.length===0
             ? 'Tu biblioteca está vacía.<br>Añade tu primer libro con el botón de abajo.'
             : 'Sin libros con ese filtro.'}
         </div>`
    }

    <button class="lib-add-btn" onclick="openBookModal()">＋ AÑADIR LIBRO</button>

    <!-- Logros de lectura -->
    <div class="lib-section-hdr">
      <div class="lib-section-line"></div>
      <span class="lib-section-title">◈ LOGROS DE LECTURA</span>
      <div class="lib-section-line"></div>
    </div>
    ${renderLibAchievements()}

    <!-- Modal (siempre en DOM para no recrear) -->
    ${renderLibModalHTML()}
  `;

  // Sincronizar slider si hay modal abierto (no aplica en render limpio)
}

// ── Hero del libro actual ─────────────────────────────────────────────────
function renderLibCurrentHero(b){
  const pct = b.progress||0;
  return `
    <div class="lib-current-hero" onclick="openBookModal('${escH(b.id)}')">
      <div class="lib-current-hero-ico">${b.ico||'📖'}</div>
      <div class="lib-current-hero-body">
        <div class="lib-current-lbl">▸ LEYENDO AHORA</div>
        <div class="lib-current-title">${escH(b.title||'Sin título')}</div>
        <div class="lib-current-author">${escH(b.author||'')}</div>
        <div class="lib-current-bar-wrap">
          <div class="lib-current-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="lib-current-pct">${pct}% completado</div>
      </div>
      <div class="lib-current-actions" onclick="event.stopPropagation()">
        <button class="lib-prog-btn" onclick="libQuickProgress('${escH(b.id)}',10)">+10%</button>
        <button class="lib-prog-btn" onclick="libMarkDone('${escH(b.id)}')">✓ FIN</button>
      </div>
    </div>`;
}

// ── Card de galería ────────────────────────────────────────────────────────
function renderLibGridCard(b){
  const pct   = b.progress||0;
  const color = libStatusColor(b.status);
  return `
    <div class="bcard ${b.status}" onclick="openBookModal('${escH(b.id)}')">
      <div class="bcard-cover">
        <div class="bcard-cover-stripe" style="background:${color}"></div>
        <div class="bcard-cover-emoji">${b.ico||'📚'}</div>
        <div class="bcard-cover-status">${libStatusIcon(b.status)}</div>
        <div class="bcard-progress-bar">
          <div class="bcard-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="bcard-info">
        <div class="bcard-title">${escH(b.title||'Sin título')}</div>
        <div class="bcard-author">${escH(b.author||'')}</div>
        <div class="bcard-pct">${b.status==='done'?'✓ LEÍDO':b.status==='wishlist'?'🔖':pct+'%'}</div>
      </div>
    </div>`;
}

// ── Card de lista ──────────────────────────────────────────────────────────
function renderLibListCard(b){
  const pct   = b.progress||0;
  const color = libStatusColor(b.status);
  return `
    <div class="bcard-list ${b.status}" onclick="openBookModal('${escH(b.id)}')">
      <div class="bcard-list-ico">${b.ico||'📚'}</div>
      <div class="bcard-list-body">
        <div class="bcard-list-title">${escH(b.title||'Sin título')}</div>
        <div class="bcard-list-meta">${escH(b.author||'')}${b.cat&&BOOK_CATS[b.cat]?' · '+BOOK_CATS[b.cat]:''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <div>
          <div class="bcard-list-bar">
            <div class="bcard-list-bar-fill" style="width:${pct}%;background:${b.status==='done'?'#4ade80':'linear-gradient(90deg,var(--blue),var(--gold))'}"></div>
          </div>
        </div>
        <div class="bcard-list-pct" style="color:${color}">${b.status==='done'?'✓':b.status==='wishlist'?'🔖':pct+'%'}</div>
      </div>
    </div>`;
}

// ── Logros de lectura ──────────────────────────────────────────────────────
function renderLibAchievements(){
  libEnsureState();
  if(!S.libAchievCompleted) S.libAchievCompleted = {};
  const total    = S.libAchievements.length;
  const unlocked = S.libAchievements.filter(a=>evalLibAchievement(a)).length;
  return `
    <div style="text-align:center;font-size:calc(11px * var(--fs-scale));color:var(--muted);margin-bottom:10px;">
      ${unlocked} / ${total} logros desbloqueados
    </div>
    <div class="lib-achiev-grid">${
    S.libAchievements.map(a=>{
      const done = evalLibAchievement(a);
      const prog = getLibAchievProgress(a);
      const pct  = Math.min(100, Math.round((prog.cur/prog.max)*100));
      const xpReward = a.target>=50 ? 80 : a.target>=20 ? 50 : a.target>=10 ? 30 : a.target>=5 ? 20 : 10;
      return `<div class="lib-achiev-card${done?' done':''}">
        <div class="lib-achiev-ico">${done?a.ico:'🔒'}</div>
        <div class="lib-achiev-name">${escH(a.name)}</div>
        <div class="lib-achiev-desc" style="font-size:calc(9px * var(--fs-scale));color:var(--muted);margin-bottom:4px;line-height:1.3;">${escH(a.desc)}</div>
        <div class="lib-achiev-pbar"><div class="lib-achiev-pfill" style="width:${pct}%"></div></div>
        <div class="lib-achiev-prog">${prog.cur}/${prog.max}</div>
        <div style="font-size:calc(9px * var(--fs-scale));color:${done?'#f0c040':'var(--muted)'};margin-top:2px;">${done?'✓ +'+xpReward+' XP':'⭐ +'+xpReward+' XP'}</div>
      </div>`;
    }).join('')
  }</div>`;
}

// ══════════════════════════════════════════════════════
// MODAL HTML (renderizado en el tab, no fuera)
// ══════════════════════════════════════════════════════
function renderLibModalHTML(){
  return `
  <div id="libModal">
    <div class="lib-modal-box">
      <div class="lib-modal-title" id="libModalTitle">◈ AÑADIR LIBRO</div>

      <div class="lib-modal-row">
        <span class="lib-modal-lbl">Portada (emoji)</span>
        <div class="lib-modal-emoji-row" id="libEmojiRow">
          ${BOOK_EMOJIS.map(e=>`<span class="lib-emoji-opt" onclick="libSelectEmoji('${e}')">${e}</span>`).join('')}
        </div>
        <input type="hidden" id="libIco" value="📚">
      </div>

      <div class="lib-modal-row">
        <span class="lib-modal-lbl">Título</span>
        <input class="lib-modal-inp" id="libTitle" placeholder="Nombre del libro" maxlength="80">
      </div>

      <div class="lib-modal-row">
        <span class="lib-modal-lbl">Autor</span>
        <input class="lib-modal-inp" id="libAuthor" placeholder="Nombre del autor" maxlength="60">
      </div>

      <div style="display:flex;gap:8px;">
        <div class="lib-modal-row" style="flex:1">
          <span class="lib-modal-lbl">Estado</span>
          <select class="lib-modal-sel" id="libStatus" onchange="libModalStatusChange()">
            <option value="reading">📖 Leyendo</option>
            <option value="done">✅ Terminado</option>
            <option value="wishlist">🔖 Lista deseos</option>
            <option value="paused">⏸️ Pausado</option>
          </select>
        </div>
        <div class="lib-modal-row" style="flex:1">
          <span class="lib-modal-lbl">Categoría</span>
          <select class="lib-modal-sel" id="libCat">
            ${Object.entries(BOOK_CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="lib-modal-row" id="libProgressRow">
        <span class="lib-modal-lbl">Progreso</span>
        <div class="lib-modal-progress-wrap">
          <input type="range" class="lib-modal-progress-inp" id="libProgress" min="0" max="100" value="0"
                 oninput="document.getElementById('libPctDisplay').textContent=this.value+'%'">
          <span class="lib-modal-pct-display" id="libPctDisplay">0%</span>
        </div>
      </div>

      <div class="lib-modal-row">
        <span class="lib-modal-lbl">Páginas totales (opcional)</span>
        <input class="lib-modal-inp" id="libPages" type="number" min="0" placeholder="ej: 320">
      </div>

      <div class="lib-modal-row">
        <span class="lib-modal-lbl">Notas</span>
        <textarea class="lib-modal-textarea" id="libNotes" placeholder="Apuntes, citas favoritas..."></textarea>
      </div>

      <div class="lib-modal-btns">
        <button class="lib-mbtn" onclick="closeLibModal()">CANCELAR</button>
        <button class="lib-mbtn danger" id="libDeleteBtn" onclick="libDeleteCurrent()" style="display:none">ELIMINAR</button>
        <button class="lib-mbtn primary" onclick="saveBook()">GUARDAR</button>
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
// ACCIONES
// ══════════════════════════════════════════════════════

function libSetFilter(f){
  _libFilter = f;
  renderBiblioteca();
}
function libSetView(v){
  _libView = v;
  renderBiblioteca();
}
function libSelectEmoji(e){
  document.getElementById('libIco').value = e;
  document.querySelectorAll('.lib-emoji-opt').forEach(el=>{
    el.classList.toggle('selected', el.textContent===e);
  });
}
function libModalStatusChange(){
  const status = document.getElementById('libStatus').value;
  const row    = document.getElementById('libProgressRow');
  if(!row) return;
  if(status==='wishlist'){
    row.style.opacity='.4';
    row.style.pointerEvents='none';
  } else if(status==='done'){
    const inp = document.getElementById('libProgress');
    const disp= document.getElementById('libPctDisplay');
    if(inp){ inp.value=100; }
    if(disp){ disp.textContent='100%'; }
    row.style.opacity='1';
    row.style.pointerEvents='auto';
  } else {
    row.style.opacity='1';
    row.style.pointerEvents='auto';
  }
}

function openBookModal(id){
  libEnsureState();
  _libEditId = id||null;

  // Asegurar que el modal existe en DOM
  if(!document.getElementById('libModal')) renderBiblioteca();

  const modal = document.getElementById('libModal');
  if(!modal) return;

  const titleEl = document.getElementById('libModalTitle');
  const delBtn  = document.getElementById('libDeleteBtn');

  if(id){
    const b = S.books.find(x=>x.id===id);
    if(!b) return;
    titleEl.textContent = '◈ EDITAR LIBRO';
    delBtn.style.display='';
    // Rellenar campos
    document.getElementById('libTitle').value  = b.title||'';
    document.getElementById('libAuthor').value = b.author||'';
    document.getElementById('libStatus').value = b.status||'reading';
    document.getElementById('libCat').value    = b.cat||'otro';
    document.getElementById('libPages').value  = b.pages||'';
    document.getElementById('libNotes').value  = b.notes||'';
    const pct = b.progress||0;
    document.getElementById('libProgress').value   = pct;
    document.getElementById('libPctDisplay').textContent = pct+'%';
    // Emoji
    const ico = b.ico||'📚';
    document.getElementById('libIco').value = ico;
    document.querySelectorAll('.lib-emoji-opt').forEach(el=>
      el.classList.toggle('selected', el.textContent===ico)
    );
  } else {
    titleEl.textContent = '◈ AÑADIR LIBRO';
    delBtn.style.display='none';
    document.getElementById('libTitle').value  = '';
    document.getElementById('libAuthor').value = '';
    document.getElementById('libStatus').value = 'reading';
    document.getElementById('libCat').value    = 'otro';
    document.getElementById('libPages').value  = '';
    document.getElementById('libNotes').value  = '';
    document.getElementById('libProgress').value   = 0;
    document.getElementById('libPctDisplay').textContent = '0%';
    document.getElementById('libIco').value = '📚';
    document.querySelectorAll('.lib-emoji-opt').forEach(el=>el.classList.remove('selected'));
    document.querySelector('.lib-emoji-opt')?.classList.add('selected');
  }
  libModalStatusChange();
  modal.classList.add('show');
}

function closeLibModal(){
  const modal = document.getElementById('libModal');
  if(modal) modal.classList.remove('show');
  _libEditId = null;
}

function saveBook(){
  libEnsureState();
  const title  = (document.getElementById('libTitle').value||'').trim();
  if(!title){ notif('⚠ El título es obligatorio'); return; }

  const author = (document.getElementById('libAuthor').value||'').trim();
  const status = document.getElementById('libStatus').value;
  const cat    = document.getElementById('libCat').value;
  const pages  = parseInt(document.getElementById('libPages').value)||0;
  const notes  = (document.getElementById('libNotes').value||'').trim();
  const progress= parseInt(document.getElementById('libProgress').value)||0;
  const ico    = document.getElementById('libIco').value||'📚';

  if(_libEditId){
    const idx = S.books.findIndex(b=>b.id===_libEditId);
    if(idx<0) return;
    const prev = S.books[idx];
    const prevProg = prev.progress||0;
    S.books[idx] = {...prev, title, author, status, cat, pages, notes, progress, ico,
      finishedAt: status==='done'&&prev.status!=='done' ? localISO() : (prev.finishedAt||null)
    };
    // XP: libro recién terminado
    if(status==='done' && prev.status!=='done'){
      const xpBook = pages>=400 ? 250 : pages>=200 ? 175 : 100;
      gainXP(xpBook);
      notif(`📚 ¡LIBRO COMPLETADO! +${xpBook} XP`);
      if(typeof FX!=='undefined') FX.questComplete();
      // XP bonus páginas
      if(pages>=1000){ gainXP(500); notif('📜 ¡Libro épico (+1000 pág)! +500 XP'); }
      else if(pages>=500){ gainXP(250); notif('📃 ¡Libro largo (+500 pág)! +250 XP'); }
    }
    // XP: hito de progreso (cruzó 25%, 50%, 75%)
    if(prev.status!=='done'){
      [[25,50],[50,100],[75,150]].forEach(([milestone, xp])=>{
        if(prevProg < milestone && progress >= milestone){
          gainXP(xp);
          notif(`📖 ${milestone}% completado +${xp} XP`);
        }
      });
    }
    // XP: se agregaron notas por primera vez
    if(!prev.notes && notes){ gainXP(20); notif('📝 Notas agregadas +20 XP'); }
  } else {
    const id = 'b'+S.nBid;
    S.nBid++;
    S.books.push({ id, title, author, status, cat, pages, notes, progress, ico,
      addedAt: localISO(), finishedAt: status==='done'?localISO():null });
    // XP: añadir libro
    gainXP(40);
    notif('📚 Libro añadido +40 XP');
    if(status==='done'){
      const xpBook = pages>=400 ? 250 : pages>=200 ? 175 : 100;
      gainXP(xpBook);
      notif(`📚 ¡Añadido como leído! +${xpBook} XP`);
      if(pages>=1000){ gainXP(500); notif('📜 ¡Libro épico (+1000 pág)! +500 XP'); }
      else if(pages>=500){ gainXP(250); notif('📃 ¡Libro largo (+500 pág)! +250 XP'); }
    }
    // XP: primera categoría diversa
    if(status==='done'){
      const doneBycat = S.books.filter(b=>b.status==='done');
      const uniqueCats = new Set(doneBycat.map(b=>b.cat)).size;
      if(uniqueCats===3){ gainXP(20); notif('🌍 ¡3 categorías distintas! +20 XP'); }
      else if(uniqueCats===5){ gainXP(35); notif('✨ ¡Polímata! 5 categorías +35 XP'); }
      else if(uniqueCats===7){ gainXP(60); notif('🎭 ¡Renacentista! 7 categorías +60 XP'); }
    }
  }

  // Evaluar logros y notificar nuevos
  _libCheckNewAchievements();

  save();
  closeLibModal();
  renderWithFlash();
  switchTab('biblioteca');
}

function libDeleteCurrent(){
  if(!_libEditId) return;
  if(!confirm('¿Eliminar este libro de la biblioteca?')) return;
  libEnsureState();
  S.books = S.books.filter(b=>b.id!==_libEditId);
  save();
  closeLibModal();
  renderWithFlash();
  switchTab('biblioteca');
}

// ── Detecta logros recién desbloqueados y da XP ───────────────────────────
function _libCheckNewAchievements(){
  libEnsureState();
  if(!S.libAchievCompleted) S.libAchievCompleted = {};
  S.libAchievements.forEach(a=>{
    if(!S.libAchievCompleted[a.id] && evalLibAchievement(a)){
      S.libAchievCompleted[a.id] = true;
      // XP por logro desbloqueado según dificultad (target)
      const xp = a.target>=50 ? 80 : a.target>=20 ? 50 : a.target>=10 ? 30 : a.target>=5 ? 20 : 10;
      gainXP(xp);
      notif(`${a.ico} ¡LOGRO! ${a.name} +${xp} XP`);
      if(typeof FX!=='undefined') FX.questComplete();
    }
  });
}

// Incremento rápido de progreso (+N%)
function libQuickProgress(id, delta){
  libEnsureState();
  const b = S.books.find(x=>x.id===id);
  if(!b) return;
  const prevProg = b.progress||0;
  b.progress = Math.min(100, prevProg+delta);
  // XP por hitos de progreso
  [[25,50],[50,100],[75,150]].forEach(([milestone, xp])=>{
    if(prevProg < milestone && b.progress >= milestone){
      gainXP(xp);
      notif(`📖 ${milestone}% completado +${xp} XP`);
    }
  });
  if(b.progress>=100){ b.progress=100; }
  save();
  renderWithFlash();
  switchTab('biblioteca');
  notif(`📖 Progreso: ${b.progress}%`);
}

// Marcar como terminado desde el hero
function libMarkDone(id){
  libEnsureState();
  const b = S.books.find(x=>x.id===id);
  if(!b) return;
  const wasDone = b.status==='done';
  b.status   = 'done';
  b.progress = 100;
  b.finishedAt = localISO();
  if(!wasDone){
    const xpBook = (b.pages||0)>=400 ? 250 : (b.pages||0)>=200 ? 175 : 100;
    gainXP(xpBook);
    notif(`📚 ¡LIBRO COMPLETADO! +${xpBook} XP`);
    if((b.pages||0)>=1000){ gainXP(500); notif('📜 ¡Libro épico (+1000 pág)! +500 XP'); }
    else if((b.pages||0)>=500){ gainXP(250); notif('📃 ¡Libro largo (+500 pág)! +250 XP'); }
    if(typeof FX!=='undefined') FX.questComplete();
    _libCheckNewAchievements();
  }
  save();
  renderWithFlash();
  switchTab('biblioteca');
}

// Delegación de updateBookProgress para uso externo
function updateBookProgress(id, pct){
  libEnsureState();
  const b = S.books.find(x=>x.id===id);
  if(!b) return;
  b.progress = Math.max(0, Math.min(100, pct));
  save();
}
