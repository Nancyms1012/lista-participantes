(function () {
  const $ = (id) => document.getElementById(id);
  let clave = sessionStorage.getItem("adminClave") || "";
  let datos = [];
  let asignacion = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const fechaTexto = (iso) =>
    new Date(iso).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Costa_Rica" });

  const puestoDe = (p) => (asignacion && asignacion.mapa && asignacion.mapa[p.cedula]) || "";

  async function api(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { "X-Admin-Password": clave, ...(opts.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Error"), { status: res.status });
    return data;
  }

  async function cargar() {
    const data = await api("/api/participantes");
    datos = data.participantes;
    asignacion = data.asignacion || null;
    $("login-box").classList.add("oculto");
    $("panel").classList.remove("oculto");
    pintar();
  }

  function pintarPuestos() {
    const sel = $("filtro-puesto");
    const actual = sel.value;
    const cuenta = {};
    let sinPuesto = 0;
    datos.forEach((p) => {
      const n = puestoDe(p);
      if (n) cuenta[n] = (cuenta[n] || 0) + 1;
      else sinPuesto++;
    });
    const nums = Object.keys(cuenta).map(Number).sort((a, b) => a - b);

    let opts = '<option value="">Todos los puestos</option>';
    nums.forEach((n) => (opts += `<option value="${n}">Puesto ${n}</option>`));
    if (nums.length && sinPuesto) opts += '<option value="sin">Sin puesto</option>';
    sel.innerHTML = opts;
    sel.value = [...sel.options].some((o) => o.value === actual) ? actual : "";

    if (!asignacion) {
      $("grupos-estado").textContent = "Todavía no se han creado los grupos.";
      $("resumen-puestos").innerHTML = "";
      return;
    }
    $("grupos-estado").textContent =
      `Grupos creados el ${fechaTexto(asignacion.fecha)}: ${asignacion.puestos} puesto${asignacion.puestos === 1 ? "" : "s"} ` +
      `de ${asignacion.tamano} (${asignacion.modo === "aleatorio" ? "al azar" : "por orden de inscripción"}).` +
      (sinPuesto ? ` ${sinPuesto} inscrito${sinPuesto === 1 ? "" : "s"} nuevo${sinPuesto === 1 ? "" : "s"} sin puesto: volvé a crear los grupos.` : "");
    $("resumen-puestos").innerHTML = nums.map((n) => `<span class="chip puesto">Puesto ${n}: <b>${cuenta[n]}</b></span>`).join("");
  }

  function pintar() {
    pintarPuestos(); // primero, para que el filtro de puesto esté al día
    const q = $("buscar").value.trim().toLowerCase();
    const fp = $("filtro-puesto").value;
    const filtrados = datos.filter(
      (p) =>
        (!q || p.cedula.includes(q) || p.nombre.toLowerCase().includes(q) || p.telefono.includes(q)) &&
        (!fp || (fp === "sin" ? !puestoDe(p) : String(puestoDe(p)) === fp))
    );

    $("total").textContent = "";
    $("total-num").textContent = datos.length;
    $("total-label").textContent = datos.length === 1 ? "persona registrada" : "personas registradas";
    if (filtrados.length !== datos.length) $("total-label").textContent += ` (mostrando ${filtrados.length})`;

    // Resumen de tallas (para saber cuántas camisetas pedir)
    const cuenta = {};
    datos.forEach((p) => {
      cuenta[p.talla] = (cuenta[p.talla] || 0) + 1;
    });
    const orden = ["S", "M", "L", "XL", "2XL"];
    const claves = Object.keys(cuenta).sort((a, b) => {
      const ia = orden.indexOf(a), ib = orden.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b);
    });
    $("resumen").innerHTML = claves.map((k) => `<span class="chip">${esc(k)}: <b>${cuenta[k]}</b></span>`).join("");

    $("cuerpo").innerHTML = filtrados
      .map(
        (p, i) => `<tr>
          <td>${i + 1}</td>
          <td>${esc(p.cedula)}</td>
          <td>${esc(p.nombre)}</td>
          <td>${esc(p.telefono)}</td>
          <td>${esc(p.talla)}</td>
          <td>${esc(puestoDe(p) || "—")}</td>
          <td>${esc(fechaTexto(p.fecha))}</td>
          <td><button class="peligro" data-del="${esc(p.cedula)}">Eliminar</button></td>
        </tr>`
      )
      .join("");
  }

  // CSV con ; y BOM para que Excel (español) lo abra con tildes y en columnas
  function celdaCsv(v) {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita fórmulas en Excel
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function descargarCsv() {
    const filas = [["Cédula", "Nombre completo", "Teléfono", "Talla", "Puesto", "Fecha de registro"]];
    const base = asignacion
      ? [...datos].sort((a, b) => (puestoDe(a) || 9999) - (puestoDe(b) || 9999))
      : datos;
    base.forEach((p) => filas.push([p.cedula, p.nombre, p.telefono, p.talla, puestoDe(p), fechaTexto(p.fecha)]));
    const csv = "\uFEFF" + filas.map((f) => f.map(celdaCsv).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `participantes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  $("login").addEventListener("submit", async (e) => {
    e.preventDefault();
    clave = $("clave").value;
    try {
      await cargar();
      sessionStorage.setItem("adminClave", clave);
    } catch (err) {
      $("login-msg").textContent = err.message;
      $("login-msg").classList.remove("oculto");
    }
  });

  $("buscar").addEventListener("input", pintar);
  $("filtro-puesto").addEventListener("change", pintar);
  $("crear-grupos").addEventListener("click", async () => {
    const tamano = parseInt($("tamano").value, 10);
    if (!tamano || tamano < 1) return alert("Escribí cuántas personas van por puesto.");
    const puestos = Math.ceil(datos.length / tamano);
    const aviso = asignacion ? "\n\nEsto REEMPLAZA la asignación anterior y los puestos pueden cambiar." : "";
    if (!confirm(`Se crearán ${puestos} puesto(s) de hasta ${tamano} personas con ${datos.length} inscritos.${aviso}\n\n¿Continuar?`)) return;
    try {
      await api("/api/asignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tamano, modo: $("modo").value }),
      });
      await cargar();
    } catch (err) {
      alert(err.message);
    }
  });
  $("borrar-grupos").addEventListener("click", async () => {
    if (!asignacion) return alert("No hay asignación que borrar.");
    if (!confirm("¿Borrar la asignación? Las personas ya no verán su puesto en la consulta.")) return;
    try {
      await api("/api/asignar", { method: "DELETE" });
      await cargar();
    } catch (err) {
      alert(err.message);
    }
  });
  $("csv").addEventListener("click", descargarCsv);
  $("refrescar").addEventListener("click", () => cargar().catch((e) => alert(e.message)));
  $("salir").addEventListener("click", () => {
    sessionStorage.removeItem("adminClave");
    location.reload();
  });
  $("cuerpo").addEventListener("click", async (e) => {
    const ced = e.target.dataset && e.target.dataset.del;
    if (!ced) return;
    if (!confirm(`¿Eliminar el registro de la cédula ${ced}?`)) return;
    try {
      await api(`/api/participantes?cedula=${encodeURIComponent(ced)}`, { method: "DELETE" });
      await cargar();
    } catch (err) {
      alert(err.message);
    }
  });

  if (clave) cargar().catch(() => sessionStorage.removeItem("adminClave"));
})();
