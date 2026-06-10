/* ═══════════════════════════════════════════════════════
   PUPUSERÍA RUIZ — app.js
   -------------------------------------------------------
   Responsabilidades:
   1.  Estado global del carrito
   2.  Render y sincronización del carrito (desktop + drawer)
   3.  Panel de selección de masa (col-detalle)
   4.  Modal formulario de pedido
   5.  Envío del pedido a Google Sheets
   6.  Pantalla de éxito
   7.  Onboarding interactivo
   8.  Animaciones (bounce, glow, float +1, shake)
   9.  Toast de retroalimentación
   10. Init
   -------------------------------------------------------
   Depende de: config.js, menu.js
   NO hardcodea datos de productos.
═══════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════
   1. ESTADO GLOBAL
═══════════════════════════════════════════════════════ */

/**
 * Carrito: array plano de ítems.
 * Cada ítem: { uid, id, nombre, masa, precio_unitario }
 */
let carrito      = [];
let _uidCounter  = 0;
let _productoSeleccionado = null;  // producto activo en col-detalle

/* ═══════════════════════════════════════════════════════
   2. LÓGICA DEL CARRITO
═══════════════════════════════════════════════════════ */

/** Agrega un ítem al carrito y dispara UI. */
function agregarAlCarrito(producto, masa) {
  carrito.push({
    uid:             ++_uidCounter,
    id:              producto.ID,
    nombre:          producto.Nombre,
    masa,
    precio_unitario: parseFloat(producto.Precio_unitario) || 0,
  });
  _syncCarrito();
  _animarAgregar(producto.ID, masa);
}

/** Elimina una unidad del carrito (por id + masa). */
function quitarDelCarrito(id, masa) {
  const idx = carrito.map(i => i.id + '||' + i.masa).lastIndexOf(id + '||' + masa);
  if (idx !== -1) {
    carrito.splice(idx, 1);
    _syncCarrito();
  }
}

/** Vacía el carrito completo. */
function vaciarCarrito() {
  carrito = [];
  _syncCarrito();
}

/**
 * Agrupa los ítems del carrito para renderizar.
 * @returns {Array<{id,nombre,masa,cant,precio_unitario,subtotal}>}
 */
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
        masa:            item.masa,
        cant:            1,
        precio_unitario: item.precio_unitario,
        subtotal:        +item.precio_unitario.toFixed(2),
      });
    }
  });
  return [...mapa.values()];
}

/** Calcula el total del carrito. */
function _calcularTotal() {
  return +_agrupar().reduce((acc, g) => acc + g.subtotal, 0).toFixed(2);
}

/** Sincroniza carrito en desktop, drawer, badge y botones confirmar. */
function _syncCarrito() {
  const grupos = _agrupar();
  const total  = _calcularTotal();
  const hayItems = carrito.length > 0;

  _renderLineas(document.getElementById('carrito-items'),       grupos);
  _renderLineas(document.getElementById('drawer-carrito-items'), grupos);

  // Total desktop
  const elTotal   = document.getElementById('carrito-total');
  const elValor   = document.getElementById('ct-valor');
  if (elTotal && elValor) {
    elTotal.hidden = !hayItems;
    elValor.textContent = formatPrecio(total);
  }

  // Total drawer
  const elTotalD  = document.getElementById('drawer-carrito-total');
  const elValorD  = document.getElementById('drawer-ct-valor');
  if (elTotalD && elValorD) {
    elTotalD.hidden = !hayItems;
    elValorD.textContent = formatPrecio(total);
  }

  // Botones confirmar
  [
    document.getElementById('btn-confirmar'),
    document.getElementById('drawer-btn-confirmar'),
  ].forEach(btn => { if (btn) btn.disabled = !hayItems; });

  // Badge header móvil
  _actualizarBadge();
}

