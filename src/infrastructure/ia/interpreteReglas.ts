// Adaptador de interpretación local basado en reglas y comparación difusa.
// Se usa cuando no hay clave de IA configurada y como modo degradado si el modelo no responde (EC02).
import {
  contieneAlguna,
  contieneFrase,
  leerCantidad,
  normalizar,
  palabrasParecidas,
} from "@/application/conversacion/texto";
import type {
  Intencion,
  ItemInterpretado,
  PlatoCarta,
  ServicioDeInterpretacion,
} from "@/application/puertos";

const VACIAS = new Set([
  "de", "del", "la", "el", "los", "las", "a", "al", "con", "en", "y", "e", "por", "favor", "porfa",
  "porfavor", "pf", "plis", "please", "me", "mi", "para", "un", "una", "uno", "unos", "unas",
  "quiero", "quisiera", "queria", "deme", "dame", "denme", "manda", "mandame", "mandeme", "traeme",
  "traiganme", "pedir", "ordenar", "pido", "agrega", "agregame", "agregar", "anade", "anademe",
  "ponme", "pon", "das", "da", "seria", "sería", "tambien", "mas", "otro", "otra", "otros", "otras",
  "plato", "platos", "orden", "ordenes", "porcion", "porciones", "hola", "buenas", "buenos", "dias",
  "tardes", "noches", "senor", "senorita", "amigo", "amiga", "joven", "ya", "pues", "nomas", "no",
  "que", "si", "x", "lo", "le", "les", "su", "sus", "solo",
  // palabras de pregunta (HU04)
  "lleva", "llevan", "tiene", "tienen", "cuesta", "cuestan", "vale", "esta", "es", "son", "como",
  "cuanto", "cuanta", "viene", "trae", "ingredientes", "ingrediente", "picante", "pica", "hay",
  "recomienda", "recomiendas", "cual", "cuales", "sabe", "saber",
  // muletillas y verbos coloquiales
  "mandas", "mande", "mandan", "traes", "traen", "traigan", "pe", "pes", "ahi", "porfis", "porfi",
  "cambia", "cambiala", "cambialo", "cambiame", "sean", "mejor", "ponle", "ponlo", "pongan", "nos",
]);

const VERBOS_PEDIDO = [
  "quiero", "quisiera", "queria", "deme", "dame", "denme", "mandame", "mandeme", "manda", "traeme",
  "pedir", "pido", "ordenar", "agrega", "agregame", "agregar", "anade", "anademe", "ponme", "me das",
  "me da", "para mi", "me pones", "voy a querer", "seria", "me mandas", "me traes", "nos mandas",
  "nos traes", "mandame", "me mandan", "me traen",
];

/** Palabras que no son platos: si un segmento solo tiene estas, no es un ítem del pedido. */
const META = new Set([
  "delivery", "llevar", "recoger", "local", "carta", "menu", "pedido", "pedidos", "hacer", "comer",
  "almorzar", "almuerzo", "algo", "saber", "informacion", "precio", "precios", "favor", "rico", "rica",
  "persona", "personas", "aca", "aqui", "hoy", "ahora", "rapido", "gracias", "todo", "eso", "nada",
]);

const MARCAS_OBSERVACION = ["sin", "con poco", "con mucho", "con extra", "extra", "bien", "aparte", "poco", "bastante"];

/** Frases que siempre indican una pregunta sobre un plato. */
const PALABRAS_PREGUNTA_PLATO = [
  "que lleva", "que tiene", "de que es", "que es", "ingredientes", "cuanto cuesta", "cuanto esta",
  "cuanto vale", "precio", "cuanto es", "como es", "como viene", "viene con", "para cuantas personas",
  "es grande",
];
/** Palabras que solo indican pregunta si el mensaje es interrogativo ("¿pica?" vs. "bien picante"). */
const PALABRAS_PREGUNTA_DEBILES = ["picante", "pica", "trae"];

interface Candidato {
  id: string;
  cobSegmento: number;
  cobPlato: number;
}

function tokensContenido(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((t) => t && !VACIAS.has(t));
}

export class InterpreteReglas implements ServicioDeInterpretacion {
  async interpretar(texto: string, carta: PlatoCarta[]): Promise<Intencion> {
    return interpretarConReglas(texto, carta);
  }
}

