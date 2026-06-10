/* ═══════════════════════════════════════════════════════
   PUPUSERÍA RUIZ — app.js  Fase 1
   -------------------------------------------------------
   1.  Estado global del carrito
   2.  Render y sincronización del carrito (desktop + drawer)
   3.  Panel de selección de masa (col-detalle, desktop)
   4.  Drawer carrito (móvil)
   5.  Modal formulario de pedido
   6.  Envío del pedido a Google Sheets
   7.  Pantalla de éxito
   8.  Animaciones (bounce, glow, float +1, shake)
   9.  Toast
   10. Onboarding interactivo
   11. Init
   -------------------------------------------------------
   Depende de: config.js (API_URL, ESTADOS, ENTREGA, LS, helpers),
               menu.js   (renderMenu, _animarAgregar target)
═══════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════
   1. ESTADO GLOBAL
═══════════════════════════════════════════════════════ */

let carrito      = [];
let _uidCounter  = 0;
let _productoSeleccionado = null;

/* ═══════════════════════════════════════════════════════
   2. LÓGICA DEL CARRITO
═══════════════════════════════════════════════════════ */

/* ─── PROMO TRADICIONALES ────────────────────────────
   3 pupusas Tradicionales (combinables) = $1.00
   Sueltas: $0.40 c/u
──────────────────────────────────────────────────── */
const PROMO_TRAD = { tipo: 'Tradicional', qty: 3, precio: 1.00, precioUnidad: 0.40 };

function agregarAlCarrito(producto, masa, cantidad) {
  const veces = cantidad || 1;
  for (let i = 0; i < veces; i++) {
    carrito.push({
      uid:             ++_uidCounter,
      id:              producto.ID,
      nombre:          producto.Nombre,
      tipo:            producto.Tipo || '',
      masa,
      precio_unitario: parseFloat(producto.Precio_unitario) || 0,
    });
  }
  _syncCarrito();
  _animarAgregar(producto.ID, masa);
}

function quitarDelCarrito(id, masa) {
  const idx = carrito.map(i => i.id + '||' + i.masa).lastIndexOf(id + '||' + masa);
  if (idx !== -1) { carrito.splice(idx, 1); _syncCarrito(); }
}

function vaciarCarrito() { carrito = []; _syncCarrito(); }

function _agrupar() {
  const mapa = new Map();
  carrito.forEach(item => {
    const k = item.id + '||' + item.masa;
    if (mapa.has(k)) {
      const g = mapa.get(k);
      g.cant++;
      g.subtotal = +(g.precio_unitario * g.cant).toFixed(2);
    } else {
      mapa.set(k, {
        id:              item.id,
        nombre:          item.nombre,
        tipo:            item.tipo || '',
        masa:            item.masa,
        cant:            1,
        precio_unitario: item.precio_unitario,
        subtotal:        +item.precio_unitario.toFixed(2),
      });
    }
  });
  return [...mapa.values()];
}

function _calcularTotal() {
  const grupos = _agrupar();
  // Contar todas las unidades tradicionales (combinables entre sí)
  const totalTrad = grupos
    .filter(g => g.tipo === PROMO_TRAD.tipo)
    .reduce((acc, g) => acc + g.cant, 0);
  const lotes   = Math.floor(totalTrad / PROMO_TRAD.qty);
  const sueltas = totalTrad % PROMO_TRAD.qty;
  const totalTradMonto = lotes * PROMO_TRAD.precio + sueltas * PROMO_TRAD.precioUnidad;

  const totalOtros = grupos
    .filter(g => g.tipo !== PROMO_TRAD.tipo)
    .reduce((acc, g) => acc + g.subtotal, 0);

  return +(totalTradMonto + totalOtros).toFixed(2);
}

