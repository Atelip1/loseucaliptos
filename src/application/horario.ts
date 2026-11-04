import type { Configuracion } from "./puertos";

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Hora local (minutos desde medianoche) en la zona horaria del restaurante. */
export function minutosLocales(fecha: Date, zonaHoraria: string): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: zonaHoraria,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** RN08: los pedidos inmediatos solo se aceptan dentro del horario de atención. */
export function estaAbierto(config: Configuracion, ahora: Date): boolean {
  if (config.ignorarHorario) return true;
  const actual = minutosLocales(ahora, config.zonaHoraria);
  return actual >= minutos(config.apertura) && actual < minutos(config.cierre);
}

/** Fecha local "AAAA-MM-DD" en la zona horaria del restaurante. */
export function fechaLocal(fecha: Date, zonaHoraria: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zonaHoraria }).format(fecha);
}