export function interpretarConReglas(texto: string, carta: PlatoCarta[]): Intencion {
  const n = normalizar(texto);
  if (!n) return { tipo: "NO_ENTENDIDO" };
  const esPregunta = texto.includes("?") || /^(que|cual|cuanto|cuanta|como|tiene|tienen|lleva|hay|es|son|donde|a que)\b/.test(n);

  if (contieneAlguna(n, ["persona", "humano", "asesor", "asesora", "operador", "encargado", "encargada", "hablar con alguien", "atencion personal", "un mozo"])) {
    return { tipo: "HUMANO" };
  }
  if (/\b(cancel\w*|anul\w*)\b/.test(n) && /\bpedido\b/.test(n)) return { tipo: "CANCELAR_PEDIDO" };
  if (/\b(modific\w*|cambi\w*|corregir)\b/.test(n) && /\b(mi|el) pedido\b/.test(n)) return { tipo: "MODIFICAR_PEDIDO" };
  if (
    contieneAlguna(n, ["estado de mi pedido", "estado del pedido", "como va mi pedido", "donde esta mi pedido", "cuanto falta", "ya esta listo", "ya sale", "mi pedido ya", "y mi pedido"])
  ) {
    return { tipo: "ESTADO_PEDIDO" };
  }
  if (/^(quita|quitar|quitale|quitame|saca|sacar|sacale|elimina|eliminar|borra|borrar|retira|ya no quiero)\b/.test(n)) {
    const resto = n.replace(/^(quita|quitar|quitale|quitame|saca|sacar|sacale|elimina|eliminar|borra|borrar|retira|ya no quiero)\b/, "");
    return { tipo: "QUITAR", items: extraerItems(resto, carta) };
  }

  const items = extraerItems(n, carta);
  const reconocidos = items.filter((i) => i.platoId || i.candidatos?.length);

  // Pregunta sobre un plato (HU04): "¿qué lleva la carapulcra?"
  const preguntaPlato =
    contieneAlguna(n, PALABRAS_PREGUNTA_PLATO) || (esPregunta && contieneAlguna(n, PALABRAS_PREGUNTA_DEBILES));
  if (preguntaPlato && reconocidos.length) {
    const it = reconocidos[0];
    return { tipo: "PREGUNTA_PLATO", platoId: it.platoId ?? it.candidatos?.[0], consulta: texto };
  }

  // Recomendación: "¿qué me recomiendas?"
  if (/\b(recomi\w*|sugier\w*|sugerencia|especialidad\w*|lo mas pedido|lo mejor)\b/.test(n) && !reconocidos.length) {
    return { tipo: "RECOMENDAR" };
  }

  // Cambiar la cantidad de un plato del carrito (RF06): "cambia a 3 chichas", "que sean 2 lomos"
  if (/^(cambia\w*|mejor|que sean|ponle|ponlo|pon)\b/.test(n) && reconocidos.length) {
    return { tipo: "CAMBIAR_CANTIDAD", items: reconocidos };
  }

  const tieneVerbo = contieneAlguna(n, VERBOS_PEDIDO);
  const empiezaConCantidad = leerCantidad(n.split(" ")[0]) !== null && n.split(" ").length > 1;
  if ((tieneVerbo || empiezaConCantidad) && items.length && !esSoloFaq(n)) {
    return { tipo: "PEDIR", items };
  }
  if (tieneVerbo && !items.length && contieneAlguna(n, ["pedido", "pedir", "ordenar", "comer", "almorzar"])) {
    return { tipo: "VER_CARTA" };
  }

  const faq = detectarFaq(n);
  if (faq) return { tipo: "FAQ", tema: faq };
  if (contieneAlguna(n, ["carta", "menu", "que tienen", "que platos", "que hay", "que venden", "opciones", "que ofrecen", "la carta"])) {
    return { tipo: "VER_CARTA" };
  }
  if (contieneAlguna(n, ["carrito", "que llevo", "que pedi", "mi lista", "ver pedido", "ver mi pedido"])) {
    return { tipo: "VER_CARRITO" };
  }
  if (contieneAlguna(n, ["eso es todo", "nada mas", "es todo", "seria todo", "solo eso", "terminar", "finalizar", "continuar", "listo", "eso nomas", "eso seria", "ya esta"])) {
    return { tipo: "TERMINAR" };
  }
  if (/^(si|sii+|ok|okey|okay|dale|confirmo|confirmar|correcto|de acuerdo|claro|ya|perfecto|va|asi es|esta bien|bueno)( .*)?$/.test(n) && n.split(" ").length <= 4) {
    return { tipo: "CONFIRMAR" };
  }
  if (/^(no|nop|nope|negativo|no gracias)$/.test(n)) return { tipo: "NEGAR" };
  if (contieneFrase(n, "gracias")) return { tipo: "GRACIAS" };
  if (reconocidos.length && !esPregunta) return { tipo: "PEDIR", items };
  if (esPregunta && reconocidos.length) {
    const it = reconocidos[0];
    return { tipo: "PREGUNTA_PLATO", platoId: it.platoId ?? it.candidatos?.[0], consulta: texto };
  }
  if (/^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|alo|saludos)\b/.test(n)) return { tipo: "SALUDO" };
  return { tipo: "NO_ENTENDIDO" };
}

