/*
 * Hilda Gas: recordar datos de entrega en este navegador.
 * No consulta datos de clientes en Google Sheets.
 * Cargar antes del script principal de index.html.
 */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const formulario = $("formPedido");
  const consentimiento = $("consentimiento");

  if (!formulario || !consentimiento) return;

  // Separa el almacenamiento por ruta del sitio.
  const ruta = location.pathname.replace(/\/(?:index\.html)?$/, "");
  const CLAVE = "hildaGas:entrega:v1:" + ruta;

  const CAMPOS = {
    nombre: 60,
    apellido: 60,
    telefono: 20,
    calle: 160,
    colonia: 100,
    municipio: 100,
    entreCalles: 160,
    referencias: 500
  };

  let datosGuardados = null;

  function depurar(datos) {
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
      return null;
    }

    const copia = {};

    for (const [campo, limite] of Object.entries(CAMPOS)) {
      if (typeof datos[campo] !== "string") return null;
      if (datos[campo].length > limite) return null;

      copia[campo] = datos[campo].trim();
    }

    for (const campo of [
      "nombre", "apellido", "telefono", "calle", "colonia", "municipio"
    ]) {
      if (!copia[campo]) return null;
    }

    if (!/^(?:52)?\d{10}$/.test(copia.telefono.replace(/\D/g, ""))) {
      return null;
    }

    return copia;
  }

  function leerDatos() {
    try {
      const contenido = localStorage.getItem(CLAVE);
      if (!contenido) return null;

      const registro = JSON.parse(contenido);
      if (registro.version !== 1) return null;

      return depurar(registro.datos);
    } catch (_) {
      // El formulario sigue funcionando si el navegador bloquea
      // el almacenamiento o si los datos guardados no son válidos.
      return null;
    }
  }

  // Aviso visible también cuando el formulario de entrega está oculto.
  const aviso = document.createElement("div");
  aviso.className = "aviso";
  aviso.hidden = true;
  aviso.setAttribute("aria-live", "polite");

  const saludo = document.createElement("strong");

  const explicacion = document.createElement("p");
  explicacion.className = "ayuda";
  explicacion.textContent =
    "Tus datos de entrega se precargarán al hacer el pedido. " +
    "Revisa la dirección antes de enviarlo.";

  const olvidar = document.createElement("button");
  olvidar.type = "button";
  olvidar.className = "principal cielo";
  olvidar.textContent = "Olvidar mis datos";

  aviso.append(saludo, explicacion, olvidar);

  const introduccion = document.querySelector(".introduccion");
  if (introduccion) {
    introduccion.before(aviso);
  } else {
    formulario.before(aviso);
  }

  // Opción de almacenamiento: no tiene name, por lo que no se envía
  // como un dato adicional a Google Sheets.
  const bloque = document.createElement("div");
  bloque.className = "campo";

  const etiqueta = document.createElement("label");
  etiqueta.className = "check";

  const recordar = document.createElement("input");
  recordar.id = "recordarDatos";
  recordar.type = "checkbox";

  const texto = document.createElement("span");
  texto.textContent = "Recordar mis datos en este dispositivo";

  etiqueta.append(recordar, texto);

  const ayuda = document.createElement("p");
  ayuda.className = "ayuda";
  ayuda.textContent =
    "Úsalo solo en tu dispositivo personal. Se guardarán nombre, " +
    "teléfono y dirección en este navegador después de registrar " +
    "el pedido. Puedes borrarlos con “Olvidar mis datos”. " +
    "Desmarcar esta opción también elimina los datos guardados.";

  const estado = document.createElement("p");
  estado.className = "ayuda";
  estado.setAttribute("role", "status");
  estado.setAttribute("aria-live", "polite");

  // Confirmación de dirección en cada compra.
  const etiquetaRevision = document.createElement("label");
  etiquetaRevision.className = "check";

  const revision = document.createElement("input");
  revision.id = "confirmarDireccion";
  revision.type = "checkbox";
  revision.required = true;

  const textoRevision = document.createElement("span");
  textoRevision.textContent =
    "He revisado mis datos y confirmo que esta es la dirección " +
    "de entrega para este pedido.";

  etiquetaRevision.append(revision, textoRevision);
  bloque.append(etiqueta, ayuda, estado, etiquetaRevision);

  const etiquetaConsentimiento = consentimiento.closest("label");
  etiquetaConsentimiento.before(bloque);

  function actualizarAviso() {
    aviso.hidden = !datosGuardados;

    if (datosGuardados) {
      saludo.textContent = "¡Hola, " + datosGuardados.nombre + "!";
    }
  }

  function eliminarGuardados() {
    try {
      localStorage.removeItem(CLAVE);
      datosGuardados = null;
      recordar.checked = false;
      actualizarAviso();
      estado.textContent =
        "Ya no hay datos guardados por esta función en este navegador.";
      return true;
    } catch (_) {
      recordar.checked = false;
      estado.textContent =
        "El navegador no permitió borrar los datos. " +
        "Puedes eliminarlos desde la configuración de datos de este sitio.";
      return false;
    }
  }

  recordar.addEventListener("change", () => {
    if (!recordar.checked) {
      eliminarGuardados();
    } else {
      estado.textContent =
        "Los datos se guardarán cuando el pedido se registre correctamente.";
    }
  });

  olvidar.addEventListener("click", () => {
    const anteriores = datosGuardados;

    if (!eliminarGuardados()) return;

    // Borra del formulario únicamente los valores que todavía
    // coinciden con los guardados, sin eliminar cambios nuevos.
    if (anteriores) {
      for (const campo of Object.keys(CAMPOS)) {
        const elemento = $(campo);
        if (elemento && elemento.value.trim() === anteriores[campo]) {
          elemento.value = "";
        }
      }
    }

    revision.checked = false;
    consentimiento.checked = false;
    explicacion.textContent =
      "Los pedidos que ya registraste no se borran de Google Sheets.";
  });

  // Si se modifica un dato, se debe revisar de nuevo la entrega.
  for (const campo of Object.keys(CAMPOS)) {
    const elemento = $(campo);
    if (elemento) {
      elemento.addEventListener("input", () => {
        revision.checked = false;
      });
    }
  }

  datosGuardados = leerDatos();

  if (datosGuardados) {
    for (const campo of Object.keys(CAMPOS)) {
      if ($(campo)) $(campo).value = datosGuardados[campo];
    }

    recordar.checked = true;
  }

  // Nunca recordar autorizaciones ni la confirmación de dirección.
  consentimiento.checked = false;
  revision.checked = false;
  actualizarAviso();

  function guardar(datos) {
    // Esta función se llama solo tras confirmar el registro.
    // Un problema de almacenamiento no debe impedir abrir WhatsApp.
    if (!recordar.checked) return;

    const copia = depurar(datos);
    if (!copia) return;

    try {
      localStorage.setItem(CLAVE, JSON.stringify({
        version: 1,
        datos: copia
      }));

      datosGuardados = copia;
      actualizarAviso();
      estado.textContent =
        "Tus datos quedaron guardados en este navegador.";
    } catch (_) {
      estado.textContent =
        "El pedido se registró, pero el navegador no permitió " +
        "recordar tus datos.";

      const resultado = $("resultado");

      if (resultado) {
        let nota = $("avisoDatosNoGuardados");

        if (!nota) {
          nota = document.createElement("p");
          nota.id = "avisoDatosNoGuardados";
          nota.className = "ayuda";
          nota.setAttribute("role", "status");
          resultado.append(nota);
        }

        nota.textContent =
          "Tu pedido se registró correctamente. No fue posible " +
          "guardar tus datos en este navegador; tendrás que " +
          "capturarlos en tu próxima visita.";
      }
    }
  }

  window.HildaDatos = Object.freeze({ guardar });
})();