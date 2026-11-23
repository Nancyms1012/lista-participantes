(function () {
  const $ = (id) => document.getElementById(id);
  const form = $("form");
  const nombre = $("nombre");
  const metodo = $("metodo");
  const telefono = $("telefono");
  const iban = $("iban");
  const msg = $("mensaje");
  const REGEX_NOMBRE = /^\p{L}+(?:[ '’-]+\p{L}+)*$/u;

  const mostrar = (t, tipo) => {
    msg.textContent = t;
    msg.className = "mensaje " + tipo;
  };

  nombre.addEventListener("input", () => (nombre.value = nombre.value.replace(/[^\p{L}\s'’-]/gu, "")));
  telefono.addEventListener("input", () => (telefono.value = telefono.value.replace(/[^\d+\s-]/g, "")));
  iban.addEventListener("input", () => (iban.value = iban.value.replace(/[^a-zA-Z0-9\s]/g, "").toUpperCase()));

  metodo.addEventListener("change", () => {
    $("bloque-sinpe").classList.toggle("oculto", metodo.value !== "sinpe");
    $("bloque-iban").classList.toggle("oculto", metodo.value !== "iban");
    msg.className = "mensaje oculto";
    if (metodo.value === "sinpe") telefono.focus();
    if (metodo.value === "iban") iban.focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "mensaje oculto";

    const nom = nombre.value.replace(/\s+/g, " ").trim();
    if (nom.length < 5 || !REGEX_NOMBRE.test(nom)) return mostrar("Escribí tu nombre completo, solo con letras.", "error");
    if (!metodo.value) return mostrar("Elegí cómo querés recibir el pago.", "error");

    let valor;
    if (metodo.value === "sinpe") {
      valor = telefono.value.replace(/[\s-]/g, "").replace(/^\+?506/, "");
      if (!/^\d{8}$/.test(valor)) return mostrar("El número de SINPE Móvil debe tener 8 dígitos.", "error");
    } else {
      valor = iban.value.replace(/\s/g, "");
      if (!/^CR\d{20}$/.test(valor)) return mostrar("El IBAN debe empezar con CR seguido de 20 números (22 caracteres en total).", "error");
    }

    $("enviar").disabled = true;
    $("enviar").textContent = "Enviando…";
    try {
      const res = await fetch("/api/pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nom, metodo: metodo.value, valor, web: $("web").value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return mostrar(d.error || "No se pudo guardar. Intentá de nuevo.", "error");
      form.classList.add("oculto");
      $("exito").classList.remove("oculto");
    } catch {
      mostrar("Sin conexión. Revisá tu internet e intentá de nuevo.", "error");
    } finally {
      $("enviar").disabled = false;
      $("enviar").textContent = "Enviar mis datos";
    }
  });
})();
