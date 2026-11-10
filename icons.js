(() => {
  'use strict';

  const paths = Object.freeze({
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    equals: '<path d="M5 9h14M5 15h14"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronUp: '<path d="m6 15 6-6 6 6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
    arrowsLeftRight: '<path d="M17 8H3m0 0 4-4M3 8l4 4M7 16h14m0 0-4-4m4 4-4 4"/>',
    arrowsUpDown: '<path d="M8 3 4 7l4 4M4 7h12M16 21l4-4-4-4m4 4H8"/>',
    arrowUp: '<path d="M12 19V5m-7 7 7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14m7-7-7 7-7-7"/>',
    dotsVertical: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    archive: '<path d="M3 4h18v4H3zM5 8v12h14V8M9 12h6m-6 4h6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
    edit: '<path d="m15 5 4 4M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/>',
    scale: '<path d="m16 16 3-8 3 8a3 3 0 0 1-6 0ZM2 16l3-8 3 8a3 3 0 0 1-6 0ZM12 3v18m-4 0h8M5 8h14"/>',
    tools: '<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3 3.7-3.7Z"/>',
    exchange: '<path d="M7 7h11l-3-3M17 17H6l3 3M18 7a7 7 0 0 1 0 10M6 17a7 7 0 0 1 0-10"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="7.5" cy="7" r="2.2"/><circle cx="16.5" cy="17" r="2.2"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H20v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z"/><path d="M4 9h14a2 2 0 0 1 2 2v2H4"/><circle cx="16" cy="11.5" r=".7"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    pdf: '<path d="M7 3h7l5 5v13H5V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 15h8M8 18h5"/>',
    phone: '<path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>',
    calculator: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M8 6h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2"/>',
    backspace: '<path d="M21 5H8l-6 7 6 7h13V5Z"/><path d="m11 9 6 6m0-6-6 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>',
    filter: '<path d="M4 6h16M7 12h10m-7 6h4"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 21h16"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 21h16"/>',
    restore: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
    warning: '<path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 3h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    homeGrid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    square: '<rect x="4" y="4" width="16" height="16" rx="2"/>'
  });

  const escapeAttr = value => String(value).replace(/[&"<>]/g, char => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[char]);
  const svg = (name, size = '1em', className = 'dftr-icon') => {
    const path = paths[name] || paths.info;
    const safeClass = String(className).split(/\s+/).filter(part => /^[a-zA-Z0-9_-]+$/.test(part)).join(' ');
    const safeSize = typeof size === 'number' ? `${Math.max(12, Math.min(64, size))}px` : escapeAttr(size);
    return `<svg class="${safeClass || 'dftr-icon'} dftr-icon--${escapeAttr(name)}" viewBox="0 0 24 24" width="${safeSize}" height="${safeSize}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
  };

  let flagSequence = 0;
  const currency = code => {
    const flagId = `dftr-flag-${++flagSequence}`;
    if (code === 'USDT') return '<svg class="dftr-currency-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="23" fill="#50AF95"/><path d="M12 11h24M24 11v27M14 17h20M16 21c2.5 2 13.5 2 16 0" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M24 20v7" stroke="#fff" stroke-width="3"/></svg>';
    if (code === 'SAR') return '<svg class="dftr-currency-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="23" fill="#006c35"/><path d="M11 26h26M15 30l19-5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><text x="24" y="20" text-anchor="middle" direction="rtl" font-family="IBM Plex Sans Arabic,Tahoma,sans-serif" font-size="7" font-weight="700" fill="#fff">لا إله إلا الله</text></svg>';
    if (code === 'YER') return `<svg class="dftr-currency-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs><clipPath id="${flagId}"><circle cx="24" cy="24" r="22"/></clipPath></defs><g clip-path="url(#${flagId})"><path fill="#ce1126" d="M0 0h48v16H0z"/><path fill="#fff" d="M0 16h48v16H0z"/><path fill="#000" d="M0 32h48v16H0z"/></g><circle cx="24" cy="24" r="22.5" fill="none" stroke="#d6d6d1"/></svg>`;
    if (code === 'USD') return `<svg class="dftr-currency-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs><clipPath id="${flagId}"><circle cx="24" cy="24" r="22"/></clipPath></defs><g clip-path="url(#${flagId})"><path fill="#b22234" d="M0 0h48v48H0z"/><path fill="#fff" d="M0 4h48v4H0zm0 8h48v4H0zm0 8h48v4H0zm0 8h48v4H0zm0 8h48v4H0z"/><path fill="#3c3b6e" d="M0 0h24v24H0z"/><g fill="#fff"><circle cx="5" cy="5" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="8" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><circle cx="5" cy="15" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="19" cy="15" r="1"/></g></g><circle cx="24" cy="24" r="22.5" fill="none" stroke="#d6d6d1"/></svg>`;
    return '';
  };

  const legacyIcons = new Map([
    ['🇸🇦', 'currency-sa'], ['🇾🇪', 'currency-ye'], ['🇺🇸', 'currency-us'], ['💵', 'currency-us'],
    ['🗑', 'trash'], ['✎', 'edit'], ['⚙', 'settings'], ['♙', 'user'], ['▥', 'chart'],
    ['＋', 'plus'], ['➕', 'plus'], ['+', 'plus'], ['−', 'minus'], ['-', 'minus'],
    ['⚖', 'scale'], ['⚒', 'tools'], ['⌘', 'exchange'], ['%', 'percent'], ['⌕', 'search'], ['⌄', 'chevronDown'], ['⌃', 'chevronUp'],
    ['↗', 'arrowUpRight'], ['↔', 'arrowsLeftRight'], ['↕', 'arrowsUpDown'], ['↑', 'arrowUp'], ['↓', 'arrowDown'], ['⇩', 'download'], ['⋮', 'dotsVertical'], ['⌑', 'archive'], ['▱', 'archive'], ['⠿', 'dots'], ['‹', 'chevronLeft'], ['›', 'chevronRight'],
    ['×', 'close'], ['✕', 'close'], ['✓', 'check'], ['✔', 'check'], ['☀', 'sun'], ['◐', 'moon'],
    ['⇄', 'arrowsLeftRight'], ['▣', 'wallet'], ['▤', 'fileText'], ['▢', 'square'], ['⌫', 'backspace'], ['☎', 'phone'], ['✉', 'mail']
  ].sort((a, b) => b[0].length - a[0].length));
  const legacyIconEntries = [...legacyIcons];

  const skipSelector = 'svg,script,style,textarea,select,option,code,pre,.calc,.calc-box,.calc-keypad,[data-icon-plain]';
  const iconContexts = '[aria-hidden="true"],summary > span,.dftr-empty-icon,.customer-breadcrumb span,.ico,.icon,.x,.arrow,.search-label span,.settings-summary-icon,.theme-settings-icon,.withdrawal-row-arrow,.withdrawals-row-chevron,.customers-row-chevron,.client-finance-settings-chevron';

  function isContext(parent, token, trailing) {
    if (parent.closest(skipSelector)) return false;
    if (parent.closest('.calc-brand-icon')) return ['＋', '−', '+', '-', '='].includes(token);
    if (!(parent.closest('button,a,[role="button"]') || parent.closest(iconContexts) || parent.matches(iconContexts))) return false;
    if ((token === '＋' || token === '➕' || token === '+' || token === '−' || token === '-') && /^[\d٠-٩۰-۹$₮]/u.test(trailing.trimStart())) return false;
    return true;
  }

  function iconMarkup(token, parent) {
    if (token === '🇸🇦') return currency('SAR');
    if (token === '🇾🇪') return currency('YER');
    if (token === '🇺🇸' || token === '💵') return currency('USD');
    if (token === '=') return svg('equals');
    if (token === '▣' && parent?.closest('#reportPrint')) return svg('printer');
    return svg(legacyIcons.get(token) || 'info');
  }

  function upgradeTextNode(node) {
    if (!node.parentElement || !node.isConnected) return;
    const parent = node.parentElement;
    const raw = node.nodeValue || '';
    const leadingSpaces = raw.match(/^\s*/u)?.[0] || '';
    const content = raw.slice(leadingSpaces.length);
    const match = legacyIconEntries.find(([token]) => content.startsWith(token));
    const calcBrand = parent.closest('.calc-brand-icon');
    const equalsMatch = calcBrand && content.startsWith('=') ? ['=', 'equals'] : null;
    const entry = equalsMatch || match;
    if (!entry) return;
    const [token] = entry;
    const trailing = content.slice(token.length);
    if (trailing && !/^\s/u.test(trailing)) return;
    if (!isContext(parent, token, trailing)) return;

    const template = document.createElement('template');
    template.innerHTML = iconMarkup(token, parent);
    const fragment = document.createDocumentFragment();
    if (leadingSpaces) fragment.append(document.createTextNode(leadingSpaces));
    const icon = template.content.firstElementChild;
    if (!icon) return;
    fragment.append(icon);
    if (trailing) fragment.append(document.createTextNode(trailing));
    node.replaceWith(fragment);

    const button = parent.closest('button');
    if (button?.classList.contains('x') && !button.hasAttribute('aria-label')) button.setAttribute('aria-label', 'إغلاق');
    if (button && !button.hasAttribute('aria-label') && button.childElementCount === 1) {
      const labels = { close: 'إغلاق', trash: 'حذف', edit: 'تعديل', check: 'تحديد' };
      const label = labels[icon.classList.item(icon.classList.length - 1).replace('dftr-icon--', '')];
      if (label) button.setAttribute('aria-label', label);
    }
  }

  function upgrade(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { upgradeTextNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.matches('svg')) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) upgradeTextNode(node);
  }

  window.DaftariIcons = Object.freeze({ svg, currency, upgrade });

  const start = () => {
    upgrade(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') upgradeTextNode(record.target);
        else record.addedNodes.forEach(upgrade);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
