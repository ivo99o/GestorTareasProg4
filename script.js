const form = document.querySelector('.form-tarea');
const inputTitulo = document.getElementById('titulo');
const inputCategoria = document.getElementById('categoria');
const inputTelefono = document.getElementById('telefono');
const inputFecha = document.getElementById('fecha');
const inputHora = document.getElementById('hora');
const botonCrear = document.querySelector('.btn-crear');

const listaTareas = document.querySelector('.lista-tareas');
const botonesFiltroCategoria = document.querySelectorAll('.filtro');
const botonPendiente = document.querySelector('.filtro-pendiente');
const checkboxFormulario = document.getElementById('toggle-form');

const CLAVE_LOCALSTORAGE = 'gestor-tareas';

const NOMBRES_CATEGORIA = {
  laboral: 'Laboral',
  estudio: 'Estudio',
  recordatorio: 'Recordatorio',
};

let tareas = [];
let siguienteId = 1;
let idEnEdicion = null;
let filtroCategoriaActivo = 'todos';
let soloPendientes = false;
const estadosAnteriores = new Map();

function crearTareasDeEjemplo() {
  const ahora = Date.now();
  const HORA = 60 * 60 * 1000;
  const DIA = 24 * HORA;

  return [
    { id: siguienteId++, titulo: 'Entregar informe', categoria: 'laboral',
      telefono: '3815551234', fechaObjetivo: new Date(ahora - 1 * DIA) },
    { id: siguienteId++, titulo: 'Parcial de Programacion IV', categoria: 'estudio',
      telefono: '3815551234', fechaObjetivo: new Date(ahora + 5 * HORA) },
    { id: siguienteId++, titulo: 'Turno con el dentista', categoria: 'recordatorio',
      telefono: '3815551234', fechaObjetivo: new Date(ahora + 18 * HORA) },
    { id: siguienteId++, titulo: 'Renovar el DNI', categoria: 'laboral',
      telefono: '3815551234', fechaObjetivo: new Date(ahora + 2 * DIA) },
  ];
}

function cargarTareas() {
  const guardado = localStorage.getItem(CLAVE_LOCALSTORAGE);

  if (!guardado) {
    return crearTareasDeEjemplo();
  }

  const tareasGuardadas = JSON.parse(guardado).map(function (tarea) {
    return { ...tarea, fechaObjetivo: new Date(tarea.fechaObjetivo) };
  });

  siguienteId = tareasGuardadas.reduce(function (max, tarea) {
    return Math.max(max, tarea.id + 1);
  }, 1);

  return tareasGuardadas;
}

function guardarTareas() {
  localStorage.setItem(CLAVE_LOCALSTORAGE, JSON.stringify(tareas));
}

function calcularEstado(fechaObjetivo) {
  const horasRestantes = (fechaObjetivo.getTime() - Date.now()) / (60 * 60 * 1000);

  if (horasRestantes < 0) {
    return { clase: 'tarea--vencida', clave: 'vencida', texto: 'VENCIDA', icono: '🔴' };
  }
  if (horasRestantes <= 12) {
    return { clase: 'tarea--naranja', clave: 'naranja', texto: 'NARANJA', icono: '🟠' };
  }
  if (horasRestantes <= 24) {
    return { clase: 'tarea--amarilla', clave: 'amarilla', texto: 'AMARILLO', icono: '🟡' };
  }
  return { clase: 'tarea--pendiente', clave: 'pendiente', texto: 'PENDIENTE', icono: '⚪' };
}

function crearTarjetaTarea(tarea) {
  const estado = calcularEstado(tarea.fechaObjetivo);

  const tarjeta = document.createElement('div');
  tarjeta.className = `tarea card shadow-sm ${estado.clase}`;
  tarjeta.dataset.categoria = tarea.categoria;
  tarjeta.dataset.id = tarea.id;

  const fechaLegible = tarea.fechaObjetivo.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  tarjeta.innerHTML = `
    <div class="card-body text-center">
      <h3 class="tarea-titulo card-title h5 mb-2">${tarea.titulo}</h3>
      <div class="tarea-info text-start">
        <p class="tarea-categoria card-text small mb-1">🏷️ Categoría: <strong>${NOMBRES_CATEGORIA[tarea.categoria] || tarea.categoria}</strong></p>
        <p class="tarea-fecha card-text small mb-1">📅 Fecha objetivo: ${fechaLegible}</p>
        <p class="tarea-estado card-text small mb-0">${estado.icono} Estado: <strong>${estado.texto}</strong></p>
      </div>
      <div class="tarea-acciones d-flex justify-content-center gap-2 mt-3">
        <button type="button" class="btn-eliminar btn btn-sm">Eliminar</button>
        <button type="button" class="btn-editar btn btn-sm">Editar</button>
      </div>
    </div>
  `;

  return tarjeta;
}

