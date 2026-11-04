import { json, validarParticipante } from "./_util.js";

// POST /api/registrar  -> guarda un participante
export async function onRequestPost({ request, env }) {
  if (!env.PARTICIPANTES) {
    return json({ error: "Falta conectar el KV 'PARTICIPANTES' en Cloudflare." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Datos inválidos." }, 400);
  }

  const v = validarParticipante(body);
  if (v.error) return json({ error: v.error }, 400);
  const { cedula, nombre, talla, telefono } = v.datos;

  const key = `p:${cedula}`;
  const existente = await env.PARTICIPANTES.get(key);
  if (existente !== null) {
    return json({ error: "Esta cédula ya está registrada." }, 409);
  }

  const registro = {
    cedula,
    nombre,
    talla,
    telefono,
    fecha: new Date().toISOString(),
  };

  // Se guarda también como metadata para poder listar sin leer cada llave
  await env.PARTICIPANTES.put(key, JSON.stringify(registro), { metadata: registro });

  return json({ ok: true });
}
