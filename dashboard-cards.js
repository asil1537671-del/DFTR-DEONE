(() => {
  const cards = document.querySelector('.cards');
  const calculator = document.querySelector('.calc');
  const calculatorPanel = document.getElementById('calcBox');
  if (!cards || !calculator || !calculatorPanel) return;

  const ORDER_KEY = 'daftari-dashboard-card-order-v1';
  const CALCULATOR_KEY = 'daftari-calculator-enabled-v1';
  const defaultOrder = [
    'chooseClient',
    'addClient',
    'exchangeSettings',
    'debtor-card',
    'calculatorSettings',
    'payment-card'
  ];

  const debtorCard = document.getElementById('debtorCount')?.closest('.card');
  const paymentCard = document.getElementById('paymentCount')?.closest('.card');
  if (debtorCard) debtorCard.id = 'debtor-card';
  if (paymentCard) paymentCard.id = 'payment-card';

  const calculatorCard = document.createElement('button');
  calculatorCard.type = 'button';
  calculatorCard.id = 'calculatorSettings';
  calculatorCard.className = 'card calculator-settings-card';
  calculatorCard.innerHTML = '<span class="calculator-card-icon" aria-hidden="true">⌗</span><span class="calculator-card-copy"><strong>الحاسبة العائمة</strong><small class="calculator-card-status"></small></span><span class="calculator-switch" aria-hidden="true"><i></i></span>';
  cards.append(calculatorCard);

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
    const handle = document.createElement('span');
    handle.className = 'card-drag-handle';
    handle.textContent = '⠿';
    handle.title = 'اسحب لإعادة ترتيب البطاقة';
    handle.setAttribute('aria-hidden', 'true');
    card.append(handle);
    if (card.tagName !== 'BUTTON') card.tabIndex = 0;
  }

  function setCalculatorEnabled(enabled, persist = true) {
    calculator.hidden = !enabled;
    calculatorPanel.classList.remove('open');
    calculatorCard.setAttribute('aria-pressed', String(enabled));
    calculatorCard.querySelector('.calculator-card-status').textContent = enabled
      ? 'مفعّلة · اضغط لإيقافها'
      : 'متوقفة · اضغط لتشغيلها';
    calculatorCard.setAttribute('aria-label', enabled ? 'إيقاف الحاسبة العائمة' : 'تشغيل الحاسبة العائمة');
    if (persist) {
      try { localStorage.setItem(CALCULATOR_KEY, String(enabled)); } catch (_) { /* Storage can be unavailable in private or file modes. */ }
    }
  }

  let calculatorEnabled = true;
  try { calculatorEnabled = localStorage.getItem(CALCULATOR_KEY) !== 'false'; } catch (_) { /* Use the default enabled state. */ }
  setCalculatorEnabled(calculatorEnabled, false);
  calculatorCard.addEventListener('click', () => {
    calculatorEnabled = calculatorCard.getAttribute('aria-pressed') !== 'true';
    setCalculatorEnabled(calculatorEnabled);
  });

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
