// Adaptador del servicio de interpretación con un modelo de lenguaje vía API (OpenAI, salidas
// estructuradas en JSON). El modelo solo devuelve ids de la carta; la aplicación valida cada plato
// y toma los precios de la base de datos (RN01, EC03).
import type {
  Intencion,
  ItemInterpretado,
  PlatoCarta,
  ServicioDeInterpretacion,
} from "@/application/puertos";

const TIPOS = [
  "SALUDO", "VER_CARTA", "FAQ", "PREGUNTA_PLATO", "PEDIR", "QUITAR", "VER_CARRITO", "TERMINAR",
  "CONFIRMAR", "NEGAR", "HUMANO", "ESTADO_PEDIDO", "CANCELAR_PEDIDO", "MODIFICAR_PEDIDO", "GRACIAS",
  "NO_ENTENDIDO",
] as const;

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tipo", "tema", "platoConsultado", "items"],
  properties: {
    tipo: { type: "string", enum: TIPOS },
    tema: { type: ["string", "null"], enum: ["HORARIO", "UBICACION", "DELIVERY", "PAGOS", null] },
    platoConsultado: { type: ["string", "null"] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["texto", "cantidad", "observacion", "platoId", "candidatos"],
        properties: {
          texto: { type: "string" },
          cantidad: { type: "integer" },
          observacion: { type: ["string", "null"] },
          platoId: { type: ["string", "null"] },
          candidatos: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

function instrucciones(carta: PlatoCarta[]): string {
  const lista = carta
    .map((p) => `- id=${p.id} | ${p.nombre} | ${p.categoria}${p.alias.length ? ` | también: ${p.alias.join(", ")}` : ""}`)
    .join("\n");
  return `Eres el intérprete de mensajes del chatbot de pedidos del Restaurante Los Eucaliptos (Chincha, Perú).
Clasifica el mensaje del cliente y extrae los platos. Responde SOLO con el JSON del esquema.
Reglas:
- tipo PEDIR cuando el cliente pide platos; QUITAR cuando quiere sacar platos del carrito.
- Para cada plato, platoId debe ser EXACTAMENTE un id de la carta. Si el plato no existe, platoId=null y candidatos=[].
- Si el mensaje es ambiguo (p. ej. "un pescado" y hay varias preparaciones), platoId=null y en candidatos los ids posibles.
- cantidad: entero; entiende cantidades en letras ("dos") y errores ortográficos. Por defecto 1.
- observacion: indicaciones como "sin ají" o null.
- FAQ con tema HORARIO, UBICACION, DELIVERY o PAGOS para preguntas generales del restaurante.
- PREGUNTA_PLATO cuando pregunta qué lleva, precio o detalles de un plato (platoConsultado = id).
- TERMINAR para "eso es todo", "listo", "nada más". HUMANO si pide hablar con una persona.
- Nunca inventes platos ni precios.
Carta vigente:
${lista}`;
}

export class InterpreteOpenAI implements ServicioDeInterpretacion {
  constructor(
    private apiKey: string,
    private modelo = "gpt-4o-mini",
    private timeoutMs = 8000,
  ) {}

  async interpretar(texto: string, carta: PlatoCarta[]): Promise<Intencion> {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), this.timeoutMs);
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: control.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.modelo,
          temperature: 0,
          messages: [
            { role: "system", content: instrucciones(carta) },
            { role: "user", content: texto },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "intencion", strict: true, schema: ESQUEMA },
          },
        }),
      });
      if (!resp.ok) throw new Error(`OpenAI respondió ${resp.status}`);
      const json = await resp.json();
      const contenido = json.choices?.[0]?.message?.content;
      if (!contenido) throw new Error("Respuesta vacía del modelo");
      return aIntencion(JSON.parse(contenido), carta, texto);
    } finally {
      clearTimeout(temporizador);
    }
  }
}

interface SalidaModelo {
  tipo: (typeof TIPOS)[number];
  tema: "HORARIO" | "UBICACION" | "DELIVERY" | "PAGOS" | null;
  platoConsultado: string | null;
  items: { texto: string; cantidad: number; observacion: string | null; platoId: string | null; candidatos: string[] }[];
}

/** Convierte la salida del modelo en una Intención, descartando ids que no existan en la carta. */
export function aIntencion(s: SalidaModelo, carta: PlatoCarta[], texto: string): Intencion {
  const ids = new Set(carta.map((p) => p.id));
  const items: ItemInterpretado[] = (s.items ?? []).map((i) => ({
    texto: i.texto,
    cantidad: Number.isInteger(i.cantidad) && i.cantidad > 0 ? i.cantidad : 1,
    observacion: i.observacion ?? undefined,
    platoId: i.platoId && ids.has(i.platoId) ? i.platoId : undefined,
    candidatos: (i.candidatos ?? []).filter((c) => ids.has(c)),
  }));
  switch (s.tipo) {
    case "FAQ":
      return s.tema ? { tipo: "FAQ", tema: s.tema } : { tipo: "NO_ENTENDIDO" };
    case "PREGUNTA_PLATO":
      return {
        tipo: "PREGUNTA_PLATO",
        platoId: s.platoConsultado && ids.has(s.platoConsultado) ? s.platoConsultado : undefined,
        consulta: texto,
      };
    case "PEDIR":
      return items.length ? { tipo: "PEDIR", items } : { tipo: "NO_ENTENDIDO" };
    case "QUITAR":
      return { tipo: "QUITAR", items };
    default:
      return { tipo: s.tipo } as Intencion;
  }
}
