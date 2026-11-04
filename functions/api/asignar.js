import { json, verificarAdmin, listarParticipantes, LLAVE_ASIGNACION } from "./_util.js";

// Mezcla una lista con Fisher-Yates usando números aleatorios criptográficos
function mezclar(arr) {
  const a = [...arr];
  const buf = new Uint32Array(1);
  for (let i = a.length - 1; i > 0; i--) {
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// POST /api/asignar  { tamano: 10, modo: "orden" | "aleatorio" }
// Divide a los inscritos en grupos (puestos de asistencia) y guarda la asignación.
export async function onRequestPost({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const tamano = Number.parseInt(body.tamano ?? 10, 10);
  const modo = body.modo === "aleatorio" ? "aleatorio" : "orden";
  if (!Number.isInteger(tamano) || tamano < 1 || tamano > 500) {
    return json({ error: "El tamaño del grupo debe ser un número entre 1 y 500." }, 400);
  }

  let lista = await listarParticipantes(env); // ya viene por orden de inscripción
  if (lista.length === 0) return json({ error: "Todavía no hay inscritos." }, 400);
  if (modo === "aleatorio") lista = mezclar(lista);

  const mapa = {};
  lista.forEach((p, i) => {
    mapa[p.cedula] = Math.floor(i / tamano) + 1;
  });
  const puestos = Math.ceil(lista.length / tamano);

  const asignacion = { fecha: new Date().toISOString(), tamano, modo, puestos, mapa };
  await env.PARTICIPANTES.put(LLAVE_ASIGNACION, JSON.stringify(asignacion));

  return json({ ok: true, asignacion });
}

// DELETE /api/asignar  -> borra la asignación (la consulta pública deja de mostrar puestos)
export async function onRequestDelete({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;
  await env.PARTICIPANTES.delete(LLAVE_ASIGNACION);
  return json({ ok: true });
}