/** Devuelve el desglose de la promo para mostrar en carrito y modal */
function _desgloseTrad() {
  const grupos = _agrupar();
  const totalTrad = grupos
    .filter(g => g.tipo === PROMO_TRAD.tipo)
    .reduce((acc, g) => acc + g.cant, 0);
  if (totalTrad === 0) return null;
  const lotes   = Math.floor(totalTrad / PROMO_TRAD.qty);
  const sueltas = totalTrad % PROMO_TRAD.qty;
  return { totalTrad, lotes, sueltas };
}

function _syncCarrito() {
  const grupos   = _agrupar();
  const total    = _calcularTotal();
  const hayItems = carrito.length > 0;

  _renderLineas(document.getElementById('carrito-items'),       grupos);
  _renderLineas(document.getElementById('drawer-carrito-items'), grupos);

  // Total desktop
  const elTotal = document.getElementById('carrito-total');
  const elValor = document.getElementById('ct-valor');
  if (elTotal && elValor) { elTotal.hidden = !hayItems; elValor.textContent = formatPrecio(total); }

  // Total drawer
  const elTotalD = document.getElementById('drawer-carrito-total');
  const elValorD = document.getElementById('drawer-ct-valor');
  if (elTotalD && elValorD) { elTotalD.hidden = !hayItems; elValorD.textContent = formatPrecio(total); }

  // Count badge en carrito desktop
  const count = document.getElementById('carrito-count');
  if (count) {
    if (hayItems) { count.textContent = `${carrito.length} ítem${carrito.length !== 1 ? 's' : ''}`; count.hidden = false; }
    else count.hidden = true;
  }

  // Botones confirmar
  ['btn-confirmar', 'drawer-btn-confirmar'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !hayItems;
  });

  // Nota promo tradicionales
  _renderNotaPromo();
  _actualizarBadge();
}

function _renderNotaPromo() {
  const d = _desgloseTrad();
  ['nota-promo', 'drawer-nota-promo'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!d) { el.hidden = true; return; }
    let txt = '🌟 Tradicionales: ';
    if (d.lotes > 0)   txt += `${d.lotes} grupo${d.lotes>1?'s':''} de 3 = $${(d.lotes * PROMO_TRAD.precio).toFixed(2)}`;
    if (d.lotes > 0 && d.sueltas > 0) txt += ' · ';
    if (d.sueltas > 0) txt += `${d.sueltas} suelta${d.sueltas>1?'s':''} = $${(d.sueltas * PROMO_TRAD.precioUnidad).toFixed(2)}`;
    el.textContent = txt;
    el.hidden = false;
  });
}

function _renderLineas(contenedor, grupos) {
  if (!contenedor) return;
  if (grupos.length === 0) {
    contenedor.innerHTML = `
      <div class="carrito-vacio">
        <span class="carrito-vacio__icono">🧺</span>
        <p>Aún no hay pupusas.</p>
        <p class="carrito-vacio__hint">Toca <strong>Maíz</strong> o <strong>Arroz</strong> para empezar.</p>
      </div>`;
    return;
  }
  contenedor.innerHTML = grupos.map(g => `
    <div class="carrito-linea" data-id="${g.id}" data-masa="${g.masa}">
      <div class="cl-info">
        <span class="cl-nombre">${g.nombre}</span>
        <span class="cl-masa">${_iconoMasa(g.masa)} ${g.masa}</span>
      </div>
      <div class="cl-controles">
        <button class="cl-btn cl-btn--quitar" data-id="${g.id}" data-masa="${g.masa}" aria-label="Quitar una ${g.nombre}">−</button>
        <span class="cl-cant">${g.cant}</span>
        <span class="cl-subtotal">${formatPrecio(g.subtotal)}</span>
      </div>
    </div>`).join('');

  contenedor.querySelectorAll('.cl-btn--quitar').forEach(btn => {
    btn.addEventListener('click', () => quitarDelCarrito(btn.dataset.id, btn.dataset.masa));
  });
}

function _actualizarBadge() {
  const badge = document.getElementById('header-badge');
  if (!badge) return;
  badge.textContent = carrito.length;
  badge.hidden = carrito.length === 0;
}

