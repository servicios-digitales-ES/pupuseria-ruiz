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

/* ─── ESTADO TEMPORAL: PUPUSA LOCA ─────────────────── */
let _locaMasa     = '';
let _locaQuitados = [];

/* Lista de ingredientes de la Loca — leída de MENU_CONFIG si existe,
   o fallback hardcodeado para que nunca quede vacío               */
function _ingredientesLoca() {
  if (typeof MENU_CONFIG !== 'undefined' && MENU_CONFIG.ingredientesLoca) {
    return MENU_CONFIG.ingredientesLoca;
  }
  return ['Frijol','Queso','Chicharrón','Ajo','Pollo','Jamón','Mora','Jalapeño','Ayote','Loroco'];
}

/* ─── MODAL EDITOR PUPUSA LOCA ──────────────────────── */
function abrirModalLoca(producto, masa) {
  _locaMasa     = masa;
  _locaQuitados = [];

  const ings = _ingredientesLoca();
  const chipsHtml = ings.map(ing => `
    <button class="chip-ing chip-activo" data-ing="${ing}">
      <span class="chip-check">✓</span> ${ing}
    </button>`).join('');

  document.getElementById('modal-loca-body').innerHTML = `
    <p class="loca-instruccion">
      Toca el ingrediente que <strong>NO</strong> quieres en tu Pupusa Loca.
    </p>
    <p class="loca-masa-info">Masa elegida: <strong>${masa}</strong></p>
    <div class="chip-grid" id="chip-grid">${chipsHtml}</div>
    <p class="loca-hint">Verde ✓ = incluido · Rojo ✕ = sin ese ingrediente</p>`;

  // Listeners de chips
  document.getElementById('chip-grid').addEventListener('click', e => {
    const chip = e.target.closest('.chip-ing');
    if (!chip) return;
    const ing = chip.dataset.ing;
    if (chip.classList.contains('chip-activo')) {
      chip.classList.replace('chip-activo', 'chip-quitado');
      chip.querySelector('.chip-check').textContent = '✕';
      if (!_locaQuitados.includes(ing)) _locaQuitados.push(ing);
    } else {
      chip.classList.replace('chip-quitado', 'chip-activo');
      chip.querySelector('.chip-check').textContent = '✓';
      _locaQuitados = _locaQuitados.filter(x => x !== ing);
    }
  });

  document.getElementById('modal-loca-overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  _locaProducto = producto;
}

function cerrarModalLoca() {
  document.getElementById('modal-loca-overlay').hidden = true;
  document.body.style.overflow = '';
  _locaMasa = ''; _locaQuitados = []; _locaProducto = null;
}

let _locaProducto = null;

function confirmarLoca() {
  if (!_locaMasa || !_locaProducto) return;
  const nota = _locaQuitados.length > 0
    ? 'Sin: ' + _locaQuitados.join(', ')
    : 'Todo incluido';
  // Agregar directamente al carrito con nota
  carrito.push({
    uid:             ++_uidCounter,
    id:              _locaProducto.ID,
    nombre:          _locaProducto.Nombre,
    tipo:            _locaProducto.Tipo || 'Loca',
    masa:            _locaMasa,
    precio_unitario: parseFloat(_locaProducto.Precio_unitario) || 3.00,
    nota,
  });
  _syncCarrito();
  _animarAgregar(_locaProducto.ID, _locaMasa);
  mostrarToast(`Pupusa Loca (${_locaMasa}) agregada 🌶️`, 'success');
  cerrarModalLoca();
}

/* ─── RASTREO DE "MIS PEDIDOS" (varios a la vez) ─────
   Antes solo se guardaba el último ID. Ahora se guarda una lista
   (hasta 5), para que si alguien hace varios pedidos seguidos los
   vea todos en el panel lateral, no solo el más reciente. ──────── */
function _misPedidosGet() {
  try {
    const raw = typeof lsGet === 'function' ? lsGet(LS.ULTIMO_ID) : null;
    if (!raw) return [];
    // Compatibilidad con lo guardado antes (un solo ID en texto plano,
    // sin formato de lista JSON).
    if (raw.trim().startsWith('[')) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    }
    return [raw];
  } catch (e) { return []; }
}

function _misPedidosSet(lista) {
  if (typeof lsSet === 'function') lsSet(LS.ULTIMO_ID, JSON.stringify(lista));
}

function _misPedidosAgregar(id) {
  const lista = _misPedidosGet().filter(x => x !== id);
  lista.unshift(id); // el más nuevo va primero
  _misPedidosSet(lista.slice(0, 5)); // máximo 5, para no acumular para siempre
}

function _misPedidosQuitar(id) {
  _misPedidosSet(_misPedidosGet().filter(x => x !== id));
}

/* ─── DRAWER IZQUIERDO: ESTADO DEL PEDIDO ───────────── */
function abrirDrawerEstado() {
  const overlay = document.getElementById('drawer-left-overlay');
  const drawer  = document.getElementById('drawer-estado');
  if (!drawer) return;
  overlay.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('open'));
  document.body.style.overflow = 'hidden';
  _cargarEstadoEnDrawer();
}

