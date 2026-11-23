import { json, validarPago, listarPagos, normalizarNombre } from "./_util.js";

// POST /api/pago  { nombre, metodo: "sinpe" | "iban", valor }   (público)
// Guarda los datos de pago de una persona. No devuelve datos de otras personas.
export async function onRequestPost({ request, env }) {
  if (!env.PARTICIPANTES) return json({ error: "Servicio no disponible." }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Datos inválidos." }, 400);
  }

  // Campo trampa para bots: las personas no lo ven ni lo llenan
  if (String(body.web ?? "").trim() !== "") return json({ ok: true });

  const v = validarPago(body);
  if (v.error) return json({ error: v.error }, 400);
  const { nombre, metodo, valor } = v.datos;

  // Evitar duplicados exactos (mismo nombre y mismos datos)
  const existentes = await listarPagos(env);
  const yaEsta = existentes.some(
    (p) => p.metodo === metodo && p.valor === valor && normalizarNombre(p.nombre) === normalizarNombre(nombre)
  );
  if (yaEsta) return json({ error: "Ya recibimos estos datos. No hace falta enviarlos de nuevo." }, 409);

  const id = crypto.randomUUID();
  const registro = { id, nombre, metodo, valor, fecha: new Date().toISOString() };
  await env.PARTICIPANTES.put(`pago:${id}`, JSON.stringify(registro), { metadata: registro });
  return json({ ok: true });
}
