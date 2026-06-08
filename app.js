/* ═══════════════════════════════════════════════════════
   PUPUSERÍA RUIZ — app.js  v4
   -------------------------------------------------------
   1.  Estado global
   2.  Drawers: izquierdo (Menú) y derecho (Pedido completo)
   3.  Render del menú de pupusas
   4.  Modal de edición de Pupusa Loca
   5.  Lógica del pedido: agregar, eliminar, calcular
   6.  Render del drawer-pedido (factura en vivo)
   7.  Link de auditoría + modal de confirmación
   8.  WhatsApp: mensaje + link de auditoría
   9.  Badge, pulso y toast de bienvenida
   10. Init
═══════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────
   1. ESTADO GLOBAL
───────────────────────────────────────────────────── */
let pedido        = [];   /* array de ítems individuales */
let itemIdCounter = 0;    /* uid incremental              */
let _waUrl        = '';   /* URL de WhatsApp pendiente    */

/* Estado temporal del modal de la Loca */
let _locaMasa          = '';   /* masa elegida para la Loca pendiente */
let _locaQuitados      = [];   /* ingredientes desmarcados            */

/* ─────────────────────────────────────────────────────
   2. DRAWERS
───────────────────────────────────────────────────── */

/* ── Drawer izquierdo: precios ── */
function buildDrawerMenu() {
  const { tradicional, precioEspecial, precioLoca } = MENU_CONFIG;

  const especialesItems = ITEMS_PUPUSAS.filter(i => i.tipo === 'especial');

  document.getElementById('drawer-left-body').innerHTML = `
    <div class="price-section">
      <div class="price-section-title">⭐ Tradicionales</div>
      <div class="price-row">
        <span class="price-name">Frijol con Queso</span>
        <span class="price-val">$${tradicional.precioUnidad.toFixed(2)}</span>
      </div>
      <div class="price-row">
        <span class="price-name">Revueltas</span>
        <span class="price-val">$${tradicional.precioUnidad.toFixed(2)}</span>
      </div>
      <div class="price-note">
        $${tradicional.precioUnidad.toFixed(2)} la unidad &nbsp;·&nbsp;
        <strong>${tradicional.promoQty} por $${tradicional.promoPrecio.toFixed(2)}</strong>
        (combinables entre sí).
      </div>
    </div>

    <div class="price-section">
      <div class="price-section-title">🫓 Especiales</div>
      ${especialesItems.map(i => `
        <div class="price-row">
          <span class="price-name">${i.nombre}</span>
          <span class="price-val">$${precioEspecial.toFixed(2)}</span>
        </div>`).join('')}
      <div class="price-note">Precio unitario: <strong>$${precioEspecial.toFixed(2)}</strong> c/u.</div>
    </div>

    <div class="price-section">
      <div class="price-section-title">🌶️ Pupusa Loca</div>
      <div class="price-row">
        <span class="price-name">Pupusa Loca</span>
        <span class="price-val">$${precioLoca.toFixed(2)}</span>
      </div>
      <div class="price-note">
        Lleva <strong>todos los ingredientes</strong>. Precio fijo:
        <strong>$${precioLoca.toFixed(2)}</strong>.
      </div>
    </div>`;
}

