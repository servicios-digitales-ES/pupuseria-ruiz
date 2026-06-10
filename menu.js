/* ═══════════════════════════════════════════════════════
   PUPUSERÍA RUIZ — menu.js
   Render del menú y helpers de UI del carrito.
   -------------------------------------------------------
   REGLA: Cero datos hardcodeados.
   Los productos siempre vienen de Google Sheets via config.js
═══════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────
   CACHÉ DE PRODUCTOS
   Se llena una sola vez al iniciar y se reutiliza.
───────────────────────────────────────────────────── */
let _productos = [];   // Array de objetos: { ID, Nombre, Tipo, Masa, Precio_unitario }

/**
 * Carga productos desde Sheets y los almacena en caché.
 * Llama esto una vez al iniciar la app.
 * @returns {Promise<Array>}
 */
/* ─────────────────────────────────────────────────────
   PRODUCTOS DE DEMOSTRACIÓN
   Se usan cuando el API de Google Sheets no está
   configurado todavía o no responde.
   Estructura idéntica a la hoja "productos".
───────────────────────────────────────────────────── */
const _PRODUCTOS_DEMO = [
  { ID: 'trad-1', Nombre: 'Frijol con Queso',      Tipo: 'Tradicional', Masa: 'Maiz/Arroz', Precio_unitario: 0.40 },
  { ID: 'trad-2', Nombre: 'Revueltas',              Tipo: 'Tradicional', Masa: 'Maiz/Arroz', Precio_unitario: 0.40 },
  { ID: 'trad-3', Nombre: 'Queso',                  Tipo: 'Tradicional', Masa: 'Maiz/Arroz', Precio_unitario: 0.40 },
  { ID: 'esp-1',  Nombre: 'Mora',                   Tipo: 'Especial',    Masa: 'Maiz/Arroz', Precio_unitario: 0.75 },
  { ID: 'esp-2',  Nombre: 'Ajo',                    Tipo: 'Especial',    Masa: 'Maiz/Arroz', Precio_unitario: 0.75 },
  { ID: 'esp-3',  Nombre: 'Loroco con Queso',       Tipo: 'Especial',    Masa: 'Maiz/Arroz', Precio_unitario: 0.75 },
  { ID: 'esp-4',  Nombre: 'Chicharrón',             Tipo: 'Especial',    Masa: 'Maiz/Arroz', Precio_unitario: 0.75 },
  { ID: 'loca-1', Nombre: 'Pupusa Loca',            Tipo: 'Loca',        Masa: 'Maiz/Arroz', Precio_unitario: 3.00 },
];

async function cargarProductos() {
  try {
    const data = await fetchProductos();
    const lista = Array.isArray(data) ? data : (data.productos || []);
    if (lista.length > 0) {
      _productos = lista;
      return _productos;
    }
    // API respondió pero sin productos → usar demo
    console.warn('API sin productos. Usando datos de demostración.');
    _productos = _PRODUCTOS_DEMO;
    return _productos;
  } catch (err) {
    // API no disponible → usar demo silenciosamente
    console.warn('API no disponible. Usando datos de demostración.', err.message);
    _productos = _PRODUCTOS_DEMO;
    return _productos;
  }
}

/** Devuelve la caché actual de productos */
function getProductos() {
  return _productos;
}

/** Busca un producto por su ID */
function getProductoPorId(id) {
  return _productos.find(p => p.ID === id) || null;
}

/* ─────────────────────────────────────────────────────
   AGRUPACIÓN VISUAL DEL CARRITO
   Convierte array plano de ítems en grupos { nombre, masa, cant, precio_unitario, subtotal }
───────────────────────────────────────────────────── */

/**
 * Agrupa los ítems del carrito para evitar líneas repetidas.
 * Entrada: [{ id, nombre, masa, precio_unitario }, ...]
 * Salida:  [{ id, nombre, masa, cant, precio_unitario, subtotal }, ...]
 */
function agruparCarrito(items) {
  const mapa = new Map();
  items.forEach(item => {
    const clave = `${item.id}||${item.masa}`;
    if (mapa.has(clave)) {
      const g = mapa.get(clave);
      g.cant++;
      g.subtotal = +(g.precio_unitario * g.cant).toFixed(2);
    } else {
      mapa.set(clave, {
        id:             item.id,
        nombre:         item.nombre,
        masa:           item.masa,
        cant:           1,
        precio_unitario: +item.precio_unitario,
        subtotal:       +item.precio_unitario,
      });
    }
  });
  return [...mapa.values()];
}