function _iconoMasa(masa) {
  if (masa === 'Maíz')  return '🌽';
  if (masa === 'Arroz') return '🌾';
  return '🫓';
}

/* ═══════════════════════════════════════════════════════
   3. PANEL DE SELECCIÓN DE MASA (desktop)
═══════════════════════════════════════════════════════ */

function mostrarPanelMasa(producto) {
  _productoSeleccionado = producto;
  const placeholder = document.getElementById('detalle-placeholder');
  const panel       = document.getElementById('detalle-masa-panel');
  if (!panel) return;
  if (placeholder) placeholder.hidden = true;
  panel.hidden = false;

  const esTrad = (producto.Tipo || '') === PROMO_TRAD.tipo;
  document.getElementById('dmp-producto').innerHTML = `
    <div class="dmp-nombre">${producto.Nombre}</div>
    <div class="dmp-precio">${esTrad
      ? `${formatPrecio(producto.Precio_unitario)} c/u · <span class="dmp-promo-hint">3 por $1.00</span>`
      : formatPrecio(producto.Precio_unitario)
    }</div>`;

  // Mostrar/ocultar bloque promo 3×$1
  const bloquePromo = document.getElementById('dmp-promo');
  if (bloquePromo) bloquePromo.hidden = !esTrad;

  document.querySelectorAll('#dmp-masas .btn-masa').forEach(b => b.classList.remove('active'));
}

function ocultarPanelMasa() {
  _productoSeleccionado = null;
  const placeholder = document.getElementById('detalle-placeholder');
  const panel       = document.getElementById('detalle-masa-panel');
  if (placeholder) placeholder.hidden = false;
  if (panel)       panel.hidden = true;
}

/* ═══════════════════════════════════════════════════════
   4. DRAWER CARRITO (móvil)
═══════════════════════════════════════════════════════ */

function abrirDrawer() {
  const drawer  = document.getElementById('drawer-carrito');
  const overlay = document.getElementById('drawer-overlay');
  if (!drawer) return;
  overlay.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function cerrarDrawer() {
  const drawer  = document.getElementById('drawer-carrito');
  const overlay = document.getElementById('drawer-overlay');
  if (!drawer) return;
  drawer.classList.remove('open');
  setTimeout(() => { overlay.hidden = true; document.body.style.overflow = ''; }, 320);
}

/* ═══════════════════════════════════════════════════════
   5. MODAL FORMULARIO
═══════════════════════════════════════════════════════ */

let _tipoEntregaSeleccionada = '';

function abrirModal() {
  if (carrito.length === 0) return;

  _renderResumenModal();
  _tipoEntregaSeleccionada = '';

  // Limpiar form
  ['campo-nombre','campo-whatsapp','campo-casa','campo-pasaje','campo-referencia']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  document.getElementById('form-domicilio').hidden = true;
  document.querySelectorAll('.btn-entrega').forEach(b => b.classList.remove('selected'));
  document.getElementById('modal-pedido-submit').disabled = true;

  // Ocultar hint WA hasta que elijan entrega
  const waHint = document.getElementById('wa-hint');
  if (waHint) waHint.hidden = true;

  const overlay = document.getElementById('modal-pedido-overlay');
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('campo-nombre').focus(), 60);
}

function cerrarModal() {
  document.getElementById('modal-pedido-overlay').hidden = true;
  document.body.style.overflow = '';
}

function _renderResumenModal() {
  const grupos = _agrupar();
  const total  = _calcularTotal();
  const el     = document.getElementById('modal-resumen');
  if (!el) return;
  el.innerHTML = `
    ${grupos.map(g => `
      <div class="mr-linea">
        <span>${g.cant} × ${g.nombre} <small style="opacity:.65">(${g.masa})</small></span>
        <span>${formatPrecio(g.subtotal)}</span>
      </div>`).join('')}
    <div class="mr-total">
      <span class="mr-total-label">Total</span>
      <span class="mr-total-valor">${formatPrecio(total)}</span>
    </div>`;
}

