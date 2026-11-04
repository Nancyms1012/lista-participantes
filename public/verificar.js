(function () {
  const form = document.getElementById("form");
  const cedula = document.getElementById("cedula");
  const btn = document.getElementById("verificar");
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
    btn.textContent = "Verificando…";
    try {
      const res = await fetch("/api/verificar?cedula=" + encodeURIComponent(ced));
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return mostrar(esc(d.error || "No se pudo verificar. Intentá de nuevo."), "error");

      if (d.estado === "inscrito") {
        mostrar(
          `<div class="puesto-resultado">✅ ¡Estás inscrito/a!<div class="nombre-verificado">${esc(d.nombre)}</div>` +
            `<small>Si tu nombre tiene algún error, avisale a la organización.</small></div>`,
          "ok"
        );
      } else {
        mostrar("Esta cédula no aparece en la lista de inscritos. Verificá el número o registrate en la página de inscripción.", "error");
      }
    } catch {
      mostrar("Sin conexión. Revisá tu internet e intentá de nuevo.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Verificar";
    }
  });
})();