function openDrawerLeft() {
  buildDrawerMenu();
  document.getElementById('drawer-left').classList.add('open');
  document.getElementById('overlay-left').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawerLeft() {
  document.getElementById('drawer-left').classList.remove('open');
  document.getElementById('overlay-left').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Drawer derecho: pedido en vivo ── */
function openDrawerRight() {
  renderDrawerPedido();
  document.getElementById('drawer-right').classList.add('open');
  document.getElementById('overlay-right').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawerRight() {
  document.getElementById('drawer-right').classList.remove('open');
  document.getElementById('overlay-right').classList.remove('open');
  document.body.style.overflow = '';
}

/* ─────────────────────────────────────────────────────
   3. RENDER DEL MENÚ DE PUPUSAS
───────────────────────────────────────────────────── */
function renderMenu() {
  const { tradicional, precioEspecial, precioLoca } = MENU_CONFIG;
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';

  ITEMS_PUPUSAS.forEach(item => {
    const card = document.createElement('div');

    /* ── TARJETA TRADICIONAL ── */
    if (item.tipo === 'tradicional') {
      card.className = 'pupusa-card card-tradicional';
      card.innerHTML = `
        <span class="type-badge badge-tradicional">⭐ Tradicional</span>
        <div class="card-nombre">${item.nombre}</div>
        <div class="card-precio">
          $${tradicional.precioUnidad.toFixed(2)} c/u &nbsp;·&nbsp;
          ${tradicional.promoQty} por $${tradicional.promoPrecio.toFixed(2)}
        </div>
        <div class="card-btns-promo">
          <div class="masa-row-label">🌽 Maíz</div>
          <div class="masa-row">
            <button class="btn-promo btn-promo-3"
              data-id="${item.id}" data-masa="Maíz" data-modo="promo">
              $${tradicional.promoPrecio.toFixed(2)}<small>${tradicional.promoQty} juntas</small>
            </button>
            <button class="btn-promo btn-promo-1"
              data-id="${item.id}" data-masa="Maíz" data-modo="unidad">
              $${tradicional.precioUnidad.toFixed(2)}<small>×1 unidad</small>
            </button>
          </div>
          <div class="masa-row-label">🌾 Arroz</div>
          <div class="masa-row">
            <button class="btn-promo btn-promo-3"
              data-id="${item.id}" data-masa="Arroz" data-modo="promo">
              $${tradicional.promoPrecio.toFixed(2)}<small>${tradicional.promoQty} juntas</small>
            </button>
            <button class="btn-promo btn-promo-1"
              data-id="${item.id}" data-masa="Arroz" data-modo="unidad">
              $${tradicional.precioUnidad.toFixed(2)}<small>×1 unidad</small>
            </button>
          </div>
        </div>`;

    /* ── TARJETA ESPECIAL ── */
    } else if (item.tipo === 'especial') {
      card.className = 'pupusa-card card-especial';
      card.innerHTML = `
        <span class="type-badge badge-especial">🫓 Especial</span>
        <div class="card-nombre">${item.nombre}</div>
        <div class="card-precio">$${precioEspecial.toFixed(2)} c/u</div>
        <div class="card-btns">
          <button class="btn-masa btn-maiz"  data-id="${item.id}" data-masa="Maíz">
            🌽 Maíz<small>agregar</small>
          </button>
          <button class="btn-masa btn-arroz" data-id="${item.id}" data-masa="Arroz">
            🌾 Arroz<small>agregar</small>
          </button>
        </div>`;

    /* ── TARJETA LOCA ── */
    } else if (item.tipo === 'loca') {
      card.className = 'pupusa-card card-loca card-loca-wide';
      card.innerHTML = `
        <span class="type-badge badge-loca">🌶️ Pupusa Loca</span>
        <div class="card-nombre">${item.nombre}</div>
        <div class="card-precio">$${precioLoca.toFixed(2)} — todos los ingredientes</div>
        <div class="card-btns">
          <button class="btn-masa btn-maiz btn-loca-trigger"
            data-id="${item.id}" data-masa="Maíz">
            🌽 Maíz<small>personalizar</small>
          </button>
          <button class="btn-masa btn-arroz btn-loca-trigger"
            data-id="${item.id}" data-masa="Arroz">
            🌾 Arroz<small>personalizar</small>
          </button>
        </div>`;
    }

    grid.appendChild(card);
  });

  /* Event delegation en el grid */
  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;
    const item = ITEMS_PUPUSAS.find(i => i.id === btn.dataset.id);
    if (!item) return;

    if (item.tipo === 'loca') {
      /* Abre el modal editor de la Loca */
      abrirModalLoca(item, btn.dataset.masa);
    } else if (item.tipo === 'tradicional') {
      const cant = btn.dataset.modo === 'promo' ? MENU_CONFIG.tradicional.promoQty : 1;
      agregarPupusa(item, btn.dataset.masa, cant);
    } else {
      agregarPupusa(item, btn.dataset.masa, 1);
    }
  });
}

/* ─────────────────────────────────────────────────────
   4. MODAL EDITOR — PUPUSA LOCA
   Título: "Toca el ingrediente que NO quieres dentro
            de tu pupusa loca"
   Todos los ingredientes marcados por defecto.
   Al presionar ¡Listo! agrega al pedido con nota.
───────────────────────────────────────────────────── */
function abrirModalLoca(item, masa) {
  _locaMasa     = masa;
  _locaQuitados = [];

  const ingredientes = MENU_CONFIG.ingredientesLoca;

  let chipsHtml = ingredientes.map(ing => `
    <button class="chip-ing chip-activo" data-ing="${ing}">
      <span class="chip-check">✓</span> ${ing}
    </button>`).join('');

  document.getElementById('modal-loca-body').innerHTML = `
    <p class="loca-instruccion">
      Toca el ingrediente que <strong>NO</strong> quieres dentro de tu pupusa loca.
    </p>
    <p class="loca-masa-info">🌾 Masa elegida: <strong>${masa}</strong></p>
    <div class="chip-grid" id="chip-grid">
      ${chipsHtml}
    </div>
    <p class="loca-hint">Los ingredientes marcados en verde <strong>SÍ</strong> van incluidos.</p>`;

  /* Listener para chips */
  document.getElementById('chip-grid').addEventListener('click', e => {
    const chip = e.target.closest('.chip-ing');
    if (!chip) return;
    const ing = chip.dataset.ing;
    if (chip.classList.contains('chip-activo')) {
      chip.classList.remove('chip-activo');
      chip.classList.add('chip-quitado');
      chip.querySelector('.chip-check').textContent = '✕';
      if (!_locaQuitados.includes(ing)) _locaQuitados.push(ing);
    } else {
      chip.classList.add('chip-activo');
      chip.classList.remove('chip-quitado');
      chip.querySelector('.chip-check').textContent = '✓';
      _locaQuitados = _locaQuitados.filter(x => x !== ing);
    }
  });

  document.getElementById('modal-loca-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarModalLoca() {
  document.getElementById('modal-loca-overlay').classList.remove('open');
  document.body.style.overflow = '';
  _locaMasa     = '';
  _locaQuitados = [];
}

function confirmarLoca() {
  if (!_locaMasa) return;

  const item = ITEMS_PUPUSAS.find(i => i.id === 'loca');

  /* Nota: "Sin: X, Y" o "Todo incluido" */
  const nota = _locaQuitados.length > 0
    ? `Sin: ${_locaQuitados.join(', ')}`
    : 'Todo incluido';

  pedido.push({
    uid:    ++itemIdCounter,
    id:     item.id,
    nombre: item.nombre,
    nota,
    masa:   _locaMasa,
    tipo:   'loca',
  });

  if (document.getElementById('drawer-right').classList.contains('open')) {
    renderDrawerPedido();
  }
  actualizarBadge();
  pulsarBotonPedido();
  cerrarModalLoca();
}

/* ─────────────────────────────────────────────────────
   5. LÓGICA DEL PEDIDO
───────────────────────────────────────────────────── */
function agregarPupusa(item, masa, cantidad) {
  for (let i = 0; i < cantidad; i++) {
    pedido.push({
      uid:    ++itemIdCounter,
      id:     item.id,
      nombre: item.nombre,
      nota:   '',
      masa,
      tipo:   item.tipo,
    });
  }
  if (document.getElementById('drawer-right').classList.contains('open')) {
    renderDrawerPedido();
  }
  actualizarBadge();
  pulsarBotonPedido();
}

function eliminarUno(nombre, masa, nota) {
  /* Elimina la última coincidencia de nombre+masa+nota */
  for (let i = pedido.length - 1; i >= 0; i--) {
    if (pedido[i].nombre === nombre && pedido[i].masa === masa && (pedido[i].nota || '') === nota) {
      pedido.splice(i, 1);
      break;
    }
  }
  renderDrawerPedido();
  actualizarBadge();
}

function calcularTotal() {
  const { tradicional, precioEspecial, precioLoca } = MENU_CONFIG;

  const tradicionales = pedido.filter(p => p.tipo === 'tradicional');
  const especiales    = pedido.filter(p => p.tipo === 'especial');
  const locas         = pedido.filter(p => p.tipo === 'loca');

  const totalTrad = tradicionales.length;
  const lotes     = Math.floor(totalTrad / tradicional.promoQty);
  const sueltas   = totalTrad % tradicional.promoQty;

  const totalMonto =
    lotes   * tradicional.promoPrecio +
    sueltas * tradicional.precioUnidad +
    especiales.length * precioEspecial +
    locas.length      * precioLoca;

  return { totalMonto, lotes, sueltas, totalTrad };
}

/* ─────────────────────────────────────────────────────
   6. RENDER DEL DRAWER DERECHO (pedido en vivo)
───────────────────────────────────────────────────── */
function renderDrawerPedido() {
  const body   = document.getElementById('drawer-right-body');
  const footer = document.getElementById('drawer-footer');

  if (pedido.length === 0) {
    body.innerHTML = `
      <div class="ped-vacio">
        <span class="icon">🧺</span>
        Aún no hay pupusas.<br>¡Toca Maíz o Arroz en el menú para empezar!
      </div>`;
    footer.innerHTML = `
      <button class="btn-generar" disabled>💬 Generar Pedido</button>`;
    return;
  }

  /* Agrupar por nombre + masa + nota (Locas con notas distintas quedan separadas) */
  const grupos = new Map();
  pedido.forEach(p => {
    const k = p.nombre + '||' + p.masa + '||' + (p.nota || '');
    if (!grupos.has(k)) grupos.set(k, { nombre: p.nombre, masa: p.masa, nota: p.nota || '', cant: 0 });
    grupos.get(k).cant++;
  });

  let lineasHtml = '';
  grupos.forEach(g => {
    const notaHtml = g.nota ? `<div class="pl-nota">${g.nota}</div>` : '';
    const cantHtml = g.cant > 1 ? `<span class="pl-cant">${g.cant}</span>` : '';
    const dNota    = (g.nota || '').replace(/"/g, '&quot;');
    lineasHtml += `
      <div class="ped-linea">
        ${cantHtml}
        <div class="pl-info">
          <div class="pl-nombre">${g.nombre}</div>
          <div class="pl-masa">${g.masa}</div>
          ${notaHtml}
        </div>
        <button class="pl-del"
          data-nombre="${g.nombre}"
          data-masa="${g.masa}"
          data-nota="${dNota}"
          title="Quitar uno">−</button>
      </div>`;
  });

  const calc = calcularTotal();

  /* Nota de promo solo si hay tradicionales */
  let notaPromoHtml = '';
  if (calc.totalTrad > 0) {
    const { tradicional } = MENU_CONFIG;
    let t = '';
    if (calc.lotes   > 0) t += `${calc.lotes} grup${calc.lotes > 1 ? 'os' : 'o'} de ${tradicional.promoQty} = $${(calc.lotes * tradicional.promoPrecio).toFixed(2)}`;
    if (calc.sueltas > 0) t += `${t ? '  ·  ' : ''}${calc.sueltas} unidad${calc.sueltas > 1 ? 'es' : ''} = $${(calc.sueltas * tradicional.precioUnidad).toFixed(2)}`;
    notaPromoHtml = `<div class="ped-promo-nota show">🌟 Tradicionales: ${t}</div>`;
  }

  body.innerHTML = lineasHtml + notaPromoHtml;

  body.querySelectorAll('.pl-del').forEach(btn => {
    btn.addEventListener('click', () =>
      eliminarUno(btn.dataset.nombre, btn.dataset.masa, btn.dataset.nota || ''));
  });

  footer.innerHTML = `
    <div class="ped-total">
      <span class="ped-total-label">TOTAL</span>
      <span class="ped-total-val">$${calc.totalMonto.toFixed(2)}</span>
    </div>
    <button class="btn-generar" id="btn-generar-inner">💬 Generar Pedido</button>`;

  document.getElementById('btn-generar-inner')
    .addEventListener('click', () => { closeDrawerRight(); abrirModal(); });
}

/* ─────────────────────────────────────────────────────
   7. BADGE Y PULSO
───────────────────────────────────────────────────── */
function actualizarBadge() {
  const badge = document.getElementById('hdr-badge');
  if (pedido.length === 0) {
    badge.textContent = '';
    badge.classList.remove('visible');
  } else {
    badge.textContent = pedido.length;
    badge.classList.add('visible');
  }
}

function pulsarBotonPedido() {
  const btn = document.getElementById('btn-abrir-pedido');
  btn.classList.remove('pulso');
  void btn.offsetWidth;
  btn.classList.add('pulso');
  btn.addEventListener('animationend', () => btn.classList.remove('pulso'), { once: true });
}

/* ─────────────────────────────────────────────────────
   8. AUDITORÍA Y WHATSAPP
   Mensaje: "Ya hice mi pedido a Pupusería Ruiz,
             por favor míralo aquí: [LINK]"
   Link: página HTML de auditoría en data URI Base64
───────────────────────────────────────────────────── */
function buildAuditoria() {
  const calc = calcularTotal();
  const { tradicional, precioEspecial, precioLoca } = MENU_CONFIG;

  /* Agrupar igual que el drawer */
  const grupos = new Map();
  pedido.forEach(p => {
    const k = p.nombre + '||' + p.masa + '||' + (p.nota || '');
    if (!grupos.has(k)) grupos.set(k, { nombre: p.nombre, masa: p.masa, nota: p.nota || '', cant: 0 });
    grupos.get(k).cant++;
  });

  let filasModalHtml = '';
  let filasAuditHtml = '';

  grupos.forEach(g => {
    const notaTd    = g.nota ? `<br><small style="color:#888">${g.nota}</small>` : '';
    const notaAudit = g.nota ? ` (${g.nota})` : '';
    const cantStr   = g.cant > 1 ? `${g.cant}× ` : '';

    filasModalHtml += `<tr>
      <td class="at-cant">${g.cant}</td>
      <td class="at-nombre">${g.nombre}${notaTd}</td>
      <td class="at-masa">${g.masa}</td>
    </tr>`;

    filasAuditHtml += `<tr>
      <td style="font-weight:800;text-align:center;width:44px">${g.cant}</td>
      <td>${g.nombre}${notaAudit}</td>
      <td>${g.masa}</td>
    </tr>`;
  });

  /* Nota promo */
  let notaPromoTxt = '';
  if (calc.totalTrad > 0) {
    if (calc.lotes   > 0) notaPromoTxt += `${calc.lotes} grupo(s) de ${tradicional.promoQty} = $${(calc.lotes * tradicional.promoPrecio).toFixed(2)}  `;
    if (calc.sueltas > 0) notaPromoTxt += `· ${calc.sueltas} unidad(es) = $${(calc.sueltas * tradicional.precioUnidad).toFixed(2)}`;
  }

  /* Página HTML de auditoría (se abre en el navegador) */
  const auditHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pedido — Pupusería Ruiz</title>
<style>
  body{font-family:Arial,sans-serif;background:#FDF6EC;color:#111;
       padding:22px;max-width:480px;margin:0 auto}
  h1{color:#B91C1C;font-size:1.7rem;margin-bottom:3px}
  .sub{color:#555;font-size:.9rem;margin-bottom:22px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:1.1rem}
  th{background:#B91C1C;color:#fff;padding:11px 13px;text-align:left;font-size:.95rem}
  td{padding:10px 13px;border-bottom:1px solid #DDD;vertical-align:top}
  td:last-child{color:#555;white-space:nowrap}
  .promo{background:#EDE9FE;border-left:4px solid #A78BFA;
         padding:10px 14px;border-radius:0 8px 8px 0;
         font-size:1rem;color:#4C1D95;margin-bottom:14px;font-weight:600}
  .total{background:#B91C1C;color:#fff;border-radius:12px;
         padding:16px 20px;display:flex;justify-content:space-between;
         align-items:center;margin-bottom:14px}
  .total .lbl{font-size:1.1rem;font-weight:700}
  .total .val{font-size:2.2rem;font-weight:900}
  .sello{background:#DCFCE7;border:2px solid #86EFAC;border-radius:10px;
         padding:12px 16px;text-align:center;font-weight:700;
         color:#14532D;font-size:1rem}
  .ts{color:#888;font-size:.78rem;text-align:center;margin-top:10px}
  small{font-size:.82rem;color:#888}
</style>
</head>
<body>
<h1>🧾 Pedido Verificado</h1>
<p class="sub">Pupusería Ruiz — Detalle del pedido</p>
<table>
/* ─────────────────────────────────────────────────────
   8. AUDITORÍA Y WHATSAPP (Versión corregida para GitHub)
───────────────────────────────────────────────────── */
function buildAuditoria() {
  const calc = calcularTotal();
  const { tradicional } = MENU_CONFIG;
  const pedidoId = Date.now(); // ID único
  
  /* Agrupar igual que el drawer */
  const grupos = new Map();
  pedido.forEach(p => {
    const k = p.nombre + '||' + p.masa + '||' + (p.nota || '');
    if (!grupos.has(k)) grupos.set(k, { nombre: p.nombre, masa: p.masa, nota: p.nota || '', cant: 0 });
    grupos.get(k).cant++;
  });

  let filasAuditHtml = '';
  grupos.forEach(g => {
    const notaAudit = g.nota ? ` (${g.nota})` : '';
    filasAuditHtml += `<tr>
      <td style="font-weight:800;text-align:center;width:44px">${g.cant}</td>
      <td>${g.nombre}${notaAudit}</td>
      <td>${g.masa}</td>
    </tr>`;
  });

  let notaPromoTxt = '';
  if (calc.totalTrad > 0) {
    if (calc.lotes > 0) notaPromoTxt += `${calc.lotes} grupo(s) de ${tradicional.promoQty} = $${(calc.lotes * tradicional.promoPrecio).toFixed(2)}  `;
    if (calc.sueltas > 0) notaPromoTxt += `· ${calc.sueltas} unidad(es) = $${(calc.sueltas * tradicional.precioUnidad).toFixed(2)}`;
  }

  /* HTML completo de la auditoría */
  const auditHtml = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Pedido — Pupusería Ruiz</title>
    <style>
      body{font-family:Arial,sans-serif;background:#FDF6EC;color:#111;padding:20px;max-width:480px;margin:0 auto}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#B91C1C;color:#fff;padding:10px;text-align:left}
      td{padding:10px;border-bottom:1px solid #DDD}
      .total{background:#B91C1C;color:#fff;padding:15px;border-radius:10px;text-align:center;font-size:1.5rem;font-weight:900}
    </style>
  </head>
  <body>
    <h1>🧾 Pedido Recibido</h1>
    <table>
      <thead><tr><th>Cant.</th><th>Pupusa</th><th>Masa</th></tr></thead>
      <tbody>${filasAuditHtml}</tbody>
    </table>
    ${notaPromoTxt ? `<p>🌟 ${notaPromoTxt}</p>` : ''}
    <div class="total">TOTAL: $${calc.totalMonto.toFixed(2)}</div>
    <p style="text-align:center; color:#888; margin-top:20px;">Fecha: ${new Date().toLocaleString()}</p>
  </body>
  </html>`;

  /* Guardamos en localStorage */
  localStorage.setItem('pedido_' + pedidoId, auditHtml);

  /* El link ahora es corto y real */
  const auditUrl = `https://servicios-digitales-es.github.io/pupuseria-ruiz/auditoria.html?id=${pedidoId}`;
  const mensaje = `Ya hice mi pedido a Pupusería Ruiz, por favor míralo aquí: ${auditUrl}`;

  return { mensaje };
}

/* ─────────────────────────────────────────────────────
   9. MODAL DE CONFIRMACIÓN (auditoría para el cliente)
───────────────────────────────────────────────────── */
function abrirModal() {
  if (pedido.length === 0) return;
  const { calc, filasModalHtml, notaPromoTxt, auditUrl, mensaje } = buildAuditoria();

  document.getElementById('modal-body').innerHTML = `
    <table class="audit-tabla">
      <thead><tr><th>Cant.</th><th>Pupusa</th><th>Masa</th></tr></thead>
      <tbody>${filasModalHtml}</tbody>
    </table>
    ${notaPromoTxt ? `<div class="audit-promo">🌟 Tradicionales: ${notaPromoTxt}</div>` : ''}
    <div class="audit-total">
      <span class="lbl">TOTAL A PAGAR</span>
      <span class="val">$${calc.totalMonto.toFixed(2)}</span>
    </div>
    <div class="audit-sello">
      ✅ El link de auditoría va incluido en el mensaje de WhatsApp
      para que la pupusera pueda verificar tu pedido.
    </div>`;

  _waUrl = `https://wa.me/${MENU_CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`;

  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ─────────────────────────────────────────────────────
   10. TOAST + BIENVENIDA ANIMADA
   Secuencia:
   1. Abre drawer izquierdo 500ms → cierra → parpadea
      botón "Menú" 2 veces
   2. Abre drawer derecho 500ms → cierra → parpadea
      botón "Pedido completo" 2 veces
   3. Muestra toast centrado durante 3 segundos
───────────────────────────────────────────────────── */
function parpadearBoton(btnEl, veces, intervalo) {
  return new Promise(resolve => {
    let count = 0;
    const tick = () => {
      btnEl.classList.toggle('blink-on');
      count++;
      if (count < veces * 2) {
        setTimeout(tick, intervalo);
      } else {
        btnEl.classList.remove('blink-on');
        resolve();
      }
    };
    setTimeout(tick, 80);
  });
}

function bienvenida() {
  const toast   = document.getElementById('toast');
  const btnMenu  = document.getElementById('btn-abrir-menu');
  const btnPed   = document.getElementById('btn-abrir-pedido');

  /* 1. Abrir drawer izquierdo */
  setTimeout(() => {
    openDrawerLeft();

    /* 2. Cerrar drawer izquierdo tras 500ms → parpadear botón Menú */
    setTimeout(() => {
      closeDrawerLeft();

      parpadearBoton(btnMenu, 2, 200).then(() => {

        /* 3. Abrir drawer derecho */
        setTimeout(() => {
          openDrawerRight();

          /* 4. Cerrar drawer derecho tras 500ms → parpadear botón Pedido */
          setTimeout(() => {
            closeDrawerRight();

            parpadearBoton(btnPed, 2, 200).then(() => {

              /* 5. Mostrar toast centrado durante 3 segundos */
              setTimeout(() => {
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3000);
              }, 200);

            });
          }, 500);
        }, 300);

      });
    }, 500);

  }, 400);
}

/* ─────────────────────────────────────────────────────
   11. INIT
───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Drawer izquierdo ── */
  document.getElementById('btn-abrir-menu').addEventListener('click', openDrawerLeft);
  document.getElementById('overlay-left').addEventListener('click', closeDrawerLeft);
  document.getElementById('drawer-left-close').addEventListener('click', closeDrawerLeft);

  /* ── Drawer derecho ── */
  document.getElementById('btn-abrir-pedido').addEventListener('click', openDrawerRight);
  document.getElementById('overlay-right').addEventListener('click', closeDrawerRight);
  document.getElementById('drawer-right-close').addEventListener('click', closeDrawerRight);

  /* ── Modal Loca ── */
  document.getElementById('modal-loca-close').addEventListener('click', cerrarModalLoca);
  document.getElementById('btn-loca-cancel').addEventListener('click', cerrarModalLoca);
  document.getElementById('btn-loca-listo').addEventListener('click', confirmarLoca);
  document.getElementById('modal-loca-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-loca-overlay')) cerrarModalLoca();
  });

  /* ── Modal de confirmación / auditoría ── */
  document.getElementById('modal-close').addEventListener('click', cerrarModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', cerrarModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) cerrarModal();
  });
  document.getElementById('btn-modal-wa').addEventListener('click', () => {
    window.open(_waUrl, '_blank');
    cerrarModal();
  });

  /* ── Render inicial ── */
  renderMenu();
  renderDrawerPedido();
  actualizarBadge();

  /* ── Bienvenida animada ── */
  bienvenida();
});

