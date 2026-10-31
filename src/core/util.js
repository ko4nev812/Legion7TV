export { clamp } from './consts.js';
export const has = (m, k) => Object.prototype.hasOwnProperty.call(m, k);

export function parseNick(v) {
    v = String(v || '').trim().toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '');
    const i = v.lastIndexOf('/');
    if (i >= 0) v = v.slice(i + 1);
    v = v.replace(/^@/, '');
    return /^[a-z0-9_]{1,25}$/.test(v) ? v : '';
}