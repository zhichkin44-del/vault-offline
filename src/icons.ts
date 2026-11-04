// Static, hand-written SVG icons (1.6px outline). Inserted with innerHTML only
// from these constants, never from user data.
const wrap = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICON = {
  lock: wrap(`<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`),
  search: wrap(`<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>`),
  plus: wrap(`<path d="M12 5v14M5 12h14"/>`),
  more: wrap(`<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>`),
  copy: wrap(`<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>`),
  eye: wrap(`<path d="M2.5 12C5 7.5 8.2 5.5 12 5.5S19 7.5 21.5 12C19 16.5 15.8 18.5 12 18.5S5 16.5 2.5 12z"/><circle cx="12" cy="12" r="3"/>`),
  eyeOff: wrap(`<path d="M2.5 12C5 7.5 8.2 5.5 12 5.5S19 7.5 21.5 12C19 16.5 15.8 18.5 12 18.5S5 16.5 2.5 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>`),
  edit: wrap(`<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>`),
  key: wrap(`<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>`),
  note: wrap(`<path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/>`),
  sparkle: wrap(`<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>`),
  shield: wrap(`<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>`),
  offline: wrap(`<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.5M19 13a10 10 0 0 0-2.5-1.8M2 9.5a15 15 0 0 1 4.5-3M22 9.5A15 15 0 0 0 11 5.5"/><circle cx="12" cy="19.5" r="0.6"/>`),
  upload: wrap(`<path d="M12 15V4M8 8l4-4 4 4M5 20h14"/>`),
  download: wrap(`<path d="M12 4v11M8 11l4 4 4-4M5 20h14"/>`),
  settings: wrap(`<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>`),
  globe: wrap(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>`),
  x: wrap(`<path d="M6 6l12 12M18 6L6 18"/>`),
  refresh: wrap(`<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>`),
};
