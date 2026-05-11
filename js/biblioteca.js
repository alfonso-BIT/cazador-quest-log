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
    { id:'lb1', ico:'🌱', name:'Primer Libro',    desc:'Completa tu primer libro',        type:'done',    target:1   },
    { id:'lb2', ico:'📚', name:'Biblioteca',      desc:'Lee 5 libros completos',           type:'done',    target:5   },
    { id:'lb3', ico:'🔥', name:'Lector Voraz',    desc:'Lee 10 libros completos',          type:'done',    target:10  },
    { id:'lb4', ico:'💎', name:'Gran Lector',     desc:'Lee 25 libros completos',          type:'done',    target:25  },
    { id:'lb5', ico:'⚡', name:'Velocista',       desc:'Añade 3 libros en lista',          type:'added',   target:3   },
    { id:'lb6', ico:'🗺️', name:'Explorador',     desc:'Lee libros de 3 categorías',       type:'cats',    target:3   },
    { id:'lb7', ico:'📖', name:'A Medias',        desc:'Llega al 50% en un libro',         type:'half',    target:1   },
    { id:'lb8', ico:'🏆', name:'Archimago',       desc:'Lee 3 libros de Desarrollo',       type:'catDone', target:3, cat:'desarrollo' },
  ];
}

// ── Migración: añade books[] si no existe ─────────────────────────────────
function libEnsureState(){
  if(!S.books)           S.books           = [];
  if(!S.libAchievements) S.libAchievements = libDefaultAchievements();
  if(!S.nBid)            S.nBid            = 1;
}

// ── Evaluación de logro de lectura ────────────────────────────────────────
function evalLibAchievement(a){
  if(!S.books) return false;
  const done    = S.books.filter(b=>b.status==='done');
  const all     = S.books;
  switch(a.type){
    case 'done':    return done.length >= a.target;
    case 'added':   return all.length  >= a.target;
    case 'half':    return all.some(b => b.progress >= 50);
    case 'cats':    return new Set(done.map(b=>b.cat)).size >= a.target;
    case 'catDone': return done.filter(b=>b.cat===a.cat).length >= a.target;
    default:        return false;
  }
}
function getLibAchievProgress(a){
  if(!S.books) return {cur:0, max:a.target};
  const done = S.books.filter(b=>b.status==='done');
  const all  = S.books;
  switch(a.type){
    case 'done':    return {cur:done.length, max:a.target};
    case 'added':   return {cur:all.length,  max:a.target};
    case 'half':    return {cur:all.filter(b=>b.progress>=50).length, max:a.target};
    case 'cats':    return {cur:new Set(done.map(b=>b.cat)).size, max:a.target};
    case 'catDone': return {cur:done.filter(b=>b.cat===a.cat).length, max:a.target};
    default:        return {cur:0, max:a.target};
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
  return `<div class="lib-achiev-grid">${
    S.libAchievements.map(a=>{
      const done = evalLibAchievement(a);
      const prog = getLibAchievProgress(a);
      const pct  = Math.min(100, Math.round((prog.cur/prog.max)*100));
      return `<div class="lib-achiev-card${done?' done':''}">
        <div class="lib-achiev-ico">${a.ico}</div>
        <div class="lib-achiev-name">${escH(a.name)}</div>
        <div class="lib-achiev-pbar"><div class="lib-achiev-pfill" style="width:${pct}%"></div></div>
        <div class="lib-achiev-prog">${prog.cur}/${prog.max}</div>
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
    S.books[idx] = {...prev, title, author, status, cat, pages, notes, progress, ico,
      finishedAt: status==='done'&&prev.status!=='done' ? localISO() : (prev.finishedAt||null)
    };
    // Otorgar XP si acaba de terminar
    if(status==='done' && prev.status!=='done'){
      gainXP(50);
      notif('📚 ¡LIBRO COMPLETADO! +50 XP');
      if(typeof FX!=='undefined') FX.questComplete();
    }
  } else {
    const id = 'b'+S.nBid;
    S.nBid++;
    S.books.push({ id, title, author, status, cat, pages, notes, progress, ico,
      addedAt: localISO(), finishedAt: status==='done'?localISO():null });
    if(status==='done'){
      gainXP(50);
      notif('📚 +50 XP — Libro añadido como leído');
    }
  }

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

// Incremento rápido de progreso (+N%)
function libQuickProgress(id, delta){
  libEnsureState();
  const b = S.books.find(x=>x.id===id);
  if(!b) return;
  b.progress = Math.min(100, (b.progress||0)+delta);
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
    gainXP(50);
    notif('📚 ¡LIBRO COMPLETADO! +50 XP');
    if(typeof FX!=='undefined') FX.questComplete();
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
