import { contenedor } from "@/infrastructure/contenedor";
import { manejar } from "../_util";

export const dynamic = "force-dynamic";

export function GET() {
  return manejar(async () => {
    const k = contenedor();
    return { sedes: await k.deps.carta.listarSedes(), modoIA: k.modoIA, modoWhatsApp: k.modoWhatsApp };
  });
}
