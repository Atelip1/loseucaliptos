import { leerImagen } from "@/infrastructure/archivos";
import { contenedor } from "@/infrastructure/contenedor";
import type { Params } from "../../_util";

// GET /api/comprobantes/:pedidoId → imagen del comprobante para que caja lo verifique (RF21)
export async function GET(_req: Request, { params }: Params<"id">) {
  const { id } = await params;
  const pedido = await contenedor().pedidos.obtener(id);
  const img = pedido?.comprobante ? await leerImagen(pedido.comprobante.archivo) : null;
  if (!img) return new Response("Comprobante no encontrado", { status: 404 });
  return new Response(new Uint8Array(img.bytes), { headers: { "Content-Type": img.tipo, "Cache-Control": "private, max-age=300" } });
}
