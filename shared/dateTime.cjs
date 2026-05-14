const pad = (value) => String(value).padStart(2, '0');

const parseMySqlDateTime = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const mysqlMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?(?:Z)?$/
  );

  if (mysqlMatch) {
    const [, y, m, d, h = '0', min = '0', s = '0'] = mysqlMatch;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(h),
      Number(min),
      Number(s),
      0
    );
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLocalDateTime = (value) => {
  const date = parseMySqlDateTime(value);
  if (!date) return '';

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toLocalInputDateTime = (value) => {
  const date = value instanceof Date ? value : parseMySqlDateTime(value);
  if (!date) return '';

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatMySqlDateTime = (value) => {
  const date = parseMySqlDateTime(value);
  if (!date) return null;

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

module.exports = {
  parseMySqlDateTime,
  formatLocalDateTime,
  toLocalInputDateTime,
  formatMySqlDateTime,
};
