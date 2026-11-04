// Utilidades de texto en español peruano: normalización, números en letras y comparación difusa.

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[¿?¡!.;:"'()*_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, docena: 12, quince: 15, veinte: 20,
};

/** Interpreta "2", "dos", "x2", "2x" como cantidad. */
export function leerCantidad(token: string): number | null {
  const t = token.replace(/^x(\d+)$/, "$1").replace(/^(\d+)x$/, "$1");
  if (/^\d{1,3}$/.test(t)) return Number(t);
  return NUMEROS[t] ?? null;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function singular(t: string): string {
  if (t.length > 4 && t.endsWith("es")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s")) return t.slice(0, -1);
  return t;
}

/** Dos palabras se consideran iguales si coinciden en singular o con errores ortográficos leves. */
export function palabrasParecidas(a: string, b: string): boolean {
  if (a === b) return true;
  const sa = singular(a);
  const sb = singular(b);
  if (sa === sb || sa === b || a === sb) return true;
  const largo = Math.min(a.length, b.length);
  if (largo < 4) return false;
  const tolerancia = largo >= 8 ? 2 : 1;
  return levenshtein(sa, sb) <= tolerancia;
}

/** Busca una frase completa (por palabras) dentro de un texto ya normalizado. */
export function contieneFrase(textoNormalizado: string, frase: string): boolean {
  return ` ${textoNormalizado} `.includes(` ${frase} `);
}

export function contieneAlguna(textoNormalizado: string, frases: string[]): boolean {
  return frases.some((f) => contieneFrase(textoNormalizado, f));
}
