(function () {
  const $ = (id) => document.getElementById(id);
  let clave = sessionStorage.getItem("adminClave") || "";
  let datos = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const tallaTexto = (p) => (p.talla === "Otra" ? `Otra: ${p.tallaOtra}` : p.talla);
  const fechaTexto = (iso) =>
    new Date(iso).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Costa_Rica" });

  async function api(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { "X-Admin-Password": clave, ...(opts.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "Error"), { status: res.status });
    return data;
  }

  async function cargar() {
    const data = await api("/api/participantes");
    datos = data.participantes;
    $("login-box").classList.add("oculto");
    $("panel").classList.remove("oculto");
    pintar();
  }

  function pintar() {
    const q = $("buscar").value.trim().toLowerCase();
    const filtrados = datos.filter(
      (p) => !q || p.cedula.includes(q) || p.nombre.toLowerCase().includes(q) || p.telefono.includes(q)
    );

    $("total").textContent = `${datos.length} participante${datos.length === 1 ? "" : "s"} en total`;

    // Resumen de tallas (para saber cuántas camisetas pedir)
    const cuenta = {};
    datos.forEach((p) => {
      const t = p.talla === "Otra" ? `Otra: ${p.tallaOtra.toUpperCase()}` : p.talla;
      cuenta[t] = (cuenta[t] || 0) + 1;
    });
    const orden = ["XS", "S", "M", "L", "XL", "XXL"];
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
          <td>${esc(tallaTexto(p))}</td>
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
    const filas = [["Cédula", "Nombre completo", "Teléfono", "Talla", "Talla (otra)", "Fecha de registro"]];
    datos.forEach((p) => filas.push([p.cedula, p.nombre, p.telefono, p.talla, p.tallaOtra, fechaTexto(p.fecha)]));
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
