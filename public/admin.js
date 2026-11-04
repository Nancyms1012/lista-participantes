(function () {
  const $ = (id) => document.getElementById(id);
  let clave = sessionStorage.getItem("adminClave") || "";
  let datos = [];
  let asignacion = null;
  let editando = null; // cédula de la fila que se está editando
  const TALLAS = ["S", "M", "L", "XL", "2XL"];
  const REGEX_NOMBRE = /^\p{L}+(?:[ '’-]+\p{L}+)*$/u;

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
    if (editando && !datos.some((p) => p.cedula === editando)) editando = null;
    $("login-box").classList.add("oculto");
    $("panel").classList.remove("oculto");
    pintar();
  }

  // Pestaña "Puestos": configuración, resumen y tabla de asignación manual
  function pintarPuestos() {
    const sel = $("filtro-puesto");
    const actual = sel.value;
    const total = asignacion ? asignacion.puestos || 0 : 0;
    const cuenta = {};
    let sinPuesto = 0;
    datos.forEach((p) => {
      const n = puestoDe(p);
      if (n) cuenta[n] = (cuenta[n] || 0) + 1;
      else sinPuesto++;
    });

    let opts = '<option value="">Todos</option>';
    for (let n = 1; n <= total; n++) opts += `<option value="${n}">Puesto ${n}</option>`;
    if (total) opts += '<option value="sin">Sin puesto</option>';
    sel.innerHTML = opts;
    sel.value = [...sel.options].some((o) => o.value === actual) ? actual : "";

    if (!total) {
      $("grupos-estado").textContent = "Todavía no se han creado los puestos. Indicá la cantidad y tocá «Guardar puestos».";
      $("resumen-puestos").innerHTML = "";
    } else {
      if (document.activeElement !== $("num-puestos")) $("num-puestos").value = total;
      if (asignacion.tamano && document.activeElement !== $("tamano")) $("tamano").value = asignacion.tamano;

      const cap = asignacion.tamano || 0;
      const excedidos = Object.keys(cuenta).filter((n) => cap && cuenta[n] > cap);
      $("grupos-estado").textContent =
        `${total} puesto${total === 1 ? "" : "s"}` + (cap ? ` de hasta ${cap} personas` : "") + ". " +
        (sinPuesto ? `${sinPuesto} persona${sinPuesto === 1 ? "" : "s"} sin puesto.` : "Todas las personas tienen puesto.") +
        (excedidos.length ? ` ⚠ Puesto${excedidos.length === 1 ? "" : "s"} con más de ${cap}: ${excedidos.join(", ")}.` : "");

      let chips = "";
      for (let n = 1; n <= total; n++) {
        const c = cuenta[n] || 0;
        const clase = cap && c > cap ? "chip puesto excede" : "chip puesto";
        chips += `<span class="${clase}">Puesto ${n}: <b>${c}</b>${cap ? " / " + cap : ""}</span>`;
      }
      $("resumen-puestos").innerHTML = chips;
    }

    // Tabla de asignación manual
    const q = $("buscar-puestos").value.trim().toLowerCase();
    const fp = sel.value;
    const filas = datos.filter(
      (p) =>
        (!q || p.cedula.includes(q) || p.nombre.toLowerCase().includes(q)) &&
        (!fp || (fp === "sin" ? !puestoDe(p) : String(puestoDe(p)) === fp))
    );
    $("cuerpo-puestos").innerHTML = total
      ? filas
          .map((p, i) => `<tr><td>${i + 1}</td><td class="nw">${esc(p.cedula)}</td><td>${esc(p.nombre)}</td><td>${selectorPuesto(p)}</td></tr>`)
          .join("")
      : '<tr><td colspan="4">Creá los puestos para poder asignar personas.</td></tr>';
  }

  // Selector de puesto para una fila
  function selectorPuesto(p) {
    const total = asignacion ? asignacion.puestos || 0 : 0;
    if (!total) return "—";
    const actual = puestoDe(p);
    let o = `<option value=""${actual ? "" : " selected"}>—</option>`;
    for (let n = 1; n <= total; n++) o += `<option value="${n}"${n === actual ? " selected" : ""}>${n}</option>`;
    return `<select class="sel-puesto" data-puesto-de="${esc(p.cedula)}" aria-label="Puesto de ${esc(p.nombre)}">${o}</select>`;
  }

  function pintar() {
    pintarPuestos();
    const q = $("buscar").value.trim().toLowerCase();
    const filtrados = datos.filter(
      (p) => !q || p.cedula.includes(q) || p.nombre.toLowerCase().includes(q) || p.telefono.includes(q)
    );

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
      .map((p, i) => {
        if (p.cedula === editando) {
          const opts = TALLAS.map((t) => `<option${t === p.talla ? " selected" : ""}>${t}</option>`).join("");
          return `<tr class="editando">
            <td data-label="#">${i + 1}</td>
            <td data-label="Cédula"><input class="ed" id="ed-cedula" inputmode="numeric" value="${esc(p.cedula)}"></td>
            <td data-label="Nombre"><input class="ed" id="ed-nombre" value="${esc(p.nombre)}"></td>
            <td data-label="Teléfono"><input class="ed" id="ed-telefono" inputmode="numeric" value="${esc(p.telefono)}"></td>
            <td data-label="Talla"><select class="ed" id="ed-talla">${opts}</select></td>
            <td data-label="Puesto">${esc(puestoDe(p) || "—")}</td>
            <td data-label="Fecha">${esc(fechaTexto(p.fecha))}</td>
            <td class="acciones">
              <button data-guardar="${esc(p.cedula)}">Guardar</button>
              <button class="secundario" data-cancelar="1">Cancelar</button>
            </td>
          </tr>`;
        }
        const nombreMalo = !REGEX_NOMBRE.test(p.nombre);
        return `<tr>
          <td data-label="#">${i + 1}</td>
          <td data-label="Cédula" class="nw">${esc(p.cedula)}</td>
          <td data-label="Nombre"${nombreMalo ? ' class="aviso" title="El nombre tiene caracteres que no son letras"' : ""}>${esc(p.nombre)}${nombreMalo ? " ⚠" : ""}</td>
          <td data-label="Teléfono" class="nw">${esc(p.telefono)}</td>
          <td data-label="Talla">${esc(p.talla)}</td>
          <td data-label="Puesto">${esc(puestoDe(p) || "—")}</td>
          <td data-label="Fecha">${esc(fechaTexto(p.fecha))}</td>
          <td class="acciones">
            <button class="secundario" data-edit="${esc(p.cedula)}">Editar</button>
            <button class="peligro" data-del="${esc(p.cedula)}">Eliminar</button>
          </td>
        </tr>`;
      })
      .join("");
  }

  // ---- Exportación ----
  const ENCABEZADO = ["Cédula", "Nombre completo", "Teléfono", "Talla", "Puesto", "Fecha de registro"];

  // Fecha sin coma para que no rompa las columnas del CSV: "3/11/26 4:01 a. m."
  const fechaExport = (iso) => fechaTexto(iso).replace(", ", " ");

  // Filas para exportar (con el mismo contenido en Excel y CSV). Si hay puestos, ordenadas por puesto.
  function filasExportar() {
    const base = asignacion && asignacion.puestos
      ? [...datos].sort((a, b) => (puestoDe(a) || 9999) - (puestoDe(b) || 9999))
      : datos;
    return base.map((p) => [p.cedula, p.nombre, p.telefono, p.talla, puestoDe(p) || "", fechaExport(p.fecha)]);
  }

  function descargarArchivo(contenido, tipo, nombre) {
    const blob = new Blob([contenido], { type: tipo });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const hoy = () => new Date().toISOString().slice(0, 10);

  // Excel real (.xlsx): se abre igual en cualquier computadora, sin importar el separador regional
  function descargarXlsx() {
    try {
      if (typeof window.crearXlsx !== "function") {
        return alert("No se cargó el generador de Excel. Recargá la página con Ctrl+Shift+R e intentá de nuevo.");
      }
      const filas = [ENCABEZADO, ...filasExportar().map((f) => [f[0], f[1], f[2], f[3], f[4] === "" ? "" : Number(f[4]), f[5]])];
      const bytes = window.crearXlsx({ hoja: "Participantes", anchos: [14, 36, 14, 8, 8, 20], filas });
      descargarArchivo(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `participantes-${hoy()}.xlsx`);
    } catch (err) {
      alert("No se pudo generar el Excel: " + err.message + "\nProbá con el botón CSV.");
    }
  }

  // CSV separado por comas (formato estándar) con BOM para conservar tildes
  function celdaCsv(v) {
    let s = String(v ?? "");
    if (/^([=@\t\r]|[+\-](?!\d))/.test(s)) s = "'" + s; // evita fórmulas en Excel (sin tocar teléfonos como +506…)
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function descargarCsv() {
    const csv = "\uFEFF" + [ENCABEZADO, ...filasExportar()].map((f) => f.map(celdaCsv).join(",")).join("\r\n");
    descargarArchivo(csv, "text/csv;charset=utf-8", `participantes-${hoy()}.csv`);
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
  $("buscar-puestos").addEventListener("input", pintar);
  $("filtro-puesto").addEventListener("change", pintar);
  $("guardar-puestos").addEventListener("click", async () => {
    const puestos = parseInt($("num-puestos").value, 10);
    const tamano = parseInt($("tamano").value, 10);
    if (!puestos || puestos < 1) return alert("Escribí la cantidad de puestos.");
    if (!tamano || tamano < 1) return alert("Escribí cuántas personas van por puesto.");
    try {
      await api("/api/asignar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puestos, tamano }),
      });
      await cargar();
    } catch (err) {
      alert(err.message);
    }
  });
  // Asignación manual: al cambiar el selector de una fila se guarda en el momento
  $("cuerpo-puestos").addEventListener("change", async (e) => {
    const ced = e.target.dataset && e.target.dataset.puestoDe;
    if (!ced) return;
    const valor = e.target.value;
    e.target.disabled = true;
    try {
      const r = await api("/api/asignar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: ced, puesto: valor === "" ? null : Number(valor) }),
      });
      asignacion = r.asignacion;
      pintar();
    } catch (err) {
      alert(err.message);
      await cargar();
    }
  });
  $("crear-grupos").addEventListener("click", async () => {
    const tamano = parseInt($("tamano").value, 10);
    if (!tamano || tamano < 1) return alert("Escribí cuántas personas van por puesto.");
    const puestos = Math.ceil(datos.length / tamano);
    const aviso = asignacion && Object.keys(asignacion.mapa || {}).length ? "\n\nEsto REEMPLAZA toda la asignación actual, incluida la que hiciste a mano." : "";
    if (!confirm(`Se repartirán ${datos.length} inscritos en ${puestos} puesto(s) de hasta ${tamano} personas.${aviso}\n\n¿Continuar?`)) return;
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
    if (!confirm("¿Borrar TODA la asignación (puestos y personas asignadas)? Las personas ya no verán su puesto en la consulta.")) return;
    try {
      await api("/api/asignar", { method: "DELETE" });
      await cargar();
    } catch (err) {
      alert(err.message);
    }
  });
  $("xlsx").addEventListener("click", descargarXlsx);
  $("csv").addEventListener("click", descargarCsv);
  $("refrescar").addEventListener("click", () => cargar().catch((e) => alert(e.message)));
  $("salir").addEventListener("click", () => {
    sessionStorage.removeItem("adminClave");
    location.reload();
  });
  $("cuerpo").addEventListener("click", async (e) => {
    const d = e.target.dataset || {};

    if (d.edit) {
      editando = d.edit;
      return pintar();
    }
    if (d.cancelar) {
      editando = null;
      return pintar();
    }
    if (d.guardar) {
      const nuevo = {
        original: d.guardar,
        cedula: $("ed-cedula").value.trim(),
        nombre: $("ed-nombre").value.replace(/\s+/g, " ").trim(),
        telefono: $("ed-telefono").value.trim(),
        talla: $("ed-talla").value,
      };
      if (!/^\d{7,15}$/.test(nuevo.cedula)) return alert("La cédula debe contener solo números.");
      if (nuevo.nombre.length < 5 || !REGEX_NOMBRE.test(nuevo.nombre)) return alert("El nombre debe contener solo letras.");
      if (!/^\+?\d{8,15}$/.test(nuevo.telefono.replace(/[\s-]/g, ""))) return alert("El teléfono debe tener solo números.");
      try {
        await api("/api/participantes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevo),
        });
        editando = null;
        await cargar();
      } catch (err) {
        alert(err.message);
      }
      return;
    }
    if (d.del) {
      if (!confirm(`¿Eliminar el registro de la cédula ${d.del}? Esta acción no se puede deshacer.`)) return;
      try {
        await api(`/api/participantes?cedula=${encodeURIComponent(d.del)}`, { method: "DELETE" });
        await cargar();
      } catch (err) {
        alert(err.message);
      }
    }
  });


  // ---- Pestañas ----
  function mostrarTab(nombre) {
    ["participantes", "puestos"].forEach((t) => {
      $("tab-" + t).classList.toggle("oculto", t !== nombre);
      $("btn-tab-" + t).classList.toggle("activa", t === nombre);
    });
    sessionStorage.setItem("adminTab", nombre);
  }
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => mostrarTab(b.dataset.tab)));
  mostrarTab(sessionStorage.getItem("adminTab") === "puestos" ? "puestos" : "participantes");

  if (clave) cargar().catch(() => sessionStorage.removeItem("adminClave"));
})();
