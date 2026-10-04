export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const template = (title, lines) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
<h2 style="color:#4f46e5">${esc(title)}</h2>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>`;