/** Renderiza las líneas del carrito en un contenedor. */
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
        <button class="cl-btn cl-btn--quitar"
          data-id="${g.id}" data-masa="${g.masa}"
          aria-label="Quitar una ${g.nombre}">−</button>
        <span class="cl-cant">${g.cant}</span>
        <span class="cl-subtotal">${formatPrecio(g.subtotal)}</span>
      </div>
    </div>
  `).join('');

  contenedor.querySelectorAll('.cl-btn--quitar').forEach(btn => {
    btn.addEventListener('click', () => quitarDelCarrito(btn.dataset.id, btn.dataset.masa));
  });
}

/** Actualiza el badge del header móvil. */
function _actualizarBadge() {
  const badge = document.getElementById('header-badge');
  if (!badge) return;
  const n = carrito.length;
  badge.textContent = n;
  badge.hidden      = n === 0;
}

function _iconoMasa(masa) {
  if (masa === 'Maíz')  return '🌽';
  if (masa === 'Arroz') return '🌾';
  return '🫓';
}

/* ═══════════════════════════════════════════════════════
   3. PANEL DE SELECCIÓN DE MASA (col-detalle, solo desktop)
═══════════════════════════════════════════════════════ */

/** Muestra el panel de selección de masa para un producto. */
function mostrarPanelMasa(producto) {
  _productoSeleccionado = producto;

  const placeholder = document.getElementById('detalle-placeholder');
  const panel       = document.getElementById('detalle-masa-panel');
  const elNombre    = document.getElementById('dmp-producto');

  if (!panel) return;

  if (placeholder) placeholder.hidden = true;
  panel.hidden = false;

  elNombre.innerHTML = `
    <span class="dmp-nombre">${producto.Nombre}</span>
    <div class="dmp-precio">${formatPrecio(producto.Precio_unitario)}</div>`;

  // Resaltar el último botón activo si aplica
  document.querySelectorAll('#dmp-masas .btn-masa').forEach(b => b.classList.remove('active'));
}

/** Oculta el panel y muestra el placeholder. */
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
  drawer.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarDrawer() {
  const drawer  = document.getElementById('drawer-carrito');
  const overlay = document.getElementById('drawer-overlay');
  if (!drawer) return;
  drawer.classList.remove('open');
  setTimeout(() => {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }, 300);
}

/* ═══════════════════════════════════════════════════════
   5. MODAL FORMULARIO DE PEDIDO
═══════════════════════════════════════════════════════ */

let _tipoEntregaSeleccionada = '';

function abrirModal() {
  if (carrito.length === 0) return;

  // Llenar resumen del modal
  _renderResumenModal();

  // Limpiar estado anterior
  _tipoEntregaSeleccionada = '';
  document.getElementById('campo-nombre').value    = '';
  document.getElementById('campo-whatsapp').value  = '';
  document.getElementById('campo-casa').value      = '';
  document.getElementById('campo-pasaje').value    = '';
  document.getElementById('campo-referencia').value = '';
  document.getElementById('form-domicilio').hidden  = true;
  document.querySelectorAll('.btn-entrega').forEach(b => b.classList.remove('selected'));
  document.getElementById('modal-pedido-submit').disabled = true;

  // Mostrar modal
  const overlay = document.getElementById('modal-pedido-overlay');
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  // Focus primer campo
  setTimeout(() => document.getElementById('campo-nombre').focus(), 50);
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
        <span>${g.cant} × ${g.nombre} <small>(${g.masa})</small></span>
        <span>${formatPrecio(g.subtotal)}</span>
      </div>`).join('')}
    <div class="mr-total">
      <span class="mr-total-label">Total</span>
      <span class="mr-total-valor">${formatPrecio(total)}</span>
    </div>`;
}

/** Valida el formulario y habilita/deshabilita el botón enviar. */
function _validarFormulario() {
  const nombre   = document.getElementById('campo-nombre').value.trim();
  const entrega  = _tipoEntregaSeleccionada;
  let ok = nombre.length > 0 && entrega !== '';

  if (entrega === ENTREGA.DOMICILIO) {
    const casa      = document.getElementById('campo-casa').value.trim();
    const pasaje    = document.getElementById('campo-pasaje').value.trim();
    const referencia = document.getElementById('campo-referencia').value.trim();
    ok = ok && casa !== '' && pasaje !== '' && referencia !== '';
  }

  document.getElementById('modal-pedido-submit').disabled = !ok;
}

/* ═══════════════════════════════════════════════════════
   6. ENVÍO DEL PEDIDO
═══════════════════════════════════════════════════════ */

async function enviarPedidoCompleto() {
  const nombre     = document.getElementById('campo-nombre').value.trim();
  const whatsapp   = document.getElementById('campo-whatsapp').value.trim();
  const entrega    = _tipoEntregaSeleccionada;
  const casa       = document.getElementById('campo-casa').value.trim();
  const pasaje     = document.getElementById('campo-pasaje').value.trim();
  const referencia = document.getElementById('campo-referencia').value.trim();

  // UI: mostrar spinner
  document.getElementById('submit-texto').hidden  = true;
  document.getElementById('submit-spinner').hidden = false;
  document.getElementById('modal-pedido-submit').disabled = true;

  // Construir payload
  const grupos = _agrupar();
  const payload = {
    nombre_cliente: nombre,
    tipo_entrega:   entrega,
    casa:           entrega === ENTREGA.DOMICILIO ? casa      : '',
    pasaje:         entrega === ENTREGA.DOMICILIO ? pasaje    : '',
    referencia:     entrega === ENTREGA.DOMICILIO ? referencia : '',
    whatsapp:       whatsapp,
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

    // Guardar ID en localStorage para estado.html
    const idPedido = respuesta.id || respuesta.ID_pedido || respuesta.pedido_id || '';
    if (idPedido) lsSet(LS.ULTIMO_ID, idPedido);

    cerrarModal();
    cerrarDrawer();
    _mostrarExito({ idPedido, total: payload.total });
    vaciarCarrito();

  } catch (err) {
    console.error('Error enviando pedido:', err);
    mostrarToast('Hubo un problema al enviar tu pedido. Inténtalo de nuevo.', 'error');

    // Restaurar botón
    document.getElementById('submit-texto').hidden  = false;
    document.getElementById('submit-spinner').hidden = true;
    document.getElementById('modal-pedido-submit').disabled = false;
  }
}

/* ═══════════════════════════════════════════════════════
   7. PANTALLA DE ÉXITO
═══════════════════════════════════════════════════════ */

function _mostrarExito({ idPedido, total }) {
  const ahora = new Date();

  document.getElementById('exito-num-pedido').textContent = idPedido ? `#${idPedido}` : '—';
  document.getElementById('exito-fecha').textContent      = formatFecha();
  document.getElementById('exito-hora').textContent       = formatHora();
  document.getElementById('exito-total').textContent      = formatPrecio(total);

  // Actualizar href del botón "Ver estado"
  const btnEstado = document.getElementById('btn-ver-estado');
  if (btnEstado && idPedido) {
    btnEstado.href = `estado.html?id=${idPedido}`;
  }

  document.getElementById('pantalla-exito').hidden = false;
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
}

