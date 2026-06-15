export const HISTORY_FIELDS = [
  { id: 'beacon_mac_addr', label: 'Beacon MAC' },
  { id: 'gateway_name', label: 'Gateway Name' },
  { id: 'gateway_mac_addr', label: 'Gateway MAC' },
  { id: 'name', label: 'Beacon Name' },
  { id: 'nickname', label: 'Nickname' },
  { id: 'status', label: 'Status' },
  { id: 'temp', label: 'Temperature (°C)' },
  { id: 'battery', label: 'Battery (%)' },
  { id: 'rssi', label: 'RSSI' },
  { id: 'report_at', label: 'Report Time' },
];

export const STATUS_OPTIONS = [
  { value: 'in', label: 'In Range' },
  { value: 'out', label: 'Out' },
  { value: 'alert', label: 'Alert' },
];

const OPS_BY_TYPE = {
  string: [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: 'like', label: 'LIKE' },
    { value: 'not_like', label: 'NOT LIKE' },
  ],
  number: [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: '>', label: '>' },
    { value: '>=', label: '>=' },
    { value: '<', label: '<' },
    { value: '<=', label: '<=' },
  ],
  datetime: [
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: '=', label: '=' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
  ],
  status: [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: 'in', label: 'IN' },
  ],
};

export function fieldType(fieldId) {
  if (fieldId === 'temp' || fieldId === 'battery' || fieldId === 'rssi') return 'number';
  if (fieldId === 'report_at') return 'datetime';
  if (fieldId === 'status') return 'status';
  return 'string';
}

export function operatorsForField(fieldId) {
  return OPS_BY_TYPE[fieldType(fieldId)] || OPS_BY_TYPE.string;
}

export function defaultFilterRow() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    field: 'beacon_mac_addr',
    op: 'like',
    value: '',
  };
}

export function filtersToSql(filters, { orderBy = 'report_at', orderDir = 'desc', limit = 300, offset = 0 } = {}) {
  const lines = ['SELECT * FROM history'];

  const active = filters.filter((f) => f.field && f.value !== '' && f.value != null);
  if (active.length > 0) {
    const where = active.map((f) => {
      const type = fieldType(f.field);
      const op = String(f.op || '=').toUpperCase();

      if (op === 'IN') {
        const list = String(f.value)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => `'${v.replace(/'/g, "''")}'`)
          .join(', ');
        return `${f.field} IN (${list})`;
      }

      if (type === 'string' || type === 'datetime' || type === 'status') {
        const quoted = `'${String(f.value).replace(/'/g, "''")}'`;
        if (op === 'LIKE' || op === 'NOT LIKE') {
          return `${f.field} ${op} ${quoted}`;
        }
        return `${f.field} ${op} ${quoted}`;
      }

      return `${f.field} ${op} ${f.value}`;
    }).join('\n  AND ');

    lines.push(`WHERE ${where}`);
  }

  lines.push(`ORDER BY ${orderBy} ${orderDir.toUpperCase()}`);
  lines.push(`LIMIT ${limit}`);
  if (offset > 0) {
    lines.push(`OFFSET ${offset}`);
  }

  return lines.join('\n');
}

export function normalizeFiltersForApi(filters) {
  return filters
    .filter((f) => f.field && f.value !== '' && f.value != null)
    .map((f) => {
      const op = String(f.op || '=').toLowerCase();
      if (op === 'in') {
        return {
          field: f.field,
          op: 'in',
          value: String(f.value)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
        };
      }
      return { field: f.field, op, value: f.value };
    });
}

export const DEFAULT_SQL = `SELECT * FROM history
ORDER BY report_at DESC
LIMIT 300`;
