(() => {
  'use strict';
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const fmtAmount = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const baseOpenClient = openClient;

  const balanceForCurrency = (client, currency) => (client.records || []).filter(record => record.currency === currency)
    .reduce((sum, record) => sum + (record.type === 'payment' ? -1 : 1) * (Number(record.amount) || 0), 0);
  const usdBalance = client => (client.records || []).reduce((sum, record) => {
    const amount = typeof recordUsd === 'function' ? Number(recordUsd(client, record)) || 0 : Number(record.amount) || 0;
    return sum + (record.type === 'payment' ? -amount : amount);
  }, 0);

  openClient = id => {
    baseOpenClient(id);
    const client = db.clients.find(item => String(item.id) === String(id));
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('overlay');
    if (!client || !modal || !overlay || modal.querySelector('.customer-hero')) return;
    modal.classList.add('fullscreen-modal', 'customer-detail-modal');
    overlay.classList.add('fullscreen');
    const preferred = client.displayCurrency || client.preferredCurrency || 'USD';
    const rawPhone = String(client.phone || '').replace(/\D/g, '');
    const phone = rawPhone ? escapeHtml(client.phone) : 'لا يوجد رقم هاتف';
    const rateForDisplay = currency => {
      const rates = db.settings?.exchangeRatesByType?.debt || db.settings?.exchangeRates || {};
      const configured = Number(rates[currency]);
      if (Number.isFinite(configured) && configured > 0) return configured;
      return currency === 'SAR' ? 3.8 : currency === 'YER' ? 535 : currency === 'EUR' ? 0.92 : 1;
    };
    const balance = usdBalance(client) * rateForDisplay(preferred);
    const currencyChoices = ['USD', 'SAR', 'YER', 'USDT', 'EUR'];
    const chips = currencyChoices.map(currency => `<button type="button" class="customer-currency-chip ${currency === preferred ? 'active' : ''}" data-display-currency="${currency}">${escapeHtml(currency)}</button>`).join('');
    const contactButtons = rawPhone ? `<a href="tel:${rawPhone}">اتصال</a><a href="https://wa.me/${rawPhone}" target="_blank" rel="noopener">واتساب</a>` : '';
    const hero = document.createElement('section');
    hero.className = 'customer-hero';
    hero.innerHTML = `<div class="customer-hero-actions" aria-label="خيارات العميل"><button type="button" class="customer-quick-edit" title="تعديل">✎</button><button type="button" class="customer-quick-statement" title="كشف حساب">▣</button><button type="button" class="customer-quick-archive" title="أرشفة العميل">⌑</button></div><div class="customer-hero-head"><div><h2>${escapeHtml(client.name)}</h2><p class="customer-phone">${phone}</p><div class="customer-contact-actions">${contactButtons}</div></div></div><div class="customer-hero-balance"><span>${Math.abs(balance) < 0.0001 ? `لا يوجد رصيد بعملة ${escapeHtml(preferred)}` : `عليه بعملة ${escapeHtml(preferred)}`}</span><strong>${fmtAmount(Math.abs(balance))} ${escapeHtml(preferred)}</strong><small>≈ $ ${fmtAmount(Math.abs(usdBalance(client)))}</small></div><div class="customer-display-label">عرض الإجمالي بـ:</div><div class="customer-currency-chips">${chips}</div>`;
    hero.querySelector('.customer-hero-balance span').textContent = Math.abs(balance) < 0.0001
      ? `لا يوجد رصيد بعملة ${preferred}`
      : `${balance > 0 ? 'عليه' : 'له'} بعملة ${preferred}`;
    const actions = document.createElement('div');
    actions.className = 'customer-detail-actions';
    actions.innerHTML = '<button type="button" class="customer-debt">دين (+)</button><button type="button" class="customer-payment">تسديد (−)</button><button type="button" class="customer-statement">كشف حساب</button><button type="button" class="customer-edit">تعديل</button>';
    const filters = document.createElement('div');
    filters.className = 'customer-detail-filters';
    filters.innerHTML = '<button type="button" class="active" data-filter="all">الكل</button><button type="button" data-filter="debt">ديون</button><button type="button" data-filter="payment">تسديدات</button>';
    const container = modal.querySelector('.record-scroll') || modal;
    const header = container.querySelector('.modal-head');
    const breadcrumb = document.createElement('button');
    breadcrumb.type = 'button';
    breadcrumb.className = 'customer-breadcrumb';
    breadcrumb.innerHTML = `العملاء <span>‹</span> ${escapeHtml(client.name)}`;
    if (header) header.after(breadcrumb, hero, actions, filters);
    else container.prepend(filters, actions, hero);
    // Always show the breadcrumb and complete hero first, even when the
    // previous page had been scrolled.
    const resetProfileScroll = () => {
      modal.scrollTop = 0;
      container.scrollTop = 0;
    };
    resetProfileScroll();
    requestAnimationFrame(() => requestAnimationFrame(resetProfileScroll));
    setTimeout(resetProfileScroll, 100);
    actions.querySelector('.customer-debt').onclick = () => document.getElementById('debt')?.click();
    actions.querySelector('.customer-payment').onclick = () => document.getElementById('payment')?.click();
    actions.querySelector('.customer-edit').onclick = () => typeof editClient === 'function' && editClient(id);
    actions.querySelector('.customer-statement').onclick = () => window.openAccountStatements?.(id);
    hero.querySelector('.customer-quick-edit').onclick = () => typeof editClient === 'function' && editClient(id);
    hero.querySelector('.customer-quick-statement').onclick = () => window.openAccountStatements?.(id);
    hero.querySelector('.customer-quick-archive').onclick = () => {
      if (typeof moveToTrash !== 'function' || !confirm(`أرشفة العميل ${client.name}؟`)) return;
      moveToTrash(id);
    };
    breadcrumb.onclick = () => typeof customerDirectory === 'function' && customerDirectory();
    hero.querySelectorAll('[data-display-currency]').forEach(button => button.addEventListener('click', () => {
      client.displayCurrency = button.dataset.displayCurrency;
      if (typeof save === 'function') save();
      else localStorage.setItem('daftari-ledger-v1', JSON.stringify(db));
      openClient(id);
    }));
    const records = [...container.querySelectorAll('.record')];
    if (!records.length) {
      const originalEmpty = container.querySelector('.empty');
      if (originalEmpty) originalEmpty.outerHTML = '<div class="customer-empty-operations"><strong>لا عمليات بعد</strong><span>سجّل أول دين أو تسديد لهذا العميل.</span><button type="button" class="customer-empty-debt">↗ تسجيل دين</button></div>';
      container.querySelector('.customer-empty-debt')?.addEventListener('click', () => document.getElementById('debt')?.click());
    }
    filters.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      const filter = button.dataset.filter;
      filters.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
      records.forEach(record => {
        const payment = Boolean(record.querySelector('.record-payment-label'));
        record.hidden = filter !== 'all' && (filter === 'payment' ? !payment : payment);
      });
    });
  };
})();