/* ═══════════════════════════════════════════════════════
   8. ANIMACIONES
═══════════════════════════════════════════════════════ */

/**
 * Dispara bounce en el botón de masa, float +1 y glow en la card,
 * y shake en el carrito.
 */
function _animarAgregar(productoId, masa) {
  // 1. Bounce en el botón de masa pulsado
  const slugM = masa === 'Maíz' ? 'maiz' : 'arroz';
  const cards = document.querySelectorAll(`.pupusa-card[data-id="${productoId}"]`);
  cards.forEach(card => {
    const btn = card.querySelector(`.btn-masa--${slugM}`);
    if (btn) {
      btn.classList.remove('btn-bounce');
      void btn.offsetWidth; // reflow para reiniciar animación
      btn.classList.add('btn-bounce');
      btn.addEventListener('animationend', () => btn.classList.remove('btn-bounce'), { once: true });
    }

    // 3. Glow en la card
    card.classList.remove('card-glow');
    void card.offsetWidth;
    card.classList.add('card-glow');
    card.addEventListener('animationend', () => card.classList.remove('card-glow'), { once: true });

    // 2. Float +1 sobre el botón
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const el   = document.createElement('span');
      el.className     = 'float-plus';
      el.textContent   = '+1';
      el.style.left    = `${rect.left + rect.width / 2 - 16}px`;
      el.style.top     = `${rect.top + window.scrollY - 10}px`;
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }
  });

  // 4. Shake en el carrito (desktop y drawer)
  [
    document.getElementById('col-carrito'),
    document.getElementById('drawer-carrito'),
  ].forEach(el => {
    if (!el) return;
    el.classList.remove('cart-shake');
    void el.offsetWidth;
    el.classList.add('cart-shake');
    el.addEventListener('animationend', () => el.classList.remove('cart-shake'), { once: true });
  });
}