function esSoloFaq(n: string) {
  return /^(hacen|tienen|hay) (delivery|reparto)$/.test(n);
}

function detectarFaq(n: string): "HORARIO" | "UBICACION" | "DELIVERY" | "PAGOS" | null {
  if (contieneAlguna(n, ["horario", "a que hora", "que hora", "abren", "cierran", "atienden", "estan abiertos", "hasta que hora", "dias de atencion"])) return "HORARIO";
  if (contieneAlguna(n, ["donde quedan", "donde estan", "donde queda", "direccion", "ubicacion", "como llego", "locales", "sedes", "sede", "local"])) return "UBICACION";
  if (contieneAlguna(n, ["delivery", "reparto", "envio", "envios", "zonas", "llevan a", "hasta donde", "costo de envio", "mandan a domicilio", "domicilio"])) return "DELIVERY";
  if (contieneAlguna(n, ["pago", "pagos", "pagar", "yape", "plin", "tarjeta", "transferencia", "efectivo", "medios de pago", "aceptan"])) return "PAGOS";
  return null;
}

/** Divide el mensaje en segmentos ("2 arroz con pato y una chicha") y los asocia a platos de la carta. */
export function extraerItems(n: string, carta: PlatoCarta[]): ItemInterpretado[] {
  const segmentos = n
    .split(/,|\+|\by\b|\be\b|\bmas\b|\btambien\b|\bademas\b|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const items: ItemInterpretado[] = [];
  for (const seg of segmentos) {
    const item = interpretarSegmento(seg, carta);
    if (item) items.push(item);
  }
  return items;
}

function interpretarSegmento(seg: string, carta: PlatoCarta[]): ItemInterpretado | null {
  let tokens = seg.split(" ").filter(Boolean);

  // Observación: todo lo que sigue a "sin", "con poco", etc. (desde la 2.ª palabra)
  let observacion: string | undefined;
  for (let i = 1; i < tokens.length; i++) {
    const resto = tokens.slice(i).join(" ");
    const marca = MARCAS_OBSERVACION.find((m) => resto === m || resto.startsWith(m + " "));
    if (marca && i < tokens.length - (marca.split(" ").length - 1)) {
      observacion = resto;
      tokens = tokens.slice(0, i);
      break;
    }
  }

  // Cantidad: primera palabra numérica (2, dos, x2)
  let cantidad = 1;
  let cantidadExplicita = false;
  for (let i = 0; i < tokens.length; i++) {
    const c = leerCantidad(tokens[i]);
    if (c !== null && c > 0) {
      cantidad = c;
      cantidadExplicita = !["un", "una", "uno"].includes(tokens[i]);
      tokens.splice(i, 1);
      break;
    }
  }

  const contenido = tokens.filter((t) => !VACIAS.has(t));
  if (!contenido.length || contenido.every((t) => META.has(t))) return null;
  const textoPlato = contenido.join(" ");

  const candidatos = buscarCandidatos(contenido, carta);
  const item: ItemInterpretado = { texto: textoPlato, cantidad, cantidadExplicita, observacion };
  if (!candidatos.length) return item;

  const puntaje = (c: Candidato) => c.cobSegmento + c.cobPlato;
  candidatos.sort((a, b) => puntaje(b) - puntaje(a));
  const mejor = candidatos[0];
  const empatados = candidatos.filter((c) => Math.abs(puntaje(c) - puntaje(mejor)) < 1e-9);
  if (mejor.cobPlato >= 0.999 && empatados.length === 1) item.platoId = mejor.id;
  else if (empatados.length === 1) item.platoId = mejor.id;
  else item.candidatos = empatados.map((c) => c.id);
  return item;
}

function buscarCandidatos(contenido: string[], carta: PlatoCarta[]): Candidato[] {
  const resultado: Candidato[] = [];
  for (const plato of carta) {
    let mejor: Candidato | null = null;
    for (const variante of [plato.nombre, ...plato.alias]) {
      const tp = tokensContenido(variante);
      if (!tp.length) continue;
      const encontradosSeg = contenido.filter((t) => tp.some((p) => palabrasParecidas(t, p))).length;
      const encontradosPlato = tp.filter((p) => contenido.some((t) => palabrasParecidas(t, p))).length;
      const c: Candidato = {
        id: plato.id,
        cobSegmento: encontradosSeg / contenido.length,
        cobPlato: encontradosPlato / tp.length,
      };
      if (!mejor || c.cobSegmento + c.cobPlato > mejor.cobSegmento + mejor.cobPlato) mejor = c;
    }
    if (mejor && mejor.cobSegmento >= 0.6 && mejor.cobPlato > 0) resultado.push(mejor);
  }
  return resultado;
}
