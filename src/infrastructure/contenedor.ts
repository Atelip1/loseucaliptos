// Raíz de composición: conecta los puertos con sus adaptadores según las variables de entorno.
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ServicioAtencion } from "@/application/atencion";
import { ServicioCarta } from "@/application/carta";
import { GestorConversacion } from "@/application/conversacion/gestor";
import type { Dependencias } from "@/application/dependencias";
import { ServicioPedidos } from "@/application/pedidos";
import { ServicioZonas } from "@/application/zonas";
import { InterpreteOpenAI } from "./ia/interpreteOpenAI";
import { InterpreteReglas } from "./ia/interpreteReglas";
import { InterpreteResiliente } from "./ia/interpreteResiliente";
import { AlmacenJson, repoConfiguracion, repoZonas } from "./persistencia/almacenJson";
import { MensajeriaSimulada, MensajeriaWhatsApp } from "./whatsapp/cloudApi";

export interface Contenedor {
  deps: Dependencias;
  almacen: AlmacenJson;
  carta: ServicioCarta;
  pedidos: ServicioPedidos;
  zonas: ServicioZonas;
  atencion: ServicioAtencion;
  chatbot: GestorConversacion;
  modoIA: "openai" | "reglas";
  modoWhatsApp: "cloud-api" | "simulado";
}

export function crearContenedor(almacen: AlmacenJson): Contenedor {
  const reglas = new InterpreteReglas();
  const clave = process.env.OPENAI_API_KEY;
  const interprete = clave
    ? new InterpreteResiliente(new InterpreteOpenAI(clave, process.env.OPENAI_MODEL || "gpt-4o-mini"), reglas)
    : reglas;
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const mensajeria = token && phoneId ? new MensajeriaWhatsApp(token, phoneId) : new MensajeriaSimulada();

  const deps: Dependencias = {
    carta: almacen,
    zonas: repoZonas(almacen),
    pedidos: almacen.pedidos,
    conversaciones: almacen.conversaciones,
    configuracion: repoConfiguracion(almacen),
    mensajeria,
    interprete,
    reloj: { ahora: () => new Date() },
    ids: { nuevo: () => randomUUID() },
  };
  return {
    deps,
    almacen,
    carta: new ServicioCarta(deps),
    pedidos: new ServicioPedidos(deps),
    zonas: new ServicioZonas(deps),
    atencion: new ServicioAtencion(deps),
    chatbot: new GestorConversacion(deps),
    modoIA: clave ? "openai" : "reglas",
    modoWhatsApp: token && phoneId ? "cloud-api" : "simulado",
  };
}

/**
 * Carpeta del almacenamiento local. En Vercel el disco es de solo lectura salvo /tmp, que es temporal:
 * sirve para demostraciones, no para producción (allí se usará el adaptador de Supabase).
 */
export function carpetaDatos(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return path.join("/tmp", "eucaliptos");
  return path.join(process.cwd(), "data");
}

const global = globalThis as unknown as { __eucaliptos?: Contenedor };

/** Instancia única por proceso (sobrevive a la recarga en caliente de Next.js en desarrollo). */
export function contenedor(): Contenedor {
  if (!global.__eucaliptos) {
    const archivo = path.join(carpetaDatos(), "db.json");
    global.__eucaliptos = crearContenedor(new AlmacenJson(archivo));
  }
  return global.__eucaliptos;
}