function _validarFormulario() {
  const nombre  = document.getElementById('campo-nombre')?.value.trim();
  const entrega = _tipoEntregaSeleccionada;
  let ok = !!(nombre && entrega);
  if (entrega === ENTREGA.DOMICILIO) {
    const casa  = document.getElementById('campo-casa')?.value.trim();
    const pasaje = document.getElementById('campo-pasaje')?.value.trim();
    const ref   = document.getElementById('campo-referencia')?.value.trim();
    ok = ok && !!(casa && pasaje && ref);
  }
  const btn = document.getElementById('modal-pedido-submit');
  if (btn) btn.disabled = !ok;
}

/* ═══════════════════════════════════════════════════════
   6. ENVÍO A GOOGLE SHEETS
═══════════════════════════════════════════════════════ */

async function enviarPedidoCompleto() {
  const nombre     = document.getElementById('campo-nombre').value.trim();
  const whatsapp   = document.getElementById('campo-whatsapp').value.trim();
  const entrega    = _tipoEntregaSeleccionada;
  const casa       = document.getElementById('campo-casa').value.trim();
  const pasaje     = document.getElementById('campo-pasaje').value.trim();
  const referencia = document.getElementById('campo-referencia').value.trim();

  // UI: spinner
  document.getElementById('submit-texto').hidden   = true;
  document.getElementById('submit-spinner').hidden  = false;
  document.getElementById('modal-pedido-submit').disabled = true;

  const grupos  = _agrupar();
  const payload = {
    nombre_cliente: nombre,
    tipo_entrega:   entrega,
    casa:           entrega === ENTREGA.DOMICILIO ? casa       : '',
    pasaje:         entrega === ENTREGA.DOMICILIO ? pasaje     : '',
    referencia:     entrega === ENTREGA.DOMICILIO ? referencia : '',
    whatsapp,
    estado:         ESTADOS.ENVIADO,
    items:          grupos.map(g => ({
      producto:        g.nombre,
      masa:            g.masa,
      cantidad:        g.cant,
      precio_unitario: g.precio_unitario,
      subtotal:        g.subtotal,
    })),
    total: _calcularTotal(),
  };

  try {
    const respuesta = await enviarPedido(payload);
    const idPedido  = respuesta.id || respuesta.ID_pedido || respuesta.pedido_id || '';
    if (idPedido) lsSet(LS.ULTIMO_ID, String(idPedido));

    cerrarModal();
    cerrarDrawer();
    vaciarCarrito();
    // Delay para que modal-overlay quede hidden antes de mostrar pantalla de éxito
    setTimeout(() => _mostrarExito({ idPedido, total: payload.total }), 80);

  } catch (err) {
    console.error('Error enviando pedido:', err);
    mostrarToast('Hubo un problema al enviar. Intenta de nuevo.', 'error');
    document.getElementById('submit-texto').hidden   = false;
    document.getElementById('submit-spinner').hidden  = true;
    document.getElementById('modal-pedido-submit').disabled = false;
  }
}

/* ═══════════════════════════════════════════════════════
   7. PANTALLA DE ÉXITO
═══════════════════════════════════════════════════════ */

function _mostrarExito({ idPedido, total }) {
  document.getElementById('exito-num-pedido').textContent = idPedido ? `#${idPedido}` : '—';
  document.getElementById('exito-fecha').textContent      = formatFecha();
  document.getElementById('exito-hora').textContent       = formatHora();
  document.getElementById('exito-total').textContent      = formatPrecio(total);

  const btnEstado = document.getElementById('btn-ver-estado');
  if (btnEstado && idPedido) btnEstado.href = `estado.html?id=${idPedido}`;

  document.getElementById('pantalla-exito').hidden = false;
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
}

/* ═══════════════════════════════════════════════════════
   8. ANIMACIONES
═══════════════════════════════════════════════════════ */

/**
 * Bounce en el botón pulsado, float +1, glow en card, shake carrito.
 * FIX: también se llama desde los botones del panel de masa (desktop).
 */
