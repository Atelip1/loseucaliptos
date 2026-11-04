import { contenedor } from "@/infrastructure/contenedor";
import { manejar } from "../_util";

export const dynamic = "force-dynamic";

// GET /api/conversaciones?derivadas=1 → alertas de conversaciones derivadas (RF09)
export function GET(req: Request) {
  const soloDerivadas = new URL(req.url).searchParams.get("derivadas") === "1";
  return manejar(() => contenedor().atencion.conversaciones(soloDerivadas));
}
