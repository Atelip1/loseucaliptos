import { contenedor } from "@/infrastructure/contenedor";
import { manejar, requerido } from "../../_util";

export const dynamic = "force-dynamic";

// GET /api/caja/cierre?sede=...&fecha=AAAA-MM-DD → cierre de caja diario (RF22)
export function GET(req: Request) {
  const url = new URL(req.url);
  return manejar(() =>
    contenedor().pedidos.cierreDeCaja(requerido(url.searchParams.get("sede"), "la sede"), url.searchParams.get("fecha") || undefined),
  );
}