function cerrarDrawerEstado() {
  const overlay = document.getElementById('drawer-left-overlay');
  const drawer  = document.getElementById('drawer-estado');
  if (!drawer) return;
  drawer.classList.remove('open');
  // El overflow se resetea de inmediato (no en el setTimeout) para evitar
  // la misma condición de carrera que ya se corrigió en cerrarDrawer():
  // si se abre otra pantalla durante los 320ms de la animación, este
  // timeout ya no puede pisarle el overflow al cerrarse después.
  document.body.style.overflow = '';
  setTimeout(() => { overlay.hidden = true; }, 320);
}

async function _cargarEstadoEnDrawer() {
  const lista     = _misPedidosGet();
  const vacio     = document.getElementById('estado-drawer-vacio');
  const contenido = document.getElementById('estado-drawer-contenido');

  if (lista.length === 0) {
    if (vacio)     vacio.hidden     = false;
    if (contenido) contenido.hidden = true;
    return;
  }

  if (vacio)     vacio.hidden     = true;
  if (contenido) {
    contenido.hidden = false;
    contenido.innerHTML = '<p style="color:var(--text3);font-size:.85rem;text-align:center;padding:20px;">Cargando…</p>';
  }

  const tarjetas   = [];
  const terminados = [];

  for (const id of lista) {
    try {
      const res    = await fetchEstadoPedido(id);
      const pedido = res.pedido;
      if (!pedido) continue;

      const estadoTexto = { enviado: '⏳ Recibido', recibido: '👀 En preparación', terminado: '✅ Listo' }[pedido.estado] || pedido.estado;
      const estadoColor = { enviado: 'var(--accent2)', recibido: 'var(--maiz)', terminado: 'var(--arroz)' }[pedido.estado] || 'var(--text2)';
      const numCorto    = (String(pedido.ID_pedido).match(/-(\d{3})-/) || ['', pedido.ID_pedido])[1];

      tarjetas.push(`
        <div style="border-top:1px solid var(--surface2);padding:14px 0;">
          <div style="text-align:center;padding-bottom:8px;">
            <div style="font-size:.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Pedido</div>
            <div style="font-size:1.7rem;font-weight:800;color:var(--accent2);letter-spacing:-.02em;">#${numCorto}</div>
            <div style="font-size:.78rem;color:var(--text3);margin-top:2px;">${pedido.fecha} · ${pedido.hora}</div>
            <div style="font-size:.85rem;font-weight:800;color:${estadoColor};margin-top:10px;padding:6px 14px;background:rgba(255,255,255,.05);border-radius:99px;display:inline-block;">${estadoTexto}</div>
          </div>
          <a href="estado.html?id=${pedido.ID_pedido}" class="btn-ghost btn-full" style="margin-top:8px;text-align:center;justify-content:center;display:flex;">
            Ver detalle →
          </a>
        </div>`);

      if (pedido.estado === 'terminado') terminados.push(id);
    } catch (e) {
      // Si uno falla, seguimos con los demás en vez de tumbar todo el panel.
    }
  }

  if (contenido) {
    contenido.innerHTML = tarjetas.join('') || `
      <div style="text-align:center;padding:20px;color:var(--text3);font-size:.85rem;">
        No se pudo cargar ningún pedido.<br>
        <a href="estado.html" style="color:var(--accent2);">Buscar por número</a>
      </div>`;
  }

  // Los pedidos que ya quedaron "terminado" se alcanzan a ver esta vez,
  // pero se quitan de la lista para que la próxima vez que se abra el
  // panel ya no aparezcan (solo los que siguen activos).
  terminados.forEach(id => _misPedidosQuitar(id));
}
}



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

function quitarDelCarrito(id, masa, nota) {
  const notaBuscada = nota || '';
  const idx = carrito.map(i => i.id + '||' + i.masa + '||' + (i.nota || '')).lastIndexOf(id + '||' + masa + '||' + notaBuscada);
  if (idx !== -1) { carrito.splice(idx, 1); _syncCarrito(); }
}

function vaciarCarrito() { carrito = []; _syncCarrito(); }

