(() => {
  'use strict';

  const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const money = value => `$ ${number(Math.abs(value))}`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const recordUsdValue = (client, record) => typeof recordUsd === 'function' ? Number(recordUsd(client, record)) || 0 : Number(record.amount) || 0;
  const recordDate = record => String(record.date || record.createdAt || '').slice(0, 10);

  function totals() {
    const clients = Array.isArray(db?.clients) ? db.clients : [];
    const records = clients.flatMap(client => (client.records || []).map(record => ({ client, record })));
    const result = { clients, records, debt: 0, payment: 0, fees: 0, balances: {}, clientsBalance: [] };
    clients.forEach(client => {
      let balance = 0;
      (client.records || []).forEach(record => {
        const usd = recordUsdValue(client, record);
        if (record.type === 'payment') result.payment += usd;
        else result.debt += usd;
        result.fees += Math.abs(Number(record.commissionValue) || 0);
        balance += record.type === 'payment' ? -usd : usd;
        const currency = record.currency || 'USD';
        result.balances[currency] = (result.balances[currency] || 0) + (record.type === 'payment' ? -1 : 1) * (Number(record.amount) || 0);
      });
      if (Math.abs(balance) > 0.0001) result.clientsBalance.push({ client, balance });
    });
    return result;
  }

  function chartBars(records) {
    const months = {};
    records.forEach(({ client, record }) => {
      const month = recordDate(record).slice(0, 7);
      if (!month) return;
      const row = months[month] || (months[month] = { debt: 0, payment: 0 });
      row[record.type === 'payment' ? 'payment' : 'debt'] += recordUsdValue(client, record);
    });
    const rows = Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
    const max = Math.max(1, ...rows.flatMap(([, values]) => [values.debt, values.payment]));
    return rows.length ? rows.map(([month, values]) => `<div class="report-bar-group"><div class="report-bar-pair"><i class="debt" style="height:${Math.max(4, values.debt / max * 100)}%" title="ديون ${money(values.debt)}"></i><i class="payment" style="height:${Math.max(4, values.payment / max * 100)}%" title="تسديدات ${money(values.payment)}"></i></div><small>${escapeHtml(month)}</small></div>`).join('') : '<div class="report-chart-empty">لا توجد حركة مسجلة بعد.</div>';
  }

  const transactionLabel = record => record.type === 'payment' ? 'تسديد دين' : 'إضافة دين';
  const transactionTime = record => {
    if (record.time && /^\d{2}:\d{2}$/.test(record.time)) return record.time;
    if (!record.createdAt) return '—';
    const date = new Date(record.createdAt);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  };
  const commissionSummary = record => {
    const type = record.commissionType || 'none';
    if (type === 'none') return 'لا توجد عمولة';
    const value = Number(record.commissionValue || record.commissionRate) || 0;
    const sign = type.includes('add') ? '+' : '−';
    return 'العمولة ' + sign + number(value) + (type.includes('percent') ? '%' : ' USD');
  };
  function renderDailyReport(data) {
    const dateInput = document.getElementById('dailyReportDate');
    const content = document.getElementById('dailyReportContent');
    if (!dateInput || !content) return;
    const selectedDate = dateInput.value || '';
    const entries = data.records
      .filter(item => recordDate(item.record) === selectedDate)
      .sort((a, b) => String(b.record.createdAt || '').localeCompare(String(a.record.createdAt || '')));
    const debt = entries.filter(item => item.record.type !== 'payment').reduce((sum, item) => sum + recordUsdValue(item.client, item.record), 0);
    const payment = entries.filter(item => item.record.type === 'payment').reduce((sum, item) => sum + recordUsdValue(item.client, item.record), 0);
    const customerCount = new Set(entries.map(item => item.client.id || item.client.name)).size;
    const summary = '<div class="daily-report-summary"><article><span>إضافات الدين</span><strong class="debt">' + money(debt) + '</strong></article><article><span>التسديدات</span><strong class="payment">' + money(payment) + '</strong></article><article><span>صافي حركة اليوم</span><strong>' + money(debt - payment) + '</strong></article><article><span>العملاء / العمليات</span><strong>' + number(customerCount) + ' / ' + number(entries.length) + '</strong></article></div>';
    const rows = entries.map(item => {
      const client = item.client;
      const record = item.record;
      const isPayment = record.type === 'payment';
      const currency = record.currency || 'USD';
      const exchangeRate = Number(record.exchangeRate) || (currency === 'USD' ? 1 : 0);
      const note = String(record.note || '').trim();
      return '<article class="daily-report-row ' + (isPayment ? 'is-payment' : 'is-debt') + '"><div class="daily-report-row-head"><div><strong>' + escapeHtml(client.name || 'عميل بدون اسم') + '</strong><small>' + escapeHtml(client.phone || 'لا يوجد رقم هاتف') + '</small></div><span class="daily-report-kind">' + transactionLabel(record) + '</span></div><div class="daily-report-facts"><div><span>المبلغ المسجل</span><strong class="daily-report-amount">' + (isPayment ? '− ' : '+ ') + number(record.amount) + ' ' + (typeof currencyDisplay === 'function' ? currencyDisplay(currency) : escapeHtml(currency)) + '</strong></div><div><span>المقابل بالدولار</span><strong>' + money(recordUsdValue(client, record)) + '</strong></div><div><span>وقت التسجيل</span><strong dir="ltr">' + transactionTime(record) + '</strong></div><div><span>سعر التحويل</span><strong>' + (exchangeRate ? '1 USD = ' + number(exchangeRate) + ' ' + escapeHtml(currency) : 'غير محفوظ') + '</strong></div></div><div class="daily-report-meta">' + commissionSummary(record) + '</div><div class="daily-report-note"><span>الملاحظة</span><p>' + (note ? escapeHtml(note) : 'لا توجد ملاحظة') + '</p></div></article>';
    }).join('');
    const empty = '<div class="daily-report-empty">لا توجد عمليات مسجلة في ' + escapeHtml(typeof niceDate === 'function' ? niceDate(selectedDate) : selectedDate || 'هذا اليوم') + '.</div>';
    content.innerHTML = summary + (entries.length ? '<div class="daily-report-list">' + rows + '</div><button type="button" class="daily-report-export" id="dailyReportExport"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 17v3h14v-3"/></svg> تحميل كشف هذا اليوم PDF</button>' : empty);
    const exportButton = document.getElementById('dailyReportExport');
    if (exportButton) exportButton.onclick = () => {
      if (typeof window.downloadDaftariRecordPdf !== 'function') { toast('ميزة PDF غير جاهزة بعد'); return; }
      const detailSections = entries.map(item => {
        const client = item.client;
        const record = item.record;
        const currency = record.currency || 'USD';
        const rate = Number(record.exchangeRate) || (currency === 'USD' ? 1 : 0);
        return {
          title: (record.type === 'payment' ? 'تسديد دين' : 'إضافة دين') + ' · ' + (client.name || 'عميل بدون اسم'),
          rows: [
            { label: 'رقم الهاتف', value: client.phone || 'غير مسجل' },
            { label: 'وقت التسجيل', value: transactionTime(record) },
            { label: 'المبلغ والعملة', value: (record.type === 'payment' ? '− ' : '+ ') + number(record.amount) + ' ' + currency },
            { label: 'المقابل بالدولار', value: money(recordUsdValue(client, record)) },
            { label: 'سعر التحويل', value: rate ? '1 USD = ' + number(rate) + ' ' + currency : 'غير محفوظ' },
            { label: 'العمولة', value: commissionSummary(record) },
            { label: 'الملاحظة', value: record.note || 'لا توجد ملاحظة' }
          ]
        };
      });
      window.downloadDaftariRecordPdf({
        title: 'كشف الحركة اليومية',
        subtitle: typeof niceDate === 'function' ? niceDate(selectedDate) : selectedDate,
        fileName: 'كشف-يومي-' + selectedDate,
        sections: [{ title: 'ملخص اليوم', rows: [
          { label: 'إجمالي إضافات الدين', value: money(debt) },
          { label: 'إجمالي التسديدات', value: money(payment) },
          { label: 'الصافي', value: money(debt - payment) },
          { label: 'عدد العملاء', value: number(customerCount) },
          { label: 'عدد العمليات', value: number(entries.length) }
        ] }, ...detailSections]
      });
    };
  }
  window.openDaftariReports = () => {
    const data = totals();
    const net = data.debt - data.payment;
    const balances = Object.entries(data.balances).filter(([, amount]) => Math.abs(amount) > 0.0001);
    const balanceRows = balances.length ? balances.map(([currency, amount]) => `<div class="report-currency-row"><span><strong>${escapeHtml(currency)}</strong><small>${currency === 'SAR' ? 'ريال سعودي' : currency === 'YER' ? 'ريال يمني' : currency === 'USDT' ? 'تيثر' : 'دولار أمريكي'}</small></span><b class="${amount < 0 ? 'negative' : ''}">${amount < 0 ? '− ' : '+'}${number(Math.abs(amount))} ${escapeHtml(currency)}</b></div>`).join('') : '<div class="report-empty-row">لا توجد أرصدة حسب العملة.</div>';
    const highest = [...data.clientsBalance].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))[0];
    showModal(`<section class="reports-page"><header class="reports-page-head"><h1>التقارير</h1><p>صورة كاملة عن حركة الدفتر — محسوبة من كل العمليات المسجلة.</p></header><div class="reports-page-actions"><button type="button" id="reportPdf">⇩ تحميل التقرير PDF</button><button type="button" id="reportPrint">▣ طباعة / حفظ PDF من الجهاز</button></div><section class="reports-daily-card"><div class="reports-daily-heading"><h2>كشف حركة يومية</h2><p>اختر يومًا لعرض كل إضافات الدين والتسديدات المسجلة لكل العملاء.</p></div><div class="reports-daily-filter"><label for="dailyReportDate">تاريخ التقرير</label><div class="daily-report-filter-controls"><input type="date" id="dailyReportDate" lang="en" dir="ltr" value="${today()}"><button type="button" id="showDailyReport"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v4m8-4v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/></svg> عرض الكشف</button></div></div><div id="dailyReportContent" aria-live="polite"></div></section><section class="reports-metrics"><article><span>إجمالي الديون</span><strong class="debt">${money(data.debt)}</strong></article><article><span>إجمالي التسديدات</span><strong class="payment">${money(data.payment)}</strong></article><article><span>الصافي</span><strong>${money(net)}</strong></article><article><span>العمولات</span><strong>${money(data.fees)}</strong></article></section><section class="reports-chart-card"><h2>الحركة الشهرية</h2><div class="report-chart"><div class="report-grid-lines"></div>${chartBars(data.records)}</div><div class="report-chart-key"><span><i class="debt"></i> ديون</span><span><i class="payment"></i> تسديدات</span></div></section><section class="reports-data-card"><h2>الأرصدة حسب العملة</h2>${balanceRows}</section><section class="reports-data-card report-highest"><h2>أكبر الأرصدة</h2>${highest ? `<div><span>${escapeHtml(highest.client.name)}</span><b class="${highest.balance < 0 ? 'negative' : ''}">${highest.balance < 0 ? 'له ' : 'عليه '}${money(highest.balance)}</b></div>` : '<div class="report-empty-row">لا توجد أرصدة للعملاء.</div>'}</section></section>`);
    const modal = document.getElementById('modal');
    const reportPage = modal.querySelector('.reports-page');
    const overallSummary = reportPage?.querySelector('.reports-metrics');
    const dailyCard = reportPage?.querySelector('.reports-daily-card');
    if (overallSummary && dailyCard) {
      overallSummary.insertAdjacentHTML('afterbegin', '<div class="reports-summary-head"><h2>ملخص الدفتر بالكامل</h2><p>الإجماليات محسوبة من جميع العمليات المسجلة.</p></div>');
      dailyCard.before(overallSummary);
      reportPage.append(dailyCard);
    }
    modal.classList.add('fullscreen-modal', 'reports-page-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    document.getElementById('reportPrint').onclick = () => window.print();
    const dailyDateInput = document.getElementById('dailyReportDate');
    const dailyShowButton = document.getElementById('showDailyReport');
    if (dailyDateInput) {
      renderDailyReport(data);
      dailyDateInput.addEventListener('change', () => renderDailyReport(data));
    }
    if (dailyShowButton) dailyShowButton.onclick = () => renderDailyReport(data);
    document.getElementById('reportPdf').onclick = () => {
      if (!window.openDaftariPdfPeriodChooser || !window.downloadDaftariRecordPdf) { toast('ميزة PDF غير جاهزة بعد'); return; }
      window.openDaftariPdfPeriodChooser({ title: 'تحميل تقرير النظام PDF', entries: data.records, getDate: item => recordDate(item.record), onDownload: (selected, period) => window.downloadDaftariRecordPdf({ title: 'تقرير الدفتر', subtitle: period.label, fileName: `تقرير-الدفتري-${period.fileSuffix}`, sections: [{ title: 'ملخص التقرير', rows: [{ label: 'إجمالي الديون', value: money(data.debt) }, { label: 'إجمالي التسديدات', value: money(data.payment) }, { label: 'الصافي', value: money(net) }, { label: 'عدد العمليات المحددة', value: String(selected.length) }] }] }) });
    };
    return true;
  };
})();