/* ═══════════════════════════════════════════════════════
   9. TOAST
═══════════════════════════════════════════════════════ */

let _toastTimer = null;

/**
 * Muestra un mensaje toast temporal.
 * @param {string} mensaje
 * @param {'info'|'success'|'error'} tipo
 * @param {number} duracion ms
 */
function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = mensaje;
  toast.className   = 'toast show';
  if (tipo === 'success') toast.classList.add('toast--success');
  if (tipo === 'error')   toast.classList.add('toast--error');

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duracion);
}

/* ═══════════════════════════════════════════════════════
   10. ONBOARDING
═══════════════════════════════════════════════════════ */

const _OB_PASOS = [
  {
    texto:  'Aquí puedes ver todas nuestras pupusas disponibles. Toca una para elegirla.',
    target: '#menu-grid',
    pos:    'bottom',
  },
  {
    texto:  'Cada pupusa puede pedirse en masa de maíz 🌽 o arroz 🌾. Toca la que prefieras.',
    target: '#col-detalle',
    pos:    'left',
  },
  {
    texto:  'Toca "Maíz" o "Arroz" en cualquier tarjeta para agregar la pupusa a tu pedido.',
    target: '.card-masas',
    pos:    'bottom',
  },
  {
    texto:  'Aquí aparece tu pedido en tiempo real. Puedes quitar ítems con el botón −.',
    target: '#col-carrito',
    pos:    'left',
  },
  {
    texto:  'Cuando estés listo, toca "Confirmar pedido". Podrás elegir recoger en local o envío a domicilio.',
    target: '#btn-confirmar',
    pos:    'top',
  },
  {
    texto:  'Después de enviar recibirás un número de pedido para consultar el estado en tiempo real.',
    target: '#app-header',
    pos:    'bottom',
  },
  {
    texto:  'La cola pública muestra los pedidos en preparación. No se muestran datos personales.',
    target: '#app-header',
    pos:    'bottom',
  },
];

let _obPasoActual = 0;

function _mostrarOnboarding() {
  if (lsGet(LS.ONBOARDING) === 'true') return; // ya visto
  const el = document.getElementById('onboarding');
  if (el) el.hidden = false;
}

function _cerrarOnboarding() {
  const el = document.getElementById('onboarding');
  if (el) el.hidden = true;
  lsSet(LS.ONBOARDING, 'true');
}

function _iniciarPasos() {
  document.getElementById('ob-welcome').hidden = true;
  document.getElementById('ob-pasos').hidden   = false;
  _obPasoActual = 0;
  _mostrarPasoOb(_obPasoActual);
}

function _mostrarPasoOb(idx) {
  const paso      = _OB_PASOS[idx];
  const total     = _OB_PASOS.length;
  const tooltip   = document.getElementById('ob-tooltip');
  const texto     = document.getElementById('ob-tooltip-texto');
  const indicator = document.getElementById('ob-step-indicator');
  const nextBtn   = document.getElementById('ob-btn-next');
  const spotlight = document.getElementById('ob-spotlight');

  texto.textContent      = paso.texto;
  indicator.textContent  = `${idx + 1} / ${total}`;
  nextBtn.textContent    = idx < total - 1 ? 'Siguiente →' : 'Ver resumen';

  // Spotlight: intentar resaltar el target
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

    // Posicionar tooltip cerca del target
    _posicionarTooltip(tooltip, rect, paso.pos);
  } else {
    // Sin target: centrar tooltip
    if (spotlight) spotlight.style.clipPath = 'none';
    if (tooltip) {
      tooltip.style.top    = '50%';
      tooltip.style.left   = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    }
  }
}

function _posicionarTooltip(tooltip, targetRect, pos) {
  if (!tooltip) return;
  const tw = 300; // max-width del tooltip
  const th = 120; // altura estimada
  const gap = 12;
  let top, left;

  tooltip.style.transform = '';

  switch (pos) {
    case 'bottom':
      top  = targetRect.bottom + gap;
      left = targetRect.left + targetRect.width / 2 - tw / 2;
      break;
    case 'top':
      top  = targetRect.top - th - gap;
      left = targetRect.left + targetRect.width / 2 - tw / 2;
      break;
    case 'left':
      top  = targetRect.top + targetRect.height / 2 - th / 2;
      left = targetRect.left - tw - gap;
      break;
    default: // right
      top  = targetRect.top + targetRect.height / 2 - th / 2;
      left = targetRect.right + gap;
  }

  // Mantener dentro del viewport
  left = Math.max(12, Math.min(left, window.innerWidth  - tw  - 12));
  top  = Math.max(12, Math.min(top,  window.innerHeight - th  - 12));

  tooltip.style.top  = `${top}px`;
  tooltip.style.left = `${left}px`;
}

