// Adaptador de entrada: webhook de WhatsApp Business Platform (Cloud API).
// Responde de inmediato a Meta y procesa el mensaje en segundo plano (EC01); valida la firma (EC04).
import { after } from "next/server";
import { contenedor } from "@/infrastructure/contenedor";
import { extraerMensajes, firmaValida } from "@/infrastructure/whatsapp/cloudApi";

export const dynamic = "force-dynamic";

// Verificación del webhook al registrarlo en Meta
export function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Token de verificación no válido", { status: 403 });
}

export async function POST(req: Request) {
  const texto = await req.text();
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto) {
    console.error("[webhook] WHATSAPP_APP_SECRET no está configurado; se rechaza la petición");
    return new Response("Webhook no configurado", { status: 503 });
  }
  if (!firmaValida(texto, req.headers.get("x-hub-signature-256"), secreto)) {
    console.warn("[webhook] firma no válida; petición rechazada");
    return new Response("Firma no válida", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(texto);
  } catch {
    return new Response("JSON no válido", { status: 400 });
  }
  const mensajes = extraerMensajes(payload);
  after(async () => {
    const chatbot = contenedor().chatbot;
    for (const m of mensajes) {
      try {
        await chatbot.procesar({
          telefono: m.telefono,
          nombrePerfil: m.nombrePerfil,
          texto: m.texto,
          ubicacion: m.ubicacion,
          imagen: m.imagen,
          idMensaje: m.id,
        });
      } catch (e) {
        console.error("[webhook] error al procesar mensaje", m.id, e);
      }
    }
  });
  return new Response("EVENT_RECEIVED", { status: 200 });
}
