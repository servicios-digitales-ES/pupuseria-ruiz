/* ═══════════════════════════════════════════════════════
   PUPUSERÍA RUIZ — data/menu.js  v4
   Para agregar/quitar pupusas o cambiar precios,
   edita SOLO este archivo. No toques app.js ni index.html.
   -------------------------------------------------------
   TIPOS:
     'tradicional' → Frijol con Queso, Revueltas
                     $0.40 c/u  |  3 por $1.00
     'especial'    → Queso, Pollo, Chicharrón, Ayote,
                     Chipilín, Jalapeño con Queso,
                     Ajo con Queso, Mora con Queso
                     $0.75 c/u (precio fijo)
     'loca'        → Pupusa Loca — precio fijo $3.00
═══════════════════════════════════════════════════════ */

const MENU_CONFIG = {
  nombre:   'Pupusería Ruiz',
  whatsapp: '50376375986',

  /* Tradicionales */
  tradicional: {
    precioUnidad: 0.40,   /* $0.40 la unidad */
    promoQty:     3,      /* 3 por $1.00     */
    promoPrecio:  1.00,
  },

  /* Especiales (todo excepto la Loca) */
  precioEspecial: 0.75,

  /* Pupusa Loca */
  precioLoca: 3.00,

  /* -------------------------------------------------------
   Ingredientes de la Pupusa Loca (para el modal de edición)
------------------------------------------------------- */
ingredientesLoca: [
  'Frijol',
  'Queso',
  'Chicharrón',
  'Ajo',
  'Pollo',
  'Jamón',
  'Mora',
  'Jalapeño',
  'Ayote',
  'Loroco'
],
};

/* -------------------------------------------------------
   ITEMS_PUPUSAS
   tipo: 'tradicional' | 'especial' | 'loca'
   Los ingredientes "con queso" llevan el nombre completo
   (excepto Revueltas y Loca que se explican solos).
------------------------------------------------------- */
const ITEMS_PUPUSAS = [
  /* ── TRADICIONALES ── */
  { id: 'frijol_queso', nombre: 'Frijol con Queso', tipo: 'tradicional' },
  { id: 'revueltas',    nombre: 'Revueltas',         tipo: 'tradicional' },

  /* ── ESPECIALES ── */
{ id: 'queso',        nombre: 'Queso',                  tipo: 'especial' },
{ id: 'loroco',       nombre: 'Loroco con Queso',       tipo: 'especial' },
{ id: 'chicharron',   nombre: 'Chicharrón con Queso',   tipo: 'especial' },
{ id: 'ayote',        nombre: 'Ayote con Queso',        tipo: 'especial' },
{ id: 'chipilin',     nombre: 'Chipilín con Queso',     tipo: 'especial' },
{ id: 'pollo',        nombre: 'Pollo con Queso',        tipo: 'especial' },
{ id: 'jamon',        nombre: 'Jamón con Queso',        tipo: 'especial' },
{ id: 'jalap_queso',  nombre: 'Jalapeño con Queso',     tipo: 'especial' },
{ id: 'ajo_queso',    nombre: 'Ajo con Queso',          tipo: 'especial' },
{ id: 'mora_queso',   nombre: 'Mora con Queso',         tipo: 'especial' },


  /* ── LOCA ── */
  { id: 'loca',         nombre: 'Pupusa Loca',            tipo: 'loca' },
];
