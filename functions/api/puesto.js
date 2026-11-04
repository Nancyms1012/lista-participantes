import { json, LLAVE_ASIGNACION } from "./_util.js";

// GET /api/puesto?cedula=123456789  (público)
// Devuelve solo el puesto y el primer nombre, para no exponer datos personales.
export async function onRequestGet({ request, env }) {
  if (!env.PARTICIPANTES) {
    return json({ error: "Servicio no disponible." }, 500);
  }

  const cedula = (new URL(request.url).searchParams.get("cedula") || "").trim();
  if (!/^\d{7,15}$/.test(cedula)) {
    return json({ error: "Escribí tu cédula usando solo números." }, 400);
  }

  const participante = await env.PARTICIPANTES.get(`p:${cedula}`, "json");
  if (!participante) {
    return json({ estado: "no-inscrito" });
  }

  const asignacion = await env.PARTICIPANTES.get(LLAVE_ASIGNACION, "json");
  const puesto = asignacion && asignacion.mapa ? asignacion.mapa[cedula] : undefined;
  const primerNombre = participante.nombre.split(" ")[0];

  if (!puesto) {
    return json({ estado: "sin-puesto", nombre: primerNombre });
  }
  return json({ estado: "asignado", nombre: primerNombre, puesto });
}
