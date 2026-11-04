(function () {
  const form = document.getElementById("form");
  const exito = document.getElementById("exito");
  const msg = document.getElementById("mensaje");
  const btn = document.getElementById("enviar");
  const talla = document.getElementById("talla");
  const otraWrap = document.getElementById("otra-wrap");
  const otra = document.getElementById("tallaOtra");
  const cedula = document.getElementById("cedula");
  const telefono = document.getElementById("telefono");

  function mostrar(texto, tipo) {
    msg.textContent = texto;
    msg.className = "mensaje " + tipo;
  }
  function ocultarMsg() {
    msg.className = "mensaje oculto";
  }

  // Solo números en cédula y teléfono
  cedula.addEventListener("input", () => {
    cedula.value = cedula.value.replace(/\D/g, "");
  });
  telefono.addEventListener("input", () => {
    telefono.value = telefono.value.replace(/[^\d+]/g, "");
  });

  // Campo extra cuando la talla es "Otra"
  talla.addEventListener("change", () => {
    const esOtra = talla.value === "Otra";
    otraWrap.classList.toggle("oculto", !esOtra);
    if (esOtra) otra.focus();
    else otra.value = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMsg();

    const datos = {
      cedula: cedula.value.trim(),
      nombre: document.getElementById("nombre").value.trim(),
      telefono: telefono.value.trim(),
      talla: talla.value,
      tallaOtra: otra.value.trim(),
    };

    if (!/^\d{7,15}$/.test(datos.cedula)) return mostrar("La cédula debe contener solo números.", "error");
    if (datos.nombre.length < 5) return mostrar("Escribí tu nombre completo.", "error");
    if (!/^\+?\d{8,15}$/.test(datos.telefono)) return mostrar("Escribí un teléfono válido (solo números).", "error");
    if (!datos.talla) return mostrar("Seleccioná una talla de camiseta.", "error");
    if (datos.talla === "Otra" && !datos.tallaOtra) return mostrar("Escribí cuál es la talla.", "error");

    btn.disabled = true;
    btn.textContent = "Enviando…";
    try {
      const res = await fetch("/api/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        mostrar(data.error || "No se pudo guardar. Intentá de nuevo.", "error");
        return;
      }
      form.classList.add("oculto");
      exito.classList.remove("oculto");
    } catch {
      mostrar("Sin conexión. Revisá tu internet e intentá de nuevo.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Registrarme";
    }
  });

  document.getElementById("otro").addEventListener("click", () => {
    form.reset();
    otraWrap.classList.add("oculto");
    exito.classList.add("oculto");
    form.classList.remove("oculto");
    ocultarMsg();
    cedula.focus();
  });
})();
