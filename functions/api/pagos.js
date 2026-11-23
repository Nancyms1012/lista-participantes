import { json, verificarAdmin, listarPagos } from "./_util.js";

// GET /api/pagos  -> lista de datos de pago (solo admin)
export async function onRequestGet({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;
  if (!env.PARTICIPANTES) return json({ error: "Falta conectar el KV 'PARTICIPANTES' en Cloudflare." }, 500);
  return json({ pagos: await listarPagos(env) });
}

// DELETE /api/pagos?id=...  -> elimina un registro (solo admin)
export async function onRequestDelete({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "Identificador inválido." }, 400);
  await env.PARTICIPANTES.delete(`pago:${id}`);
  return json({ ok: true });
}
