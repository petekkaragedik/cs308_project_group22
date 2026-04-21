/** Use relative URLs with CRA proxy, or set REACT_APP_API_URL=http://localhost:3001 */
export function apiUrl(path) {
  const base = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
