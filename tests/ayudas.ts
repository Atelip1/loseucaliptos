import { crearContenedor } from "@/infrastructure/contenedor";
import { AlmacenJson } from "@/infrastructure/persistencia/almacenJson";

/** Contenedor en memoria con reloj controlable e intérprete por reglas. */
export function contenedorDePrueba(fecha = new Date("2026-11-04T17:00:00Z") /* 12:00 en Lima */) {
  delete process.env.OPENAI_API_KEY;
  delete process.env.WHATSAPP_TOKEN;
  const k = crearContenedor(new AlmacenJson(null));
  let ahora = fecha;
  k.deps.reloj.ahora = () => ahora;
  const enviados: { telefono: string; texto: string }[] = [];
  k.deps.mensajeria.enviarTexto = async (telefono, texto) => {
    enviados.push({ telefono, texto });
  };
  return {
    k,
    enviados,
    avanzar(min: number) {
      ahora = new Date(ahora.getTime() + min * 60_000);
    },
    /** Envía un mensaje de texto y devuelve todas las respuestas unidas. */
    async decir(texto: string, telefono = "51999000111") {
      return (await k.chatbot.procesar({ telefono, texto })).join("\n---\n");
    },
  };
}
