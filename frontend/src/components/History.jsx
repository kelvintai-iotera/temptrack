import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../api/axiosSetup';
import { Button } from './ui/Button';
import { Download, Play, Plus, Trash2, Database, Code2 } from 'lucide-react';
import { formatBeaconStatus } from '../utils/beaconDisplay';
import {
  DEFAULT_SQL,
  HISTORY_FIELDS,
  STATUS_OPTIONS,
  defaultFilterRow,
  filtersToSql,
  normalizeFiltersForApi,
  operatorsForField,
} from '../utils/historyQuery';

const PAGE_SIZE = 300;

function formatReportAt(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function FilterRow({ row, onChange, onRemove, canRemove }) {
  const ops = operatorsForField(row.field);
  const isStatus = row.field === 'status';
  const isIn = String(row.op).toLowerCase() === 'in';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.4fr)_auto] gap-2 items-center">
      <select
        value={row.field}
        onChange={(e) => onChange({ ...row, field: e.target.value, op: operatorsForField(e.target.value)[0]?.value || '=' })}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
      >
        {HISTORY_FIELDS.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>

      <select
        value={row.op}
        onChange={(e) => onChange({ ...row, op: e.target.value })}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
      >
        {ops.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {isStatus && !isIn ? (
        <select
          value={row.value}
          onChange={(e) => onChange({ ...row, value: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="">Select status…</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={row.field === 'report_at' ? 'datetime-local' : 'text'}
          value={row.value}
          onChange={(e) => onChange({ ...row, value: e.target.value })}
          placeholder={isIn ? 'in, out, alert' : row.field === 'temp' ? 'e.g. 32' : 'Value'}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove filter"
        className="justify-self-end"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

export const History = () => {
  const [mode, setMode] = useState('builder');
  const [filters, setFilters] = useState([defaultFilterRow()]);
  const [sqlText, setSqlText] = useState(DEFAULT_SQL);
  const [orderBy, setOrderBy] = useState('report_at');
  const [orderDir, setOrderDir] = useState('desc');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const previewSql = useMemo(() => {
    if (mode === 'sql') return sqlText;
    return filtersToSql(filters, { orderBy, orderDir, limit: PAGE_SIZE, offset });
  }, [mode, sqlText, filters, orderBy, orderDir, offset]);

  const fetchQuery = useCallback(async (nextOffset = offset) => {
    setLoading(true);
    setError('');
    const payload = mode === 'sql'
      ? { sql: sqlText }
      : {
        filters: normalizeFiltersForApi(filters),
        orderBy,
        orderDir,
        limit: PAGE_SIZE,
        offset: nextOffset,
      };

    try {
      const res = await axios.post('/history/query', payload);
      setRows(res.data.items || []);
      setTotal(res.data.total ?? 0);
      if (mode === 'builder') {
        setOffset(res.data.offset ?? nextOffset);
      } else {
        setOffset(res.data.offset ?? 0);
      }
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err.response?.data?.error || err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  }, [mode, sqlText, filters, orderBy, orderDir, offset]);

  const runQuery = useCallback(() => {
    if (mode === 'builder') {
      setOffset(0);
      return fetchQuery(0);
    }
    return fetchQuery();
  }, [mode, fetchQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.post('/history/query', {
          filters: [],
          orderBy: 'report_at',
          orderDir: 'desc',
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (!cancelled) {
          setRows(res.data.items || []);
          setTotal(res.data.total ?? 0);
          setOffset(0);
        }
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
          setError(err.response?.data?.error || err.message || 'Query failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    setError('');
    try {
      const payload = mode === 'sql'
        ? { sql: sqlText.replace(/\blimit\s+\d+/i, `LIMIT ${50000}`) }
        : {
          filters: normalizeFiltersForApi(filters),
          orderBy,
          orderDir,
          limit: 50000,
        };

      const res = await axios.post('/history/export', payload, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `history-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const parsed = JSON.parse(text);
          setError(parsed.error || 'Export failed');
        } catch {
          setError(text || 'Export failed');
        }
      } else {
        setError(err.response?.data?.error || err.message || 'Export failed');
      }
    } finally {
      setExporting(false);
    }
  }, [mode, sqlText, filters, orderBy, orderDir]);

  const page = Math.floor(offset / PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <Database className="text-accent-cyan" size={28} />
            History Query
          </h2>
          <p className="text-sm text-muted mt-1">
            Filter beacon history like SQL, preview results, then export to CSV.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={runQuery} disabled={loading}>
            <Play size={16} />
            {loading ? 'Running…' : 'Run Query'}
          </Button>
          <Button variant="secondary" onClick={exportCsv} disabled={exporting}>
            <Download size={16} />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <div className="glass-panel p-4 md:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('builder')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'builder'
                ? 'bg-cyan-100 text-cyan-800 dark:bg-accent-cyan/15 dark:text-accent-cyan'
                : 'text-muted hover:text-foreground hover:bg-[var(--color-panel-hover)]'
            }`}
          >
            Visual Builder
          </button>
          <button
            type="button"
            onClick={() => setMode('sql')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              mode === 'sql'
                ? 'bg-cyan-100 text-cyan-800 dark:bg-accent-cyan/15 dark:text-accent-cyan'
                : 'text-muted hover:text-foreground hover:bg-[var(--color-panel-hover)]'
            }`}
          >
            <Code2 size={14} />
            SQL
          </button>
        </div>

        {mode === 'builder' ? (
          <div className="flex flex-col gap-3">
            {filters.map((row) => (
              <FilterRow
                key={row.id}
                row={row}
                canRemove={filters.length > 1}
                onChange={(next) => setFilters((prev) => prev.map((f) => (f.id === row.id ? next : f)))}
                onRemove={() => setFilters((prev) => prev.filter((f) => f.id !== row.id))}
              />
            ))}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters((prev) => [...prev, defaultFilterRow()])}
              >
                <Plus size={14} />
                Add Filter
              </Button>

              <div className="flex flex-wrap items-center gap-2 ml-auto text-sm">
                <span className="text-muted">Order</span>
                <select
                  value={orderBy}
                  onChange={(e) => { setOrderBy(e.target.value); setOffset(0); }}
                  className="rounded-lg border border-border bg-card px-2 py-1.5"
                >
                  {HISTORY_FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={orderDir}
                  onChange={(e) => { setOrderDir(e.target.value); setOffset(0); }}
                  className="rounded-lg border border-border bg-card px-2 py-1.5"
                >
                  <option value="desc">DESC</option>
                  <option value="asc">ASC</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={sqlText}
              onChange={(e) => { setSqlText(e.target.value); setOffset(0); }}
              rows={8}
              spellCheck={false}
              className="w-full font-mono text-sm rounded-xl border border-border bg-card px-4 py-3"
              aria-label="SQL query"
            />
            <p className="text-xs text-muted">
              Supported: SELECT * FROM history, WHERE (AND), ORDER BY, LIMIT, OFFSET.
              Temperature values use °C (e.g. temp &gt;= 32).
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-slate-50 dark:bg-white/5 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted mb-2">Query Preview</p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/90">{previewSql}</pre>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">{error}</p>
        )}
      </div>

      <div className="glass-panel p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold">Results</h3>
          <p className="text-sm text-muted">
            {total.toLocaleString()} row{total !== 1 ? 's' : ''}
            {mode === 'builder' && total > 0 ? ` · page ${page + 1} of ${totalPages}` : ''}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-muted py-8 text-center space-y-2">
            {loading ? (
              <p>Loading…</p>
            ) : (
              <>
                <p>No history records match this query.</p>
                <p className="text-xs max-w-md mx-auto">
                  History is recorded periodically from live beacon readings (about once per minute when data changes).
                  If beacons are online and reporting, new rows will appear here automatically.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 md:mx-0">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="py-2 pr-3 font-medium">Report Time</th>
                  <th className="py-2 pr-3 font-medium">Beacon</th>
                  <th className="py-2 pr-3 font-medium">MAC</th>
                  <th className="py-2 pr-3 font-medium">Gateway</th>
                  <th className="py-2 pr-3 font-medium">Temp</th>
                  <th className="py-2 pr-3 font-medium">Battery</th>
                  <th className="py-2 pr-3 font-medium">RSSI</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.beacon_mac_addr}-${row.report_at}-${idx}`} className="border-b border-border/60">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatReportAt(row.report_at)}</td>
                    <td className="py-2 pr-3">{row.nickname || row.name || '—'}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.beacon_mac_addr}</td>
                    <td className="py-2 pr-3">{row.gateway_name || '—'}</td>
                    <td className="py-2 pr-3">{row.temp != null ? `${row.temp}°C` : '—'}</td>
                    <td className="py-2 pr-3">{row.battery != null ? `${row.battery}%` : '—'}</td>
                    <td className="py-2 pr-3">{row.rssi ?? '—'}</td>
                    <td className="py-2">{formatBeaconStatus(String(row.status || '').toLowerCase())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {mode === 'builder' && total > PAGE_SIZE && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={offset <= 0 || loading}
              onClick={() => fetchQuery(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => fetchQuery(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
