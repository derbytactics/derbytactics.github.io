/**
 * Hasta dónde crece cada texto con el tamaño de letra del sistema (Ajustes → Accesibilidad → Texto más grande).
 * El texto corrido crece sin límite y se reparte en más líneas; solo se limita lo que vive en piezas de
 * tamaño fijo, donde crecer más lo cortaría o lo sacaría de su sitio.
 */
/** Dentro de una forma fija: fichas de números, dados, círculos de paso, insignias. */
export const FIXED = 1;
/** Etiquetas, pestañas, tablas y cabeceras en una línea: crecen algo, sin romper la fila. */
export const COMPACT = 1.35;
