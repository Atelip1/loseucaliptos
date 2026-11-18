// Simulador de WhatsApp para pruebas y Sprint Review sin número de WhatsApp Business.
// Usa exactamente el mismo gestor de conversación que el webhook real.
import { ErrorDeDominio } from "@/domain/dinero";
import { guardarImagen } from "@/infrastructure/archivos";
import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar, requerido } from "../_util";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const telefono = new URL(req.url).searchParams.get("telefono");
  return manejar(async () => {
    const k = contenedor();
    const tel = requerido(telefono, "el teléfono");
    const c = await k.deps.conversaciones.obtener(tel);
    const platos = new Map((await k.deps.carta.listarPlatos()).map((p) => [p.id, p]));
    const carrito = (c?.carrito ?? []).map((l) => ({
      nombre: platos.get(l.platoId)?.nombre ?? "¿?",
      cantidad: l.cantidad,
      observacion: l.observacion,
      subtotal: (platos.get(l.platoId)?.precio ?? 0) * l.cantidad,
    }));
    const pedidos = await k.deps.pedidos.listar({ clienteTelefono: tel });
    return {
      mensajes: c?.mensajes ?? [],
      derivada: c?.derivada ?? false,
      paso: c?.paso ?? null,
      nombre: c?.nombre ?? null,
      carrito,
      totalPedidos: pedidos.length,
    };
  });
}

export function POST(req: Request) {
  return manejar(async () => {
    const b = await cuerpo<{ telefono: string; nombre?: string; texto?: string; ubicacion?: { lat: number; lng: number }; imagen?: string }>(req);
    const telefono = requerido(b.telefono, "el teléfono");
    if (!/^\d{6,15}$/.test(telefono)) throw new ErrorDeDominio("El teléfono debe tener solo dígitos.");
    const imagen = b.imagen ? await guardarImagen(b.imagen) : undefined;
    const respuestas = await contenedor().chatbot.procesar({
      telefono,
      nombrePerfil: b.nombre?.trim() || undefined,
      texto: b.texto,
      ubicacion: b.ubicacion,
      imagen,
    });
    return { respuestas };
  });
}

/** DELETE /api/simulador?telefono=... → reinicia la conversación de prueba. */
export function DELETE(req: Request) {
  const telefono = new URL(req.url).searchParams.get("telefono");
  return manejar(() => contenedor().deps.conversaciones.eliminar(requerido(telefono, "el teléfono")));
}
