(function () {
  const form = document.getElementById("form");
  const cedula = document.getElementById("cedula");
  const btn = document.getElementById("consultar");
  const out = document.getElementById("resultado");

  cedula.addEventListener("input", () => {
    cedula.value = cedula.value.replace(/\D/g, "");
  });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function mostrar(html, tipo) {
    out.className = "mensaje " + tipo;
    out.innerHTML = html;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ced = cedula.value.trim();
    if (!/^\d{7,15}$/.test(ced)) return mostrar("Escribí tu cédula usando solo números.", "error");

    btn.disabled = true;
    btn.textContent = "Consultando…";
    try {
      const res = await fetch("/api/puesto?cedula=" + encodeURIComponent(ced));
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return mostrar(esc(d.error || "No se pudo consultar. Intentá de nuevo."), "error");

      if (d.estado === "asignado") {
        mostrar(
          `<div class="puesto-resultado">Hola, ${esc(d.nombre)}. Tu puesto de asistencia es el<div class="puesto-num">${esc(d.puesto)}</div></div>`,
          "ok"
        );
      } else if (d.estado === "sin-puesto") {
        mostrar(`Hola, ${esc(d.nombre)}. Estás inscrito/a, pero todavía no se te ha asignado un puesto. Volvé a consultar más tarde.`, "ok");
      } else {
        mostrar("Esta cédula no aparece en la lista de inscritos. Verificá el número o registrate en la página de inscripción.", "error");
      }
    } catch {
      mostrar("Sin conexión. Revisá tu internet e intentá de nuevo.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Consultar mi puesto";
    }
  });
})();
