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

  window.openDaftariReports = () => {
    const data = totals();
    const net = data.debt - data.payment;
    const balances = Object.entries(data.balances).filter(([, amount]) => Math.abs(amount) > 0.0001);
    const balanceRows = balances.length ? balances.map(([currency, amount]) => `<div class="report-currency-row"><span><strong>${escapeHtml(currency)}</strong><small>${currency === 'SAR' ? 'ريال سعودي' : currency === 'YER' ? 'ريال يمني' : currency === 'USDT' ? 'تيثر' : 'دولار أمريكي'}</small></span><b class="${amount < 0 ? 'negative' : ''}">${amount < 0 ? '− ' : '+'}${number(Math.abs(amount))} ${escapeHtml(currency)}</b></div>`).join('') : '<div class="report-empty-row">لا توجد أرصدة حسب العملة.</div>';
    const highest = [...data.clientsBalance].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))[0];
    showModal(`<section class="reports-page"><header class="reports-page-head"><h1>التقارير</h1><p>صورة كاملة عن حركة الدفتر — محسوبة من كل العمليات المسجلة.</p></header><div class="reports-page-actions"><button type="button" id="reportPdf">⇩ تحميل التقرير PDF</button><button type="button" id="reportPrint">▣ طباعة / حفظ PDF من الجهاز</button></div><section class="reports-metrics"><article><span>إجمالي الديون</span><strong class="debt">${money(data.debt)}</strong></article><article><span>إجمالي التسديدات</span><strong class="payment">${money(data.payment)}</strong></article><article><span>الصافي</span><strong>${money(net)}</strong></article><article><span>العمولات</span><strong>${money(data.fees)}</strong></article></section><section class="reports-chart-card"><h2>الحركة الشهرية</h2><div class="report-chart"><div class="report-grid-lines"></div>${chartBars(data.records)}</div><div class="report-chart-key"><span><i class="debt"></i> ديون</span><span><i class="payment"></i> تسديدات</span></div></section><section class="reports-data-card"><h2>الأرصدة حسب العملة</h2>${balanceRows}</section><section class="reports-data-card report-highest"><h2>أكبر الأرصدة</h2>${highest ? `<div><span>${escapeHtml(highest.client.name)}</span><b class="${highest.balance < 0 ? 'negative' : ''}">${highest.balance < 0 ? 'له ' : 'عليه '}${money(highest.balance)}</b></div>` : '<div class="report-empty-row">لا توجد أرصدة للعملاء.</div>'}</section></section>`);
    const modal = document.getElementById('modal');
    modal.classList.add('fullscreen-modal', 'reports-page-modal');
    document.getElementById('overlay').classList.add('fullscreen');
    document.getElementById('reportPrint').onclick = () => window.print();
    document.getElementById('reportPdf').onclick = () => {
      if (!window.openDaftariPdfPeriodChooser || !window.downloadDaftariRecordPdf) { toast('ميزة PDF غير جاهزة بعد'); return; }
      window.openDaftariPdfPeriodChooser({ title: 'تحميل تقرير النظام PDF', entries: data.records, getDate: item => recordDate(item.record), onDownload: (selected, period) => window.downloadDaftariRecordPdf({ title: 'تقرير الدفتر', subtitle: period.label, fileName: `تقرير-الدفتري-${period.fileSuffix}`, sections: [{ title: 'ملخص التقرير', rows: [{ label: 'إجمالي الديون', value: money(data.debt) }, { label: 'إجمالي التسديدات', value: money(data.payment) }, { label: 'الصافي', value: money(net) }, { label: 'عدد العمليات المحددة', value: String(selected.length) }] }] }) });
    };
    return true;
  };
})();
