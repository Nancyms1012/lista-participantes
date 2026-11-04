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

async function leerAsignacion(env) {
  const a = await env.PARTICIPANTES.get(LLAVE_ASIGNACION, "json");
  return a && a.mapa ? a : null;
}

// PATCH /api/asignar  { puestos, tamano }
// Crea o ajusta los puestos (cantidad y capacidad) SIN tocar a quién está asignado.
export async function onRequestPatch({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const puestos = Number.parseInt(body.puestos, 10);
  const tamano = Number.parseInt(body.tamano ?? 10, 10);
  if (!Number.isInteger(puestos) || puestos < 1 || puestos > 100) {
    return json({ error: "La cantidad de puestos debe ser un número entre 1 y 100." }, 400);
  }
  if (!Number.isInteger(tamano) || tamano < 1 || tamano > 500) {
    return json({ error: "Las personas por puesto deben ser un número entre 1 y 500." }, 400);
  }

  const actual = await leerAsignacion(env);
  const mapa = actual ? actual.mapa : {};
  const mayor = Math.max(0, ...Object.values(mapa).filter((n) => Number.isInteger(n)));
  if (puestos < mayor) {
    return json({ error: `Hay personas asignadas al puesto ${mayor}. Muévelas antes de reducir a ${puestos} puestos.` }, 409);
  }

  const asignacion = {
    fecha: actual ? actual.fecha : new Date().toISOString(),
    modo: actual ? actual.modo : "manual",
    tamano,
    puestos,
    mapa,
  };
  await env.PARTICIPANTES.put(LLAVE_ASIGNACION, JSON.stringify(asignacion));
  return json({ ok: true, asignacion });
}

// PUT /api/asignar  { cedula, puesto }
// Asigna (o quita) MANUALMENTE el puesto de una persona. puesto = número o null/"" para quitar.
export async function onRequestPut({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const cedula = String(body.cedula ?? "").trim();
  if (!/^\d{7,15}$/.test(cedula)) return json({ error: "Cédula inválida." }, 400);
  if ((await env.PARTICIPANTES.get(`p:${cedula}`)) === null) {
    return json({ error: "Esa cédula no está inscrita." }, 404);
  }

  const asignacion = await leerAsignacion(env);
  if (!asignacion || !asignacion.puestos) {
    return json({ error: "Primero creá los puestos (cantidad de puestos)." }, 409);
  }
  asignacion.modo = "manual";

  const crudo = body.puesto;
  if (crudo === null || crudo === "" || crudo === undefined) {
    delete asignacion.mapa[cedula]; // quitar del puesto
  } else {
    const puesto = Number.parseInt(crudo, 10);
    if (!Number.isInteger(puesto) || puesto < 1 || puesto > asignacion.puestos) {
      return json({ error: `El puesto debe ser un número entre 1 y ${asignacion.puestos}.` }, 400);
    }
    asignacion.mapa[cedula] = puesto;
  }

  await env.PARTICIPANTES.put(LLAVE_ASIGNACION, JSON.stringify(asignacion));
  return json({ ok: true, asignacion });
}

// POST /api/asignar  { tamano, modo: "orden" | "aleatorio" }  (OPCIONAL)
// Reparto automático: divide a los inscritos en grupos. Reemplaza TODA la asignación.
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

// DELETE /api/asignar  -> borra toda la asignación (la consulta pública deja de mostrar puestos)
export async function onRequestDelete({ request, env }) {
  const fallo = verificarAdmin(request, env);
  if (fallo) return fallo;
  await env.PARTICIPANTES.delete(LLAVE_ASIGNACION);
  return json({ ok: true });
}
