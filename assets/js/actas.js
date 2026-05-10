/* ═══════════════════════════════════════════════════════════════
   PROYECTO-INFORME-ONPE · SED-2026
   actas.js — Módulo de Registro de Actas
   Procesa votos · Valida suma · Dispara paralelismo
   Autores: Pareja HT-02 · ISMA SENATI · 2026
═══════════════════════════════════════════════════════════════ */

const Actas = {

  PADRON: 300,

  /* ══════════════════════════════════════════════════════════════
     PROCESAR ACTA — Flujo principal (Reglas #2, #3, #4, #5)
  ══════════════════════════════════════════════════════════════ */
  procesarActa() {
    const fp      = parseInt(document.getElementById('votos-fp')?.value)      || 0;
    const jp      = parseInt(document.getElementById('votos-jp')?.value)      || 0;
    const blancos = parseInt(document.getElementById('votos-blancos')?.value) || 0;
    const nulos   = parseInt(document.getElementById('votos-nulos')?.value)   || 0;

    // Número de mesa desde el formulario (inyectado por auth.js)
    const numeroMesa   = document.getElementById('num-mesa-form')?.value || '000001';
    const dnPresidente = Auth.getSesion()?.dni || '00000000';

    // Validación visual previa
    if (!this._validarCampos(fp, jp, blancos, nulos)) return;

    // Mostrar animación de procesamiento
    this._mostrarProcesando();

    setTimeout(() => {
      const resultado = SED.registrarActa({
        numeroMesa,
        dnPresidente,
        fp, jp, blancos, nulos,
      });

      this._ocultarProcesando();

      if (resultado.ok) {
        if (resultado.estado === 'contabilizada') {
          this._mostrarModalExito(resultado.acta);
        } else {
          this._mostrarModalObservada(resultado.acta);
        }
        this._actualizarResumenForm(resultado.acta);
      }
    }, 1200); // Simula procesamiento del servidor
  },

  /* ══════════════════════════════════════════════════════════════
     VALIDACIÓN VISUAL DE CAMPOS
  ══════════════════════════════════════════════════════════════ */
  _validarCampos(fp, jp, blancos, nulos) {
    const campos = ['votos-fp', 'votos-jp', 'votos-blancos', 'votos-nulos'];
    let valido = true;

    campos.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = parseInt(el.value);
      if (isNaN(val) || val < 0) {
        el.style.borderColor = 'var(--rojo-alerta)';
        valido = false;
      } else {
        el.style.borderColor = 'var(--gris-borde)';
      }
    });

    if (!valido) {
      this._mostrarToast('⚠ Complete todos los campos con valores válidos.', 'warn');
      return false;
    }

    const suma = fp + jp + blancos + nulos;

    // Actualizar contador en tiempo real
    this._actualizarContadorTiempoReal(suma);

    return true;
  },

  /* ══════════════════════════════════════════════════════════════
     CONTADOR EN TIEMPO REAL — Actualiza mientras el usuario escribe
  ══════════════════════════════════════════════════════════════ */
  activarContadorTiempoReal() {
    const campos = ['votos-fp', 'votos-jp', 'votos-blancos', 'votos-nulos'];
    campos.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          const fp      = parseInt(document.getElementById('votos-fp')?.value)      || 0;
          const jp      = parseInt(document.getElementById('votos-jp')?.value)      || 0;
          const blancos = parseInt(document.getElementById('votos-blancos')?.value) || 0;
          const nulos   = parseInt(document.getElementById('votos-nulos')?.value)   || 0;
          this._actualizarContadorTiempoReal(fp + jp + blancos + nulos);
        });
      }
    });
  },

  _actualizarContadorTiempoReal(suma) {
    const contadorEl  = document.getElementById('contador-suma');
    const diferencia  = this.PADRON - suma;

    if (!contadorEl) return;

    if (suma === this.PADRON) {
      contadorEl.innerHTML = `<span style="color:var(--verde-exito);font-weight:700;">✅ Suma correcta: ${suma} / ${this.PADRON}</span>`;
    } else if (suma > this.PADRON) {
      contadorEl.innerHTML = `<span style="color:var(--rojo-alerta);font-weight:700;">❌ Excede el padrón por ${suma - this.PADRON} votos (${suma} / ${this.PADRON})</span>`;
    } else {
      contadorEl.innerHTML = `<span style="color:var(--azul-onpe);">Suma actual: ${suma} / ${this.PADRON} — Faltan ${diferencia}</span>`;
    }
  },

  /* ══════════════════════════════════════════════════════════════
     MODALES DE RESULTADO
  ══════════════════════════════════════════════════════════════ */
  _mostrarModalExito(acta) {
    const modal = document.getElementById('modal-exito');
    if (!modal) return;

    // Actualizar contenido del modal con datos reales
    const detalle = modal.querySelector('.modal-detalle');
    if (detalle) {
      detalle.innerHTML = `
        <div style="
          background: var(--verde-claro);
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
          text-align: left;
          font-size: 0.85rem;
        ">
          <strong style="color:var(--verde-exito);">Mesa N° ${acta.numeroMesa}</strong><br>
          <span style="color:#555;">
            FP: ${acta.votos.fp} | JP: ${acta.votos.jp} | 
            Blancos: ${acta.votos.blancos} | Nulos: ${acta.votos.nulos}
          </span><br>
          <small style="color:#888;">
            📱 SMS enviado al presidente de mesa.<br>
            🕐 ${SED.formatearFecha(acta.fechaRegistro)}
          </small>
        </div>
      `;
    }

    modal.style.display = 'flex';
  },

  _mostrarModalObservada(acta) {
    const modal = document.getElementById('modal-observada');
    if (!modal) return;

    const detalle = modal.querySelector('.modal-detalle');
    if (detalle) {
      detalle.innerHTML = `
        <div style="
          background: #fff3e0;
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
          text-align: left;
          font-size: 0.85rem;
        ">
          <strong style="color:#e65100;">Mesa N° ${acta.numeroMesa}</strong><br>
          <span style="color:#555;">
            Suma registrada: ${acta.votos.total} / ${this.PADRON} esperados.
          </span><br>
          <small style="color:#888;">
            ⚖ Enviada automáticamente al JNE para resolución.<br>
            📱 SMS de notificación enviado al presidente de mesa.<br>
            🕐 ${SED.formatearFecha(acta.fechaRegistro)}
          </small>
        </div>
      `;
    }

    modal.style.display = 'flex';
  },

  /* ══════════════════════════════════════════════════════════════
     RESUMEN POST-REGISTRO — Muestra totales actualizados
  ══════════════════════════════════════════════════════════════ */
  _actualizarResumenForm(acta) {
    const resumen = document.getElementById('resumen-post-registro');
    if (!resumen) return;

    const contador = SED.getContador();
    const pct      = SED.getPorcentajeAvance();

    resumen.innerHTML = `
      <div style="
        background: var(--blanco);
        border-radius: 12px;
        padding: 20px;
        margin-top: 16px;
        border-left: 4px solid var(--dorado);
        box-shadow: var(--sombra-card);
      ">
        <h4 style="
          font-family: var(--fuente-titulo);
          color: var(--azul-oscuro);
          margin-bottom: 10px;
        ">📊 Avance Nacional Actualizado</h4>
        <p style="font-size:0.85rem; color:var(--gris-suave);">
          Contabilizadas: <strong>${contador.contabilizadas}</strong> |
          Observadas: <strong>${contador.observadas}</strong> |
          Avance: <strong>${pct}%</strong>
        </p>
      </div>
    `;
    resumen.style.display = 'block';
  },

  /* ══════════════════════════════════════════════════════════════
     ANIMACIONES DE PROCESAMIENTO
  ══════════════════════════════════════════════════════════════ */
  _mostrarProcesando() {
    const btn = document.getElementById('btn-enviar-acta');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Procesando...';
    }
  },

  _ocultarProcesando() {
    const btn = document.getElementById('btn-enviar-acta');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Firmar y Enviar Acta';
    }
  },

  /* ══════════════════════════════════════════════════════════════
     TOAST — Notificación temporal
  ══════════════════════════════════════════════════════════════ */
  _mostrarToast(mensaje, tipo = 'info') {
    // Remover toast anterior si existe
    const anterior = document.getElementById('sed-toast');
    if (anterior) anterior.remove();

    const colores = {
      success: { bg: 'var(--verde-exito)',  color: '#fff' },
      error:   { bg: 'var(--rojo-alerta)',  color: '#fff' },
      warn:    { bg: '#e65100',             color: '#fff' },
      info:    { bg: 'var(--azul-onpe)',    color: '#fff' },
    };

    const c = colores[tipo] || colores.info;

    const toast = document.createElement('div');
    toast.id = 'sed-toast';
    toast.textContent = mensaje;
    toast.style.cssText = `
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: ${c.bg};
      color: ${c.color};
      padding: 12px 28px;
      border-radius: 30px;
      font-family: 'Inter', sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 99999;
      opacity: 0;
      transition: all 0.3s ease;
      white-space: nowrap;
    `;

    document.body.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => {
      toast.style.opacity    = '1';
      toast.style.transform  = 'translateX(-50%) translateY(0)';
    });

    // Auto-desaparecer
    setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  /* ══════════════════════════════════════════════════════════════
     CERRAR MODALES
  ══════════════════════════════════════════════════════════════ */
  cerrarModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.display  = 'none';
        modal.style.opacity  = '1';
        if (idModal === 'modal-exito') location.reload();
      }, 300);
    }
  },

  /* ══════════════════════════════════════════════════════════════
     INICIALIZAR
  ══════════════════════════════════════════════════════════════ */
  init() {
    this.activarContadorTiempoReal();

    // Cerrar modal al hacer click fuera
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          const id = modal.id;
          this.cerrarModal(id);
        }
      });
    });
  },

};

/* ── INICIALIZAR AL CARGAR ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => Actas.init());