import { ErrorDeDominio } from "@/domain/dinero";
import type { EstadoPedido, MedioPago } from "@/domain/tipos";
import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar, requerido, type Params } from "../../_util";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: Params<"id">) {
  const { id } = await params;
  return manejar(async () => {
    const p = await contenedor().pedidos.obtener(id);
    if (!p) throw new ErrorDeDominio("El pedido no existe.");
    return p;
  });
}

type Accion =
  | { accion: "estado"; estado: EstadoPedido; usuario?: string }
  | { accion: "cancelar"; motivo: string; usuario?: string }
  | { accion: "cobro"; medio: MedioPago; comprobanteVerificado?: boolean; usuario?: string }
  | { accion: "repartidor"; repartidor: string; usuario?: string };

// POST /api/pedidos/:id  → comandos: CambiarEstado, CancelarPedido, RegistrarCobro, AsignarRepartidor
export async function POST(req: Request, { params }: Params<"id">) {
  const { id } = await params;
  return manejar(async () => {
    const b = await cuerpo<Accion>(req);
    const k = contenedor().pedidos;
    const usuario = b.usuario?.trim() || "personal";
    switch (b.accion) {
      case "estado":
        return k.cambiarEstado(id, b.estado, usuario);
      case "cancelar":
        return k.cancelar(id, requerido(b.motivo, "el motivo"), usuario);
      case "cobro":
        return k.registrarCobro(id, b.medio, usuario, !!b.comprobanteVerificado);
      case "repartidor":
        return k.asignarRepartidor(id, requerido(b.repartidor, "el repartidor"), usuario);
      default:
        throw new ErrorDeDominio("Acción no válida.");
    }
  });
}