/**
 * Calcula el total del carrito a partir del array agrupado.
 * @param {Array} grupos — salida de agruparCarrito()
 * @returns {number}
 */
function calcularTotalCarrito(grupos) {
  return +grupos.reduce((acc, g) => acc + g.subtotal, 0).toFixed(2);
}

/* ─────────────────────────────────────────────────────
   RENDER DEL MENÚ
───────────────────────────────────────────────────── */

/**
 * Renderiza las tarjetas de pupusas en el contenedor indicado.
 * Llama a cargarProductos() antes si _productos está vacío.
 *
 * @param {HTMLElement} contenedor — el div donde se renderizan las cards
 * @param {Function}    onAgregar  — callback(producto, masa) al pulsar Agregar
 */
async function renderMenu(contenedor, onAgregar) {
  if (!contenedor) return;

  contenedor.innerHTML = '<div class="menu-loading">Cargando menú…</div>';

  if (_productos.length === 0) {
    await cargarProductos();
  }

  if (_productos.length === 0) {
    contenedor.innerHTML = `
      <div class="menu-error">
        No se pudo cargar el menú. Recarga la página e intenta de nuevo.
      </div>`;
    return;
  }

  // Agrupar por tipo para mostrar secciones
  const secciones = agruparPorTipo(_productos);
  contenedor.innerHTML = '';

  secciones.forEach(({ tipo, items }) => {
    const seccion = document.createElement('div');
    seccion.className = 'menu-seccion';
    seccion.innerHTML = `<h3 class="menu-seccion-titulo">${etiquetaTipo(tipo)}</h3>`;

    items.forEach(prod => {
      seccion.appendChild(buildCardProducto(prod, onAgregar));
    });

    contenedor.appendChild(seccion);
  });
}

/**
 * Construye la tarjeta HTML de un producto.
 * @param {Object}   prod       — objeto producto de Sheets
 * @param {Function} onAgregar  — callback(producto, masa)
 * @returns {HTMLElement}
 */
function buildCardProducto(prod, onAgregar) {
  const card = document.createElement('div');
  card.className = `pupusa-card pupusa-card--${slugTipo(prod.Tipo)}`;
  card.dataset.id = prod.ID;

  const masas    = parseMasas(prod.Masa);
  const esTrad   = (prod.Tipo || '') === 'Tradicional';

  // Bloque promo 3×$1 para tradicionales
  const promoHtml = esTrad ? `
    <div class="card-promo-row">
      ${masas.map(masa => `
        <button
          class="btn-masa btn-masa--${slugMasa(masa)} btn-promo-3x1 btn-promo-card"
          data-id="${prod.ID}"
          data-masa="${masa}"
          data-promo="true"
          aria-label="3 ${prod.Nombre} masa ${masa} por $1.00"
        >
          ${iconoMasa(masa)} 3× ${masa}
          <span class="masa-precio">$1.00</span>
        </button>
      `).join('')}
    </div>` : '';

  card.innerHTML = `
    <div class="card-badge card-badge--${slugTipo(prod.Tipo)}">${etiquetaTipo(prod.Tipo)}</div>
    <div class="card-nombre">${prod.Nombre}</div>
    <div class="card-precio">${esTrad
      ? `${formatPrecio(prod.Precio_unitario)} c/u · <span style="color:var(--maiz);font-weight:700">3 por $1.00</span>`
      : formatPrecio(prod.Precio_unitario)
    }</div>
    <div class="card-masas">
      ${masas.map(masa => `
        <button
          class="btn-masa btn-masa--${slugMasa(masa)}"
          data-id="${prod.ID}"
          data-masa="${masa}"
          aria-label="Agregar ${prod.Nombre} masa ${masa}"
        >
          ${iconoMasa(masa)} ${masa}
        </button>
      `).join('')}
    </div>
    ${promoHtml}`;

  // Event listeners
  card.querySelectorAll('.btn-masa').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const masa     = btn.dataset.masa;
      const esPromo  = btn.dataset.promo === 'true';
      if (typeof onAgregar === 'function') onAgregar(prod, masa, esPromo ? 3 : 1);
    });
  });

  return card;
}

/* ─────────────────────────────────────────────────────
   HELPERS DE TIPO / MASA
───────────────────────────────────────────────────── */

