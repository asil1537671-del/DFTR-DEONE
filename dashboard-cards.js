(() => {
  const cards = document.querySelector('.cards');
  const calculator = document.querySelector('.calc');
  const calculatorPanel = document.getElementById('calcBox');
  if (!cards || !calculator || !calculatorPanel) return;

  const ORDER_KEY = 'daftari-dashboard-card-order-v1';
  const CALCULATOR_STATE_KEY = 'daftari-floating-calculator-enabled-v1';
  const defaultOrder = [
    'chooseClient',
    'addClient',
    'accountStatements',
    'trash-card',
    'exchangeSettings',
    'calculatorSettings',
    'analytics-card',
    'theme-card'
  ];

  const calculatorCard = document.createElement('button');
  calculatorCard.type = 'button';
  calculatorCard.id = 'calculatorSettings';
  calculatorCard.className = 'card calculator-settings-card';
  calculatorCard.innerHTML = '<span class="calculator-card-icon calc-brand-icon" aria-hidden="true"><i>＋</i><i>−</i><b>=</b></span><strong class="calculator-card-label">تفعيل الحاسبة</strong>';
  calculatorCard.setAttribute('aria-label', 'فتح الحاسبة');
  cards.append(calculatorCard);
  const accountStatementsCard = document.createElement('button');
  accountStatementsCard.type = 'button';
  accountStatementsCard.id = 'accountStatements';
  accountStatementsCard.className = 'card account-statements-card';
  accountStatementsCard.innerHTML = '<span class="account-statements-copy"><strong>كشف الحسابات</strong><small>عرض وطباعة كشف العميل</small></span><span class="account-statements-icon" aria-hidden="true"><svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ledger-cover" x1="18" y1="20" x2="104" y2="107" gradientUnits="userSpaceOnUse"><stop stop-color="#a9c8ff"/><stop offset=".48" stop-color="#587fe3"/><stop offset="1" stop-color="#3931a3"/></linearGradient><linearGradient id="ledger-edge" x1="26" y1="100" x2="110" y2="109" gradientUnits="userSpaceOnUse"><stop stop-color="#1388d1"/><stop offset=".52" stop-color="#24d0ed"/><stop offset="1" stop-color="#1162bf"/></linearGradient><linearGradient id="ledger-roll" x1="24" y1="102" x2="98" y2="119" gradientUnits="userSpaceOnUse"><stop stop-color="#43e2f4"/><stop offset=".56" stop-color="#148fd4"/><stop offset="1" stop-color="#1749ae"/></linearGradient><linearGradient id="ledger-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe58a"/><stop offset=".5" stop-color="#ffb52f"/><stop offset="1" stop-color="#d77813"/></linearGradient><filter id="ledger-shadow" x="8" y="3" width="116" height="126" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/><feOffset dy="4"/><feComponentTransfer><feFuncA type="linear" slope=".24"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#ledger-shadow)"><path d="M36 16 98 9c8-1 14 5 15 13l7 69c1 9-3 15-10 20l-8 6-8-10L36 16Z" fill="#4639bb"/><path d="m25 17 67-9c8-1 13 4 14 12l7 67c1 8-3 14-11 16l-66 10c-8 1-13-4-14-12l-7-71c-1-7 3-12 10-13Z" fill="url(#ledger-cover)"/><path d="m25 17 67-9c8-1 13 4 14 12l1 12-91 12-1-14c-1-7 3-12 10-13Z" fill="#fff" opacity=".18"/><path d="M30 31c0-4 3-7 7-8l8-1c4 0 7 3 7 7s-3 7-7 8l-8 1c-4 0-7-3-7-7Z" fill="url(#ledger-gold)" stroke="#db8c20" stroke-width="2"/><circle cx="89" cy="24" r="10" fill="url(#ledger-gold)"/><circle cx="86" cy="21" r="4" fill="#fff2b8" opacity=".5"/><path d="M27 93 99 82c5-1 9 2 10 7 1 5-2 9-7 10l-67 12c-5 1-9-2-10-7-1-5 0-9 2-11Z" fill="#304fb9" opacity=".65"/><path d="m33 90 10-2c3-1 5 1 5 4l1 16-17 3 1-16c0-3 0-4 0-5Zm21-5 10-2c3-1 5 1 5 4l2 18-18 3 1-18c0-3 0-4 0-5Zm22-6 10-2c3-1 5 1 5 4l2 19-18 3 1-19c0-3 0-4 0-5Z" fill="url(#ledger-gold)"/><path d="m28 91 37-6M53 86l35-6" stroke="#fff0ba" stroke-width="2" stroke-linecap="round" opacity=".85"/><path d="m63 43 25-4M65 54l23-3M66 65l23-3M68 76l21-3" stroke="#f4f7ff" stroke-width="5" stroke-linecap="round"/><path d="m23 103 80-12c6-1 10 3 11 8 1 5-2 9-7 11l-72 11c-8 1-15-3-16-9-1-4 0-7 4-9Z" fill="url(#ledger-roll)"/><path d="m23 103 80-12c6-1 10 1 11 5 1 4-2 7-7 8l-78 12c-5 1-9-2-10-6-1-3 0-5 4-7Z" fill="#56e5f3" opacity=".5"/><path d="M107 99c4-1 7 2 7 5s-2 6-6 7l-4 1v-12l3-1Z" fill="#1748ab"/></g></svg></span>';
  accountStatementsCard.setAttribute('aria-label', 'فتح خدمة كشف الحسابات');
  cards.append(accountStatementsCard);

  const analyticsCard = document.createElement('button');
  analyticsCard.type = 'button';
  analyticsCard.id = 'analytics-card';
  analyticsCard.className = 'card analytics-card';
  analyticsCard.innerHTML = '<span class="analytics-card-heading"><span class="analytics-card-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M8 38V24h8v14H8Zm12 0V16h8v22h-8Zm12 0V9h8v29h-8Z"/><path d="m8 18 11-7 9 2 11-8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span><strong>تحليل الحسابات</strong><small>نظرة شاملة على حركة النظام</small></span></span><span class="analytics-card-metrics"><span><small>إجمالي الديون</small><strong data-analytics-debts>0 USD</strong></span><span><small>إجمالي التسديدات</small><strong data-analytics-payments>0 USD</strong></span></span><span class="analytics-card-footer" data-analytics-footer>افتح تفاصيل الإجماليات والحركة</span>';
  analyticsCard.setAttribute('aria-label', 'فتح التحليل المالي الشامل');
  analyticsCard.addEventListener('click', () => window.openAnalytics?.());
  cards.append(analyticsCard);

  const themeCard = document.createElement('button');
  themeCard.type = 'button';
  themeCard.id = 'theme-card';
  themeCard.className = 'card theme-settings-card';
  themeCard.innerHTML = '<span class="theme-settings-copy"><strong>تغيير المظهر</strong><small data-theme-card-status></small></span><span class="theme-settings-icon" aria-hidden="true">◐</span>';
  themeCard.addEventListener('click', () => window.toggleAppTheme?.());
  cards.append(themeCard);
  const themeStatus = themeCard.querySelector('[data-theme-card-status]');
  const themeIcon = themeCard.querySelector('.theme-settings-icon');
  function syncThemeCard() {
    const dark = document.body.dataset.theme === 'dark';
    const nextTheme = dark ? 'فاتح' : 'داكن';
    themeStatus.textContent = `الوضع الحالي: ${dark ? 'داكن' : 'فاتح'} · اضغط للتبديل إلى ${nextTheme}`;
    themeIcon.textContent = dark ? '☀' : '◐';
    themeCard.setAttribute('aria-label', `تغيير المظهر، الوضع الحالي ${dark ? 'داكن' : 'فاتح'}`);
  }
  syncThemeCard();
  new MutationObserver(syncThemeCard).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

  function collectAnalytics() {
    const currenciesByKey = new Map();
    const movements = [];
    const totalsByCurrency = key => {
      if (!currenciesByKey.has(key)) currenciesByKey.set(key, { debt: 0, payment: 0, profit: 0 });
      return currenciesByKey.get(key);
    };
    let debtUsd = 0;
    let paymentUsd = 0;
    let debtCount = 0;
    let paymentCount = 0;

    (db.clients || []).forEach(client => {
      (client.records || []).forEach(record => {
        const type = record.type;
        if (type !== 'debt' && type !== 'payment') return;
        const amount = Number(record.amount) || 0;
        const currency = record.currency || 'USD';
        const totals = totalsByCurrency(currency);
        const equivalent = Number(recordUsd(client, record)) || 0;
        if (type === 'debt') {
          totals.debt += amount;
          debtUsd += equivalent;
          debtCount += 1;
        } else {
          totals.payment += amount;
          paymentUsd += equivalent;
          paymentCount += 1;
        }
        movements.push({ client, record });
      });
    });

    (db.profits || []).forEach(profit => {
      totalsByCurrency(profit.currency || 'USD').profit += Number(profit.amount) || 0;
    });

    const since = Date.now() - 24 * 60 * 60 * 1000;
    const recentMovements = movements.filter(({ record }) => {
      const createdAt = Date.parse(record.createdAt || '');
      return Number.isFinite(createdAt) && createdAt >= since && createdAt <= Date.now();
    }).sort((a, b) => Date.parse(b.record.createdAt) - Date.parse(a.record.createdAt));
    const debtors = (db.clients || []).filter(client => isOwed(client)).length;
    return {
      clientCount: (db.clients || []).length,
      debtorCount: debtors,
      debtCount,
      paymentCount,
      debtUsd,
      paymentUsd,
      balanceUsd: debtUsd - paymentUsd,
      currencies: [...currenciesByKey.entries()],
      movements: recentMovements
    };
  }

  function refreshAnalyticsCard() {
    if (!analyticsCard.isConnected) return;
    const summary = collectAnalytics();
    analyticsCard.querySelector('[data-analytics-debts]').textContent = `${fmt(summary.debtUsd)} USD`;
    analyticsCard.querySelector('[data-analytics-payments]').textContent = `${fmt(summary.paymentUsd)} USD`;
    analyticsCard.querySelector('[data-analytics-footer]').textContent = `${fmt(summary.clientCount)} عميل · ${fmt(summary.paymentCount)} تسديدات`;
    analyticsCard.setAttribute('aria-label', `التحليل المالي الشامل: إجمالي الديون ${fmt(summary.debtUsd)} دولار، وإجمالي التسديدات ${fmt(summary.paymentUsd)} دولار`);
  }

  function openAnalytics() {
    const summary = collectAnalytics();
    const currencyRows = summary.currencies
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, values]) => {
        const balance = values.debt - values.payment;
        const balanceLabel = Math.abs(balance) < 0.0001 ? 'متوازن' : `${fmt(Math.abs(balance))} ${currencyDisplay(currency)} <small>${balance > 0 ? 'مستحق' : 'رصيد للعميل'}</small>`;
        return `<tr><th>${currencyDisplay(currency)}</th><td data-label="إجمالي الديون">${fmt(values.debt)}</td><td data-label="إجمالي التسديدات">${fmt(values.payment)}</td><td data-label="الرصيد">${balanceLabel}</td><td data-label="الأرباح المسجلة">${values.profit ? fmt(values.profit) : '—'}</td></tr>`;
      }).join('');
    const movementRows = summary.movements.map(({ client, record }) => {
      const createdAt = new Date(record.createdAt);
      const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(createdAt);
      const date = `${niceDate(record.date || String(record.createdAt || '').slice(0, 10))} · ${time}`;
      const identifier = esc(client.id);
      const isPayment = record.type === 'payment';
      const label = isPayment ? 'تسديد دين' : 'إضافة دين';
      const sign = isPayment ? '−' : '+';
      return `<button type="button" class="analytics-movement ${isPayment ? 'is-payment' : 'is-debt'}" data-analytics-client="${identifier}"><span><strong>${esc(client.name)} · ${label}</strong><small>${esc(date)}${record.note ? ` · ${esc(record.note)}` : ''}</small></span><b>${sign} ${fmt(record.amount)} ${currencyDisplay(record.currency || 'USD')}<small>${fmt(recordUsd(client, record))} USD</small></b></button>`;
    }).join('') || '<div class="analytics-empty">لا توجد حركة ديون أو تسديدات خلال آخر 24 ساعة.</div>';

    showModal(`<div class="modal-head analytics-modal-head"><div><h3>التحليل المالي الشامل</h3><p>إجماليات وحركة جميع العملاء</p></div>${closeButton()}</div><div class="analytics-kpis"><div><small>إجمالي العملاء</small><strong>${fmt(summary.clientCount)}</strong></div><div><small>العملاء المدينون</small><strong>${fmt(summary.debtorCount)}</strong></div><div><small>عمليات إضافة الدين</small><strong>${fmt(summary.debtCount)}</strong></div><div><small>عمليات التسديد</small><strong>${fmt(summary.paymentCount)}</strong></div></div><section class="analytics-usd-summary"><h4>الإجماليات · ما يعادل الدولار</h4><div><span>إجمالي الديون</span><strong>${fmt(summary.debtUsd)} USD</strong></div><div><span>إجمالي التسديدات</span><strong>${fmt(summary.paymentUsd)} USD</strong></div><div class="analytics-net"><span>${summary.balanceUsd >= 0 ? 'الرصيد المستحق' : 'صافي الرصيد الدائن'}</span><strong>${fmt(Math.abs(summary.balanceUsd))} USD</strong></div></section><section class="analytics-currency-section"><h4>التفصيل حسب العملة</h4><div class="analytics-table-wrap"><table class="analytics-table"><thead><tr><th>العملة</th><th>الديون</th><th>التسديدات</th><th>الرصيد</th><th>الأرباح</th></tr></thead><tbody>${currencyRows || '<tr><td colspan="5" class="analytics-empty">لا توجد عمليات مسجلة.</td></tr>'}</tbody></table></div></section><section class="analytics-movement-section"><h4>حركة الديون والتسديدات · آخر 24 ساعة</h4><div class="analytics-movements">${movementRows}</div></section>`);
    const modal = document.getElementById('modal');
    modal.classList.add('fullscreen-modal', 'analytics-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    bindClose();
    document.querySelectorAll('[data-analytics-client]').forEach(button => {
      button.addEventListener('click', () => {
        const clientId = button.dataset.analyticsClient;
        modal.classList.remove('analytics-modal');
        openClient(clientId);
      });
    });
  }

  window.openAnalytics = openAnalytics;
  const analyticsOverlay = document.getElementById('overlay');
  if (analyticsOverlay) new MutationObserver(() => {
    if (!analyticsOverlay.classList.contains('show')) document.getElementById('modal')?.classList.remove('analytics-modal');
  }).observe(analyticsOverlay, { attributes: true, attributeFilter: ['class'] });

  refreshAnalyticsCard();
  const recentList = document.getElementById('recentList');
  if (recentList) new MutationObserver(refreshAnalyticsCard).observe(recentList, { childList: true, subtree: true, characterData: true });

  const allCards = () => Array.from(cards.children).filter(card => card.classList.contains('card'));
  const cardId = card => card.id || card.dataset.dashboardCardId;
  const currentIds = () => allCards().map(cardId).filter(Boolean);

  function saveOrder() {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(currentIds())); } catch (_) { /* Storage can be unavailable in private or file modes. */ }
  }

  function applyOrder(order) {
    const byId = new Map(allCards().map(card => [cardId(card), card]));
    const used = new Set();
    const merged = [...order, ...defaultOrder];
    for (const id of merged) {
      const card = byId.get(id);
      if (card && !used.has(card)) {
        cards.append(card);
        used.add(card);
      }
    }
    allCards().forEach(card => {
      if (!used.has(card)) cards.append(card);
    });
  }

  let savedOrder;
  try { savedOrder = JSON.parse(localStorage.getItem(ORDER_KEY) || 'null'); } catch (_) { savedOrder = null; }
  applyOrder(Array.isArray(savedOrder) ? savedOrder : defaultOrder);

  const liveMessage = document.createElement('span');
  liveMessage.className = 'dashboard-card-live-message';
  liveMessage.setAttribute('aria-live', 'polite');
  liveMessage.setAttribute('aria-atomic', 'true');
  cards.append(liveMessage);

  for (const card of allCards()) {
    card.dataset.dashboardCardId = cardId(card);
    if (card.id === 'calculatorSettings') continue;
    const handle = document.createElement('span');
    handle.className = 'card-drag-handle';
    handle.textContent = '⠿';
    handle.title = 'اسحب لإعادة ترتيب البطاقة';
    handle.setAttribute('aria-hidden', 'true');
    card.append(handle);
    if (card.tagName !== 'BUTTON') card.tabIndex = 0;
  }

  let savedCalculatorEnabled = null;
  try {
    const savedValue = localStorage.getItem(CALCULATOR_STATE_KEY);
    if (savedValue !== null) savedCalculatorEnabled = savedValue === 'true';
  } catch (_) { /* Keep the default when browser storage is unavailable. */ }
  calculator.hidden = savedCalculatorEnabled === null ? false : !savedCalculatorEnabled;
  calculatorCard.setAttribute('aria-controls', 'calcBox');
  const calculatorLabel = calculatorCard.querySelector('.calculator-card-label');

  function syncCalculatorCardState() {
    const enabled = !calculator.hidden;
    calculatorCard.setAttribute('aria-pressed', String(enabled));
    calculatorCard.setAttribute('aria-expanded', String(enabled));
    calculatorCard.setAttribute('aria-label', enabled ? 'إيقاف الحاسبة العائمة' : 'تفعيل الحاسبة العائمة');
    calculatorLabel.textContent = enabled ? 'إيقاف الحاسبة' : 'تفعيل الحاسبة';
  }
  window.syncCalculatorCardState = syncCalculatorCardState;

  calculatorCard.addEventListener('click', () => {
    const enable = calculator.hidden;
    calculatorPanel.classList.remove('open');
    calculator.hidden = !enable;
    syncCalculatorCardState();
    try { localStorage.setItem(CALCULATOR_STATE_KEY, String(enable)); } catch (_) { /* Keep the setting for this page session. */ }
  });
  syncCalculatorCardState();
  function persistAndAnnounce(card) {
    saveOrder();
    const position = allCards().indexOf(card) + 1;
    const title = card.querySelector('strong, .total-client-title, .card-top > span:first-child')?.textContent?.trim()
      || card.getAttribute('aria-label')
      || 'البطاقة';
    liveMessage.textContent = `تم نقل ${title} إلى الموضع ${position}`;
  }

  cards.addEventListener('keydown', event => {
    if (!event.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const card = event.target.closest('.card');
    if (!card || card.parentElement !== cards) return;
    const rtl = getComputedStyle(cards).direction === 'rtl';
    const moveEarlier = event.key === 'ArrowUp' || (rtl ? event.key === 'ArrowRight' : event.key === 'ArrowLeft');
    const sibling = moveEarlier ? card.previousElementSibling : card.nextElementSibling;
    if (!sibling?.classList.contains('card')) return;
    event.preventDefault();
    if (moveEarlier) cards.insertBefore(card, sibling);
    else cards.insertBefore(sibling, card);
    persistAndAnnounce(card);
    card.focus({ preventScroll: true });
  });

  let activeDrag = null;
  cards.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.card-drag-handle');
    if (!handle || event.button !== 0) return;
    const card = handle.closest('.card');
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    activeDrag = { card, pointerId: event.pointerId, changed: false, lastSlot: '' };
    card.classList.add('is-reordering');
    handle.setPointerCapture?.(event.pointerId);
  });

  cards.addEventListener('click', event => {
    if (event.target.closest('.card-drag-handle')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  document.addEventListener('pointermove', event => {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.card');
    if (!target || target.parentElement !== cards || target === activeDrag.card) return;
    const rect = target.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const rtl = getComputedStyle(cards).direction === 'rtl';
    const before = horizontal ? (rtl ? dx > 0 : dx < 0) : dy < 0;
    const slot = `${cardId(target)}:${before ? 'before' : 'after'}`;
    if (slot === activeDrag.lastSlot) return;
    activeDrag.lastSlot = slot;
    if (before) cards.insertBefore(activeDrag.card, target);
    else cards.insertBefore(activeDrag.card, target.nextElementSibling);
    activeDrag.changed = true;
  }, { passive: true });

  function finishDrag(event) {
    if (!activeDrag || (event && event.pointerId !== activeDrag.pointerId)) return;
    const { card, changed } = activeDrag;
    card.classList.remove('is-reordering');
    activeDrag = null;
    if (changed) persistAndAnnounce(card);
  }
  document.addEventListener('pointerup', finishDrag);
  document.addEventListener('pointercancel', finishDrag);
})();

