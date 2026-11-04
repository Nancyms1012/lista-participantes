import { json, verificarAdmin, listarParticipantes, LLAVE_ASIGNACION } from "./_util.js";

// GET /api/participantes  -> lista completa (solo admin)
export async function onRequestGet({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;
  if (!env.PARTICIPANTES) {
    return json({ error: "Falta conectar el KV 'PARTICIPANTES' en Cloudflare." }, 500);
  }

  const lista = await listarParticipantes(env);
  const asignacion = await env.PARTICIPANTES.get(LLAVE_ASIGNACION, "json");
  return json({ participantes: lista, asignacion });
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
