/* ═══════════════════════════════════════════════════════════════
   PROYECTO-INFORME-ONPE · SED-2026
   storage.js — Módulo centralizado de persistencia
   Simula la Base de Datos Central del sistema
   Autores: Pareja HT-02 · ISMA SENATI · 2026
═══════════════════════════════════════════════════════════════ */

const SED = {

  /* ── CLAVES DE ALMACENAMIENTO ──────────────────────────────── */
  KEYS: {
    MESAS:      'sed_mesas',
    ACTAS:      'sed_actas',
    CONTADOR:   'sed_contador',
    BLOQUEOS:   'sed_bloqueos',
    PADRON:     'sed_padron',
  },

  /* ══════════════════════════════════════════════════════════════
     INICIALIZACIÓN — Se llama al cargar cualquier página
  ══════════════════════════════════════════════════════════════ */
  init() {
    if (!localStorage.getItem(this.KEYS.MESAS)) {
      this._generarMesasIniciales();
    }
    if (!localStorage.getItem(this.KEYS.CONTADOR)) {
      this._inicializarContador();
    }
    console.log('[SED-2026] Storage inicializado correctamente.');
  },

  /* ══════════════════════════════════════════════════════════════
     MESAS — Gestión del padrón de mesas de sufragio
  ══════════════════════════════════════════════════════════════ */

  /**
   * Genera 30 mesas de ejemplo al iniciar por primera vez
   */
  _generarMesasIniciales() {
    const distritos = [
      'Miraflores', 'San Isidro', 'Surco', 'La Molina',
      'Barranco', 'Chorrillos', 'San Borja', 'Pueblo Libre',
      'Jesús María', 'Magdalena'
    ];
    const estados = ['contabilizada', 'contabilizada', 'contabilizada', 'observada', 'pendiente'];

    const mesas = [];

    for (let i = 1; i <= 30; i++) {
      const num = String(i).padStart(6, '0');
      const distrito = distritos[Math.floor(Math.random() * distritos.length)];
      const estado = estados[Math.floor(Math.random() * estados.length)];

      // Generar votos solo si no está pendiente
      let votos = null;
      if (estado !== 'pendiente') {
        const fp      = Math.floor(Math.random() * 160) + 60;
        const jp      = Math.floor(Math.random() * 160) + 60;
        const blancos = Math.floor(Math.random() * 20) + 5;
        const nulos   = 300 - fp - jp - blancos;
        votos = {
          fp:      nulos < 0 ? fp - Math.abs(nulos) : fp,
          jp,
          blancos,
          nulos:   nulos < 0 ? 0 : nulos,
          total:   300
        };
      }

      mesas.push({
        id:       `mesa-${num}`,
        numero:   num,
        distrito,
        estado,
        votos,
        dnPresidente: `${Math.floor(Math.random() * 90000000) + 10000000}`,
        fechaRegistro: estado !== 'pendiente'
          ? new Date(Date.now() - Math.random() * 3600000).toISOString()
          : null,
      });
    }

    localStorage.setItem(this.KEYS.MESAS, JSON.stringify(mesas));
    console.log('[SED-2026] 30 mesas iniciales generadas.');
  },

  /**
   * Retorna todas las mesas
   */
  getMesas() {
    return JSON.parse(localStorage.getItem(this.KEYS.MESAS)) || [];
  },

  /**
   * Busca una mesa por número
   */
  getMesaPorNumero(numero) {
    const mesas = this.getMesas();
    return mesas.find(m => m.numero === String(numero).padStart(6, '0')) || null;
  },

  /**
   * Retorna mesas filtradas por estado
   */
  getMesasPorEstado(estado) {
    return this.getMesas().filter(m => m.estado === estado);
  },

  /**
   * Verifica si una mesa ya registró su acta (Regla de negocio #3)
   */
  mesaYaRegistro(numero) {
    const mesa = this.getMesaPorNumero(numero);
    return mesa ? mesa.estado !== 'pendiente' : false;
  },

  /* ══════════════════════════════════════════════════════════════
     ACTAS — Registro y consulta de actas
  ══════════════════════════════════════════════════════════════ */

  /**
   * Registra un acta nueva (Regla de negocio #1, #2, #3, #4)
   * Retorna: { ok: true/false, motivo: string }
   */
  registrarActa({ numeroMesa, dnPresidente, fp, jp, blancos, nulos }) {
    const PADRON = 300;

    // Regla #3 — Mesa única
    if (this.mesaYaRegistro(numeroMesa)) {
      return { ok: false, motivo: 'Esta mesa ya registró su acta anteriormente.' };
    }

    // Regla #2 — Suma del padrón
    const suma = fp + jp + blancos + nulos;
    const cuadra = suma === PADRON;
    const estado = cuadra ? 'contabilizada' : 'observada';

    const acta = {
      numeroMesa: String(numeroMesa).padStart(6, '0'),
      dnPresidente,
      votos: { fp, jp, blancos, nulos, total: suma },
      estado,
      fechaRegistro: new Date().toISOString(),
    };

    // Guardar acta
    const actas = this.getActas();
    actas.push(acta);
    localStorage.setItem(this.KEYS.ACTAS, JSON.stringify(actas));

    // Actualizar mesa
    this._actualizarEstadoMesa(acta.numeroMesa, estado, acta.votos);

    // Regla #4 — Paralelismo: actualizar contador + notificar
    this._actualizarContador(acta.votos, estado);
    this._simularSMS(dnPresidente, acta.numeroMesa, estado);
    if (!cuadra) this._simularAlertaJNE(acta.numeroMesa);

    return {
      ok: true,
      estado,
      acta,
      mensaje: cuadra
        ? '✅ Acta contabilizada correctamente.'
        : '⚠️ Acta observada — enviada al JNE.',
    };
  },

  /**
   * Retorna todas las actas registradas
   */
  getActas() {
    return JSON.parse(localStorage.getItem(this.KEYS.ACTAS)) || [];
  },

  /**
   * Actualiza el estado de una mesa tras registrar su acta
   */
  _actualizarEstadoMesa(numero, estado, votos) {
    const mesas = this.getMesas();
    const idx = mesas.findIndex(m => m.numero === numero);
    if (idx !== -1) {
      mesas[idx].estado = estado;
      mesas[idx].votos  = votos;
      mesas[idx].fechaRegistro = new Date().toISOString();
      localStorage.setItem(this.KEYS.MESAS, JSON.stringify(mesas));
    }
  },

  /* ══════════════════════════════════════════════════════════════
     CONTADOR NACIONAL — Totales en tiempo real
  ══════════════════════════════════════════════════════════════ */

  _inicializarContador() {
    const mesas = this.getMesas();
    let fp = 0, jp = 0, blancos = 0, nulos = 0, contabilizadas = 0, observadas = 0;

    mesas.forEach(m => {
      if (m.votos) {
        fp        += m.votos.fp      || 0;
        jp        += m.votos.jp      || 0;
        blancos   += m.votos.blancos || 0;
        nulos     += m.votos.nulos   || 0;
      }
      if (m.estado === 'contabilizada') contabilizadas++;
      if (m.estado === 'observada')     observadas++;
    });

    const contador = {
      fp, jp, blancos, nulos,
      contabilizadas,
      observadas,
      pendientes: mesas.length - contabilizadas - observadas,
      totalMesas: mesas.length,
      ultimaActualizacion: new Date().toISOString(),
    };

    localStorage.setItem(this.KEYS.CONTADOR, JSON.stringify(contador));
  },

  /**
   * Actualiza el contador nacional al registrar un acta (Regla #4)
   */
  _actualizarContador(votos, estado) {
    const c = this.getContador();
    c.fp      += votos.fp      || 0;
    c.jp      += votos.jp      || 0;
    c.blancos += votos.blancos || 0;
    c.nulos   += votos.nulos   || 0;
    if (estado === 'contabilizada') {
      c.contabilizadas++;
      c.pendientes = Math.max(0, c.pendientes - 1);
    } else {
      c.observadas++;
      c.pendientes = Math.max(0, c.pendientes - 1);
    }
    c.ultimaActualizacion = new Date().toISOString();
    localStorage.setItem(this.KEYS.CONTADOR, JSON.stringify(c));
  },

  /**
   * Retorna el contador nacional actual
   */
  getContador() {
    return JSON.parse(localStorage.getItem(this.KEYS.CONTADOR)) || {
      fp: 0, jp: 0, blancos: 0, nulos: 0,
      contabilizadas: 0, observadas: 0, pendientes: 0, totalMesas: 0,
    };
  },

  /**
   * Calcula el porcentaje de avance
   */
  getPorcentajeAvance() {
    const c = this.getContador();
    if (c.totalMesas === 0) return 0;
    return ((c.contabilizadas + c.observadas) / c.totalMesas * 100).toFixed(3);
  },

  /**
   * Calcula porcentajes de votos por candidato
   */
  getPorcentajesVotos() {
    const c = this.getContador();
    const validos = c.fp + c.jp;
    if (validos === 0) return { fp: 0, jp: 0 };
    return {
      fp: (c.fp / validos * 100).toFixed(2),
      jp: (c.jp / validos * 100).toFixed(2),
    };
  },

  /* ══════════════════════════════════════════════════════════════
     AUTENTICACIÓN — Bloqueo por intentos (Regla #7)
  ══════════════════════════════════════════════════════════════ */

  /**
   * Verifica si un DNI está bloqueado
   */
  estaBloqueado(dni) {
    const bloqueos = JSON.parse(localStorage.getItem(this.KEYS.BLOQUEOS)) || {};
    if (!bloqueos[dni]) return false;
    const { intentos, bloqueadoHasta } = bloqueos[dni];
    if (intentos >= 3 && bloqueadoHasta && new Date() < new Date(bloqueadoHasta)) {
      return true;
    }
    return false;
  },

  /**
   * Registra un intento fallido de autenticación
   * Retorna: { bloqueado: bool, intentosRestantes: number }
   */
  registrarIntentoFallido(dni) {
    const bloqueos = JSON.parse(localStorage.getItem(this.KEYS.BLOQUEOS)) || {};
    if (!bloqueos[dni]) bloqueos[dni] = { intentos: 0, bloqueadoHasta: null };

    bloqueos[dni].intentos++;

    if (bloqueos[dni].intentos >= 3) {
      const unaHora = new Date(Date.now() + 60 * 60 * 1000);
      bloqueos[dni].bloqueadoHasta = unaHora.toISOString();
      localStorage.setItem(this.KEYS.BLOQUEOS, JSON.stringify(bloqueos));
      return { bloqueado: true, intentosRestantes: 0 };
    }

    localStorage.setItem(this.KEYS.BLOQUEOS, JSON.stringify(bloqueos));
    return {
      bloqueado: false,
      intentosRestantes: 3 - bloqueos[dni].intentos,
    };
  },

  /**
   * Limpia los intentos de un DNI tras autenticación exitosa
   */
  limpiarIntentos(dni) {
    const bloqueos = JSON.parse(localStorage.getItem(this.KEYS.BLOQUEOS)) || {};
    delete bloqueos[dni];
    localStorage.setItem(this.KEYS.BLOQUEOS, JSON.stringify(bloqueos));
  },

  /* ══════════════════════════════════════════════════════════════
     SIMULACIONES — RENIEC · SMS · JNE
  ══════════════════════════════════════════════════════════════ */

  /**
   * Simula consulta a RENIEC
   * En producción real: fetch a la API del gobierno
   */
  consultarRENIEC(dni) {
    const padron = this._getPadron();
    const persona = padron.find(p => p.dni === String(dni));
    if (persona) return { ok: true, persona };
    return { ok: false, motivo: 'DNI no registrado como presidente de mesa.' };
  },

  /**
   * Simula envío de SMS al presidente de mesa (Regla #4)
   */
  _simularSMS(dni, numeroMesa, estado) {
    const msg = estado === 'contabilizada'
      ? `ONPE: Su acta de la mesa N° ${numeroMesa} fue contabilizada correctamente.`
      : `ONPE: Su acta de la mesa N° ${numeroMesa} fue observada y enviada al JNE.`;
    console.log(`[SMS → DNI ${dni}]: ${msg}`);

    // Guardar en log de notificaciones
    const logs = JSON.parse(localStorage.getItem('sed_sms_log')) || [];
    logs.push({ dni, numeroMesa, estado, mensaje: msg, fecha: new Date().toISOString() });
    localStorage.setItem('sed_sms_log', JSON.stringify(logs));
  },

  /**
   * Simula alerta automática al JNE (Regla #5)
   */
  _simularAlertaJNE(numeroMesa) {
    console.warn(`[ALERTA JNE]: Acta observada — Mesa N° ${numeroMesa}. Requiere resolución.`);
    const alertas = JSON.parse(localStorage.getItem('sed_jne_alertas')) || [];
    alertas.push({
      numeroMesa,
      fecha: new Date().toISOString(),
      estado: 'pendiente_jne',
    });
    localStorage.setItem('sed_jne_alertas', JSON.stringify(alertas));
  },

  /**
   * Padrón simulado de presidentes de mesa (stub de RENIEC)
   */
  _getPadron() {
    const padronGuardado = localStorage.getItem(this.KEYS.PADRON);
    if (padronGuardado) return JSON.parse(padronGuardado);

    // Generar padrón base si no existe
    const nombres  = ['JUAN CARLOS', 'MARIA ELENA', 'CARLOS ALBERTO', 'ANA LUCIA', 'LUIS MIGUEL'];
    const apellidos = ['QUISPE MAMANI', 'GARCIA RODRIGUEZ', 'FLORES HUAMAN', 'SANCHEZ REYES', 'DIAZ VILLANUEVA'];

    const padron = [
      // DNIs de prueba conocidos para el profesor
      { dni: '12345678', nombre: 'JUAN CARLOS QUISPE MAMANI',    mesa: '000001' },
      { dni: '87654321', nombre: 'MARIA ELENA GARCIA RODRIGUEZ', mesa: '000002' },
      { dni: '11223344', nombre: 'CARLOS ALBERTO FLORES HUAMAN', mesa: '000003' },
      { dni: '44332211', nombre: 'ANA LUCIA SANCHEZ REYES',      mesa: '000004' },
      { dni: '55667788', nombre: 'LUIS MIGUEL DIAZ VILLANUEVA',  mesa: '000005' },
    ];

    // Generar 25 más aleatorios
    for (let i = 6; i <= 30; i++) {
      const dni = String(Math.floor(Math.random() * 90000000) + 10000000);
      const nombre = `${nombres[Math.floor(Math.random() * nombres.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]}`;
      padron.push({ dni, nombre, mesa: String(i).padStart(6, '0') });
    }

    localStorage.setItem(this.KEYS.PADRON, JSON.stringify(padron));
    return padron;
  },

  /* ══════════════════════════════════════════════════════════════
     UTILIDADES
  ══════════════════════════════════════════════════════════════ */

  /**
   * Resetea todo el storage (útil para demos)
   */
  resetear() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('sed_sms_log');
    localStorage.removeItem('sed_jne_alertas');
    console.warn('[SED-2026] Storage reseteado completamente.');
    this.init();
  },

  /**
   * Formatea fecha ISO a español
   */
  formatearFecha(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

};

// Inicializar automáticamente al cargar
document.addEventListener('DOMContentLoaded', () => SED.init());