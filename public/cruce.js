// Cruce entre participantes inscritos y datos de pago enviados.
// Los datos de pago no llevan cédula, así que se comparan por NOMBRE:
//   "si"      -> mismas palabras (sin importar tildes, mayúsculas ni el orden)
//   "posible" -> uno de los nombres está contenido en el otro (mínimo 2 palabras en común),
//                por ejemplo "María Peña" y "María José Peña Mora". Hay que revisarlo a mano.
(function (global) {
  const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e"]);

  function palabras(nombre) {
    return String(nombre || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !PARTICULAS.has(t));
  }

  // Compara dos conjuntos de palabras. Devuelve "si", "posible" o null.
  function comparar(a, b) {
    if (!a.size || !b.size) return null;
    let comunes = 0;
    for (const t of a) if (b.has(t)) comunes++;
    if (comunes === a.size && comunes === b.size) return "si";
    if (comunes >= 2 && comunes === Math.min(a.size, b.size)) return "posible";
    return null;
  }

  // participantes: [{cedula, nombre}], pagos: [{id, nombre, metodo}]
  // Devuelve:
  //   porCedula[cedula] = { estado: "si" | "posible", pagos: [pago, ...] }   (solo si hay coincidencia)
  //   porPago[id]       = { estado: "si" | "posible", participantes: [participante, ...] }
  function cruzar(participantes, pagos) {
    const porCedula = {};
    const porPago = {};
    const conjuntosPag = pagos.map((p) => new Set(palabras(p.nombre)));

    participantes.forEach((par) => {
      const a = new Set(palabras(par.nombre));
      const exactos = [];
      const posibles = [];
      pagos.forEach((pg, i) => {
        const r = comparar(a, conjuntosPag[i]);
        if (r === "si") exactos.push(pg);
        else if (r === "posible") posibles.push(pg);
      });
      if (exactos.length) {
        porCedula[par.cedula] = { estado: "si", pagos: exactos };
        exactos.forEach((pg) => {
          (porPago[pg.id] = porPago[pg.id] || { estado: "si", participantes: [] }).participantes.push(par);
        });
      } else if (posibles.length) {
        porCedula[par.cedula] = { estado: "posible", pagos: posibles };
        posibles.forEach((pg) => {
          const e = porPago[pg.id];
          if (!e) porPago[pg.id] = { estado: "posible", participantes: [par] };
          else if (e.estado === "posible") e.participantes.push(par);
        });
      }
    });
    return { porCedula, porPago };
  }

  global.cruzarPagos = cruzar;
  if (typeof module !== "undefined" && module.exports) module.exports = { cruzar, palabras, comparar };
})(typeof window !== "undefined" ? window : globalThis);
