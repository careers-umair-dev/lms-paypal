// Tiny structured logger: JSON lines in production, pretty text in development.
const isProd = process.env.NODE_ENV === 'production';
const level = (process.env.LOG_LEVEL || (isProd ? 'info' : 'debug')).toLowerCase();
const ORDER = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' };

function emit(lvl, msg, meta) {
  if (ORDER[lvl] > ORDER[level]) return;
  const stream = lvl === 'error' ? console.error : console.log;
  if (isProd) stream(JSON.stringify({ ts: new Date().toISOString(), level: lvl, msg, ...meta }));
  else stream(`${COLORS[lvl] || ''}${lvl.toUpperCase().padEnd(5)}\x1b[0m ${msg}`, meta && Object.keys(meta).length ? meta : '');
}
export const logger = {
  error: (msg, meta) => emit('error', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  debug: (msg, meta) => emit('debug', msg, meta),
};
export default logger;
