// Almacenamiento de comprobantes (en producción: Supabase Storage). En local se guardan en data/comprobantes.
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ErrorDeDominio } from "@/domain/dinero";
import { carpetaDatos } from "./contenedor";

const carpeta = () => path.join(carpetaDatos(), "comprobantes");
const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

/** Guarda una imagen recibida como data URL y devuelve su referencia "local:<archivo>". */
export async function guardarImagen(dataUrl: string): Promise<string> {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) throw new ErrorDeDominio("Solo se aceptan imágenes JPG, PNG o WEBP.");
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_BYTES) throw new ErrorDeDominio("La imagen supera los 5 MB.");
  const nombre = `${randomUUID()}.${TIPOS[m[1]]}`;
  await fs.mkdir(carpeta(), { recursive: true });
  await fs.writeFile(path.join(carpeta(), nombre), bytes);
  return `local:${nombre}`;
}

/** Lee un comprobante local o lo descarga de WhatsApp Cloud API ("wa-media:<id>"). */
export async function leerImagen(ref: string): Promise<{ bytes: Buffer; tipo: string } | null> {
  if (ref.startsWith("local:")) {
    const nombre = path.basename(ref.slice(6));
    const ext = nombre.split(".").pop() ?? "";
    const tipo = Object.entries(TIPOS).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
    try {
      return { bytes: await fs.readFile(path.join(carpeta(), nombre)), tipo };
    } catch {
      return null;
    }
  }
  if (ref.startsWith("wa-media:") && process.env.WHATSAPP_TOKEN) {
    const auth = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
    const meta = await fetch(`https://graph.facebook.com/v21.0/${ref.slice(9)}`, { headers: auth });
    if (!meta.ok) return null;
    const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
    const img = await fetch(url, { headers: auth });
    if (!img.ok) return null;
    return { bytes: Buffer.from(await img.arrayBuffer()), tipo: mime_type };
  }
  return null;
}