function _animarAgregar(productoId, masa) {
  const slugM = masa === 'Maíz' ? 'maiz' : 'arroz';

  // ── Cards del menú ──
  document.querySelectorAll(`.pupusa-card[data-id="${productoId}"]`).forEach(card => {
    const btn = card.querySelector(`.btn-masa--${slugM}`);
    if (btn) _bounceBtn(btn);

    // Glow en la card
    card.classList.remove('card-glow');
    void card.offsetWidth;
    card.classList.add('card-glow');
    card.addEventListener('animationend', () => card.classList.remove('card-glow'), { once: true });

    // Float +1 sobre el botón
    if (btn) _floatPlus(btn);
  });

  // ── Panel de masa desktop (si el botón está activo) ──
  const panelBtn = document.querySelector(`#dmp-masas .btn-masa--${slugM}`);
  if (panelBtn && !document.getElementById('detalle-masa-panel').hidden) {
    _bounceBtn(panelBtn);
    _floatPlus(panelBtn);
  }

  // ── Shake en carrito ──
  ['col-carrito', 'drawer-carrito'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('cart-shake');
    void el.offsetWidth;
    el.classList.add('cart-shake');
    el.addEventListener('animationend', () => el.classList.remove('cart-shake'), { once: true });
  });
}

function _bounceBtn(btn) {
  btn.classList.remove('btn-bounce');
  void btn.offsetWidth;
  btn.classList.add('btn-bounce');
  btn.addEventListener('animationend', () => btn.classList.remove('btn-bounce'), { once: true });
}

function _floatPlus(referenceEl) {
  const rect = referenceEl.getBoundingClientRect();
  const el   = document.createElement('span');
  el.className   = 'float-plus';
  el.textContent = '+1';
  el.style.left  = `${rect.left + rect.width / 2 - 14}px`;
  el.style.top   = `${rect.top + window.scrollY - 8}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

/* ═══════════════════════════════════════════════════════
   9. TOAST
═══════════════════════════════════════════════════════ */

let _toastTimer = null;

function mostrarToast(mensaje, tipo = 'info', duracion = 2800) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = mensaje;
  toast.className   = `toast show${tipo === 'success' ? ' toast--success' : tipo === 'error' ? ' toast--error' : ''}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), duracion);
}

/* ═══════════════════════════════════════════════════════
   10. ONBOARDING
═══════════════════════════════════════════════════════ */

const _OB_PASOS = [
  { texto: 'Aquí puedes ver todas nuestras pupusas. Toca una para seleccionarla.',
    target: '#menu-grid', pos: 'bottom' },
  { texto: 'Elige la masa: maíz 🌽 o arroz 🌾. Cada pupusa puede pedirse en cualquiera.',
    target: '#col-detalle', pos: 'left' },
  { texto: 'Toca "Maíz" o "Arroz" para agregar la pupusa a tu pedido.',
    target: '.card-masas', pos: 'bottom' },
  { texto: 'Aquí aparece tu pedido en tiempo real. Puedes quitar ítems con el botón −.',
    target: '#col-carrito', pos: 'left' },
  { texto: 'Cuando estés listo, toca "Confirmar pedido". Podrás elegir recoger en local o envío a domicilio.',
    target: '#btn-confirmar', pos: 'top' },
  { texto: 'Después de enviar recibirás un número de pedido para consultar el estado en tiempo real.',
    target: '#app-header', pos: 'bottom' },
  { texto: 'La cola pública muestra los pedidos en preparación. No se muestran datos personales.',
    target: '#app-header', pos: 'bottom' },
];

let _obPasoActual = 0;

function _mostrarOnboarding() {
  if (lsGet(LS.ONBOARDING) === 'true') return;
  const el = document.getElementById('onboarding');
  if (el) el.hidden = false;
}

