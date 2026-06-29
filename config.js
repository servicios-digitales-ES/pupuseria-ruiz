/* ═══════════════════════════════════════════════════════
   PUPUSERÍA RUIZ — config.js
   Configuración central y capa de comunicación con el API.
   -------------------------------------------------------
   REGLA: Este es el ÚNICO archivo que conoce el endpoint.
   Todos los demás módulos importan desde aquí.
═══════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────
   ENDPOINT
───────────────────────────────────────────────────── */
const API_URL =
  'https://script.google.com/macros/s/AKfycbwqLh4yPeWlIeoXy8bqDbsYJTDfqRTqgw_aj229Jx_5tv6YRvxFYelTTG51YdxpOXPM/exec';

/* ─────────────────────────────────────────────────────
   CONFIGURACIÓN DE NEGOCIO (valores por defecto)
   Se sobreescriben con los datos reales de la hoja "config"
   en cuanto el sistema los cargue.
───────────────────────────────────────────────────── */
const APP_CONFIG = {
  nombre_negocio:    'Pupusería Ruiz',
  hora_apertura:     '15:00',
  hora_cierre:       '20:00',
  dias_activos:      'Miercoles-Domingo',
  permitir_anticipados: 'si',
  mensaje_cerrado:   'cerrado',
};

/* ─────────────────────────────────────────────────────
   INTERVALO DE POLLING (ms)
───────────────────────────────────────────────────── */
const POLL_INTERVAL = 5000;

/* ─────────────────────────────────────────────────────
   ESTADOS VÁLIDOS — no crear otros
───────────────────────────────────────────────────── */
const ESTADOS = {
  ENVIADO:   'enviado',
  RECIBIDO:  'recibido',
  TERMINADO: 'terminado',
};

/* ─────────────────────────────────────────────────────
   TIPOS DE ENTREGA — texto exacto para Google Sheets
───────────────────────────────────────────────────── */
const ENTREGA = {
  LOCAL:     'ir a pupusería',
  DOMICILIO: 'enviar a domicilio',
};

/* ═══════════════════════════════════════════════════════
   CAPA DE API
   Todas las llamadas fetch del sistema pasan por aquí.
═══════════════════════════════════════════════════════ */

/**
 * GET genérico al endpoint.
 * @param {Object} params — parámetros query string
 * @returns {Promise<any>} — JSON parseado
 */
async function apiGet(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${API_URL}?${qs}` : API_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

/**
 * POST genérico al endpoint.
 * @param {Object} body — objeto que se envía como JSON
 * @returns {Promise<any>}
 */
async function apiPost(body = {}) {
  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

/* ─────────────────────────────────────────────────────
   LLAMADAS ESPECÍFICAS
───────────────────────────────────────────────────── */

/** Carga los productos desde la hoja "productos" */
async function fetchProductos() {
  return apiGet({ action: 'getProductos' });
}

/** Carga la configuración desde la hoja "config" */
async function fetchConfig() {
  return apiGet({ action: 'getConfig' });
}

/** Carga los ingredientes desde la hoja "ingredientes" */
async function fetchIngredientes() {
  return apiGet({ action: 'getIngredientes' });
}

/** Carga todos los pedidos (dashboard) */
async function fetchPedidos() {
  return apiGet({ action: 'getPedidos' });
}

/** Carga el detalle de un pedido por ID */
async function fetchDetallePedido(idPedido) {
  return apiGet({ action: 'getDetallePedido', id: idPedido });
}

/** Carga un pedido individual por ID (vista estado.html) */
async function fetchEstadoPedido(idPedido) {
  return apiGet({ action: 'getEstadoPedido', id: idPedido });
}

/** Carga la cola pública (solo pedidos "enviado") */
async function fetchCola() {
  return apiGet({ action: 'getCola' });
}

/**
 * Envía un pedido nuevo completo.
 * @param {Object} pedidoData — { nombre, tipo_entrega, casa, pasaje, referencia, whatsapp, items[] }
 */
async function enviarPedido(pedidoData) {
  return apiPost({ action: 'crearPedido', ...pedidoData });
}

/**
 * Marca un pedido como terminado.
 * @param {string|number} idPedido
 */
async function marcarTerminado(idPedido) {
  return apiPost({ action: 'marcarTerminado', id: idPedido });
}

/**
 * Registra una compra de ingrediente.
 * @param {Object} compraData — { fecha, ingrediente_ID, cantidad, unidad, cantidad_real, unidad_real, nota }
 */
async function registrarCompra(compraData) {
  return apiPost({ action: 'registrarCompra', ...compraData });
}

/** Carga las ventas resumidas */
async function fetchVentas(periodo = 'diario') {
  return apiGet({ action: 'getVentas', periodo });
}

/* ─────────────────────────────────────────────────────
   HELPERS DE FECHA / HORA
───────────────────────────────────────────────────── */

/** Devuelve hora en formato 12h: "6:25 PM" */
function formatHora(fechaStr) {
  const d = fechaStr ? new Date(fechaStr) : new Date();
  return d.toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Devuelve fecha legible: "Miércoles 8 de junio" */
function formatFecha(fechaStr) {
  const d = fechaStr ? new Date(fechaStr) : new Date();
  return d.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Diferencia en minutos entre ahora y una fecha */
function minutosDesdeFecha(fechaStr) {
  const diff = Date.now() - new Date(fechaStr).getTime();
  return Math.floor(diff / 60000);
}

/* ─────────────────────────────────────────────────────
   HELPERS DE PRECIO
───────────────────────────────────────────────────── */

/** Formatea un número como "$0.40" */
function formatPrecio(num) {
  return '$' + Number(num).toFixed(2);
}

/* ─────────────────────────────────────────────────────
   LOCAL STORAGE — claves centralizadas
───────────────────────────────────────────────────── */
const LS = {
  ONBOARDING:   'pr_onboarding_visto',
  SONIDO:       'pr_sonido_activo',
  ULTIMO_ID:    'pr_ultimo_id_pedido',
};

/** Lee un valor de localStorage */
function lsGet(clave) {
  return localStorage.getItem(clave);
}

/** Guarda un valor en localStorage */
function lsSet(clave, valor) {
  localStorage.setItem(clave, valor);
     }
