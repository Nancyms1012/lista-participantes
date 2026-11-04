import { json, verificarAdmin, listarParticipantes, LLAVE_ASIGNACION, validarParticipante } from "./_util.js";

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

// PUT /api/participantes  { original: "cedula actual", cedula, nombre, talla, telefono }
// Edita un registro (solo admin). Si cambia la cédula, también se traslada su puesto.
export async function onRequestPut({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Datos inválidos." }, 400);
  }

  const original = String(body.original ?? "").trim();
  if (!/^\d{7,15}$/.test(original)) return json({ error: "Cédula original inválida." }, 400);

  const v = validarParticipante(body);
  if (v.error) return json({ error: v.error }, 400);
  const { cedula, nombre, talla, telefono } = v.datos;

  const actual = await env.PARTICIPANTES.get(`p:${original}`, "json");
  if (!actual) return json({ error: "El registro ya no existe. Actualizá la lista." }, 404);

  if (cedula !== original && (await env.PARTICIPANTES.get(`p:${cedula}`)) !== null) {
    return json({ error: "Esa cédula ya está registrada en otra persona." }, 409);
  }

  // Se conserva la fecha original de inscripción
  const registro = { cedula, nombre, talla, telefono, fecha: actual.fecha };
  await env.PARTICIPANTES.put(`p:${cedula}`, JSON.stringify(registro), { metadata: registro });

  if (cedula !== original) {
    await env.PARTICIPANTES.delete(`p:${original}`);
    const asig = await env.PARTICIPANTES.get(LLAVE_ASIGNACION, "json");
    if (asig && asig.mapa && asig.mapa[original] !== undefined) {
      asig.mapa[cedula] = asig.mapa[original];
      delete asig.mapa[original];
      await env.PARTICIPANTES.put(LLAVE_ASIGNACION, JSON.stringify(asig));
    }
  }

  return json({ ok: true, registro });
}
