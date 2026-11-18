import type { LineaCarrito } from "@/application/puertos";
import { ErrorDeDominio } from "@/domain/dinero";
import type { Modalidad } from "@/domain/tipos";
import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar, requerido } from "../_util";

export const dynamic = "force-dynamic";

// GET /api/pedidos?sede=...&vista=cocina|caja|delivery|dia  (consultas CQRS por pantalla)
export function GET(req: Request) {
  const url = new URL(req.url);
  return manejar(async () => {
    const k = contenedor();
    // Pedidos de un cliente (contexto del pedido en el panel de atención)
    const telefono = url.searchParams.get("telefono");
    if (telefono) {
      const lista = await k.deps.pedidos.listar({ clienteTelefono: telefono });
      return { pedidos: lista.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).slice(0, 10) };
    }
    const sede = requerido(url.searchParams.get("sede"), "la sede");
    const vista = url.searchParams.get("vista") ?? "dia";
    const config = await k.deps.configuracion.obtener();
    let pedidos;
    let cancelados: Awaited<ReturnType<typeof k.pedidos.canceladosRecientes>> = [];
    if (vista === "cocina") {
      pedidos = await k.pedidos.pendientesCocina(sede);
      cancelados = await k.pedidos.canceladosRecientes(sede);
    }
    else if (vista === "caja") pedidos = await k.pedidos.pendientesDeCobro(sede);
    else if (vista === "delivery") pedidos = await k.pedidos.deliveryActivos(sede);
    else pedidos = (await k.pedidos.delDia(sede, url.searchParams.get("fecha") ?? undefined)).reverse();
    return { pedidos, cancelados, ahora: k.deps.reloj.ahora().toISOString(), tiempoObjetivoMin: config.tiempoObjetivoCocinaMin };
  });
}

// POST /api/pedidos → el mozo registra un pedido de mesa (HU09) o para llevar en el local
export function POST(req: Request) {
  return manejar(async () => {
    const b = await cuerpo<{
      sedeId: string;
      mesa?: string;
      modalidad?: Modalidad;
      clienteNombre?: string;
      lineas: LineaCarrito[];
      usuario?: string;
    }>(req);
    const modalidad = b.modalidad === "PARA_LLEVAR" ? "PARA_LLEVAR" : "EN_LOCAL";
    if (modalidad === "EN_LOCAL" && !b.mesa?.trim()) throw new ErrorDeDominio("Indique el número de mesa.");
    if (!Array.isArray(b.lineas)) throw new ErrorDeDominio("Faltan los platos.");
    return contenedor().pedidos.registrar({
      sedeId: requerido(b.sedeId, "la sede"),
      canal: "PRESENCIAL",
      modalidad,
      mesa: modalidad === "EN_LOCAL" ? b.mesa!.trim() : undefined,
      clienteNombre: b.clienteNombre?.trim() || undefined,
      lineas: b.lineas.map((l) => ({ platoId: String(l.platoId), cantidad: Number(l.cantidad), observacion: l.observacion })),
      usuario: b.usuario?.trim() || "mozo",
    });
  });
}
