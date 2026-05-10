/* ═══════════════════════════════════════════════════════════════
   PROYECTO-INFORME-ONPE · SED-2026
   estadisticas.js — Módulo de Gráficos y Estadísticas
   Usa Chart.js para visualización dinámica
   Autores: Pareja HT-02 · ISMA SENATI · 2026
═══════════════════════════════════════════════════════════════ */

const Estadisticas = {

  _graficos: {},

  /* ══════════════════════════════════════════════════════════════
     INICIALIZAR — Detecta qué página está activa
  ══════════════════════════════════════════════════════════════ */
  init() {
    // Página de estadísticas general
    if (document.getElementById('grafico-barras')) {
      this.renderGraficoBarras();
    }

    // Gráfico de dona para avance de actas
    if (document.getElementById('grafico-dona')) {
      this.renderGraficoDonaAvance();
    }

    // Tarjetas de resumen dinámico
    if (document.getElementById('resumen-dinamico')) {
      this.renderResumenDinamico();
    }

    // Actualizar cada 5 minutos (Regla #6)
    setInterval(() => this._actualizarTodo(), 5 * 60 * 1000);
  },

  /* ══════════════════════════════════════════════════════════════
     GRÁFICO DE BARRAS — Votos por candidato
  ══════════════════════════════════════════════════════════════ */
  renderGraficoBarras() {
    const ctx = document.getElementById('grafico-barras')?.getContext('2d');
    if (!ctx) return;

    const pcts    = SED.getPorcentajesVotos();
    const contador = SED.getContador();

    if (this._graficos.barras) {
      this._graficos.barras.destroy();
    }

    this._graficos.barras = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['KEIKO FUJIMORI\nFuerza Popular', 'ROBERTO SÁNCHEZ\nJuntos por el Perú'],
        datasets: [{
          label: '% de votos válidos',
          data: [parseFloat(pcts.fp), parseFloat(pcts.jp)],
          backgroundColor: ['#004b8d', '#c9a84c'],
          borderColor:     ['#002a5c', '#92640a'],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1200,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y.toFixed(2)}% de votos válidos`,
              afterLabel: (ctx) => {
                const votos = ctx.dataIndex === 0 ? contador.fp : contador.jp;
                return ` ${votos.toLocaleString('es-PE')} votos`;
              }
            }
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (v) => v + '%',
              font: { family: 'Inter', size: 11 },
            },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
          x: {
            ticks: {
              font: { family: 'Inter', size: 11, weight: '600' },
            },
            grid: { display: false },
          }
        }
      }
    });

    // Actualizar etiquetas de porcentaje en el HTML
    const elFP = document.getElementById('pct-fp');
    const elJP = document.getElementById('pct-jp');
    if (elFP) elFP.textContent = pcts.fp + '%';
    if (elJP) elJP.textContent = pcts.jp + '%';
  },

  /* ══════════════════════════════════════════════════════════════
     GRÁFICO DE DONA — Avance de actas
  ══════════════════════════════════════════════════════════════ */
  renderGraficoDonaAvance() {
    const ctx = document.getElementById('grafico-dona')?.getContext('2d');
    if (!ctx) return;

    const c = SED.getContador();

    if (this._graficos.dona) {
      this._graficos.dona.destroy();
    }

    this._graficos.dona = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Contabilizadas', 'Observadas', 'Pendientes'],
        datasets: [{
          data: [c.contabilizadas, c.observadas, c.pendientes],
          backgroundColor: ['#004b8d', '#c9a84c', '#e2e8f0'],
          borderColor:     ['#002a5c', '#92640a', '#cbd5e1'],
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        animation: { duration: 1000, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Inter', size: 11 },
              padding: 16,
              usePointStyle: true,
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed} mesas`
            }
          }
        }
      }
    });

    // Texto central del dona
    this._renderTextoCentralDona(SED.getPorcentajeAvance());
  },

  _renderTextoCentralDona(porcentaje) {
    const el = document.getElementById('dona-porcentaje');
    if (el) {
      el.textContent = porcentaje + '%';
    }
  },

  /* ══════════════════════════════════════════════════════════════
     RESUMEN DINÁMICO — Tarjetas con datos reales
  ══════════════════════════════════════════════════════════════ */
  renderResumenDinamico() {
    const contenedor = document.getElementById('resumen-dinamico');
    if (!contenedor) return;

    const c   = SED.getContador();
    const pct = SED.getPorcentajeAvance();
    const pcts = SED.getPorcentajesVotos();

    contenedor.innerHTML = `
      <div class="resumen-grid">

        <div class="resumen-card azul">
          <div class="resumen-icon">📊</div>
          <div class="resumen-data">
            <span class="resumen-numero">${pct}%</span>
            <span class="resumen-label">Actas procesadas</span>
          </div>
        </div>

        <div class="resumen-card verde">
          <div class="resumen-icon">✅</div>
          <div class="resumen-data">
            <span class="resumen-numero">${c.contabilizadas.toLocaleString('es-PE')}</span>
            <span class="resumen-label">Contabilizadas</span>
          </div>
        </div>

        <div class="resumen-card dorado">
          <div class="resumen-icon">⚖️</div>
          <div class="resumen-data">
            <span class="resumen-numero">${c.observadas.toLocaleString('es-PE')}</span>
            <span class="resumen-label">Para envío al JNE</span>
          </div>
        </div>

        <div class="resumen-card gris">
          <div class="resumen-icon">⏳</div>
          <div class="resumen-data">
            <span class="resumen-numero">${c.pendientes.toLocaleString('es-PE')}</span>
            <span class="resumen-label">Pendientes</span>
          </div>
        </div>

      </div>

      <div class="candidatos-resumen">
        <div class="candidato-barra">
          <div class="candidato-info">
            <strong>KEIKO FUJIMORI</strong>
            <span>Fuerza Popular</span>
          </div>
          <div class="barra-candidato-wrapper">
            <div class="barra-candidato azul" style="width: ${pcts.fp}%"></div>
          </div>
          <span class="candidato-pct">${pcts.fp}%</span>
        </div>

        <div class="candidato-barra">
          <div class="candidato-info">
            <strong>ROBERTO SÁNCHEZ</strong>
            <span>Juntos por el Perú</span>
          </div>
          <div class="barra-candidato-wrapper">
            <div class="barra-candidato dorado" style="width: ${pcts.jp}%"></div>
          </div>
          <span class="candidato-pct">${pcts.jp}%</span>
        </div>
      </div>

      <p class="update-time" style="text-align:right; margin-top:12px;">
        Actualizado: ${SED.formatearFecha(SED.getContador().ultimaActualizacion)}
      </p>
    `;

    // Animar barras de candidatos
    setTimeout(() => {
      document.querySelectorAll('.barra-candidato').forEach(b => {
        b.style.transition = 'width 1.2s ease';
      });
    }, 100);
  },

  /* ══════════════════════════════════════════════════════════════
     ACTUALIZAR TODO — Se llama cada 5 min (Regla #6)
  ══════════════════════════════════════════════════════════════ */
  _actualizarTodo() {
    console.log('[SED-2026] Actualizando estadísticas...');
    this.renderGraficoBarras();
    this.renderGraficoDonaAvance();
    this.renderResumenDinamico();
  },

};

/* ── INICIALIZAR AL CARGAR ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => Estadisticas.init());