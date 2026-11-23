// Utilidades compartidas por las funciones de la API

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// Comparación de textos en tiempo constante (evita adivinar la clave por tiempos de respuesta)
function igualesSeguro(a, b) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}

// Devuelve null si la clave es correcta, o una Response de error si no
export function verificarAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json({ error: "Falta configurar ADMIN_PASSWORD en Cloudflare." }, 500);
  }
  const clave = request.headers.get("X-Admin-Password") || "";
  if (!igualesSeguro(clave, env.ADMIN_PASSWORD)) {
    return json({ error: "Clave incorrecta." }, 401);
  }
  return null;
}

export const TALLAS = ["S", "M", "L", "XL", "2XL"];

// Lee todos los participantes del KV, ordenados por fecha de registro
export async function listarParticipantes(env) {
  const lista = [];
  let cursor;
  do {
    const res = await env.PARTICIPANTES.list({ prefix: "p:", cursor });
    for (const k of res.keys) {
      if (k.metadata) {
        lista.push(k.metadata);
      } else {
        const v = await env.PARTICIPANTES.get(k.name, "json");
        if (v) lista.push(v);
      }
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  lista.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return lista;
}

// Llave del KV donde se guarda la asignación de puestos
export const LLAVE_ASIGNACION = "asignacion";

// Nombre: solo letras (con tildes y ñ), espacios, guion y apóstrofe entre palabras
export const REGEX_NOMBRE = /^\p{L}+(?:[ '’-]+\p{L}+)*$/u;

// Valida y normaliza los datos de un participante (registro y edición)
// Devuelve { error } o { datos: { cedula, nombre, talla, telefono } }
export function validarParticipante(body) {
  const cedula = String(body.cedula ?? "").trim();
  const nombre = String(body.nombre ?? "").replace(/\s+/g, " ").trim();
  const talla = String(body.talla ?? "").trim();
  const telefono = String(body.telefono ?? "").replace(/[\s-]/g, "");

  if (!/^\d{7,15}$/.test(cedula)) {
    return { error: "La cédula debe contener solo números (sin guiones ni espacios)." };
  }
  if (nombre.length < 5 || nombre.length > 100) {
    return { error: "Escribí el nombre completo." };
  }
  if (!REGEX_NOMBRE.test(nombre)) {
    return { error: "El nombre debe contener solo letras (sin números ni símbolos)." };
  }
  if (!TALLAS.includes(talla)) {
    return { error: "Seleccioná una talla de camiseta." };
  }
  if (!/^\+?\d{8,15}$/.test(telefono)) {
    return { error: "El teléfono debe tener solo números (8 dígitos en Costa Rica)." };
  }
  return { datos: { cedula, nombre, talla, telefono } };
}

// ---------- Datos de pago (SINPE Móvil / cuenta IBAN) ----------

// IBAN válido: CR + 20 dígitos, con dígito verificador mod-97 correcto
export function ibanValido(iban) {
  if (!/^CR\d{20}$/.test(iban)) return false;
  const movido = iban.slice(4) + iban.slice(0, 4);
  const numerico = movido.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let resto = 0;
  for (const d of numerico) resto = (resto * 10 + Number(d)) % 97;
  return resto === 1;
}

// Valida los datos de pago. Devuelve { error } o { datos: { nombre, metodo, valor } }
export function validarPago(body) {
  const nombre = String(body.nombre ?? "").replace(/\s+/g, " ").trim();
  const metodo = String(body.metodo ?? "").trim();

  if (nombre.length < 5 || nombre.length > 100) return { error: "Escribí el nombre completo." };
  if (!REGEX_NOMBRE.test(nombre)) return { error: "El nombre debe contener solo letras (sin números ni símbolos)." };

  if (metodo === "sinpe") {
    let tel = String(body.valor ?? "").replace(/[\s-]/g, "").replace(/^\+?506/, "");
    if (!/^\d{8}$/.test(tel)) return { error: "El número de SINPE Móvil debe tener 8 dígitos." };
    return { datos: { nombre, metodo, valor: tel } };
  }
  if (metodo === "iban") {
    const iban = String(body.valor ?? "").replace(/[\s-]/g, "").toUpperCase();
    if (!/^CR\d{20}$/.test(iban)) return { error: "El IBAN debe empezar con CR seguido de 20 números (22 caracteres en total)." };
    if (!ibanValido(iban)) return { error: "Ese número de IBAN no es válido. Revisá que no tenga un dígito equivocado." };
    return { datos: { nombre, metodo, valor: iban } };
  }
  return { error: "Elegí cómo querés recibir el pago: SINPE Móvil o cuenta IBAN." };
}

// Lee todos los datos de pago, ordenados por fecha
export async function listarPagos(env) {
  const lista = [];
  let cursor;
  do {
    const res = await env.PARTICIPANTES.list({ prefix: "pago:", cursor });
    for (const k of res.keys) {
      if (k.metadata) lista.push(k.metadata);
      else {
        const v = await env.PARTICIPANTES.get(k.name, "json");
        if (v) lista.push(v);
      }
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  lista.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return lista;
}

// Compara nombres sin importar mayúsculas ni tildes
export const normalizarNombre = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
