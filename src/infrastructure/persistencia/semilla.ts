// Datos iniciales de ejemplo. Los precios y zonas son referenciales: la propietaria debe
// reemplazarlos desde el panel de administración (RN05: "montos por definir").
import type { Configuracion } from "@/application/puertos";
import type { Plato, Sede, Zona } from "@/domain/tipos";

export const SEDES: Sede[] = [
  { id: "grocio-prado", nombre: "Grocio Prado", prefijo: "GP", direccion: "Calle Filomeno Tasayco 125 (calle Los Eucaliptos), cdra. 5, Grocio Prado" },
  { id: "panamericana", nombre: "Panamericana Sur", prefijo: "PS", direccion: "Carretera Panamericana Sur km 193.10, Grocio Prado – Sunampe" },
];

const p = (
  id: string,
  nombre: string,
  categoria: string,
  soles: number,
  descripcion: string,
  alias: string[] = [],
): Plato => ({ id, nombre, categoria, precio: Math.round(soles * 100), descripcion, alias, activo: true });

export const PLATOS: Plato[] = [
  p("carapulcra", "Carapulcra con sopa seca", "Criollos", 28, "Guiso de papa seca con cerdo, ají panca y maní, acompañado de sopa seca (tallarín al estilo chinchano).", ["carapulcra", "sopa seca", "dúo chinchano"]),
  p("arroz-pato", "Arroz con pato", "Criollos", 32, "Arroz verde al culantro con pato macerado en chicha de jora, con zarza criolla.", ["pato"]),
  p("pachamanca", "Pachamanca a la olla", "Criollos", 35, "Cerdo, pollo y carnero con habas, choclo, camote y papa, cocidos con hierbas andinas.", ["pacha"]),
  p("aji-gallina", "Ají de gallina", "Criollos", 24, "Gallina deshilachada en crema de ají amarillo, con arroz, papa y huevo.", []),
  p("lomo-saltado", "Lomo saltado", "Criollos", 34, "Trozos de lomo salteados al wok con cebolla y tomate, con papas fritas y arroz.", ["lomo"]),
  p("ceviche-pescado", "Ceviche de pescado", "Pescados y mariscos", 30, "Pescado fresco del día en leche de tigre con cebolla, ají limo, camote y choclo.", []),
  p("ceviche-mixto", "Ceviche mixto", "Pescados y mariscos", 35, "Pescado y mariscos en leche de tigre, con camote y choclo.", []),
  p("pescado-frito", "Pescado frito", "Pescados y mariscos", 28, "Filete de pescado frito con yuca, arroz y zarza criolla.", []),
  p("sudado-pescado", "Sudado de pescado", "Pescados y mariscos", 30, "Pescado cocido al vapor en caldo de tomate, cebolla, ají y chicha de jora, con arroz.", ["sudado"]),
  p("chicharron-pescado", "Chicharrón de pescado", "Pescados y mariscos", 28, "Trozos de pescado apanados y fritos, con yuca y salsa tártara.", []),
  p("causa", "Causa rellena", "Entradas", 15, "Papa amarilla prensada con ají y limón, rellena de pollo o atún.", []),
  p("papa-huancaina", "Papa a la huancaína", "Entradas", 12, "Papas sancochadas bañadas en crema de ají amarillo y queso fresco.", ["huancaina"]),
  p("chicha-morada", "Chicha morada (jarra 1 L)", "Bebidas", 15, "Refresco natural de maíz morado con piña, canela y clavo.", ["chicha"]),
  p("limonada", "Limonada (jarra 1 L)", "Bebidas", 15, "Limonada natural frozen o al tiempo.", ["limonada frozen"]),
  p("gaseosa", "Gaseosa 1.5 L", "Bebidas", 10, "Inca Kola o Coca-Cola de 1.5 L.", ["inca kola", "coca cola", "inka cola"]),
  p("agua", "Agua mineral 625 ml", "Bebidas", 3, "Agua sin gas.", ["agua"]),
];

export const ZONAS: Zona[] = [
  { id: "z-grocio-centro", sedeId: "grocio-prado", nombre: "Grocio Prado (centro)", tarifa: 300, pedidoMinimo: 2000, activa: true },
  { id: "z-chincha-alta", sedeId: "grocio-prado", nombre: "Chincha Alta", tarifa: 600, pedidoMinimo: 3000, activa: true },
  { id: "z-sunampe", sedeId: "panamericana", nombre: "Sunampe", tarifa: 400, pedidoMinimo: 2500, activa: true },
  { id: "z-pueblo-nuevo", sedeId: "panamericana", nombre: "Pueblo Nuevo", tarifa: 700, pedidoMinimo: 3500, activa: true },
];

export const CONFIGURACION: Configuracion = {
  nombreRestaurante: "Restaurante Los Eucaliptos",
  apertura: "10:00",
  cierre: "17:00",
  zonaHoraria: "America/Lima",
  ignorarHorario: true,
  mensajeBienvenida: "Bienvenido al Restaurante Los Eucaliptos 🌿, comida criolla y pescados en Chincha.",
  textoPagos: "Aceptamos efectivo, tarjeta, Yape, Plin y transferencia.",
  textoHorario: "Atendemos de lunes a domingo de 10:00 a. m. a 5:00 p. m.",
  tiempoObjetivoCocinaMin: 20,
  tiempoEstimadoMin: { EN_LOCAL: 20, PARA_LLEVAR: 25, DELIVERY: 40 },
};
