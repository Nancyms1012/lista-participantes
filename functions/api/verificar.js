import { json } from "./_util.js";

// GET /api/verificar?cedula=123456789  (público)
// Confirma si una cédula está inscrita y devuelve SOLO el nombre.
// Nunca devuelve cédula, teléfono ni talla.
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
  return json({ estado: "inscrito", nombre: participante.nombre });
}
