import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Reportes.css';

const API_URL = 'http://localhost:8000/api';

const hoy = new Date().toISOString().split('T')[0];
const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().split('T')[0];

const fmt = (n) =>
  `Bs. ${parseFloat(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
const fmtPct = (n) => `${parseFloat(n || 0).toFixed(1)}%`;

const TABS = [
  { id: 'ejecutivo',    icon: '📋', label: 'Informe Ejecutivo' },
  { id: 'ventas',       icon: '💰', label: 'Ventas' },
  { id: 'inventario',   icon: '📦', label: 'Inventario' },
  { id: 'compras',      icon: '🛒', label: 'Compras' },
  { id: 'rentabilidad', icon: '💹', label: 'Rentabilidad' },
];

// ── Componentes reutilizables ─────────────────────────────────

function KpiCard({ icon, label, value, sub, color = 'primary' }) {
  return (
    <div className={`kpi-card kpi-${color}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

function BarChart({ data, valueKey, labelKey, color = '#6366f1' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0));
  return (
    <div className="bar-chart">
      {data.map((item, i) => {
        const val = parseFloat(item[valueKey]) || 0;
        return (
          <div key={i} className="bar-item">
            <div className="bar-label">{item[labelKey]}</div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: max > 0 ? `${(val / max) * 100}%` : '0%', background: color }}
              />
              <span className="bar-value">{fmt(val)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function exportarCSV(headers, rows, nombre) {
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${c ?? ''}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${nombre}_${hoy}.csv`;
  link.click();
}

// ── TAB: Informe Ejecutivo ────────────────────────────────────

function TabEjecutivo({ datos }) {
  if (!datos) {
    return (
      <div className="reporte-empty">
        <div className="empty-icon">📋</div>
        <p>Cargando informe ejecutivo...</p>
      </div>
    );
  }

  const { ventas, inventario, compras, financiero, tendencia_6_meses, periodo, generado_en } = datos;
  const gananciaNegativa = financiero?.ganancia_neta_mes < 0;

  const imprimirEjecutivo = () => {
    const contenido = document.getElementById('ejecutivo-print');
    if (!contenido) return;

    const ventana = window.open('', '_blank', 'width=900,height=700');
    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Informe Ejecutivo — Mana Music</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              color: #1e293b;
              line-height: 1.7;
              padding: 30px 40px;
              background: white;
            }
            .doc-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 20px;
              margin-bottom: 24px;
            }
            .doc-brand { display: flex; align-items: center; gap: 16px; }
            .doc-logo { font-size: 40px; line-height: 1; }
            .doc-empresa {
              font-size: 22px; font-weight: 800; color: #0f172a;
              margin: 0; letter-spacing: 1px;
              font-family: 'Arial', sans-serif;
            }
            .doc-titulo-doc {
              font-size: 13px; font-weight: 500; color: #64748b;
              margin: 4px 0 0 0; letter-spacing: 0.5px;
              font-family: 'Arial', sans-serif;
            }
            .doc-meta { text-align: right; font-family: 'Arial', sans-serif; }
            .doc-meta-item {
              font-size: 13px; color: #64748b;
              display: flex; justify-content: flex-end; gap: 6px;
            }
            .doc-meta-label { color: #94a3b8; }
            .doc-divider {
              border: none; border-top: 2px solid #0f172a; margin: 0 0 28px 0;
            }
            .doc-seccion { margin-bottom: 28px; }
            .doc-seccion-titulo {
              font-size: 12px; font-weight: 700; color: #0f172a;
              letter-spacing: 1px; margin: 0 0 14px 0;
              padding-bottom: 6px; border-bottom: 1px solid #e2e8f0;
              font-family: 'Arial', sans-serif;
            }
            .doc-texto p {
              margin: 0 0 12px 0; font-size: 14px;
              color: #334155; text-align: justify;
            }
            .doc-positivo { color: #16a34a; }
            .doc-negativo { color: #dc2626; }
            .doc-alerta   { color: #dc2626; }
            .doc-advertencia { color: #d97706; }
            .doc-kpis-grid {
              display: grid; grid-template-columns: repeat(4, 1fr);
              gap: 1px; background: #e2e8f0;
              border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
            }
            .doc-kpi { background: white; padding: 16px; text-align: center; }
            .doc-kpi-valor {
              font-size: 16px; font-weight: 700; color: #0f172a;
              font-family: 'Arial', sans-serif; line-height: 1.2;
            }
            .doc-kpi-etiqueta {
              font-size: 10px; color: #64748b; margin-top: 4px;
              font-family: 'Arial', sans-serif; font-weight: 500;
            }
            .doc-tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
            .doc-tabla td {
              padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #334155;
            }
            .doc-tabla td:first-child { color: #64748b; width: 60%; }
            .doc-tabla td:last-child { text-align: right; font-weight: 500; }
            .doc-tabla-destacada { background: #f8fafc; font-size: 14px; }
            .doc-tabla-destacada td { border-top: 1px solid #e2e8f0; }
            /* Bar chart */
            .bar-chart { display: flex; flex-direction: column; gap: 8px; }
            .bar-item { display: flex; align-items: center; gap: 10px; }
            .bar-label {
              min-width: 80px; max-width: 120px; font-size: 11px;
              color: #64748b; text-align: right;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .bar-track {
              flex: 1; height: 24px; background: #f1f5f9;
              border-radius: 4px; position: relative; overflow: hidden;
            }
            .bar-fill { height: 100%; border-radius: 4px; }
            .bar-value {
              position: absolute; right: 8px; top: 50%;
              transform: translateY(-50%); font-size: 11px;
              font-weight: 600; color: #334155; white-space: nowrap;
            }
            .doc-footer {
              margin-top: 40px; padding-top: 16px;
              border-top: 1px solid #e2e8f0; text-align: center;
            }
            .doc-footer p {
              font-size: 10px; color: #94a3b8; margin: 4px 0;
              font-family: 'Arial', sans-serif;
            }
            @page { margin: 15mm 20mm; size: A4 portrait; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${contenido.innerHTML}
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => {
      ventana.print();
      ventana.close();
    }, 500);
  };

  return (
    <div className="ejecutivo-container">
      <div className="ejecutivo-acciones no-print">
        <button className="btn-imprimir-reporte" onClick={imprimirEjecutivo}>
          🖨️ Imprimir / Exportar PDF
        </button>
      </div>

      <div className="ejecutivo-documento" id="ejecutivo-print">

        {/* Encabezado del documento */}
        <div className="doc-header">
          <div className="doc-brand">
            <span className="doc-logo">🎵</span>
            <div>
              <h1 className="doc-empresa">MANA MUSIC</h1>
              <h2 className="doc-titulo-doc">INFORME EJECUTIVO DE GESTIÓN</h2>
            </div>
          </div>
          <div className="doc-meta">
            <div className="doc-meta-item">
              <span className="doc-meta-label">Período:</span>
              <strong>{periodo?.mes_actual}</strong>
            </div>
            <div className="doc-meta-item">
              <span className="doc-meta-label">Generado:</span>
              <strong>{new Date(generado_en + 'T00:00:00').toLocaleDateString('es-BO', {
                day: '2-digit', month: 'long', year: 'numeric'
              })}</strong>
            </div>
            <div className="doc-meta-item">
              <span className="doc-meta-label">Año:</span>
              <strong>{periodo?.anio}</strong>
            </div>
          </div>
        </div>

        <div className="doc-divider" />

        {/* 1. Resumen Ejecutivo */}
        <section className="doc-seccion">
          <h3 className="doc-seccion-titulo">1. RESUMEN EJECUTIVO</h3>
          <div className="doc-texto">
            <p>
              Durante el mes de <strong>{periodo?.mes_actual}</strong>, Mana Music registró ingresos
              totales por ventas de <strong>{fmt(ventas?.total_mes)}</strong>, distribuidos en{' '}
              <strong>{ventas?.num_ventas_mes} transacciones</strong> con un ticket promedio de{' '}
              <strong>{fmt(ventas?.ticket_promedio)}</strong>.
            </p>
            <p>
              El gasto en adquisición de mercadería ascendió a{' '}
              <strong>{fmt(compras?.total_mes)}</strong> en{' '}
              <strong>{compras?.num_compras_mes} órdenes de compra</strong>, resultando en una
              ganancia neta estimada de{' '}
              <strong className={gananciaNegativa ? 'doc-negativo' : 'doc-positivo'}>
                {fmt(financiero?.ganancia_neta_mes)}
              </strong>{' '}
              con un margen bruto del{' '}
              <strong>{fmtPct(financiero?.margen_porcentaje)}</strong>.
            </p>
            <p>
              El inventario comprende <strong>{inventario?.total_productos} productos</strong> con
              un valor total de <strong>{fmt(inventario?.valor_total)}</strong>.{' '}
              {inventario?.criticos > 0 || inventario?.bajos > 0 ? (
                <>
                  Se identifican <strong className="doc-alerta">
                    {inventario?.criticos} producto(s) en estado crítico
                  </strong> y{' '}
                  <strong className="doc-advertencia">
                    {inventario?.bajos} con stock bajo
                  </strong>, los cuales requieren atención prioritaria.{' '}
                  {inventario?.ordenes_pendientes > 0 && (
                    <>Existen <strong>{inventario?.ordenes_pendientes} órdenes de reabastecimiento pendientes</strong> de aprobación.</>
                  )}
                </>
              ) : (
                <>El inventario se encuentra en buen estado operativo.</>
              )}
            </p>
            <p>
              El producto con mayor facturación del mes fue <strong>{ventas?.top_producto}</strong>,
              y el vendedor con mejor desempeño fue <strong>{ventas?.mejor_vendedor}</strong>.
            </p>
          </div>
        </section>

        {/* 2. KPIs */}
        <section className="doc-seccion">
          <h3 className="doc-seccion-titulo">2. INDICADORES CLAVE DE DESEMPEÑO</h3>
          <div className="doc-kpis-grid">
            {[
              { label: 'Ventas del Mes',      valor: fmt(ventas?.total_mes) },
              { label: 'Transacciones',        valor: ventas?.num_ventas_mes },
              { label: 'Ticket Promedio',      valor: fmt(ventas?.ticket_promedio) },
              { label: 'Margen Bruto',         valor: fmtPct(financiero?.margen_porcentaje) },
              { label: 'Ganancia Neta Mes',    valor: fmt(financiero?.ganancia_neta_mes), negativo: gananciaNegativa },
              { label: 'Ventas Acum. del Año', valor: fmt(ventas?.total_anio) },
              { label: 'Valor Inventario',     valor: fmt(inventario?.valor_total) },
              { label: 'Compras del Mes',      valor: fmt(compras?.total_mes) },
            ].map((kpi, i) => (
              <div key={i} className="doc-kpi">
                <div className={`doc-kpi-valor ${kpi.negativo ? 'doc-negativo' : ''}`}>
                  {kpi.valor}
                </div>
                <div className="doc-kpi-etiqueta">{kpi.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Tendencia */}
        {tendencia_6_meses?.length > 0 && (
          <section className="doc-seccion">
            <h3 className="doc-seccion-titulo">3. TENDENCIA DE VENTAS — ÚLTIMOS 6 MESES</h3>
            <BarChart
              data={tendencia_6_meses}
              valueKey="total"
              labelKey="mes"
              color="#6366f1"
            />
          </section>
        )}

        {/* 4. Análisis de Ventas */}
        <section className="doc-seccion">
          <h3 className="doc-seccion-titulo">4. ANÁLISIS DE VENTAS</h3>
          <table className="doc-tabla">
            <tbody>
              <tr><td>Total vendido en el mes</td><td><strong>{fmt(ventas?.total_mes)}</strong></td></tr>
              <tr><td>Número de transacciones</td><td><strong>{ventas?.num_ventas_mes}</strong></td></tr>
              <tr><td>Ticket promedio por transacción</td><td><strong>{fmt(ventas?.ticket_promedio)}</strong></td></tr>
              <tr><td>Producto más vendido del mes</td><td><strong>{ventas?.top_producto}</strong></td></tr>
              <tr><td>Vendedor con mayor facturación</td><td><strong>{ventas?.mejor_vendedor}</strong></td></tr>
              <tr><td>Ventas acumuladas del año</td><td><strong>{fmt(ventas?.total_anio)}</strong></td></tr>
            </tbody>
          </table>
        </section>

        {/* 5. Inventario */}
        <section className="doc-seccion">
          <h3 className="doc-seccion-titulo">5. ESTADO DEL INVENTARIO</h3>
          <table className="doc-tabla">
            <tbody>
              <tr><td>Total de productos gestionados</td><td><strong>{inventario?.total_productos}</strong></td></tr>
              <tr><td>Valor total del inventario</td><td><strong>{fmt(inventario?.valor_total)}</strong></td></tr>
              <tr>
                <td>Productos en estado crítico</td>
                <td><strong className={inventario?.criticos > 0 ? 'doc-alerta' : ''}>{inventario?.criticos}</strong></td>
              </tr>
              <tr>
                <td>Productos con stock bajo</td>
                <td><strong className={inventario?.bajos > 0 ? 'doc-advertencia' : ''}>{inventario?.bajos}</strong></td>
              </tr>
              <tr><td>Órdenes de reabastecimiento pendientes</td><td><strong>{inventario?.ordenes_pendientes}</strong></td></tr>
            </tbody>
          </table>
        </section>

        {/* 6. Financiero */}
        <section className="doc-seccion">
          <h3 className="doc-seccion-titulo">6. RESULTADO FINANCIERO DEL MES</h3>
          <table className="doc-tabla">
            <tbody>
              <tr><td>Ingresos por ventas</td><td><strong>{fmt(ventas?.total_mes)}</strong></td></tr>
              <tr><td>Egresos por compras de mercadería</td><td><strong>{fmt(compras?.total_mes)}</strong></td></tr>
              <tr><td>Número de órdenes de compra emitidas</td><td><strong>{compras?.num_compras_mes}</strong></td></tr>
              <tr className="doc-tabla-destacada">
                <td><strong>Ganancia neta estimada</strong></td>
                <td>
                  <strong className={gananciaNegativa ? 'doc-negativo' : 'doc-positivo'}>
                    {fmt(financiero?.ganancia_neta_mes)}
                  </strong>
                </td>
              </tr>
              <tr className="doc-tabla-destacada">
                <td><strong>Margen bruto del período</strong></td>
                <td><strong>{fmtPct(financiero?.margen_porcentaje)}</strong></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <div className="doc-footer">
          <div className="doc-footer-linea" />
          <p>Informe generado automáticamente por el sistema de gestión Mana Music.</p>
          <p>Fecha de generación: {new Date().toLocaleDateString('es-BO', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
          })} — Documento de uso interno y carácter confidencial.</p>
        </div>
      </div>
    </div>
  );
}

// ── TAB: Ventas ───────────────────────────────────────────────

function TabVentas({ datos }) {
  if (!datos) {
    return (
      <div className="reporte-empty">
        <div className="empty-icon">💰</div>
        <p>Selecciona un período y pulsa <strong>Generar Reporte</strong>.</p>
      </div>
    );
  }

  const { totales, por_dia, por_forma_pago, por_producto, por_vendedor } = datos;

  return (
    <div>
      <div className="reporte-acciones">
        <button className="btn-exportar-reporte" onClick={() =>
          exportarCSV(
            ['Producto', 'Categoría', 'Cant. Vendida', 'Ingresos', 'N° Ventas'],
            (por_producto || []).map(p => [
              p.id_producto__nombre,
              p.id_producto__categoria__nombre || 'Sin categoría',
              p.cantidad_vendida,
              parseFloat(p.ingresos).toFixed(2),
              p.num_ventas
            ]),
            'ventas_productos'
          )
        }>📥 Exportar CSV</button>
      </div>

      <div className="kpi-grid">
        <KpiCard icon="💰" label="Total Vendido"    value={fmt(totales?.total_general)}    color="primary" />
        <KpiCard icon="🧾" label="Transacciones"    value={totales?.cantidad_total || 0}   color="blue" />
        <KpiCard icon="📊" label="Ticket Promedio"  value={fmt(totales?.promedio_general)} color="purple" />
        <KpiCard icon="📅" label="Días con Ventas"  value={por_dia?.length || 0}           color="green" />
      </div>

      {por_dia?.length > 0 && (
        <div className="reporte-seccion">
          <h3>Ventas por Día {por_dia.length > 15 && <span className="nota">(últimos 15 días)</span>}</h3>
          <BarChart
            data={por_dia.slice(-15)}
            valueKey="total"
            labelKey="fecha_venta__date"
            color="#6366f1"
          />
        </div>
      )}

      {por_forma_pago?.length > 0 && (
        <div className="reporte-seccion">
          <h3>Por Forma de Pago</h3>
          <div className="tabla-container">
            <table className="reporte-tabla">
              <thead>
                <tr><th>Forma de Pago</th><th>N° Ventas</th><th>Total</th></tr>
              </thead>
              <tbody>
                {por_forma_pago.map((f, i) => (
                  <tr key={i}>
                    <td>{f.forma_pago}</td>
                    <td>{f.cantidad}</td>
                    <td>{fmt(f.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {por_producto?.length > 0 && (
        <div className="reporte-seccion">
          <h3>Productos Más Vendidos (Top 20)</h3>
          <div className="tabla-container">
            <table className="reporte-tabla">
              <thead>
                <tr><th>#</th><th>Producto</th><th>Categoría</th><th>Cant. Vendida</th><th>Ingresos</th></tr>
              </thead>
              <tbody>
                {por_producto.slice(0, 20).map((p, i) => (
                  <tr key={i}>
                    <td className="col-numero">{i + 1}</td>
                    <td>{p.id_producto__nombre}</td>
                    <td>{p.id_producto__categoria__nombre || '—'}</td>
                    <td>{p.cantidad_vendida}</td>
                    <td>{fmt(p.ingresos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {por_vendedor?.length > 0 && (
        <div className="reporte-seccion">
          <h3>Ventas por Vendedor</h3>
          <div className="tabla-container">
            <table className="reporte-tabla">
              <thead>
                <tr><th>Vendedor</th><th>Email</th><th>N° Ventas</th><th>Total</th><th>Ticket Promedio</th></tr>
              </thead>
              <tbody>
                {por_vendedor.map((v, i) => (
                  <tr key={i}>
                    <td>{v.id_usuario__id_persona__nombres} {v.id_usuario__id_persona__apellido_paterno}</td>
                    <td className="col-email">{v.id_usuario__email}</td>
                    <td>{v.num_ventas}</td>
                    <td>{fmt(v.total_vendido)}</td>
                    <td>{fmt(v.ticket_promedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB: Inventario ───────────────────────────────────────────

function TabInventario({ datos }) {
  const [filtroEstado, setFiltroEstado] = useState('');

  if (!datos) {
    return (
      <div className="reporte-empty">
        <div className="empty-icon">📦</div>
        <p>Pulsa <strong>Generar Reporte</strong> para ver el estado actual del inventario.</p>
      </div>
    );
  }

  const { productos, valor_total, resumen_estados, total_productos } = datos;
  const productosFiltrados = filtroEstado ? productos.filter(p => p.estado === filtroEstado) : productos;

  const ESTADO_META = {
    NORMAL:     { color: 'green',  label: '✅ Normal',     badge: 'badge-green' },
    BAJO:       { color: 'yellow', label: '⚠️ Bajo',       badge: 'badge-yellow' },
    CRITICO:    { color: 'red',    label: '🔴 Crítico',    badge: 'badge-red' },
    SOBRESTOCK: { color: 'blue',   label: '🔵 Sobrestock', badge: 'badge-blue' },
  };

  return (
    <div>
      <div className="reporte-acciones">
        <button className="btn-exportar-reporte" onClick={() =>
          exportarCSV(
            ['Producto', 'Categoría', 'Stock', 'Mín', 'Máx', 'Estado', 'Valor', 'Últ. Venta'],
            productosFiltrados.map(p => [
              p.nombre, p.categoria, p.stock_actual, p.stock_minimo,
              p.stock_maximo, p.estado, p.valor.toFixed(2), p.ultima_venta || ''
            ]),
            'inventario_estado'
          )
        }>📥 Exportar CSV</button>
      </div>

      <div className="kpi-grid">
        <KpiCard icon="📦" label="Total Productos" value={total_productos}       color="primary" />
        <KpiCard icon="💰" label="Valor Total"     value={fmt(valor_total)}      color="blue" />
        <KpiCard icon="🔴" label="Críticos"         value={resumen_estados?.CRITICO || 0}    color="red" />
        <KpiCard icon="⚠️" label="Stock Bajo"      value={resumen_estados?.BAJO || 0}        color="yellow" />
      </div>

      <div className="reporte-seccion">
        <h3>Filtrar por Estado</h3>
        <div className="estado-chips">
          {Object.entries(resumen_estados || {}).map(([estado, count]) => {
            const meta = ESTADO_META[estado] || { color: 'grey', label: estado };
            return (
              <div
                key={estado}
                className={`estado-chip chip-${meta.color} ${filtroEstado === estado ? 'chip-activo' : ''}`}
                onClick={() => setFiltroEstado(filtroEstado === estado ? '' : estado)}
              >
                {meta.label}: <strong>{count}</strong>
              </div>
            );
          })}
          {filtroEstado && (
            <button className="btn-limpiar-chip" onClick={() => setFiltroEstado('')}>
              ✕ Limpiar filtro
            </button>
          )}
        </div>
      </div>

      <div className="reporte-seccion">
        <h3>
          Detalle de Inventario
          {filtroEstado && <span className="filtro-activo-label"> — {ESTADO_META[filtroEstado]?.label}</span>}
          <span className="tabla-count"> ({productosFiltrados.length} productos)</span>
        </h3>
        <div className="tabla-container">
          <table className="reporte-tabla">
            <thead>
              <tr>
                <th>Producto</th><th>Categoría</th><th>Stock</th>
                <th>Mín</th><th>Máx</th><th>Estado</th>
                <th>Valor</th><th>Últ. Venta</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p, i) => {
                const meta = ESTADO_META[p.estado] || { badge: 'badge-grey', label: p.estado };
                return (
                  <tr key={i} className={`fila-${ESTADO_META[p.estado]?.color || 'grey'}`}>
                    <td>{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td><strong>{p.stock_actual}</strong></td>
                    <td className="col-numero">{p.stock_minimo}</td>
                    <td className="col-numero">{p.stock_maximo}</td>
                    <td><span className={`badge-estado ${meta.badge}`}>{meta.label}</span></td>
                    <td>{fmt(p.valor)}</td>
                    <td className="col-fecha">{p.ultima_venta || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── TAB: Compras ──────────────────────────────────────────────

function TabCompras({ datos }) {
  if (!datos) {
    return (
      <div className="reporte-empty">
        <div className="empty-icon">🛒</div>
        <p>Selecciona un período y pulsa <strong>Generar Reporte</strong>.</p>
      </div>
    );
  }

  const { por_proveedor, totales, ordenes_pendientes } = datos;

  return (
    <div>
      <div className="reporte-acciones">
        <button className="btn-exportar-reporte" onClick={() =>
          exportarCSV(
            ['Proveedor', 'N° Compras', 'Total Comprado'],
            (por_proveedor || []).map(p => [
              p.id_proveedor__nombre, p.num_compras, parseFloat(p.total_comprado).toFixed(2)
            ]),
            'compras_proveedor'
          )
        }>📥 Exportar CSV</button>
      </div>

      <div className="kpi-grid">
        <KpiCard icon="🛒" label="Total Comprado"        value={fmt(totales?.total_general)} color="primary" />
        <KpiCard icon="🧾" label="Órdenes Emitidas"      value={totales?.num_total || 0}     color="blue" />
        <KpiCard icon="🏭" label="Proveedores Activos"   value={por_proveedor?.length || 0}  color="purple" />
        <KpiCard icon="⏳" label="Reabast. Pendientes"   value={ordenes_pendientes || 0}      color="yellow" />
      </div>

      {por_proveedor?.length > 0 && (
        <>
          <div className="reporte-seccion">
            <h3>Gasto por Proveedor</h3>
            <BarChart data={por_proveedor} valueKey="total_comprado" labelKey="id_proveedor__nombre" color="#0ea5e9" />
          </div>
          <div className="reporte-seccion">
            <div className="tabla-container">
              <table className="reporte-tabla">
                <thead>
                  <tr><th>Proveedor</th><th>N° Compras</th><th>Total Comprado</th></tr>
                </thead>
                <tbody>
                  {por_proveedor.map((p, i) => (
                    <tr key={i}>
                      <td>{p.id_proveedor__nombre}</td>
                      <td>{p.num_compras}</td>
                      <td>{fmt(p.total_comprado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!por_proveedor?.length && (
        <div className="reporte-empty">
          <p>No hay compras registradas en el período seleccionado.</p>
        </div>
      )}
    </div>
  );
}

// ── TAB: Rentabilidad ─────────────────────────────────────────

function TabRentabilidad({ datos }) {
  if (!datos || datos.length === 0) {
    return (
      <div className="reporte-empty">
        <div className="empty-icon">💹</div>
        <p>Selecciona un período y pulsa <strong>Generar Reporte</strong>.</p>
      </div>
    );
  }

  const totalIngresos  = datos.reduce((s, p) => s + p.ingresos, 0);
  const totalGanancia  = datos.reduce((s, p) => s + p.ganancia_total, 0);
  const margenPromedio = totalIngresos > 0 ? (totalGanancia / totalIngresos) * 100 : 0;
  const mejorProducto  = datos[0];
  const peorProducto   = datos[datos.length - 1];

  return (
    <div>
      <div className="reporte-acciones">
        <button className="btn-exportar-reporte" onClick={() =>
          exportarCSV(
            ['Producto', 'Cantidad', 'P. Venta', 'P. Compra', 'Margen Unit.', 'Margen %', 'Ganancia Total'],
            datos.map(p => [
              p.nombre, p.cantidad,
              parseFloat(p.precio_venta_promedio).toFixed(2),
              parseFloat(p.precio_compra_promedio).toFixed(2),
              parseFloat(p.margen_unitario).toFixed(2),
              parseFloat(p.margen_porcentaje).toFixed(1) + '%',
              parseFloat(p.ganancia_total).toFixed(2)
            ]),
            'rentabilidad'
          )
        }>📥 Exportar CSV</button>
      </div>

      <div className="kpi-grid">
        <KpiCard
          icon="💹" label="Ganancia Total"
          value={fmt(totalGanancia)}
          color={totalGanancia >= 0 ? 'green' : 'red'}
        />
        <KpiCard icon="📊" label="Margen Promedio"  value={fmtPct(margenPromedio)} color="blue" />
        <KpiCard icon="💰" label="Ingresos Totales" value={fmt(totalIngresos)}     color="primary" />
        <KpiCard
          icon="🏆" label="Mayor Ganancia"
          value={mejorProducto?.nombre || 'N/A'}
          sub={fmt(mejorProducto?.ganancia_total)}
          color="purple"
        />
      </div>

      <div className="reporte-seccion">
        <h3>Rentabilidad por Producto</h3>
        <div className="tabla-container">
          <table className="reporte-tabla">
            <thead>
              <tr>
                <th>#</th><th>Producto</th><th>Cant.</th>
                <th>P. Venta Prom.</th><th>P. Compra Prom.</th>
                <th>Margen Unit.</th><th>Margen %</th><th>Ganancia Total</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((p, i) => {
                const margenClase = p.margen_porcentaje >= 20 ? 'margen-alto'
                  : p.margen_porcentaje >= 10 ? 'margen-medio' : 'margen-bajo';
                return (
                  <tr key={i}>
                    <td className="col-numero">{i + 1}</td>
                    <td>{p.nombre}</td>
                    <td className="col-numero">{p.cantidad}</td>
                    <td>{fmt(p.precio_venta_promedio)}</td>
                    <td>{fmt(p.precio_compra_promedio)}</td>
                    <td className={p.margen_unitario >= 0 ? 'col-positivo' : 'col-negativo'}>
                      {fmt(p.margen_unitario)}
                    </td>
                    <td>
                      <span className={`badge-margen ${margenClase}`}>
                        {fmtPct(p.margen_porcentaje)}
                      </span>
                    </td>
                    <td className={`col-ganancia ${p.ganancia_total >= 0 ? 'col-positivo' : 'col-negativo'}`}>
                      {fmt(p.ganancia_total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="tabla-totales">
                <td colSpan={2}><strong>TOTALES</strong></td>
                <td></td><td></td><td></td><td></td>
                <td><strong>{fmtPct(margenPromedio)}</strong></td>
                <td className={totalGanancia >= 0 ? 'col-positivo' : 'col-negativo'}>
                  <strong>{fmt(totalGanancia)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────

function Reportes() {
  const [tabActual, setTabActual]   = useState('ejecutivo');
  const [fechaDesde, setFechaDesde] = useState(primerDiaMes);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [loading, setLoading]       = useState(false);
  const [datos, setDatos]           = useState({
    ejecutivo: null, ventas: null, inventario: null,
    compras: null, rentabilidad: null,
  });

  useEffect(() => { cargarEjecutivo(); }, []);

  const cargarEjecutivo = async () => {
    try {
      const res = await axios.get(`${API_URL}/reportes/ejecutivo/`);
      setDatos(prev => ({ ...prev, ejecutivo: res.data }));
    } catch (e) {
      console.error('Error cargando ejecutivo:', e);
    }
  };

  const generarReporte = async () => {
    setLoading(true);
    const params = { fecha_desde: fechaDesde, fecha_hasta: fechaHasta };
    try {
      if (tabActual === 'ejecutivo') {
        await cargarEjecutivo();

      } else if (tabActual === 'ventas') {
        const [periodoRes, productosRes, vendedoresRes] = await Promise.all([
          axios.get(`${API_URL}/reportes/ventas-periodo/`, { params }),
          axios.get(`${API_URL}/reportes/ventas-productos/`, { params }),
          axios.get(`${API_URL}/reportes/ventas-vendedores/`, { params }),
        ]);
        setDatos(prev => ({
          ...prev,
          ventas: {
            ...periodoRes.data,
            por_producto: productosRes.data,
            por_vendedor: vendedoresRes.data,
          }
        }));

      } else if (tabActual === 'inventario') {
        const res = await axios.get(`${API_URL}/reportes/inventario/`);
        setDatos(prev => ({ ...prev, inventario: res.data }));

      } else if (tabActual === 'compras') {
        const [comprasRes, ordenesRes] = await Promise.all([
          axios.get(`${API_URL}/reportes/compras/`, { params }),
          axios.get(`${API_URL}/ordenes-reabastecimiento/?estado=PENDIENTE`),
        ]);
        setDatos(prev => ({
          ...prev,
          compras: { ...comprasRes.data, ordenes_pendientes: ordenesRes.data.length }
        }));

      } else if (tabActual === 'rentabilidad') {
        const res = await axios.get(`${API_URL}/reportes/rentabilidad/`, { params });
        setDatos(prev => ({ ...prev, rentabilidad: res.data }));
      }
    } catch (e) {
      console.error('Error generando reporte:', e);
    } finally {
      setLoading(false);
    }
  };

  const mostrarFiltroFechas = tabActual !== 'ejecutivo' && tabActual !== 'inventario';

  const renderContenido = () => {
    if (loading) {
      return (
        <div className="reporte-loading">
          <div className="spinner" />
          <p>Generando reporte...</p>
        </div>
      );
    }
    switch (tabActual) {
      case 'ejecutivo':    return <TabEjecutivo    datos={datos.ejecutivo} />;
      case 'ventas':       return <TabVentas        datos={datos.ventas} />;
      case 'inventario':   return <TabInventario    datos={datos.inventario} />;
      case 'compras':      return <TabCompras        datos={datos.compras} />;
      case 'rentabilidad': return <TabRentabilidad  datos={datos.rentabilidad} />;
      default: return null;
    }
  };

  return (
    <div className="reportes-container">
      {/* Header */}
      <div className="reportes-header no-print">
        <h1>📊 Reportes</h1>
        <div className="reportes-controles">
          {mostrarFiltroFechas && (
            <div className="reportes-filtros">
              <div className="filtro-grupo">
                <label>Desde</label>
                <input
                  type="date" value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  className="filtro-date"
                />
              </div>
              <div className="filtro-grupo">
                <label>Hasta</label>
                <input
                  type="date" value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  className="filtro-date"
                />
              </div>
            </div>
          )}
          <button
            className="btn-generar"
            onClick={generarReporte}
            disabled={loading}
          >
            {loading ? '⏳ Generando...' : '🔄 Generar Reporte'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="reportes-tabs no-print">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${tabActual === tab.id ? 'tab-activo' : ''}`}
            onClick={() => setTabActual(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="reportes-contenido">
        {renderContenido()}
      </div>
    </div>
  );
}

export default Reportes;