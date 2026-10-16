/* ¿Cuál es mi mesa? · búsqueda de invitados por nombre.
   Sin dependencias, sin cookies y sin analítica. Los datos están en mesas.json. */
(function () {
  'use strict';

  var MINIMO = 2; // letras a partir de las que se busca en vivo

  // Abreviaturas que la gente escribirá desarrolladas.
  var ALIAS = [
    [/\bM\.\s*(?=[ÁA]ngel)/g, 'miguel'], // «M. Ángel» → también «Miguel Ángel» (no «María M. Landaluce»)
    [/\bMª/g, 'maria'],               // «Mª Jesús» → también «María Jesús»
    [/\bSra\./g, 'senora esposa'],
  ];

  var $ = function (id) { return document.getElementById(id); };
  var campo = $('campo');
  var borrar = $('borrar');
  var aviso = $('aviso');
  var resultados = $('resultados');
  var sinResultados = $('sin-resultados');
  var vistas = { buscar: $('vista-buscar'), mesa: $('vista-mesa'), todas: $('vista-todas') };

  var mesas = [];
  var indice = []; // { mesa, posicion, texto, palabras[] }

  /** Minúsculas, sin tildes y sin distinguir ñ/n (la NFKD también convierte «ª» en «a»). */
  function normalizar(s) {
    return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function palabras(s) {
    return normalizar(s).split(/[^a-z0-9]+/).filter(Boolean);
  }

  function indexar(datos) {
    mesas = datos.mesas;
    indice = [];
    mesas.forEach(function (m) {
      m.entradas.forEach(function (entrada, posicion) {
        // Una entrada es un texto o una lista de personas, una por línea.
        var texto = Array.isArray(entrada) ? entrada.join('\n') : entrada;
        var extra = '';
        ALIAS.forEach(function (a) { if (texto.search(a[0]) !== -1) extra += ' ' + a[1]; a[0].lastIndex = 0; });
        // Cada nombre de la entrada («Óscar, María y Berta») y su cargo entre
        // paréntesis quedan como palabras sueltas: cualquiera la encuentra.
        indice.push({ mesa: m, posicion: posicion, texto: texto, palabras: palabras(texto + extra) });
      });
    });
  }

  /** Cada palabra escrita tiene que ser el principio de alguna palabra de la entrada. */
  function buscar(consulta) {
    var q = palabras(consulta);
    if (!q.length || q.join('').length < MINIMO) return null;
    var encontrados = [];
    indice.forEach(function (e) {
      var exactas = 0;
      var todas = q.every(function (p) {
        var hay = false;
        e.palabras.forEach(function (w) {
          if (w.indexOf(p) === 0) { hay = true; if (w === p) exactas++; }
        });
        return hay;
      });
      if (todas) encontrados.push({ e: e, exactas: exactas, primera: e.palabras[0].indexOf(q[0]) === 0 ? 1 : 0 });
    });
    encontrados.sort(function (a, b) {
      return (b.primera - a.primera) || (b.exactas - a.exactas) ||
        (a.e.mesa.numero - b.e.mesa.numero) || (a.e.posicion - b.e.posicion);
    });
    return encontrados.map(function (x) { return x.e; });
  }

  function lineas(entrada) { return Array.isArray(entrada) ? entrada.join('\n') : entrada; }
  function vaciar(nodo) { while (nodo.firstChild) nodo.removeChild(nodo.firstChild); }
  function el(etiqueta, clase, texto) {
    var n = document.createElement(etiqueta);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  // ── Pintar resultados ───────────────────────────────────────────
  function pintar(lista) {
    vaciar(resultados);
    sinResultados.hidden = true;
    aviso.textContent = '';
    if (lista === null) return;
    if (!lista.length) { sinResultados.hidden = false; return; }
    aviso.textContent = lista.length === 1 ? 'Hemos encontrado 1 resultado:' : 'Hemos encontrado ' + lista.length + ' resultados. Toque el suyo:';
    lista.forEach(function (e) {
      var li = el('li');
      var b = el('button', 'tarjeta');
      b.type = 'button';
      b.appendChild(el('span', 'tarjeta-nombre', e.texto));
      var mesa = el('span', 'tarjeta-mesa');
      mesa.appendChild(el('span', 'mini-rotulo', 'Mesa '));
      mesa.appendChild(el('span', 'mini-esfera', String(e.mesa.numero)));
      b.appendChild(mesa);
      b.addEventListener('click', function () { abrirMesa(e.mesa.numero, e.posicion); });
      li.appendChild(b);
      resultados.appendChild(li);
    });
  }

  var reloj;
  function alEscribir() {
    borrar.hidden = !campo.value;
    clearTimeout(reloj);
    reloj = setTimeout(function () { pintar(buscar(campo.value)); }, 120);
  }

  // ── Vistas (con historial: el botón «atrás» del móvil vuelve a la búsqueda) ──
  function mostrar(nombre) {
    Object.keys(vistas).forEach(function (k) { vistas[k].hidden = k !== nombre; });
    window.scrollTo(0, 0);
  }

  function pintarMesa(numero, posicion) {
    var m = mesas.filter(function (x) { return x.numero === numero; })[0];
    if (!m) return false;
    $('mesa-numero').textContent = String(m.numero);
    $('mesa-nombre').hidden = !m.nombre;
    if (m.nombre) $('mesa-nombre').textContent = m.nombre;
    var ul = $('mesa-lista');
    vaciar(ul);
    m.entradas.forEach(function (t, i) {
      var li = el('li', i === posicion ? 'suya' : '', lineas(t));
      ul.appendChild(li);
    });
    document.title = 'Mesa ' + m.numero + ' · ¿Cuál es mi mesa?';
    return true;
  }

  function abrirMesa(numero, posicion, sinHistorial) {
    if (!pintarMesa(numero, posicion)) return;
    campo.blur();
    if (!sinHistorial) history.pushState({ vista: 'mesa', n: numero, p: posicion }, '', '#mesa-' + numero);
    mostrar('mesa');
  }

  function pintarTodas() {
    var cont = $('todas-lista');
    if (cont.firstChild) return;
    mesas.forEach(function (m) {
      var tarjeta = el('article', 'todas-mesa');
      var h = el('h3');
      h.appendChild(el('span', 'h3-rotulo', 'Mesa '));
      h.appendChild(el('span', 'mini-esfera', String(m.numero)));
      if (m.nombre) h.appendChild(el('small', null, m.nombre));
      tarjeta.appendChild(h);
      var ul = el('ul');
      m.entradas.forEach(function (t) { ul.appendChild(el('li', null, lineas(t))); });
      tarjeta.appendChild(ul);
      cont.appendChild(tarjeta);
    });
  }

  function abrirTodas(sinHistorial) {
    pintarTodas();
    campo.blur();
    if (!sinHistorial) history.pushState({ vista: 'todas' }, '', '#todas');
    mostrar('todas');
  }

  function volverABuscar() {
    if (history.state && history.state.vista !== 'buscar') { history.back(); return; }
    irABuscar();
  }
  function irABuscar() {
    document.title = '¿Cuál es mi mesa? · 30 aniversario Rotary Club de Torrelavega';
    campo.value = '';
    borrar.hidden = true;
    pintar(null);
    mostrar('buscar');
    campo.focus();
  }

  window.addEventListener('popstate', function (ev) {
    var s = ev.state || { vista: 'buscar' };
    if (s.vista === 'mesa') abrirMesa(s.n, s.p, true);
    else if (s.vista === 'todas') abrirTodas(true);
    else irABuscar();
  });

  // ── Eventos ─────────────────────────────────────────────────────
  campo.addEventListener('input', alEscribir);
  $('formulario').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearTimeout(reloj);
    var lista = buscar(campo.value);
    pintar(lista);
    if (lista && lista.length === 1) { abrirMesa(lista[0].mesa.numero, lista[0].posicion); return; }
    campo.blur(); // cierra el teclado para que se vean los resultados
    if (lista === null) aviso.textContent = 'Escriba al menos ' + MINIMO + ' letras de su nombre.';
  });
  borrar.addEventListener('click', function () {
    campo.value = '';
    borrar.hidden = true;
    pintar(null);
    campo.focus();
  });
  document.querySelectorAll('[data-ir]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-ir') === 'todas') abrirTodas(); else volverABuscar();
    });
  });

  // ── Bienvenida ──────────────────────────────────────────────────
  // Se ve una vez por visita (al volver atrás o recargar dentro de la misma
  // sesión no se repite). Dura unos 5 s; tocar en cualquier sitio la salta.
  (function bienvenida() {
    var capa = $('bienvenida');
    if (!capa) return;
    var vista = false;
    try { vista = sessionStorage.getItem('bienvenida-vista') === '1'; } catch (e) {}
    if (vista) { capa.hidden = true; return; }
    var quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    capa.hidden = false;
    document.documentElement.classList.add('con-intro');
    var cerrada = false;
    function cerrar() {
      if (cerrada) return;
      cerrada = true;
      try { sessionStorage.setItem('bienvenida-vista', '1'); } catch (e) {}
      capa.classList.add('saliendo');
      setTimeout(function () {
        capa.hidden = true;
        document.documentElement.classList.remove('con-intro');
        campo.focus();
      }, 900);
    }
    capa.addEventListener('click', cerrar);
    setTimeout(cerrar, quieto ? 3500 : 5600);
  })();

  // ── Datos ───────────────────────────────────────────────────────
  history.replaceState({ vista: 'buscar' }, '', location.pathname + location.search);
  fetch('mesas.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (datos) {
      indexar(datos);
      if (campo.value) alEscribir();
    })
    .catch(function () {
      aviso.textContent = 'No se ha podido cargar la lista de mesas. Compruebe la conexión o pregunte en la entrada.';
    });

  // Copia en el móvil para que funcione aunque falle la cobertura en el salón.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
