(() => {
  'use strict';
  const app = document.querySelector('.app');
  const header = app?.querySelector('.top');
  const cards = app?.querySelector('.cards');
  if (!app || !header || !cards || document.querySelector('.dftr-home')) return;
  app.classList.add('dftr-phone-shell', 'max-w-md', 'mx-auto');

  const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const dateText = value => typeof niceDate === 'function' ? niceDate(value) : String(value || '—');
  const timeText = record => {
    if (record.time) return String(record.time);
    const timestamp = new Date(record.createdAt || '');
    return Number.isNaN(timestamp.getTime()) ? '' : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(timestamp);
  };
  const totalUsd = (client, record) => typeof recordUsd === 'function' ? Number(recordUsd(client, record)) || 0 : Number(record.amount) || 0;
  const data = () => (typeof db === 'object' && db ? db : { clients: [] });

  const home = document.createElement('section');
  home.className = 'dftr-home';
  home.innerHTML = `<section class="dftr-home-hero" aria-label="ملخص أرصدة العملاء"><div class="dftr-hero-top"><div><div class="dftr-hero-label">صافي أرصدة العملاء</div><div class="dftr-hero-value" data-home-net>$ 0</div></div><div class="dftr-wallet-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2H6.5A2.5 2.5 0 0 0 4 11.5v-4Z"/><path d="M4 11.5A2.5 2.5 0 0 1 6.5 9H20v8a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-5Z"/><circle cx="16.5" cy="14" r="1"/></svg></div></div><p class="dftr-hero-note">موجب = مبالغ على العملاء · سالب = مبالغ لهم</p><div class="dftr-hero-stats"><div class="dftr-hero-stat"><strong data-home-clients>0</strong><span>عميل</span></div><div class="dftr-hero-stat"><strong data-home-records>0</strong><span>عملية</span></div><div class="dftr-hero-stat"><strong data-home-fees>$ 0</strong><span>عمولات</span></div></div><div class="dftr-hero-actions"><button type="button" class="home-add-client"><svg class="dftr-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>عميل جديد</span></button><button type="button" class="home-reports"><svg class="dftr-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg><span>التقارير</span></button><button type="button" class="home-client-list"><svg class="dftr-action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3.5 20c0-4 2.2-6 5.5-6s5.5 2 5.5 6M14 15c3.8-.8 6.5 1.2 6.5 5"/></svg><span>العملاء</span><span class="home-client-count" data-home-client-button-count>0</span></button></div></section><div class="dftr-home-main"><section class="dftr-home-section"><div class="dftr-section-heading"><h2>الأرصدة حسب العملة</h2><button type="button" class="home-balance-details">التفاصيل</button></div><div class="dftr-currency-summary" data-home-currencies></div></section><section class="dftr-home-section"><div class="dftr-activity-panel"><div class="dftr-section-heading"><div><h2>آخر العمليات</h2><small class="dftr-activity-window">آخر 24 ساعة · <b data-home-24-count>0</b> عملية</small></div><button type="button" class="home-daily-report" title="فتح كشف اليوم الكامل لكل العملاء"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v4m8-4v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="m8 13 2 2 5-5"/></svg><span>كشف اليوم</span></button></div><div class="dftr-activity-list" data-home-activity></div></div></section></div><section class="dftr-tools-section" hidden><h2>الإعدادات</h2><p>غيّر مظهر التطبيق، فعّل الحاسبة، عدّل الصرف، أو راجع العناصر المحذوفة.</p></section><nav class="dftr-bottom-nav" aria-label="التنقل الرئيسي"><button type="button" class="active" data-home-nav="home"><i><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></svg></i><span>الرئيسية</span></button><button type="button" data-home-nav="clients"><i><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3.5 20c0-4 2.2-6 5.5-6s5.5 2 5.5 6M14 15c3.8-.8 6.5 1.2 6.5 5"/></svg></i><span>العملاء</span></button><button type="button" data-home-nav="withdrawals"><i><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="15.5" cy="12" r="1.2"/></svg></i><span>السحوبات</span></button><button type="button" data-home-nav="reports"><i><svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></i><span>التقارير</span></button><button type="button" data-home-nav="tools"><i><svg viewBox="0 0 24 24"><path d="M10 2.8h4l.55 2.15c.5.17.98.45 1.4.78l2.12-.7 2 3.46-1.6 1.56v1.9l1.6 1.56-2 3.46-2.12-.7c-.42.33-.9.6-1.4.78L14 21.2h-4l-.55-2.15c-.5-.17-.98-.45-1.4-.78l-2.12.7-2-3.46 1.6-1.56v-1.9l-1.6-1.56 2-3.46 2.12.7c.42-.33.9-.6 1.4-.78z"/><circle cx="12" cy="12" r="3.1"/></svg></i><span>الإعدادات</span></button></nav>`;
  header.insertAdjacentElement('afterend', home);
  home.querySelector('.dftr-tools-section').append(cards);
  const settingsCards = ['theme-card', 'calculatorSettings', 'exchangeSettings', 'trash-card', 'backup-card']
    .map(id => document.getElementById(id)).filter(Boolean);
  cards.prepend(...settingsCards);
  header.classList.add('home-top');
  const headerSettings = document.createElement('button');
  headerSettings.type = 'button';
  headerSettings.className = 'home-header-settings';
  headerSettings.setAttribute('aria-label', 'الإعدادات');
  headerSettings.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2.8h4l.55 2.15c.5.17.98.45 1.4.78l2.12-.7 2 3.46-1.6 1.56v1.9l1.6 1.56-2 3.46-2.12-.7c-.42.33-.9.6-1.4.78L14 21.2h-4l-.55-2.15c-.5-.17-.98-.45-1.4-.78l-2.12.7-2-3.46 1.6-1.56v-1.9l-1.6-1.56 2-3.46 2.12.7c.42-.33.9-.6 1.4-.78z"/><circle cx="12" cy="12" r="3.1"/></svg>';
  header.querySelector('.top-tools')?.prepend(headerSettings);

  const tools = home.querySelector('.dftr-tools-section');
  const mainNavigation = home.querySelector('.dftr-bottom-nav');
  const liquidityNavigation = document.createElement('button');
  liquidityNavigation.type = 'button';
  liquidityNavigation.dataset.homeNav = 'liquidity';
  liquidityNavigation.innerHTML = '<i><svg viewBox="0 0 24 24"><path d="M4 7h16v12H4zM7 7V4h10v3M8 14h8"/></svg></i><span>السيولة</span>';
  mainNavigation.querySelector('[data-home-nav="withdrawals"]')?.before(liquidityNavigation);
  mainNavigation.classList.add('has-liquidity');
  mainNavigation.querySelectorAll('button > span').forEach(label => label.classList.add('text-xs'));
  const activateNav = name => home.querySelectorAll('[data-home-nav]').forEach(button => button.classList.toggle('active', button.dataset.homeNav === name));
  const closeCurrentScreen = () => {
    document.querySelectorAll('.transaction-overlay, .profile-form-overlay, .client-menu-popover').forEach(node => node.remove());
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    // Do not use closeModal() for a root-tab switch.  The mobile navigation
    // layer implements closeModal with history.back(), which made a second
    // tab press race with the page that was about to open.
    overlay?.classList.remove('show', 'fullscreen');
    if (modal) {
      modal.className = 'modal';
      modal.replaceChildren();
    }
    document.body.classList.remove('dftr-modal-open');
  };
  const openAfterReset = action => {
    closeCurrentScreen();
    window.__dftrTabNavigation = true;
    try { action(); }
    finally { queueMicrotask(() => { window.__dftrTabNavigation = false; }); }
  };
  const openClients = () => {
    tools.hidden = true;
    activateNav('clients');
    openAfterReset(() => typeof customerDirectory === 'function' ? customerDirectory() : document.querySelector('#chooseClient')?.click());
  };
  const openReports = () => {
    tools.hidden = true;
    activateNav('reports');
    openAfterReset(() => window.openDaftariReports?.() || window.openAnalytics?.());
  };
  const openWithdrawals = () => {
    tools.hidden = true;
    activateNav('withdrawals');
    openAfterReset(() => document.querySelector('#personal-withdrawals-card')?.click());
  };
  const openLiquidity = () => {
    tools.hidden = true;
    activateNav('liquidity');
    openAfterReset(() => openLiquidityPage());
  };
  const openTools = () => {
    tools.hidden = true;
    activateNav('tools');
    openAfterReset(() => {
      if (typeof window.openDaftariSettings === 'function') { window.openDaftariSettings(); return; }
      tools.hidden = false;
      tools.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const openHome = () => {
    tools.hidden = true;
    activateNav('home');
    closeCurrentScreen();
    requestAnimationFrame(() => home.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  headerSettings.addEventListener('click', openTools);
  home.querySelectorAll('.home-add-client').forEach(button => button.addEventListener('click', () => document.querySelector('#addClient')?.click()));
  home.querySelectorAll('.home-client-list').forEach(button => button.addEventListener('click', openClients));
  home.querySelectorAll('.home-reports,.home-balance-details,.home-daily-report').forEach(button => button.addEventListener('click', openReports));
  // Root tabs are idempotent.  Without this guard, tapping the already-open
  // tab first closed its modal (via history.back) and the next navigation frame
  // could leave the user on the home screen instead of the selected section.
  const openRootScreen = () => {
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    if (!overlay?.classList.contains('show') || !modal) return 'home';
    if (modal.classList.contains('customers-page-modal')) return 'clients';
    if (modal.classList.contains('liquidity-page-modal')) return 'liquidity';
    if (modal.classList.contains('reports-page-modal')) return 'reports';
    if (modal.classList.contains('settings-modal')) return 'tools';
    if (modal.classList.contains('withdrawals-page-modal') && !modal.querySelector('.withdrawals-detail-page')) return 'withdrawals';
    return null;
  };
  mainNavigation.addEventListener('click', event => {
    const button = event.target.closest('[data-home-nav]');
    if (!button) return;
    const destination = button.dataset.homeNav;
    if (destination !== 'home' && openRootScreen() === destination) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    ({ home: openHome, clients: openClients, liquidity: openLiquidity, withdrawals: openWithdrawals, reports: openReports, tools: openTools })[destination]?.();
  });

  // The withdrawal tab is a screen in its own right.  It reads the original
  // personal-withdrawals ledger, rather than creating a second data source.
  const withdrawalsCard = document.getElementById('personal-withdrawals-card');
  let openingOriginalWithdrawalForm = false;
  const withdrawalAmountsForHome = entry => {
    const raw = Array.isArray(entry?.amounts) ? entry.amounts : [entry?.amount];
    return raw.map(value => Number(String(value ?? '').replace(/,/g, ''))).filter(value => Number.isFinite(value) && value > 0);
  };
  const withdrawalTotalForHome = entry => withdrawalAmountsForHome(entry).reduce((total, amount) => total + amount, 0);
  const withdrawalClockForHome = entry => {
    if (entry?.time) return String(entry.time).slice(0, 5);
    const date = new Date(entry?.createdAt || '');
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const withdrawalCurrencyLabel = currency => ({ YER: 'ر.ي', SAR: 'ر.س', USD: '$', USDT: '₮' })[currency] || currency || '';
  const withdrawalFormat = amount => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(amount) || 0);
  const sortedWithdrawalsForHome = () => [...(db.personalWithdrawals || [])].sort((a, b) => String(b.occurredAt || b.createdAt || b.date || '').localeCompare(String(a.occurredAt || a.createdAt || a.date || '')));
  const withdrawalDateForHome = entry => String(entry.date || entry.createdAt || '').slice(0, 10) || '—';

  const openWithdrawalDetailsHome = id => {
    const entry = (db.personalWithdrawals || []).find(item => String(item.id) === String(id));
    if (!entry) return openWithdrawalsPage();
    const amounts = withdrawalAmountsForHome(entry);
    const total = withdrawalTotalForHome(entry);
    showModal(`<section class="withdrawals-page withdrawals-detail-page"><button type="button" class="withdrawals-back" id="withdrawalsBack">‹ رجوع إلى السجل</button><h1>تفاصيل السحبة</h1><div class="withdrawals-detail-total"><span>إجمالي السحب</span><strong>${withdrawalFormat(total)} ${withdrawalCurrencyLabel(entry.currency)}</strong><small>${withdrawalDateForHome(entry)} · ${withdrawalClockForHome(entry)} · ${amounts.length} مبالغ</small></div><section class="withdrawals-detail-items"><h2>المبالغ المضمنة</h2>${amounts.map((amount, index) => `<div><span>${index + 1}</span><strong>${withdrawalFormat(amount)} ${withdrawalCurrencyLabel(entry.currency)}</strong></div>`).join('') || '<p>لا توجد مبالغ.</p>'}</section>${entry.source ? `<p class="withdrawals-detail-note">المصدر: ${escapeHtml(entry.source)}</p>` : ''}${entry.note ? `<p class="withdrawals-detail-note">ملاحظة: ${escapeHtml(entry.note)}</p>` : ''}<button type="button" class="withdrawals-delete" id="withdrawalsDelete">حذف السحبة</button></section>`);
    const modal = document.getElementById('modal');
    modal.classList.add('fullscreen-modal', 'withdrawals-page-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    document.getElementById('withdrawalsBack').onclick = openWithdrawalsPage;
    document.getElementById('withdrawalsDelete').onclick = () => {
      if (!confirm('حذف هذه السحبة المستقلة؟')) return;
      db.personalWithdrawals = (db.personalWithdrawals || []).filter(item => String(item.id) !== String(id));
      save();
      openWithdrawalsPage();
    };
  };

  const openWithdrawalsPage = () => {
    const withdrawals = sortedWithdrawalsForHome();
    const totals = withdrawals.reduce((all, entry) => {
      const currency = entry.currency || 'USD';
      all[currency] = (all[currency] || 0) + withdrawalTotalForHome(entry);
      return all;
    }, {});
    const primary = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    const totalText = primary ? `${withdrawalFormat(primary[1])} ${withdrawalCurrencyLabel(primary[0])}` : '0';
    const rows = withdrawals.map(entry => `<button type="button" class="withdrawals-page-row" data-withdrawal-page-id="${escapeHtml(entry.id)}"><span class="withdrawals-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="15.5" cy="12" r="1"/></svg></span><span class="withdrawals-row-copy"><strong>${withdrawalFormat(withdrawalTotalForHome(entry))} ${withdrawalCurrencyLabel(entry.currency)}</strong><small>${withdrawalDateForHome(entry)} · ${withdrawalClockForHome(entry)} · ${withdrawalAmountsForHome(entry).length} مبالغ</small></span><span class="withdrawals-row-chevron" aria-hidden="true">‹</span></button>`).join('') || '<div class="withdrawals-page-empty">لا توجد سحوبات مسجلة بعد.</div>';
    showModal(`<section class="withdrawals-page"><section class="withdrawals-page-hero"><div class="withdrawals-hero-top"><div><h1>السحوبات اليومية</h1><p>قسم مستقل تمامًا — لا يدخل في أرصدة العملاء ولا في إجمالي الديون.</p></div><span class="withdrawals-hero-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="15.5" cy="12" r="1"/></svg></span></div><div class="withdrawals-hero-total"><strong>${totalText}</strong><span>${primary ? (currencies?.[primary[0]] || primary[0]) : 'لا توجد سحوبات'}</span></div><div class="withdrawals-hero-bottom"><button type="button" id="newWithdrawalFromPage">＋ سحوبات جديدة</button><span>${withdrawals.length} سحبة مسجلة</span></div></section><section class="withdrawals-page-list"><div class="withdrawals-page-list-head"><div><h2>سجل السحوبات</h2><p>اضغط أي سحبة لعرض تفاصيلها</p></div><button type="button" id="withdrawalsPdfFromPage">PDF</button></div>${rows}</section></section>`);
    const modal = document.getElementById('modal');
    modal.classList.add('fullscreen-modal', 'withdrawals-page-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    document.getElementById('newWithdrawalFromPage').onclick = () => {
      // Reuse the original, fully featured entry form (multiple amounts, time,
      // dates and PDF) so no older withdrawal capability is lost.
      openingOriginalWithdrawalForm = true;
      withdrawalsCard?.click();
      openingOriginalWithdrawalForm = false;
    };
    document.querySelectorAll('[data-withdrawal-page-id]').forEach(button => button.addEventListener('click', () => openWithdrawalDetailsHome(button.dataset.withdrawalPageId)));
    document.getElementById('withdrawalsPdfFromPage').onclick = () => {
      if (!window.openDaftariPdfPeriodChooser || !window.downloadDaftariRecordPdf) { toast('ميزة PDF غير جاهزة بعد'); return; }
      window.openDaftariPdfPeriodChooser({ title: 'تنزيل سجل السحوبات PDF', entries: withdrawals, getDate: entry => withdrawalDateForHome(entry), getTime: entry => withdrawalClockForHome(entry), onDownload: (selected, period) => window.downloadDaftariRecordPdf({ title: 'سجل السحوبات الشخصية', subtitle: period.label, fileName: `سجل-السحوبات-${period.fileSuffix}`, sections: [{ title: 'السحوبات', rows: selected.map(entry => ({ label: `${withdrawalDateForHome(entry)} · ${withdrawalClockForHome(entry)}`, value: `${withdrawalFormat(withdrawalTotalForHome(entry))} ${entry.currency || ''}` })) }] }) });
    };
  };
  if (withdrawalsCard) withdrawalsCard.addEventListener('click', event => {
    if (openingOriginalWithdrawalForm) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openWithdrawalsPage();
  }, true);

  // Liquidity has the same standalone structure as withdrawals, but keeps its
  // own blue cash-and-bank identity and the original liquidity ledger.
  const cashLiquidityCard = document.getElementById('cash-liquidity-card');
  let openingOriginalLiquidityForm = false;
  const liquidityCurrencies = ['USD', 'SAR', 'YER', 'USDT'];
  const liquidityRate = currency => {
    const rates = db.settings?.exchangeRatesByType?.debt || db.settings?.exchangeRates || {};
    return Number(rates[currency]) || (currency === 'SAR' ? 3.8 : currency === 'YER' ? 535 : 1);
  };
  const liquidityEntryDate = entry => String(entry.date || entry.createdAt || '').slice(0, 10) || '—';
  const openLiquidityEntryPage = () => {
    const currentDate = typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const currencyOptions = liquidityCurrencies.filter(currency => currencies?.[currency]).map(currency => `<option value="${currency}">${currencies[currency]}</option>`).join('');
    const selectedDisplayCurrency = db.settings?.liquidityDisplayCurrency || 'USD';
    showModal(`<section class="liquidity-entry-page"><header><button type="button" id="liquidityEntryClose">×</button><div><h1>إضافة سيولة</h1><p>أضف أرصدة خزنة أو بنك أو محفظة مستقلة.</p></div></header><form id="liquidityMultiForm"><div class="grid2"><div class="field"><label>عرض الإجمالي بعملة</label><select name="totalCurrency">${liquidityCurrencies.filter(currency => currencies?.[currency]).map(currency => `<option value="${currency}" ${currency === selectedDisplayCurrency ? 'selected' : ''}>${currencies[currency]}</option>`).join('')}</select></div><div class="field"><label>التاريخ</label><input name="date" type="date" value="${currentDate}" required></div></div><div class="field" data-liquidity-multiple><label>المبالغ والعملات</label><div class="liquidity-amount-list"></div><small class="muted">لكل مبلغ عملته الخاصة. يُضاف صف جديد تلقائيًا بعد اكتمال الصف السابق.</small></div><div class="liquidity-entry-total"><span>إجمالي المبالغ بعد التحويل</span><strong>0</strong><small>0 مبالغ</small></div><div class="grid2"><div class="field"><label>الخزنة أو البنك أو المحفظة</label><input name="location" maxlength="100" placeholder="مثال: بنك، خزنة أو محفظة" required></div><div class="field"><label>الوقت</label><input name="time" type="time" value="${currentTime}" required></div></div><div class="field"><label>ملاحظة</label><input name="note" maxlength="160" placeholder="توضيح اختياري"></div><div class="form-actions"><button class="primary" type="submit" disabled>حفظ السيولة</button><button class="soft-btn" type="button" id="liquidityEntryCancel">إلغاء</button></div></form></section>`);
    const modal = document.getElementById('modal');
    modal.classList.add('fullscreen-modal', 'liquidity-entry-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    const form = document.getElementById('liquidityMultiForm');
    const amountList = form.querySelector('.liquidity-amount-list');
    const totalBox = form.querySelector('.liquidity-entry-total');
    const submit = form.querySelector('[type="submit"]');
    const totalCurrency = form.elements.totalCurrency;
    const rows = () => [...amountList.querySelectorAll('.liquidity-amount-row')].map(row => ({
      element: row,
      currency: row.querySelector('select').value,
      amount: Number(String(row.querySelector('input').value).replace(/,/g, ''))
    }));
    const parsedAmounts = () => rows().filter(row => currencies[row.currency] && Number.isFinite(row.amount) && row.amount > 0);
    const update = () => {
      const values = parsedAmounts();
      const displayCurrency = totalCurrency.value || 'USD';
      const convertedTotal = values.reduce((sum, row) => sum + row.amount / liquidityRate(row.currency), 0) * liquidityRate(displayCurrency);
      totalBox.querySelector('strong').textContent = `${number(convertedTotal)} ${displayCurrency}`;
      totalBox.querySelector('small').textContent = `${values.length} مبالغ`;
      submit.disabled = !values.length;
    };
    const addAmount = () => {
      const row = document.createElement('div');
      row.className = 'liquidity-amount-row';
      row.innerHTML = `<select aria-label="عملة المبلغ"><option value="">العملة</option>${currencyOptions}</select><input type="text" inputmode="decimal" placeholder="0.00" dir="ltr" autocomplete="off" aria-label="المبلغ"><button type="button" aria-label="حذف المبلغ">×</button>`;
      const rowCurrency = row.querySelector('select');
      const input = row.querySelector('input');
      const checkForNext = () => {
        if (row === amountList.lastElementChild && rowCurrency.value && Number(String(input.value).replace(/,/g, '')) > 0) addAmount();
        update();
      };
      rowCurrency.addEventListener('change', checkForNext);
      input.addEventListener('input', checkForNext);
      row.querySelector('button').onclick = () => { if (amountList.children.length > 1) row.remove(); else { rowCurrency.value = ''; input.value = ''; } update(); };
      amountList.append(row);
    };
    addAmount();
    totalCurrency.addEventListener('change', update);
    const back = () => openLiquidityPage();
    document.getElementById('liquidityEntryClose').onclick = back;
    document.getElementById('liquidityEntryCancel').onclick = back;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = new FormData(form), amounts = parsedAmounts(), location = String(values.get('location') || '').trim();
      const incompleteRow = rows().some(row => Number.isFinite(row.amount) && row.amount > 0 && !currencies[row.currency]);
      if (incompleteRow || !amounts.length || !location) { toast('حدد عملة كل مبلغ، والمبالغ، واسم الخزنة أو البنك'); return; }
      const groupId = crypto.randomUUID();
      const date = String(values.get('date') || currentDate), time = String(values.get('time') || currentTime), note = String(values.get('note') || '').trim();
      db.liquidityEntries = db.liquidityEntries || [];
      db.settings = db.settings || {};
      db.settings.liquidityDisplayCurrency = String(values.get('totalCurrency') || 'USD');
      amounts.forEach(row => db.liquidityEntries.unshift({ id: crypto.randomUUID(), groupId, currency: row.currency, amount: row.amount, location, note, date, time, createdAt: new Date(`${date}T${time}`).toISOString() }));
      save();
      openLiquidityPage();
      toast('تم حفظ السيولة المستقلة');
    });
  };
  const openLiquidityPage = () => {
    db.settings = db.settings || {};
    const entries = [...(db.liquidityEntries || [])].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const displayCurrency = db.settings.liquidityDisplayCurrency || 'USD';
    const totalUsd = entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0) / liquidityRate(entry.currency || 'USD'), 0);
    const icon = '<svg viewBox="0 0 24 24"><path d="M4 7h16v12H4zM7 7V4h10v3M8 14h8"/></svg>';
    const days = entries.reduce((all, entry) => { const day = liquidityEntryDate(entry); (all[day] || (all[day] = [])).push(entry); return all; }, {});
    const rows = Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).map(([day, dayEntries]) => {
      const dayUsd = dayEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0) / liquidityRate(entry.currency || 'USD'), 0);
      return `<details class="liquidity-day"><summary><span class="liquidity-row-icon" aria-hidden="true">${icon}</span><span class="liquidity-row-copy"><strong>${number(dayUsd * liquidityRate(displayCurrency))} ${displayCurrency}</strong><small>${day} · ${dayEntries.length} مبالغ</small></span><span class="liquidity-row-chevron" aria-hidden="true">⌄</span></summary><div class="liquidity-day-entries">${dayEntries.map(entry => `<div><span>${escapeHtml(entry.location || 'خزنة أو بنك')}</span><strong>${number(entry.amount)} ${escapeHtml(entry.currency || 'USD')}</strong><small>${entry.time || ''}${entry.note ? ` · ${escapeHtml(entry.note)}` : ''}</small></div>`).join('')}</div></details>`;
    }).join('') || '<div class="liquidity-page-empty">لا توجد أرصدة سيولة مسجلة بعد.</div>';
    const choices = liquidityCurrencies.filter(currency => currencies?.[currency]).map(currency => `<button type="button" data-liquidity-currency="${currency}" class="${currency === displayCurrency ? 'active' : ''}">${currency}</button>`).join('');
    showModal(`<section class="liquidity-page"><section class="liquidity-page-hero"><div class="liquidity-hero-top"><div><h1>إجمالي السيولة</h1></div><span class="liquidity-hero-icon" aria-hidden="true">${icon}</span></div><div class="liquidity-hero-total"><strong>${number(totalUsd * liquidityRate(displayCurrency))} ${displayCurrency}</strong><span>الإجمالي المتاح</span></div><div class="liquidity-currency-choices"><span>عرض الإجمالي بـ:</span>${choices}</div><div class="liquidity-hero-bottom"><button type="button" id="newLiquidityFromPage">＋ إضافة سيولة</button><span>${entries.length} رصيد مسجل</span></div></section><section class="liquidity-page-list"><div class="liquidity-page-list-head"><div><h2>سجل السيولة</h2><p>الخزائن والبنوك والمحافظ المسجلة</p></div><button type="button" id="liquidityPdfFromPage">PDF</button></div>${rows}</section></section>`);
    const modal = document.getElementById('modal');
    modal.classList.add('fullscreen-modal', 'liquidity-page-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    document.querySelectorAll('[data-liquidity-currency]').forEach(button => button.addEventListener('click', () => {
      db.settings.liquidityDisplayCurrency = button.dataset.liquidityCurrency;
      save();
      openLiquidityPage();
    }));
    document.getElementById('newLiquidityFromPage').onclick = openLiquidityEntryPage;
    document.getElementById('liquidityPdfFromPage').onclick = () => {
      if (!window.openDaftariPdfPeriodChooser || !window.downloadDaftariRecordPdf) { toast('ميزة PDF غير جاهزة بعد'); return; }
      window.openDaftariPdfPeriodChooser({ title: 'تنزيل سجل السيولة PDF', entries, onDownload: (selected, period) => window.downloadDaftariRecordPdf({ title: 'سجل السيولة المتاحة', subtitle: period.label, fileName: `سجل-السيولة-${period.fileSuffix}`, sections: [{ title: 'الأرصدة', rows: selected.map(entry => ({ label: entry.location || 'خزنة أو بنك', value: `${number(entry.amount)} ${entry.currency || ''}` })) }] }) });
    };
  };
  if (cashLiquidityCard) cashLiquidityCard.addEventListener('click', event => {
    if (openingOriginalLiquidityForm) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openLiquidityPage();
  }, true);

  // Reuse the ledger's clients and client-detail actions in a dedicated clients
  // screen.  No customer data, records, or old actions are replaced here.
  const originalCustomerDirectory = customerDirectory;
  customerDirectory = () => {
    const clients = Array.isArray(db.clients) ? db.clients : [];
    const clientUsd = client => (client.records || []).reduce((sum, record) => sum + (record.type === 'payment' ? -1 : 1) * totalUsd(client, record), 0);
    const clientCurrencyBalance = client => {
      const currency = client.preferredCurrency || client.currency || 'USD';
      return { currency, value: (client.records || []).filter(record => (record.currency || 'USD') === currency).reduce((sum, record) => sum + (record.type === 'payment' ? -1 : 1) * (Number(record.amount) || 0), 0) };
    };
    const total = clients.reduce((sum, client) => sum + clientUsd(client), 0);
    showModal(`<section class="customers-page"><header class="customers-page-head"><div><h1>العملاء</h1><p><b>${clients.length}</b> عميل · إجمالي <strong>$ ${number(Math.abs(total))}</strong></p></div><button type="button" id="customersAddTop">＋ عميل جديد</button></header><div class="customers-search"><span aria-hidden="true">⌕</span><input id="customersSearch" type="search" autocomplete="off" placeholder="ابحث بالاسم أو الهاتف…"></div><button type="button" class="customers-archived" id="customersArchived"><span aria-hidden="true">▱</span> المؤرشف فقط؟</button><section id="customersPageList" class="customers-page-list"></section></section>`);
    const modal = document.getElementById('modal');
    modal.classList.add('fullscreen-modal', 'customers-page-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    const search = document.getElementById('customersSearch');
    const archivedButton = document.getElementById('customersArchived');
    let archivedOnly = false;
    const paint = () => {
      const query = search.value.trim().toLowerCase();
      const list = clients.filter(client => {
        const archived = Boolean(client.archived || client.deletedAt);
        return (!archivedOnly || archived) && `${client.name || ''} ${client.phone || ''}`.toLowerCase().includes(query);
      });
      const holder = document.getElementById('customersPageList');
      holder.innerHTML = list.length ? list.map(client => {
        const balance = clientCurrencyBalance(client);
        const usd = clientUsd(client);
        const initial = escapeHtml((client.name || 'ع').trim().charAt(0) || 'ع');
        return `<button type="button" class="customers-page-row" data-customers-page-id="${escapeHtml(client.id)}"><span class="customers-avatar">${initial}</span><span class="customers-row-copy"><strong>${escapeHtml(client.name || 'عميل')}</strong><small>${escapeHtml(client.phone || 'لا يوجد رقم هاتف')} · ${(client.records || []).length} عملية</small></span><span class="customers-row-balance ${balance.value < 0 ? 'positive' : ''}"><b>${balance.value < 0 ? '− ' : '+'}${number(Math.abs(balance.value))} ${escapeHtml(balance.currency)}</b><small>${usd < 0 ? 'له' : 'عليه'} $ ${number(Math.abs(usd))}</small></span><span class="customers-row-chevron" aria-hidden="true">‹</span></button>`;
      }).join('') : `<div class="customers-empty"><div aria-hidden="true">♙</div><strong>${clients.length ? 'لا يوجد عملاء مطابقون' : 'ابدأ بدفترك'}</strong><p>${clients.length ? 'غيّر البحث أو أظهر العملاء المؤرشفين.' : 'أضف أول عميل، وسجّل له الديون والتسديدات بعملات مختلفة.'}</p>${clients.length ? '' : '<button type="button" id="customersEmptyAdd">＋ إضافة عميل</button>'}</div>`;
      window.DaftariIcons?.upgrade(holder);
      holder.querySelectorAll('[data-customers-page-id]').forEach(button => button.addEventListener('click', () => openClient(button.dataset.customersPageId)));
      holder.querySelector('#customersEmptyAdd')?.addEventListener('click', () => document.getElementById('addClient')?.click());
    };
    document.getElementById('customersAddTop').onclick = () => document.getElementById('addClient')?.click();
    archivedButton.onclick = () => { archivedOnly = !archivedOnly; archivedButton.classList.toggle('active', archivedOnly); paint(); };
    search.addEventListener('input', paint);
    paint();
  };

  const refresh = () => {
    const clients = Array.isArray(data().clients) ? data().clients : [];
    const records = clients.flatMap(client => (client.records || []).map(record => ({ client, record })));
    const balances = {};
    let netUsd = 0;
    let commissionUsd = 0;
    records.forEach(({ client, record }) => {
      const amount = Number(record.amount) || 0;
      const sign = record.type === 'payment' ? -1 : 1;
      const currency = record.currency || 'USD';
      balances[currency] = (balances[currency] || 0) + sign * amount;
      const usd = totalUsd(client, record);
      netUsd += sign * usd;
      commissionUsd += Math.abs(Number(record.commissionValue) || 0);
    });
    home.querySelector('[data-home-net]').textContent = `$ ${number(Math.abs(netUsd))}`;
    home.querySelector('[data-home-clients]').textContent = number(clients.length);
    home.querySelector('[data-home-client-button-count]').textContent = number(clients.length);
    home.querySelector('[data-home-records]').textContent = number(records.length);
    home.querySelector('[data-home-fees]').textContent = `$ ${number(commissionUsd)}`;
    const liquidity = (data().liquidityEntries || []).reduce((all, entry) => {
      const currency = entry.currency || 'USD';
      all[currency] = (all[currency] || 0) + (Number(entry.amount) || 0);
      return all;
    }, {});
    const displayCurrency = data().settings?.liquidityDisplayCurrency || 'USD';
    const rates = data().settings?.exchangeRatesByType?.debt || data().settings?.exchangeRates || {};
    const rate = currency => Number(rates[currency]) || (currency === 'SAR' ? 3.8 : currency === 'YER' ? 535 : 1);
    const liquidityUsd = Object.entries(liquidity).reduce((sum, [currency, amount]) => sum + amount / rate(currency), 0);
    const liquiditySymbol = { USD: '$', SAR: 'ر.س', YER: 'ر.ي', USDT: '₮' }[displayCurrency] || displayCurrency;
    home.querySelector('[data-home-liquidity-total]').textContent = `${liquiditySymbol} ${number(liquidityUsd * rate(displayCurrency))}`;
    const currencyBox = home.querySelector('[data-home-currencies]');
    const currencyRows = Object.entries(balances).filter(([, value]) => Math.abs(value) > 0.00001);
    currencyBox.innerHTML = currencyRows.length ? currencyRows.map(([currency, value]) => `<div class="dftr-currency-row"><span>${escapeHtml((currencies?.[currency] || currency).replace(/^.*? /, ''))}</span><strong>${value < 0 ? '−' : ''}${number(Math.abs(value))} ${escapeHtml(currency)}</strong></div>`).join('') : '<div class="dftr-home-empty">لا توجد أرصدة بعد — سجّل أول عملية لعمل.</div>';
    const activity = home.querySelector('[data-home-activity]');
    const now = Date.now();
    const last24Start = now - 24 * 60 * 60 * 1000;
    const operationTimestamp = record => {
      const createdAt = new Date(record.createdAt || '');
      if (!Number.isNaN(createdAt.getTime())) return createdAt.getTime();
      const storedDay = String(record.date || '').slice(0, 10);
      const parts = storedDay.split('-').map(Number);
      return parts.length === 3 && parts.every(Number.isFinite) ? Date.UTC(parts[0], parts[1] - 1, parts[2]) - 3 * 60 * 60 * 1000 : 0;
    };
    const recent24Hours = records
      .filter(({ record }) => operationTimestamp(record) >= last24Start && operationTimestamp(record) <= now)
      .sort((a, b) => operationTimestamp(b.record) - operationTimestamp(a.record));
    home.querySelector('[data-home-24-count]').textContent = number(recent24Hours.length);
    const newest = recent24Hours;
    activity.innerHTML = newest.length ? newest.map(({ client, record }) => `<button type="button" class="dftr-activity-row ${record.type === 'payment' ? 'is-payment' : 'is-debt'}" data-home-client="${escapeHtml(client.id)}"><span><strong>${escapeHtml(client.name || 'عميل')}</strong><small>${record.type === 'payment' ? 'تسديد دين' : 'إضافة دين'} · ${escapeHtml(dateText(record.date))}${timeText(record) ? ' · ' + escapeHtml(timeText(record)) : ''}</small></span><b>${record.type === 'payment' ? '−' : '+'} ${number(record.amount)} ${escapeHtml(record.currency || '')}</b></button>`).join('') : '<div class="dftr-activity-empty"><div class="dftr-empty-icon">♙</div><strong>لا توجد عمليات خلال آخر 24 ساعة</strong><span>ستظهر هنا كل إضافات الدين والتسديدات لجميع العملاء في هذه الفترة.</span></div>';
    activity.querySelectorAll('[data-home-client]').forEach(button => button.addEventListener('click', () => window.openClient?.(button.dataset.homeClient)));
    activity.querySelectorAll('.home-add-client').forEach(button => button.addEventListener('click', () => document.querySelector('#addClient')?.click()));
  };
  refresh();
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    const result = originalSetItem.apply(this, arguments);
    if (key === 'daftari-ledger-v1') queueMicrotask(refresh);
    return result;
  };
  new MutationObserver(refresh).observe(cards, { childList: true, subtree: true, characterData: true });
  window.addEventListener('focus', refresh);
})();
