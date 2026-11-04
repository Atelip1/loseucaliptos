import { NextResponse } from "next/server";
import { ErrorDeDominio } from "@/domain/dinero";

/** Ejecuta un caso de uso y traduce los errores de dominio a respuestas 400. */
export async function manejar(fn: () => Promise<unknown>) {
  try {
    const r = await fn();
    return NextResponse.json(r ?? { ok: true });
  } catch (e) {
    if (e instanceof ErrorDeDominio) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function cuerpo<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ErrorDeDominio("Cuerpo de la petición no válido.");
  }
}

export function requerido(valor: unknown, nombre: string): string {
  if (typeof valor !== "string" || !valor.trim()) throw new ErrorDeDominio(`Falta ${nombre}.`);
  return valor.trim();
}

export type Params<K extends string> = { params: Promise<Record<K, string>> };
