import { json, verificarAdmin } from "./_util.js";

// GET /api/participantes  -> lista completa (solo admin)
export async function onRequestGet({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;
  if (!env.PARTICIPANTES) {
    return json({ error: "Falta conectar el KV 'PARTICIPANTES' en Cloudflare." }, 500);
  }

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
  return json({ participantes: lista });
}

// DELETE /api/participantes?cedula=123  -> elimina un registro (solo admin)
export async function onRequestDelete({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;

  const cedula = new URL(request.url).searchParams.get("cedula") || "";
  if (!/^\d{7,15}$/.test(cedula)) return json({ error: "Cédula inválida." }, 400);

  await env.PARTICIPANTES.delete(`p:${cedula}`);
  return json({ ok: true });
}