/**
 * Agrupa array de productos por Tipo, preservando el orden natural.
 */
function agruparPorTipo(productos) {
  const orden = ['Tradicional', 'Especial', 'Loca'];
  const mapa  = new Map();

  productos.forEach(p => {
    const t = (p.Tipo || 'Otro').trim();
    if (!mapa.has(t)) mapa.set(t, []);
    mapa.get(t).push(p);
  });

  // Ordenar secciones: primero los tipos conocidos, luego el resto
  const resultado = [];
  orden.forEach(t => { if (mapa.has(t)) resultado.push({ tipo: t, items: mapa.get(t) }); });
  mapa.forEach((items, tipo) => {
    if (!orden.includes(tipo)) resultado.push({ tipo, items });
  });

  return resultado;
}

/**
 * Parsea el campo Masa de Sheets: "Maiz/Arroz" → ['Maíz', 'Arroz']
 * Normaliza tildes ausentes del Sheet.
 */
function parseMasas(masaStr) {
  if (!masaStr) return ['Maíz', 'Arroz'];
  return masaStr.split('/').map(m => {
    const s = m.trim();
    if (s.toLowerCase() === 'maiz')  return 'Maíz';
    if (s.toLowerCase() === 'arroz') return 'Arroz';
    return s;
  });
}

/** Convierte tipo a slug CSS: "Tradicional" → "tradicional" */
function slugTipo(tipo) {
  return (tipo || 'otro').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
}

/** Slug de masa para CSS */
function slugMasa(masa) {
  return masa.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Etiqueta visual por tipo */
function etiquetaTipo(tipo) {
  const map = {
    'Tradicional': '⭐ Tradicionales',
    'Especial':    '🫓 Especiales',
    'Loca':        '🌶️ Pupusa Loca',
  };
  return map[tipo] || tipo;
}

/** Ícono de masa */
function iconoMasa(masa) {
  if (masa === 'Maíz')  return '🌽';
  if (masa === 'Arroz') return '🌾';
  return '🫓';
}

/* ─────────────────────────────────────────────────────
   RENDER DEL CARRITO
   Renderiza las líneas del resumen del pedido en curso.
───────────────────────────────────────────────────── */

/**
 * Renderiza el contenido del carrito en un contenedor dado.
 *
 * @param {HTMLElement} contenedor   — div donde van las líneas
 * @param {Array}       items        — array plano del carrito [{id, nombre, masa, precio_unitario}]
 * @param {Function}    onEliminar   — callback(id, masa) al quitar un ítem
 */
function renderCarrito(contenedor, items, onEliminar) {
  if (!contenedor) return;

  const grupos = agruparCarrito(items);

  if (grupos.length === 0) {
    contenedor.innerHTML = `
      <div class="carrito-vacio">
        <span class="carrito-vacio__icono">🧺</span>
        <p>Aún no hay pupusas.</p>
        <p class="carrito-vacio__hint">Toca <strong>Maíz</strong> o <strong>Arroz</strong> en el menú para comenzar.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = grupos.map(g => `
    <div class="carrito-linea" data-id="${g.id}" data-masa="${g.masa}">
      <div class="cl-info">
        <span class="cl-nombre">${g.nombre}</span>
        <span class="cl-masa">${iconoMasa(g.masa)} ${g.masa}</span>
      </div>
      <div class="cl-controles">
        <button class="cl-btn cl-btn--quitar"
          data-id="${g.id}" data-masa="${g.masa}"
          aria-label="Quitar una ${g.nombre}"
        >−</button>
        <span class="cl-cant">${g.cant}</span>
        <span class="cl-subtotal">${formatPrecio(g.subtotal)}</span>
      </div>
    </div>
  `).join('');

  // Bind de botones quitar
  contenedor.querySelectorAll('.cl-btn--quitar').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof onEliminar === 'function') onEliminar(btn.dataset.id, btn.dataset.masa);
    });
  });
}

/**
 * Actualiza únicamente el total visible (sin re-renderizar todo).
 * @param {HTMLElement} elTotal — el span/div donde se muestra el total
 * @param {Array}       items   — array plano del carrito
 */
function actualizarTotal(elTotal, items) {
  if (!elTotal) return;
  const grupos = agruparCarrito(items);
  const total  = calcularTotalCarrito(grupos);
  elTotal.textContent = formatPrecio(total);
}
