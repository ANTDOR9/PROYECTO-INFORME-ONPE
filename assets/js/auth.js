/* ═══════════════════════════════════════════════════════════════
   PROYECTO-INFORME-ONPE · SED-2026
   auth.js — Módulo de Autenticación
   Valida DNI contra RENIEC simulado · Bloqueo por 3 intentos
   Autores: Pareja HT-02 · ISMA SENATI · 2026
═══════════════════════════════════════════════════════════════ */

const Auth = {

  /* ── ESTADO INTERNO ────────────────────────────────────────── */
  _sesion: null,

  /* ══════════════════════════════════════════════════════════════
     VALIDAR IDENTIDAD — Flujo principal de autenticación
  ══════════════════════════════════════════════════════════════ */
  validarIdentidad() {
    const inputDNI = document.getElementById('dni-input');
    const msgEl    = document.getElementById('auth-msg');
    const btnAuth  = document.getElementById('btn-auth');
    const dni      = inputDNI ? inputDNI.value.trim() : '';

    // Limpiar mensaje anterior
    this._setMsg(msgEl, '', '');

    // Validación básica de formato
    if (!/^\d{8}$/.test(dni)) {
      this._setMsg(msgEl, '⚠ Ingrese un DNI válido de 8 dígitos.', 'warn');
      inputDNI.focus();
      return;
    }

    // Verificar si el DNI está bloqueado (Regla #7)
    if (SED.estaBloqueado(dni)) {
      this._setMsg(
        msgEl,
        '🔒 DNI bloqueado por 3 intentos fallidos. Intente en 1 hora.',
        'error'
      );
      if (btnAuth) btnAuth.disabled = true;
      return;
    }

    // Animación de carga — simula consulta a RENIEC
    this._setMsg(msgEl, '🔄 Consultando RENIEC...', 'info');
    if (btnAuth) btnAuth.disabled = true;

    setTimeout(() => {
      const resultado = SED.consultarRENIEC(dni);

      if (resultado.ok) {
        // Autenticación exitosa
        this._sesion = { dni, persona: resultado.persona };
        SED.limpiarIntentos(dni);
        this._onExito(resultado.persona, msgEl);
      } else {
        // Intento fallido
        const { bloqueado, intentosRestantes } = SED.registrarIntentoFallido(dni);

        if (bloqueado) {
          this._setMsg(
            msgEl,
            '🔒 DNI bloqueado por 3 intentos fallidos. Intente en 1 hora.',
            'error'
          );
          if (btnAuth) btnAuth.disabled = true;
        } else {
          this._setMsg(
            msgEl,
            `❌ DNI no autorizado como presidente de mesa. Intentos restantes: ${intentosRestantes}`,
            'error'
          );
          if (btnAuth) btnAuth.disabled = false;
          inputDNI.value = '';
          inputDNI.focus();
        }
      }
    }, 900); // Delay simulando latencia de RENIEC
  },

  /* ══════════════════════════════════════════════════════════════
     ON ÉXITO — Muestra formulario y datos del presidente
  ══════════════════════════════════════════════════════════════ */
  _onExito(persona, msgEl) {
    // Mensaje de bienvenida
    this._setMsg(
      msgEl,
      `✅ Identidad verificada. Bienvenido/a, ${persona.nombre}.`,
      'success'
    );

    // Mostrar número de mesa asignada
    const mesaAsignada = document.getElementById('mesa-asignada');
    if (mesaAsignada) {
      mesaAsignada.textContent = `Mesa N° ${persona.mesa}`;
      mesaAsignada.style.display = 'block';
    }

    // Verificar si la mesa ya registró acta (Regla #3)
    if (SED.mesaYaRegistro(persona.mesa)) {
      this._setMsg(
        msgEl,
        `⚠ La mesa N° ${persona.mesa} ya registró su acta anteriormente.`,
        'warn'
      );
      this._mostrarMesaYaRegistrada(persona.mesa);
      return;
    }

    // Mostrar sección de registro
    const seccionRegistro = document.getElementById('registro');
    if (seccionRegistro) {
      seccionRegistro.style.display = 'block';
      seccionRegistro.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Guardar número de mesa en el formulario
    const inputNumMesa = document.getElementById('num-mesa-form');
    if (inputNumMesa) inputNumMesa.value = persona.mesa;

    // Mostrar nombre en el formulario
    const nombreForm = document.getElementById('nombre-presidente');
    if (nombreForm) nombreForm.textContent = persona.nombre;
  },

  /* ══════════════════════════════════════════════════════════════
     MESA YA REGISTRADA — Mensaje especial
  ══════════════════════════════════════════════════════════════ */
  _mostrarMesaYaRegistrada(numeroMesa) {
    const seccionRegistro = document.getElementById('registro');
    if (seccionRegistro) {
      seccionRegistro.innerHTML = `
        <div style="
          background: #fff3e0;
          border: 1.5px solid #e65100;
          border-radius: 12px;
          padding: 28px 32px;
          text-align: center;
          margin-top: 20px;
        ">
          <span style="font-size:2.5rem;">📋</span>
          <h3 style="
            font-family: 'Playfair Display', serif;
            color: #e65100;
            margin: 12px 0 8px;
          ">Mesa N° ${String(numeroMesa).padStart(6,'0')} ya registrada</h3>
          <p style="color:#666; font-size:0.9rem;">
            Esta mesa ya envió su acta correctamente. 
            No es posible registrar una segunda acta.
          </p>
          <a href="pages/resultados.html" style="
            display: inline-block;
            margin-top: 16px;
            padding: 10px 24px;
            background: #004b8d;
            color: white;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.9rem;
            text-decoration: none;
          ">Ver resultados →</a>
        </div>
      `;
      seccionRegistro.style.display = 'block';
      seccionRegistro.scrollIntoView({ behavior: 'smooth' });
    }
  },

  /* ══════════════════════════════════════════════════════════════
     UTILIDADES DE UI
  ══════════════════════════════════════════════════════════════ */

  /**
   * Muestra un mensaje con estilo según tipo
   * tipos: 'success' | 'error' | 'warn' | 'info' | ''
   */
  _setMsg(el, texto, tipo) {
    if (!el) return;
    const colores = {
      success: '#2e7d32',
      error:   '#c62828',
      warn:    '#e65100',
      info:    '#004b8d',
      '':      '#666',
    };
    el.textContent = texto;
    el.style.color = colores[tipo] || '#666';
    el.style.fontWeight = tipo ? '600' : '400';
  },

  /**
   * Retorna la sesión activa
   */
  getSesion() {
    return this._sesion;
  },

  /**
   * Activa Enter en el input de DNI
   */
  activarEnter() {
    const input = document.getElementById('dni-input');
    if (!input) return;
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.validarIdentidad();
    });
  },

  /**
   * Inicializa el módulo en la página
   */
  init() {
    this.activarEnter();

    // Mostrar DNIs de prueba en consola para el profesor
    console.info(
      '%c[SED-2026] DNIs de prueba para autenticación:\n' +
      '12345678 · Mesa 000001\n' +
      '87654321 · Mesa 000002\n' +
      '11223344 · Mesa 000003\n' +
      '44332211 · Mesa 000004\n' +
      '55667788 · Mesa 000005',
      'color: #004b8d; font-weight: bold; font-size: 11px;'
    );
  },

};

/* ── INICIALIZAR AL CARGAR ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => Auth.init());