function renderizarTareas() {
  revisarCambiosDeEstado();
  listaTareas.innerHTML = '';

  const tareasFiltradas = tareas.filter(function (tarea) {
    const coincideCategoria = filtroCategoriaActivo === 'todos' || tarea.categoria === filtroCategoriaActivo;
    const coincidePendiente = !soloPendientes || calcularEstado(tarea.fechaObjetivo).clave === 'pendiente';
    return coincideCategoria && coincidePendiente;
  });

  const tareasAMostrar = tareasFiltradas.slice().sort(function (a, b) {
    return a.fechaObjetivo - b.fechaObjetivo;
  });

  if (tareasAMostrar.length === 0) {
    const mensajeVacio = document.createElement('p');
    mensajeVacio.className = 'text-center text-muted mb-0';
    mensajeVacio.textContent = 'No hay tareas que coincidan con estos filtros.';
    listaTareas.appendChild(mensajeVacio);
    return;
  }

  tareasAMostrar.forEach(function (tarea) {
    listaTareas.appendChild(crearTarjetaTarea(tarea));
  });
}

function obtenerFechaObjetivoDelFormulario() {
  const hora = inputHora.value || '23:59';
  return new Date(`${inputFecha.value}T${hora}`);
}

function volverAModoCrear() {
  idEnEdicion = null;
  botonCrear.textContent = 'Crear tarea';
  form.reset();
}

function manejarEnvioFormulario(evento) {
  evento.preventDefault();

  const datosTarea = {
    titulo: inputTitulo.value.trim(),
    categoria: inputCategoria.value,
    telefono: inputTelefono.value.trim(),
    fechaObjetivo: obtenerFechaObjetivoDelFormulario(),
  };

  if (idEnEdicion === null) {
    tareas.push({ id: siguienteId++, ...datosTarea });
  } else {
    const tarea = tareas.find(function (t) { return t.id === idEnEdicion; });
    Object.assign(tarea, datosTarea);
  }

  guardarTareas();
  renderizarTareas();
  volverAModoCrear();

  checkboxFormulario.checked = false;
}

form.addEventListener('submit', manejarEnvioFormulario);

listaTareas.addEventListener('click', function (evento) {
  const tarjeta = evento.target.closest('.tarea');
  if (!tarjeta) return;

  const id = Number(tarjeta.dataset.id);

  if (evento.target.closest('.btn-eliminar')) {
    const confirmado = confirm('¿Seguro que querés eliminar esta tarea?');
    if (!confirmado) return;

    tareas = tareas.filter(function (t) { return t.id !== id; });
    guardarTareas();
    renderizarTareas();

    if (idEnEdicion === id) {
      volverAModoCrear();
    }
  }

  if (evento.target.closest('.btn-editar')) {
    const tarea = tareas.find(function (t) { return t.id === id; });
    if (!tarea) return;

    idEnEdicion = tarea.id;
    inputTitulo.value = tarea.titulo;
    inputCategoria.value = tarea.categoria;
    inputTelefono.value = tarea.telefono;
    inputFecha.value = tarea.fechaObjetivo.toISOString().slice(0, 10);
    inputHora.value = tarea.fechaObjetivo.toTimeString().slice(0, 5);

    botonCrear.textContent = 'Guardar cambios';

    checkboxFormulario.checked = true;
    inputTitulo.focus();
  }
});

function actualizarEstiloBotonesCategoria() {
  botonesFiltroCategoria.forEach(function (boton) {
    const esElActivo = boton.dataset.filtro === filtroCategoriaActivo;
    boton.classList.toggle('activo', esElActivo);
    boton.classList.toggle('btn-dark', esElActivo);
    boton.classList.toggle('btn-outline-dark', !esElActivo);
  });
}

botonesFiltroCategoria.forEach(function (boton) {
  boton.addEventListener('click', function () {
    filtroCategoriaActivo = boton.dataset.filtro;
    actualizarEstiloBotonesCategoria();
    renderizarTareas();
  });
});

botonPendiente.addEventListener('click', function () {
  soloPendientes = !soloPendientes;
  botonPendiente.classList.toggle('activo', soloPendientes);
  botonPendiente.classList.toggle('btn-dark', soloPendientes);
  botonPendiente.classList.toggle('btn-outline-dark', !soloPendientes);
  botonPendiente.setAttribute('aria-pressed', String(soloPendientes));
  renderizarTareas();
});

function pedirPermisoNotificaciones() {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function notificar(tarea, estado) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  new Notification('Gestor de Tareas', {
    body: `${estado.icono} "${tarea.titulo}" está en estado ${estado.texto}`,
  });
}

function revisarCambiosDeEstado() {
  tareas.forEach(function (tarea) {
    const estado = calcularEstado(tarea.fechaObjetivo);
    const estadoAnterior = estadosAnteriores.get(tarea.id);

    if (estadoAnterior !== estado.texto) {
      const esUrgente = estado.texto === 'AMARILLA' || estado.texto === 'NARANJA' || estado.texto === 'VENCIDA';
      if (esUrgente) {
        notificar(tarea, estado);
      }
      estadosAnteriores.set(tarea.id, estado.texto);
    }
  });
}

tareas = cargarTareas();
pedirPermisoNotificaciones();
renderizarTareas();

setInterval(renderizarTareas, 30000);