function _cerrarOnboarding() {
  // 3 acciones atómicas — única función responsable de finalizar el onboarding
  lsSet(LS.ONBOARDING, 'true');                                    // a) marcar completado
  const ob = document.getElementById('onboarding');
  if (ob) ob.hidden = true;                                        // b) ocultar onboarding
  const menu = document.getElementById('app-layout') ||
               document.querySelector('.app-layout');
  if (menu) menu.hidden = false;                                   // c) garantizar menú visible
}

function _iniciarPasos() {
  document.getElementById('ob-welcome').hidden = true;
  document.getElementById('ob-pasos').hidden   = false;
  _obPasoActual = 0;
  _mostrarPasoOb(0);
}

function _mostrarPasoOb(idx) {
  const paso      = _OB_PASOS[idx];
  const total     = _OB_PASOS.length;
  const tooltip   = document.getElementById('ob-tooltip');
  const texto     = document.getElementById('ob-tooltip-texto');
  const pasoNum   = document.getElementById('ob-step-indicator');
  const nextBtn   = document.getElementById('ob-btn-next');
  const spotlight = document.getElementById('ob-spotlight');
  const dotsEl    = document.getElementById('ob-dots');

  texto.textContent    = paso.texto;
  pasoNum.textContent  = `Paso ${idx + 1} de ${total}`;
  nextBtn.textContent  = idx < total - 1 ? 'Siguiente →' : 'Ver resumen';

  // Dots
  if (dotsEl) {
    dotsEl.innerHTML = _OB_PASOS.map((_, i) =>
      `<div class="ob-dot${i === idx ? ' active' : ''}"></div>`).join('');
  }

  const target = document.querySelector(paso.target);
  if (target && spotlight) {
    const rect = target.getBoundingClientRect();
    const pad  = 8;
    const x1   = Math.max(0, rect.left   - pad);
    const y1   = Math.max(0, rect.top    - pad);
    const x2   = Math.min(window.innerWidth,  rect.right  + pad);
    const y2   = Math.min(window.innerHeight, rect.bottom + pad);

    spotlight.style.clipPath =
      `polygon(0 0, 100% 0, 100% 100%, 0 100%,` +
      `0 ${y1}px, ${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px,` +
      `${x2}px ${y1}px, 0 ${y1}px)`;

    _posicionarTooltip(tooltip, rect, paso.pos);
  } else {
    if (spotlight) spotlight.style.clipPath = 'none';
    if (tooltip) {
      tooltip.style.top = '50%'; tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    }
  }
}

function _posicionarTooltip(tooltip, rect, pos) {
  if (!tooltip) return;
  const tw = 290; const th = 130; const gap = 14;
  let top, left;
  tooltip.style.transform = '';
  switch (pos) {
    case 'bottom': top = rect.bottom + gap; left = rect.left + rect.width / 2 - tw / 2; break;
    case 'top':    top = rect.top - th - gap; left = rect.left + rect.width / 2 - tw / 2; break;
    case 'left':   top = rect.top + rect.height / 2 - th / 2; left = rect.left - tw - gap; break;
    default:       top = rect.top + rect.height / 2 - th / 2; left = rect.right + gap;
  }
  left = Math.max(12, Math.min(left, window.innerWidth  - tw - 12));
  top  = Math.max(12, Math.min(top,  window.innerHeight - th - 12));
  tooltip.style.top  = `${top}px`;
  tooltip.style.left = `${left}px`;
}

function _avanzarPasoOb() {
  if (_obPasoActual < _OB_PASOS.length - 1) {
    _obPasoActual++;
    _mostrarPasoOb(_obPasoActual);
  } else {
    document.getElementById('ob-pasos').hidden = true;
    document.getElementById('ob-final').hidden = false;
  }
}

