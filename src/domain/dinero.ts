// Objeto de valor Dinero: se trabaja siempre en céntimos enteros para evitar errores de redondeo.

export function soles(montoEnSoles: number): number {
  return Math.round(montoEnSoles * 100);
}

export function formatoSoles(centimos: number): string {
  return `S/ ${(centimos / 100).toFixed(2)}`;
}

export function validarPrecio(centimos: number): void {
  if (!Number.isInteger(centimos) || centimos <= 0) {
    throw new ErrorDeDominio("El precio debe ser un monto positivo.");
  }
}

export const CANTIDAD_MAXIMA = 50;

/** Objeto de valor Cantidad: entero entre 1 y 50 por línea. */
export function validarCantidad(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAXIMA) {
    throw new ErrorDeDominio(`La cantidad debe estar entre 1 y ${CANTIDAD_MAXIMA}.`);
  }
}

export class ErrorDeDominio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeDominio";
  }
}
