import type { DatosPlato } from "@/application/carta";
import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar } from "../_util";

export const dynamic = "force-dynamic";

// GET /api/carta?sede=grocio-prado&todos=1  → VerCarta (con disponibilidad por sede)
export function GET(req: Request) {
  const url = new URL(req.url);
  return manejar(async () => {
    const k = contenedor();
    const sedes = await k.deps.carta.listarSedes();
    const platos = await k.carta.verCarta(url.searchParams.get("sede") ?? undefined, url.searchParams.get("todos") === "1");
    const agotados: Record<string, string[]> = {};
    for (const s of sedes) agotados[s.id] = [...(await k.deps.carta.agotados(s.id))];
    return { platos, agotados };
  });
}

// POST /api/carta → registrar plato (HU01)
export function POST(req: Request) {
  return manejar(async () => contenedor().carta.crearPlato(await cuerpo<DatosPlato>(req)));
}