function _avanzarPasoOb() {
  if (_obPasoActual < _OB_PASOS.length - 1) {
    _obPasoActual++;
    _mostrarPasoOb(_obPasoActual);
  } else {
    // Último paso → pantalla final
    document.getElementById('ob-pasos').hidden = true;
    document.getElementById('ob-final').hidden = false;
  }
}

/* ═══════════════════════════════════════════════════════
   10. INIT
═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── Render inicial del carrito (vacío) ── */
  _syncCarrito();

  /* ── Cargar menú desde Google Sheets ── */
  await renderMenu(
    document.getElementById('menu-grid'),
    (producto, masa) => {
      // En móvil: agregar directo
      // En desktop (col-detalle visible): mostrar panel de masa primero
      const colDetalle = document.getElementById('col-detalle');
      const esDesktop  = window.innerWidth >= 768;

      if (esDesktop && colDetalle) {
        mostrarPanelMasa(producto);
      } else {
        // En móvil el callback viene con masa ya seleccionada desde la card
        agregarAlCarrito(producto, masa);
        mostrarToast(`${producto.Nombre} (${masa}) agregada 🫓`, 'success', 2000);
      }
    }
  );

  /* ── Panel de masa (desktop): botones Maíz / Arroz ── */
  ['btn-masa-maiz', 'btn-masa-arroz'].forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!_productoSeleccionado) return;
      const masa = btn.dataset.masa;
      agregarAlCarrito(_productoSeleccionado, masa);
      mostrarToast(`${_productoSeleccionado.Nombre} (${masa}) agregada 🫓`, 'success', 2000);
      // Feedback visual en el botón
      document.querySelectorAll('#dmp-masas .btn-masa').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* ── Drawer carrito (móvil) ── */
  document.getElementById('btn-abrir-carrito')
    ?.addEventListener('click', abrirDrawer);
  document.getElementById('btn-cerrar-carrito')
    ?.addEventListener('click', cerrarDrawer);
  document.getElementById('drawer-overlay')
    ?.addEventListener('click', cerrarDrawer);

  /* ── Botones confirmar pedido ── */
  ['btn-confirmar', 'drawer-btn-confirmar'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      cerrarDrawer();
      abrirModal();
    });
  });

  /* ── Modal formulario ── */
  document.getElementById('modal-pedido-close')
    ?.addEventListener('click', cerrarModal);
  document.getElementById('modal-pedido-cancel')
    ?.addEventListener('click', cerrarModal);
  document.getElementById('modal-pedido-overlay')
    ?.addEventListener('click', e => {
      if (e.target === document.getElementById('modal-pedido-overlay')) cerrarModal();
    });

  // Tipo de entrega
  document.querySelectorAll('.btn-entrega').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-entrega').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      _tipoEntregaSeleccionada = btn.dataset.valor;
      document.getElementById('form-domicilio').hidden =
        _tipoEntregaSeleccionada !== ENTREGA.DOMICILIO;
      _validarFormulario();
    });
  });

  // Validación en tiempo real
  ['campo-nombre', 'campo-whatsapp', 'campo-casa', 'campo-pasaje', 'campo-referencia']
    .forEach(id => {
      document.getElementById(id)
        ?.addEventListener('input', _validarFormulario);
    });

  // Enviar pedido
  document.getElementById('modal-pedido-submit')
    ?.addEventListener('click', enviarPedidoCompleto);

  /* ── Onboarding ── */
  document.getElementById('ob-btn-comenzar')
    ?.addEventListener('click', _iniciarPasos);
  document.getElementById('ob-btn-saltar')
    ?.addEventListener('click', _cerrarOnboarding);
  document.getElementById('ob-btn-next')
    ?.addEventListener('click', _avanzarPasoOb);
  document.getElementById('ob-btn-finalizar')
    ?.addEventListener('click', _cerrarOnboarding);

  _mostrarOnboarding();

});