/* ═══════════════════════════════════════════════════════
   11. INIT
═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── Render inicial del carrito (vacío) ── */
  _syncCarrito();

  /* ── Cargar menú desde Google Sheets ── */
  await renderMenu(
    document.getElementById('menu-grid'),
    (producto, masa, cantidad) => {
      const colDetalle = document.getElementById('col-detalle');
      const esDesktop  = window.innerWidth >= 768 && colDetalle;
      const cant       = cantidad || 1;
      const esPromo    = cant >= 3;

      if (esDesktop && !esPromo) {
        // Desktop sin promo → mostrar panel de masa
        mostrarPanelMasa(producto);
      } else {
        // Móvil siempre directo; desktop con botón promo también directo
        agregarAlCarrito(producto, masa, cant);
        if (esPromo) {
          mostrarToast(`3 × ${producto.Nombre} (${masa}) 🌟 $1.00`, 'success');
        } else {
          mostrarToast(`${producto.Nombre} (${masa}) agregada 🫓`, 'success');
        }
      }
    }
  );

  /* ── Panel de masa desktop ── */
  ['btn-masa-maiz', 'btn-masa-arroz'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!_productoSeleccionado) return;
      const masa = btn.dataset.masa;
      agregarAlCarrito(_productoSeleccionado, masa);
      mostrarToast(`${_productoSeleccionado.Nombre} (${masa}) agregada 🫓`, 'success');
      document.querySelectorAll('#dmp-masas .btn-masa').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Botón 3×$1 en panel desktop
  ['btn-masa-maiz-promo', 'btn-masa-arroz-promo'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!_productoSeleccionado) return;
      const masa = btn.dataset.masa;
      agregarAlCarrito(_productoSeleccionado, masa, PROMO_TRAD.qty);
      mostrarToast(`3 × ${_productoSeleccionado.Nombre} (${masa}) 🌟 $1.00`, 'success');
    });
  });

  /* ── Drawer carrito (móvil) ── */
  document.getElementById('btn-abrir-carrito')?.addEventListener('click', abrirDrawer);
  document.getElementById('btn-cerrar-carrito')?.addEventListener('click', cerrarDrawer);
  document.getElementById('drawer-overlay')?.addEventListener('click', cerrarDrawer);

  /* ── Botones confirmar pedido ── */
  ['btn-confirmar', 'drawer-btn-confirmar'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      cerrarDrawer();
      abrirModal();
    });
  });

  /* ── Modal formulario ── */
  document.getElementById('modal-pedido-close')?.addEventListener('click', cerrarModal);
  document.getElementById('modal-pedido-cancel')?.addEventListener('click', cerrarModal);
  document.getElementById('modal-pedido-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modal-pedido-overlay')) cerrarModal();
  });

  // Tipo de entrega
  document.querySelectorAll('.btn-entrega').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-entrega').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      _tipoEntregaSeleccionada = btn.dataset.valor;

      // Mostrar/ocultar campos domicilio
      document.getElementById('form-domicilio').hidden =
        _tipoEntregaSeleccionada !== ENTREGA.DOMICILIO;

      // FIX: mostrar mensaje WA para AMBOS tipos de entrega
      const waHint = document.getElementById('wa-hint');
      if (waHint) waHint.hidden = false;

      _validarFormulario();
    });
  });

  // Validación en tiempo real
  ['campo-nombre','campo-whatsapp','campo-casa','campo-pasaje','campo-referencia'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', _validarFormulario);
  });

  // Enviar pedido
  document.getElementById('modal-pedido-submit')?.addEventListener('click', enviarPedidoCompleto);

  /* ── Onboarding ── */
  // NOTA: No se redirige automáticamente a pantalla de éxito con LS.ULTIMO_ID al cargar.
  // El menú principal es siempre el estado por defecto al iniciar la app.
  document.getElementById('ob-btn-comenzar')?.addEventListener('click', _iniciarPasos);
  document.getElementById('ob-btn-saltar')?.addEventListener('click', _cerrarOnboarding);        // welcome → cerrar
  document.getElementById('ob-btn-saltar-pasos')?.addEventListener('click', _cerrarOnboarding);  // pasos → cerrar (omitir explicación)
  document.getElementById('ob-btn-next')?.addEventListener('click', _avanzarPasoOb);
  document.getElementById('ob-btn-finalizar')?.addEventListener('click', _cerrarOnboarding);     // final → cerrar

  _mostrarOnboarding();

});