function _agrupar() {
  const mapa = new Map();
  carrito.forEach(item => {
    const nota = item.nota || '';
    // La nota forma parte de la clave: una Loca "Sin: Ajo" nunca se
    // mezcla con otra "Sin: Jalapeño" — cada personalización es única.
    const k = item.id + '||' + item.masa + '||' + nota;
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
        nota,
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
    <div class="carrito-linea" data-id="${g.id}" data-masa="${g.masa}" data-nota="${_escapeAttr(g.nota)}">
      <div class="cl-info">
        <span class="cl-nombre">${g.nombre}</span>
        <span class="cl-masa">${_iconoMasa(g.masa)} ${g.masa}</span>
        ${g.nota ? `<span class="cl-nota">${g.nota}</span>` : ''}
      </div>
      <div class="cl-controles">
        <button class="cl-btn cl-btn--quitar" data-id="${g.id}" data-masa="${g.masa}" data-nota="${_escapeAttr(g.nota)}" aria-label="Quitar una ${g.nombre}">−</button>
        <span class="cl-cant">${g.cant}</span>
        <span class="cl-subtotal">${formatPrecio(g.subtotal)}</span>
      </div>
    </div>`).join('');

  contenedor.querySelectorAll('.cl-btn--quitar').forEach(btn => {
    btn.addEventListener('click', () => quitarDelCarrito(btn.dataset.id, btn.dataset.masa, btn.dataset.nota));
  });
}

function _escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
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
  setTimeout(() => { overlay.hidden = true; }, 320);
  // Nota: el overflow del body ya NO se toca aquí — lo controla
  // exclusivamente la pantalla que esté activa (modal, drawer o éxito)
  // para evitar condiciones de carrera entre setTimeouts superpuestos.
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
        <span>
          ${g.cant} × ${g.nombre} <small style="opacity:.65">(${g.masa})</small>
          ${g.nota ? `<br><small style="color:var(--accent2);font-weight:600;">${g.nota}</small>` : ''}
        </span>
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
      personalizacion: g.nota || '',
      precio_unitario: g.precio_unitario,
      subtotal:        g.subtotal,
    })),
    total: _calcularTotal(),
  };

  try {
    const respuesta = await enviarPedido(payload);
    const idPedido  = (respuesta && (respuesta.id || respuesta.ID_pedido || respuesta.pedido_id)) || '';
    // Se agrega a la lista de pedidos rastreados (no se sobrescribe),
    // así si la persona hace varios pedidos seguidos los ve todos en
    // el panel lateral "Mi pedido", no solo el último.
    if (idPedido) _misPedidosAgregar(String(idPedido));
    if (!idPedido) console.warn('Pedido enviado pero la respuesta no incluyó un ID:', respuesta);

    // Cierre INMEDIATO y forzado de todo lo que pueda quedar abierto,
    // sin animaciones ni setTimeouts que puedan solaparse.
    document.getElementById('modal-pedido-overlay').hidden = true;
    document.getElementById('drawer-overlay').hidden = true;
    document.getElementById('drawer-carrito').classList.remove('open');
    document.getElementById('drawer-left-overlay').hidden = true;
    document.getElementById('drawer-estado')?.classList.remove('open');
    vaciarCarrito();
    _mostrarExito({ idPedido, total: payload.total });

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
  // Mostramos solo el número corto (ej. "#004"), no el ID completo —
  // el cliente solo necesita ese número para preguntar por su pedido.
  const numCorto = idPedido
    ? '#' + (String(idPedido).match(/-(\d{3})-/) || ['', '???'])[1]
    : 'Confirmado';
  document.getElementById('exito-num-pedido').textContent = numCorto;
  document.getElementById('exito-fecha').textContent      = formatFecha();
  document.getElementById('exito-hora').textContent       = formatHora();
  document.getElementById('exito-total').textContent      = formatPrecio(total);

  const btnEstado = document.getElementById('btn-ver-estado');
  if (btnEstado) btnEstado.href = idPedido ? `estado.html?id=${idPedido}` : 'estado.html';

  document.getElementById('pantalla-exito').hidden = false;
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
}

function cerrarPantallaExito() {
  document.getElementById('pantalla-exito').hidden = true;
  document.body.style.overflow = '';
  // Volver a renderizar el menú/carrito limpio
  _syncCarrito();
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

      const esLoca = (producto.Tipo || '').toLowerCase() === 'loca';

      if (esLoca) {
        // Pupusa Loca → siempre abre modal de personalización
        abrirModalLoca(producto, masa);
      } else if (esDesktop && !esPromo) {
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

  /* ── Modal Pupusa Loca ── */
  document.getElementById('modal-loca-close')?.addEventListener('click', cerrarModalLoca);
  document.getElementById('btn-loca-cancelar')?.addEventListener('click', cerrarModalLoca);
  document.getElementById('btn-loca-listo')?.addEventListener('click', confirmarLoca);
  document.getElementById('modal-loca-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modal-loca-overlay')) cerrarModalLoca();
  });

  /* ── Drawer izquierdo: estado del pedido ── */
  document.getElementById('btn-abrir-estado-drawer')?.addEventListener('click', abrirDrawerEstado);
  document.getElementById('btn-cerrar-estado-drawer')?.addEventListener('click', cerrarDrawerEstado);
  document.getElementById('drawer-left-overlay')?.addEventListener('click', cerrarDrawerEstado);

  /* ── Cerrar pantalla de éxito ── */
  document.getElementById('btn-cerrar-exito')?.addEventListener('click', cerrarPantallaExito);
  document.getElementById('btn-otro-pedido')?.addEventListener('click', cerrarPantallaExito);

});
