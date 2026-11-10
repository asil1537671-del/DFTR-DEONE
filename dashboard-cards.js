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
    'cash-liquidity-card',
    'personal-withdrawals-card',
    'backup-card',
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

  // Personal withdrawals live in their own ledger.  They never create or change a
  // client record, debt, payment, or client balance.  Older single-amount entries
  // are normalized here so existing data remains visible as one-item withdrawals.
  db.personalWithdrawals = Array.isArray(db.personalWithdrawals) ? db.personalWithdrawals : [];
  // Liquidity is entered manually as the actual balances held in cash boxes and
  // bank accounts.  It intentionally has no relation to clients, debts, payments,
  // or personal withdrawals.
  db.liquidityEntries = Array.isArray(db.liquidityEntries) ? db.liquidityEntries : [];
  const normalizeDigits = value => String(value ?? '')
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  const withdrawalAmounts = entry => {
    const listed = Array.isArray(entry?.amounts) ? entry.amounts : [];
    const amounts = listed.map(value => Number(normalizeDigits(value).replace(/,/g, ''))).filter(value => Number.isFinite(value) && value > 0);
    if (amounts.length) return amounts;
    const legacyAmount = Number(entry?.amount);
    return Number.isFinite(legacyAmount) && legacyAmount > 0 ? [legacyAmount] : [];
  };
  const withdrawalTotal = entry => withdrawalAmounts(entry).reduce((total, amount) => total + amount, 0);
  const withdrawalTime = entry => {
    if (entry?.time) return String(entry.time).slice(0, 5);
    if (!entry?.createdAt) return '';
    const date = new Date(entry.createdAt);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const withdrawalTimestamp = entry => `${niceDate(entry.date)}${withdrawalTime(entry) ? ` · ${withdrawalTime(entry)}` : ''}`;
  const sortWithdrawals = entries => [...entries].sort((a, b) => String(b.occurredAt || b.createdAt || b.date || '').localeCompare(String(a.occurredAt || a.createdAt || a.date || '')));
  const cashCard = document.createElement('button');
  cashCard.type = 'button';
  cashCard.id = 'cash-liquidity-card';
  cashCard.className = 'card cash-liquidity-card';
  cashCard.innerHTML = '<span class="cash-card-head"><span class="cash-card-icon" aria-hidden="true">▣</span><span><strong>إجمالي السيولة</strong><small>أرصدة الخزائن والبنوك المستقلة</small></span></span><span class="cash-card-values" data-cash-values>لا توجد سيولة مسجلة</span>';
  cards.append(cashCard);

  const withdrawalsCard = document.createElement('button');
  withdrawalsCard.type = 'button';
  withdrawalsCard.id = 'personal-withdrawals-card';
  withdrawalsCard.className = 'card personal-withdrawals-card';
  withdrawalsCard.innerHTML = '<span class="cash-card-head"><span class="withdrawals-card-icon" aria-hidden="true">↗</span><span><strong>السحوبات الشخصية</strong><small>سجل مستقل لا يدخل في ديون أو أرصدة العملاء</small></span></span><span class="withdrawals-card-total" data-withdrawals-total>لا توجد سحوبات اليوم</span>';
  cards.append(withdrawalsCard);

  function currencyTotals(entries, direction) {
    const totals = {};
    entries.forEach(entry => {
      const currency = entry.currency || 'USD';
      totals[currency] = (totals[currency] || 0) + direction(entry);
    });
    return totals;
  }

  function collectLiquidity() {
    return currencyTotals(db.liquidityEntries || [], entry => Number(entry.amount) || 0);
  }

  function formatCurrencyTotals(totals, empty = 'لا توجد بيانات') {
    const entries = Object.entries(totals).filter(([, amount]) => Math.abs(amount) > 0.0001);
    return entries.length ? entries.map(([currency, amount]) => `${fmt(Math.abs(amount))} ${currencyDisplay(currency)}`).join(' · ') : empty;
  }

  function refreshCashCards() {
    const liquidity = collectLiquidity();
    const cashValues = cashCard.querySelector('[data-cash-values]');
    const netEntries = Object.entries(liquidity).filter(([, amount]) => Math.abs(amount) > 0.0001);
    cashValues.innerHTML = netEntries.length ? formatCurrencyTotals(liquidity) : 'لا توجد سيولة مسجلة';
    cashCard.setAttribute('aria-label', `إجمالي السيولة: ${netEntries.length ? netEntries.map(([currency, amount]) => `${fmt(Math.abs(amount))} ${currency}`).join('، ') : 'لا توجد سيولة مسجلة'}`);
    const currentDay = today();
    const todayEntries = (db.personalWithdrawals || []).filter(entry => entry.date === currentDay);
    const withdrawalsTotal = withdrawalsCard.querySelector('[data-withdrawals-total]');
    withdrawalsTotal.innerHTML = todayEntries.length ? `${fmt(todayEntries.length)} سحبة اليوم · ${formatCurrencyTotals(currencyTotals(todayEntries, withdrawalTotal), '')}` : 'لا توجد سحوبات اليوم';
  }

  function openCashLiquidity() {
    const liquidity = collectLiquidity();
    const totals = formatCurrencyTotals(liquidity, 'لا توجد سيولة مسجلة');
    const entries = [...(db.liquidityEntries || [])].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const rows = entries.slice(0, 50).map(entry => `<button type="button" class="personal-withdrawal-row" data-liquidity-id="${esc(entry.id)}"><span><strong>${fmt(entry.amount)} ${currencyDisplay(entry.currency || 'USD')}</strong><small>${esc(entry.location || 'خزنة أو بنك')}${entry.note ? ` · ${esc(entry.note)}` : ''}</small></span><span class="withdrawal-row-arrow" aria-hidden="true">×</span></button>`).join('') || '<div class="empty">أضف رصيد خزنة أو حساب بنكي ليظهر هنا.</div>';
    showModal(`<div class="modal-head"><div><h3>إجمالي السيولة</h3><p class="cash-modal-note">أرصدة تُدخلها يدويًا للخزائن والبنوك، وهي مستقلة تمامًا عن الديون والتسديدات والسحوبات.</p></div>${closeButton()}</div><section class="withdrawals-summary"><span>إجمالي الأرصدة المسجلة</span><strong>${totals}</strong><small>${fmt(entries.length)} رصيد مستقل</small></section><form id="liquidityEntryForm"><h4>إضافة رصيد سيولة</h4><div class="grid2"><div class="field"><label>العملة</label><select name="currency" required>${withdrawalCurrencyOptions()}</select></div><div class="field"><label>المبلغ</label><input name="amount" type="text" inputmode="decimal" lang="en" dir="ltr" autocomplete="off" placeholder="0.00" required></div></div><div class="field"><label>الخزنة أو البنك</label><input name="location" maxlength="100" placeholder="مثال: خزنة المكتب أو حساب البنك" required></div><div class="field"><label>ملاحظة</label><input name="note" maxlength="160" placeholder="توضيح اختياري"></div><div class="form-actions"><button class="primary" type="submit">حفظ رصيد السيولة</button><button class="soft-btn" type="button" id="downloadLiquidityPdf">تنزيل سجل السيولة PDF</button></div></form><section class="personal-withdrawals-list"><h4>الأرصدة المسجلة</h4>${rows}</section>`);
    bindClose();
    const form = document.getElementById('liquidityEntryForm');
    // The cash ledger can be viewed as one chosen currency while retaining
    // every original entry in its own currency.
    db.settings = db.settings || {};
    const displayOptions = ['USD', 'SAR', 'YER', 'USDT'].filter(code => currencies[code]);
    const displayField = document.createElement('div');
    displayField.className = 'field liquidity-display-currency';
    displayField.innerHTML = `<label>عرض إجمالي السيولة بعملة</label><select>${displayOptions.map(code => `<option value="${code}" ${code === (db.settings.liquidityDisplayCurrency || 'USD') ? 'selected' : ''}>${currencies[code]}</option>`).join('')}</select><small class="muted">يمكنك تغيير عملة العرض في أي وقت؛ لا تتغير أرصدة المحافظ والبنوك الأصلية.</small><strong></strong>`;
    form.before(displayField);
    const displaySelect = displayField.querySelector('select');
    const showLiquidityTotal = () => {
      const currency = displaySelect.value;
      const rates = db.settings.exchangeRatesByType?.debt || db.settings.exchangeRates || {};
      const rate = code => Number(rates[code]) || (code === 'SAR' ? 3.8 : code === 'YER' ? 535 : 1);
      const asUsd = Object.entries(liquidity).reduce((sum, [code, amount]) => sum + Number(amount || 0) / rate(code), 0);
      displayField.querySelector('strong').textContent = `الإجمالي المتاح: ${fmt(asUsd * rate(currency))} ${currencyDisplay(currency)}`;
    };
    displaySelect.addEventListener('change', () => {
      db.settings.liquidityDisplayCurrency = displaySelect.value;
      save();
      showLiquidityTotal();
    });
    showLiquidityTotal();
    document.getElementById('downloadLiquidityPdf').onclick = () => {
      if (!window.downloadDaftariRecordPdf) { toast('ميزة PDF غير جاهزة بعد'); return; }
      window.openDaftariPdfPeriodChooser({
        title: 'تنزيل سجل السيولة PDF', entries,
        onDownload: (selected, period) => {
          window.downloadDaftariRecordPdf({ title: 'سجل السيولة المستقلة', subtitle: `أرصدة الخزائن والبنوك · مستقلة عن الديون والتسديدات والسحوبات · ${period.label}`, fileName: `سجل-السيولة-${period.fileSuffix}`, sections: [{ title: 'الأرصدة', rows: selected.length ? selected.map(entry => ({ label: `${entry.location || 'خزنة أو بنك'}${entry.note ? ` · ${entry.note}` : ''}`, value: `${fmt(entry.amount)} ${entry.currency || ''}` })) : [{ label: 'الأرصدة', value: 'لا توجد سيولة في الفترة المحددة' }] }] });
          toast('تم تنزيل سجل السيولة بصيغة PDF');
        }
      });
    };
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = new FormData(form);
      const currency = String(values.get('currency') || '');
      const amount = Number(normalizeDigits(values.get('amount')).replace(/,/g, ''));
      const location = String(values.get('location') || '').trim();
      if (!currencies[currency] || !Number.isFinite(amount) || amount <= 0 || !location) { toast('حدد العملة والمبلغ واسم الخزنة أو البنك'); return; }
      db.liquidityEntries.unshift({ id: crypto.randomUUID(), currency, amount, location, note: String(values.get('note') || '').trim(), createdAt: new Date().toISOString() });
      save();
      refreshCashCards();
      openCashLiquidity();
      toast('تم حفظ رصيد السيولة المستقل');
    });
    document.querySelectorAll('[data-liquidity-id]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.liquidityId;
      if (!confirm('حذف رصيد السيولة المحدد؟')) return;
      db.liquidityEntries = db.liquidityEntries.filter(entry => String(entry.id) !== String(id));
      save();
      refreshCashCards();
      openCashLiquidity();
    }));
  }

  function withdrawalCurrencyOptions() {
    return '<option value="" selected disabled>اختر العملة</option>' + ['YER', 'USD', 'SAR', 'USDT'].filter(currency => currencies[currency]).map(currency => `<option value="${currency}">${currencies[currency]}</option>`).join('');
  }

  function parseWithdrawalAmounts(values) {
    return (Array.isArray(values) ? values : [values]).flatMap(value => normalizeDigits(value).split(/[\n,،;؛\s]+/)).map(part => Number(part.replace(/,/g, ''))).filter(amount => Number.isFinite(amount) && amount > 0);
  }

  function formatDraftWithdrawalTotal(amounts, currency) {
    return amounts.length ? `${fmt(amounts.reduce((total, amount) => total + amount, 0))} ${currencyDisplay(currency)}` : `0 ${currencyDisplay(currency)}`;
  }

  function openPersonalWithdrawals() {
    const withdrawals = sortWithdrawals(db.personalWithdrawals || []);
    const totals = currencyTotals(withdrawals, withdrawalTotal);
    const items = withdrawals.slice(0, 30).map(entry => `<button type="button" class="personal-withdrawal-row" data-withdrawal-id="${esc(entry.id)}"><span><strong>${fmt(withdrawalTotal(entry))} ${currencyDisplay(entry.currency || 'USD')}</strong><small>${withdrawalTimestamp(entry)} · ${fmt(withdrawalAmounts(entry).length)} مبالغ${entry.source ? ` · ${esc(entry.source)}` : ''}</small></span><span class="withdrawal-row-arrow" aria-hidden="true">‹</span></button>`).join('') || '<div class="empty">لا توجد سحوبات شخصية مسجلة.</div>';
    const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    showModal(`<div class="modal-head"><div><h3>السحوبات اليومية</h3><p class="withdrawals-independent-note">سجل مستقل تمامًا عن ديون العملاء وتسديداتهم وأرصدتهم.</p></div>${closeButton()}</div><section class="withdrawals-summary"><span>إجمالي السحوبات المسجلة</span><strong>${formatCurrencyTotals(totals, 'لا توجد سحوبات مسجلة')}</strong><small>${fmt(withdrawals.length)} سحبة مستقلة</small></section><form id="personalWithdrawalForm"><h4>سحب جديد</h4><div class="grid2"><div class="field"><label>العملة أولاً</label><select name="currency" required>${withdrawalCurrencyOptions()}</select></div><div class="field"><label>التاريخ</label><input name="date" type="date" lang="en" dir="ltr" required value="${today()}"></div></div><div class="field withdrawal-amounts-field" data-withdrawal-amounts hidden><label>المبالغ</label><div class="withdrawal-amount-list" data-withdrawal-amount-list></div><small class="muted">يُضاف حقل جديد تلقائيًا بعد إدخال كل مبلغ.</small></div><div class="withdrawal-draft-total" data-withdrawal-draft hidden><span>الإجمالي</span><strong data-withdrawal-draft-total>0</strong><small data-withdrawal-draft-count>0 مبالغ</small></div><div class="grid2"><div class="field"><label>المصدر</label><input name="source" maxlength="100" placeholder="فرع، محفظة، أو مورد (اختياري)"></div><div class="field"><label>الوقت</label><input name="time" type="time" lang="en" dir="ltr" required value="${currentTime}"></div></div><div class="field"><label>ملاحظة</label><input name="note" maxlength="160" placeholder="توضيح إضافي (اختياري)"></div><div class="form-actions"><button class="primary" type="submit" data-withdrawal-submit disabled>إضافة سحب</button><button class="soft-btn" type="button" id="downloadWithdrawalsPdf">تنزيل سجل السحوبات PDF</button></div></form><section class="personal-withdrawals-list"><h4>سجل السحوبات</h4>${items}</section>`);
    document.getElementById('modal').classList.add('fullscreen-modal', 'personal-withdrawals-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    bindClose();
    const form = document.getElementById('personalWithdrawalForm');
    document.getElementById('downloadWithdrawalsPdf').onclick = () => {
      if (!window.downloadDaftariRecordPdf) { toast('ميزة PDF غير جاهزة بعد'); return; }
      window.openDaftariPdfPeriodChooser({
        title: 'تنزيل سجل السحوبات PDF', entries: withdrawals,
        getDate: entry => entry.date, getTime: withdrawalTime,
        onDownload: (selected, period) => {
          window.downloadDaftariRecordPdf({ title: 'سجل السحوبات الشخصية', subtitle: `سجل مستقل تمامًا عن ديون العملاء وتسديداتهم وأرصدتهم · ${period.label}`, fileName: `سجل-السحوبات-${period.fileSuffix}`, sections: [{ title: 'السحوبات', rows: selected.length ? selected.map(entry => ({ label: `${withdrawalTimestamp(entry)}${entry.source ? ` · ${entry.source}` : ''}${entry.note ? ` · ${entry.note}` : ''}`, value: `${fmt(withdrawalTotal(entry))} ${entry.currency || ''}` })) : [{ label: 'السحوبات', value: 'لا توجد سحوبات في الفترة المحددة' }] }] });
          toast('تم تنزيل سجل السحوبات بصيغة PDF');
        }
      });
    };
    const currencyField = form.elements.currency;
    const amountsField = form.querySelector('[data-withdrawal-amounts]');
    const amountList = form.querySelector('[data-withdrawal-amount-list]');
    const draftBox = form.querySelector('[data-withdrawal-draft]');
    const draftTotal = form.querySelector('[data-withdrawal-draft-total]');
    const draftCount = form.querySelector('[data-withdrawal-draft-count]');
    const submitButton = form.querySelector('[data-withdrawal-submit]');
    const getAmounts = () => parseWithdrawalAmounts([...amountList.querySelectorAll('.withdrawal-amount-input')].map(input => input.value));
    const addAmountInput = () => {
      const input = document.createElement('input');
      input.className = 'withdrawal-amount-input';
      input.type = 'text';
      input.inputMode = 'decimal';
      input.lang = 'en';
      input.dir = 'ltr';
      input.autocomplete = 'off';
      input.placeholder = '0.00';
      input.setAttribute('aria-label', `المبلغ ${amountList.children.length + 1}`);
      input.addEventListener('input', () => {
        const inputs = [...amountList.querySelectorAll('.withdrawal-amount-input')];
        if (input === inputs.at(-1) && input.value.trim()) addAmountInput();
        updateDraft();
      });
      amountList.append(input);
      return input;
    };
    const updateDraft = () => {
      const amounts = getAmounts();
      const currency = currencyField.value;
      draftTotal.innerHTML = currency ? formatDraftWithdrawalTotal(amounts, currency) : '0';
      draftCount.textContent = `${fmt(amounts.length)} مبالغ`;
      submitButton.disabled = !currency || !amounts.length;
    };
    currencyField.addEventListener('change', () => {
      const selected = Boolean(currencyField.value);
      amountsField.hidden = !selected;
      draftBox.hidden = !selected;
      if (selected && !amountList.children.length) addAmountInput().focus();
      updateDraft();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = new FormData(form);
      const amounts = getAmounts();
      const currency = String(values.get('currency') || 'USD');
      const date = String(values.get('date') || today());
      const time = String(values.get('time') || currentTime).slice(0, 5);
      if (!amounts.length || !currencies[currency] || !/^\d{2}:\d{2}$/.test(time)) { toast('أدخل مبالغًا صحيحة وحدد العملة والوقت'); return; }
      db.personalWithdrawals.unshift({
        id: crypto.randomUUID(),
        amounts,
        amount: amounts.reduce((total, amount) => total + amount, 0),
        currency,
        source: String(values.get('source') || '').trim(),
        note: String(values.get('note') || '').trim(),
        date,
        time,
        occurredAt: new Date(`${date}T${time}:00`).toISOString(),
        createdAt: new Date().toISOString()
      });
      save();
      refreshCashCards();
      openPersonalWithdrawals();
      toast('تم حفظ السحب المستقل');
    });
    document.querySelectorAll('[data-withdrawal-id]').forEach(button => button.addEventListener('click', () => openWithdrawalDetails(button.dataset.withdrawalId)));
  }

  function openWithdrawalDetails(id) {
    const entry = (db.personalWithdrawals || []).find(item => String(item.id) === String(id));
    if (!entry) return openPersonalWithdrawals();
    const amounts = withdrawalAmounts(entry);
    const amountRows = amounts.map((amount, index) => `<li><span>${fmt(index + 1)}</span><strong>${fmt(amount)} ${currencyDisplay(entry.currency || 'USD')}</strong></li>`).join('');
    showModal(`<div class="modal-head"><div><h3>تفاصيل السحب</h3><p class="withdrawals-independent-note">عملية مستقلة ولا تؤثر في أرصدة أو ديون العملاء.</p></div>${closeButton()}</div><section class="withdrawal-detail-total"><span>إجمالي السحب</span><strong>${fmt(withdrawalTotal(entry))} ${currencyDisplay(entry.currency || 'USD')}</strong><small>${withdrawalTimestamp(entry)} · ${fmt(amounts.length)} مبالغ</small></section><section class="withdrawal-detail-list"><h4>المبالغ المضمنة</h4><ol>${amountRows}</ol></section><dl class="withdrawal-detail-meta"><div><dt>المصدر</dt><dd>${entry.source ? esc(entry.source) : 'غير محدد'}</dd></div><div><dt>الملاحظة</dt><dd>${entry.note ? esc(entry.note) : 'لا توجد ملاحظة'}</dd></div></dl><div class="form-actions"><button type="button" class="soft-btn" id="withdrawalBack">العودة للسجل</button><button type="button" class="danger" id="withdrawalDelete">حذف السحب</button></div>`);
    document.getElementById('modal').classList.add('fullscreen-modal', 'personal-withdrawals-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    bindClose();
    document.getElementById('withdrawalBack').onclick = openPersonalWithdrawals;
    document.getElementById('withdrawalDelete').onclick = () => {
      if (!confirm('حذف هذا السحب المستقل نهائيًا؟')) return;
      db.personalWithdrawals = db.personalWithdrawals.filter(item => String(item.id) !== String(id));
      save();
      refreshCashCards();
      openPersonalWithdrawals();
      toast('تم حذف السحب');
    };
  }

  cashCard.addEventListener('click', openCashLiquidity);
  withdrawalsCard.addEventListener('click', openPersonalWithdrawals);
  refreshCashCards();

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

  const backupCard = document.createElement('button');
  backupCard.type = 'button';
  backupCard.id = 'backup-card';
  backupCard.className = 'card backup-card';
  backupCard.innerHTML = '<span class="backup-card-icon" aria-hidden="true">⇄</span><span class="backup-card-copy"><strong>النسخة الاحتياطية</strong><small>حفظ بياناتك ونقلها إلى جوال آخر</small></span>';
  backupCard.setAttribute('aria-label', 'فتح النسخة الاحتياطية');
  backupCard.addEventListener('click', openBackup);
  cards.append(backupCard);

  function backupPayload() {
    return {
      app: 'دفتري',
      format: 'daftari-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify({
        clients: Array.isArray(db.clients) ? db.clients : [],
        profits: Array.isArray(db.profits) ? db.profits : [],
        personalWithdrawals: Array.isArray(db.personalWithdrawals) ? db.personalWithdrawals : [],
        liquidityEntries: Array.isArray(db.liquidityEntries) ? db.liquidityEntries : [],
        trash: Array.isArray(db.trash) ? db.trash : [],
        settings: db.settings && typeof db.settings === 'object' ? db.settings : {}
      }))
    };
  }

  function downloadBackup() {
    const backup = backupPayload();
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daftari-backup-${today()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('تم حفظ ملف النسخة الاحتياطية');
  }

  function restoreBackup(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('ملف النسخة الاحتياطية كبير جدًا'); return; }
    const reader = new FileReader();
    reader.onerror = () => toast('تعذر قراءة ملف النسخة الاحتياطية');
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(String(reader.result || '')); } catch (_) { toast('هذا الملف ليس نسخة احتياطية صالحة'); return; }
      const source = parsed?.format === 'daftari-backup' ? parsed.data : parsed;
      if (!source || typeof source !== 'object' || !Array.isArray(source.clients) || !Array.isArray(source.profits)) { toast('هذا الملف لا يحتوي على بيانات دفتري صالحة'); return; }
      if (!confirm('سيتم استبدال بيانات هذا الجهاز بالكامل ببيانات النسخة الاحتياطية. هل تريد المتابعة؟')) return;
      db = {
        clients: source.clients,
        profits: source.profits,
        personalWithdrawals: Array.isArray(source.personalWithdrawals) ? source.personalWithdrawals : [],
        liquidityEntries: Array.isArray(source.liquidityEntries) ? source.liquidityEntries : [],
        trash: Array.isArray(source.trash) ? source.trash : [],
        settings: source.settings && typeof source.settings === 'object' ? source.settings : {}
      };
      save();
      refreshCashCards();
      refreshAnalyticsCard();
      closeModal();
      toast('تمت استعادة النسخة الاحتياطية بنجاح');
    };
    reader.readAsText(file, 'utf-8');
  }

  function openBackup() {
    showModal(`<div class="modal-head"><div><h3>النسخة الاحتياطية</h3><p class="backup-modal-note">احتفظ بملف النسخة في مكان آمن، ثم افتحه من جوالك الآخر لاستعادة بيانات الدفتر والمستخدم المرتبط بها.</p></div>${closeButton()}</div><section class="backup-info"><strong>ماذا تتضمن النسخة؟</strong><span>بيانات المستخدم، العملاء، الديون، التسديدات، السيولة المستقلة، السحوبات، إعدادات الصرف، وسلة المحذوفات.</span></section><div class="backup-actions"><button type="button" class="primary" id="downloadBackup">↓ حفظ نسخة احتياطية</button><button type="button" class="soft-btn" id="restoreBackup">↑ استعادة نسخة من ملف</button><input id="backupFile" type="file" accept="application/json,.json" hidden></div><p class="backup-warning">عند الاستعادة تُستبدل بيانات الجهاز الحالية بالملف الذي تختاره.</p>`);
    bindClose();
    document.getElementById('downloadBackup').onclick = downloadBackup;
    const fileInput = document.getElementById('backupFile');
    document.getElementById('restoreBackup').onclick = () => fileInput.click();
    fileInput.onchange = () => restoreBackup(fileInput.files?.[0]);
  }

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
    const systemTransactions = (db.clients || []).flatMap(client => (client.records || []).map(record => ({ client, record })))
      .sort((a, b) => String(b.record.date || '').localeCompare(String(a.record.date || '')) || String(b.record.createdAt || '').localeCompare(String(a.record.createdAt || '')));
    const systemPdfButton = '<div class="form-actions analytics-pdf-action"><button type="button" class="soft-btn" id="downloadSystemTransactionsPdf">تنزيل سجل معاملات النظام PDF</button></div>';
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

    showModal(`<div class="modal-head analytics-modal-head"><div><h3>التحليل المالي الشامل</h3><p>إجماليات وحركة جميع العملاء</p></div>${closeButton()}</div><div class="analytics-kpis"><div><small>إجمالي العملاء</small><strong>${fmt(summary.clientCount)}</strong></div><div><small>العملاء المدينون</small><strong>${fmt(summary.debtorCount)}</strong></div><div><small>عمليات إضافة الدين</small><strong>${fmt(summary.debtCount)}</strong></div><div><small>عمليات التسديد</small><strong>${fmt(summary.paymentCount)}</strong></div></div>${systemPdfButton}<section class="analytics-usd-summary"><h4>الإجماليات · ما يعادل الدولار</h4><div><span>إجمالي الديون</span><strong>${fmt(summary.debtUsd)} USD</strong></div><div><span>إجمالي التسديدات</span><strong>${fmt(summary.paymentUsd)} USD</strong></div><div class="analytics-net"><span>${summary.balanceUsd >= 0 ? 'الرصيد المستحق' : 'صافي الرصيد الدائن'}</span><strong>${fmt(Math.abs(summary.balanceUsd))} USD</strong></div></section><section class="analytics-currency-section"><h4>التفصيل حسب العملة</h4><div class="analytics-table-wrap"><table class="analytics-table"><thead><tr><th>العملة</th><th>الديون</th><th>التسديدات</th><th>الرصيد</th><th>الأرباح</th></tr></thead><tbody>${currencyRows || '<tr><td colspan="5" class="analytics-empty">لا توجد عمليات مسجلة.</td></tr>'}</tbody></table></div></section><section class="analytics-movement-section"><h4>حركة الديون والتسديدات · آخر 24 ساعة</h4><div class="analytics-movements">${movementRows}</div></section>`);
    const modal = document.getElementById('modal');
    modal.classList.add('fullscreen-modal', 'analytics-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    bindClose();
    document.getElementById('downloadSystemTransactionsPdf').onclick = () => {
      if (!window.openDaftariPdfPeriodChooser || !window.downloadDaftariRecordPdf) { toast('ميزة PDF غير جاهزة بعد'); return; }
      window.openDaftariPdfPeriodChooser({
        title: 'تنزيل سجل معاملات النظام PDF', entries: systemTransactions,
        getDate: item => item.record.date, getTime: item => item.record.createdAt ? new Date(item.record.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
        onDownload: (selected, period) => {
          window.downloadDaftariRecordPdf({ title: 'سجل معاملات النظام', subtitle: `جميع ديون وتسديدات العملاء · ${period.label}`, fileName: `سجل-معاملات-النظام-${period.fileSuffix}`, sections: [{ title: 'المعاملات', rows: selected.length ? selected.map(({ client, record }) => ({ label: `${client.name} · ${record.type === 'payment' ? 'تسديد' : 'إضافة دين'} · ${niceDate(record.date)}${record.note ? ` · ${record.note}` : ''}`, value: `${record.type === 'payment' ? '−' : '+'} ${fmt(record.amount)} ${record.currency || ''}` })) : [{ label: 'المعاملات', value: 'لا توجد عمليات في الفترة المحددة' }] }] });
          toast('تم تنزيل سجل معاملات النظام بصيغة PDF');
        }
      });
    };
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
  if (recentList) new MutationObserver(() => { refreshAnalyticsCard(); refreshCashCards(); }).observe(recentList, { childList: true, subtree: true, characterData: true });

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
