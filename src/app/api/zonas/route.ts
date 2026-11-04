import type { DatosZona } from "@/application/zonas";
import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar } from "../_util";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const sede = new URL(req.url).searchParams.get("sede") ?? undefined;
  return manejar(() => contenedor().zonas.listar(sede));
}

// POST /api/zonas → HU24
export function POST(req: Request) {
  return manejar(async () => contenedor().zonas.crear(await cuerpo<DatosZona>(req)));
}
