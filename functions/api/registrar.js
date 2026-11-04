import { json, TALLAS } from "./_util.js";

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

  const cedula = String(body.cedula ?? "").trim();
  const nombre = String(body.nombre ?? "").replace(/\s+/g, " ").trim();
  const talla = String(body.talla ?? "").trim();
  const tallaOtra = String(body.tallaOtra ?? "").replace(/\s+/g, " ").trim();
  const telefono = String(body.telefono ?? "").replace(/[\s-]/g, "");

  if (!/^\d{7,15}$/.test(cedula)) {
    return json({ error: "La cédula debe contener solo números (sin guiones ni espacios)." }, 400);
  }
  if (nombre.length < 5 || nombre.length > 100) {
    return json({ error: "Escribí el nombre completo." }, 400);
  }
  if (!TALLAS.includes(talla)) {
    return json({ error: "Seleccioná una talla de camiseta." }, 400);
  }
  if (talla === "Otra" && (tallaOtra.length < 1 || tallaOtra.length > 30)) {
    return json({ error: "Indicá cuál es la talla (máximo 30 caracteres)." }, 400);
  }
  if (!/^\+?\d{8,15}$/.test(telefono)) {
    return json({ error: "El teléfono debe tener solo números (8 dígitos en Costa Rica)." }, 400);
  }

  const key = `p:${cedula}`;
  const existente = await env.PARTICIPANTES.get(key);
  if (existente !== null) {
    return json({ error: "Esta cédula ya está registrada." }, 409);
  }

  const registro = {
    cedula,
    nombre,
    talla,
    tallaOtra: talla === "Otra" ? tallaOtra : "",
    telefono,
    fecha: new Date().toISOString(),
  };

  // Se guarda también como metadata para poder listar sin leer cada llave
  await env.PARTICIPANTES.put(key, JSON.stringify(registro), { metadata: registro });

  return json({ ok: true });
}
