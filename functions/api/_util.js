// Utilidades compartidas por las funciones de la API

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// Comparación de textos en tiempo constante (evita adivinar la clave por tiempos de respuesta)
function igualesSeguro(a, b) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}

// Devuelve null si la clave es correcta, o una Response de error si no
export function verificarAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json({ error: "Falta configurar ADMIN_PASSWORD en Cloudflare." }, 500);
  }
  const clave = request.headers.get("X-Admin-Password") || "";
  if (!igualesSeguro(clave, env.ADMIN_PASSWORD)) {
    return json({ error: "Clave incorrecta." }, 401);
  }
  return null;
}

export const TALLAS = ["S", "M", "L", "XL", "2XL"];

// Lee todos los participantes del KV, ordenados por fecha de registro
export async function listarParticipantes(env) {
  const lista = [];
  let cursor;
  do {
    const res = await env.PARTICIPANTES.list({ prefix: "p:", cursor });
    for (const k of res.keys) {
      if (k.metadata) {
        lista.push(k.metadata);
      } else {
        const v = await env.PARTICIPANTES.get(k.name, "json");
        if (v) lista.push(v);
      }
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  lista.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return lista;
}

// Llave del KV donde se guarda la asignación de puestos
export const LLAVE_ASIGNACION = "asignacion";
