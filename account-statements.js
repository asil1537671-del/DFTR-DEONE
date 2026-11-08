(() => {
  const card = document.getElementById('accountStatements');
  const modal = document.getElementById('modal');
  const overlay = document.getElementById('overlay');
  if (!card || !modal || !overlay) return;

  const currencyNames = {
    all: 'جميع العملات',
    YER: 'ريال يمني',
    SAR: 'ريال سعودي',
    USD: 'دولار أمريكي',
    USDT: 'USDT'
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const formatAmount = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const formatBalance = (value, currency = 'USD') => `${Number(value) < -0.005 ? '−' : ''}${currency} ${formatAmount(Math.abs(Number(value) || 0))}`;
  const balanceLabel = value => value > 0.005 ? 'رصيد مستحق على العميل' : value < -0.005 ? 'رصيد للعميل' : 'الحساب متوازن';
  const recordTime = record => {
    if (!record?.createdAt) return '00:00';
    const date = new Date(record.createdAt);
    return Number.isNaN(date.getTime()) ? '00:00' : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const recordMoment = record => `${String(record?.date || '').slice(0, 10)}T${recordTime(record)}`;
  const matchesPeriod = (record, from, to, fromTime = '', toTime = '') => {
    const date = String(record?.date || '').slice(0, 10);
    const moment = recordMoment(record);
    if (!date) return false;
    if (from && moment < `${from}T${fromTime || '00:00'}`) return false;
    if (to && moment > `${to}T${toTime || '23:59'}`) return false;
    return true;
  };
  const periodText = (from, to, fromTime = '', toTime = '') => from || to
    ? `${from ? niceDate(from) : 'البداية'}${fromTime ? ` ${fromTime}` : ''} — ${to ? niceDate(to) : 'اليوم'}${toTime ? ` ${toTime}` : ''}`
    : 'كامل الفترة';

  function statementValue(client, record, currency) {
    const value = currency === 'all'
      ? Number(recordUsd(client, record)) || 0
      : Number(record.amount) || 0;
    return record.type === 'payment' ? -value : value;
  }

  function openStatementService(initialClientId = null) {
    const clients = [...db.clients].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const currencyOptions = [
      ['all', 'جميع العملات'],
      ['YER', '🇾🇪 ريال يمني'],
      ['SAR', '🇸🇦 ريال سعودي'],
      ['USD', '🇺🇸 دولار أمريكي'],
      ['USDT', '₮ USDT']
    ].map(([value, label]) => `<option value="${value}">${label}</option>`).join('');

    showModal(`<div class="modal-head"><h3>كشف الحسابات</h3><button type="button" class="x" id="close">×</button></div>
      <form id="accountStatementForm" class="account-statement-controls">
        <div class="field account-statement-client-field"><label for="statementClientTrigger">اختر العميل</label><input id="statementClient" name="clientId" type="hidden" value=""><button id="statementClientTrigger" class="account-statement-client-trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="statementClientPicker" ${clients.length ? '' : 'disabled'}><span id="statementClientLabel">${clients.length ? 'اختر عميلًا' : 'لا يوجد عملاء بعد'}</span><span class="account-statement-client-caret" aria-hidden="true">⌕</span></button></div>
        <div class="field"><label for="statementCurrency">العملة</label><select id="statementCurrency" name="currency">${currencyOptions}</select></div>
        <div class="account-statement-dates"><div class="field"><label for="statementFrom">من تاريخ</label><input id="statementFrom" name="from" type="date" lang="en" dir="ltr"></div><div class="field"><label for="statementTo">إلى تاريخ</label><input id="statementTo" name="to" type="date" lang="en" dir="ltr"></div><div class="field"><label for="statementFromTime">من وقت (اختياري)</label><input id="statementFromTime" name="fromTime" type="time" lang="en" dir="ltr"></div><div class="field"><label for="statementToTime">إلى وقت (اختياري)</label><input id="statementToTime" name="toTime" type="time" lang="en" dir="ltr"></div></div>
        <div class="account-statement-actions"><button class="primary" type="submit" ${clients.length ? '' : 'disabled'}>عرض الكشف</button><button class="soft-btn account-statement-print" type="button" id="printAccountStatement" hidden>تنزيل PDF</button></div>
      </form>
      <dialog id="statementClientPicker" class="account-statement-client-dialog" aria-labelledby="statementClientPickerTitle"><div class="account-statement-client-dialog-inner"><header class="account-statement-client-dialog-head"><h4 id="statementClientPickerTitle">اختر العميل</h4><button id="closeStatementClientPicker" class="x" type="button" aria-label="إغلاق قائمة العملاء">×</button></header><label for="statementClientSearch">ابحث باسم العميل أو رقم الهاتف</label><input id="statementClientSearch" type="search" autocomplete="off" placeholder="اكتب اسم العميل أو رقم الهاتف"><div id="statementClientResults" class="account-statement-client-results" role="listbox" aria-label="نتائج العملاء"></div><p id="statementClientEmpty" class="account-statement-client-empty" hidden>لا توجد نتائج مطابقة.</p></div></dialog>
      <div class="account-statement-report" id="accountStatementReport"><div class="empty">اختر عميلًا والعملة والفترة لعرض كشف الحساب.</div></div>`);
    modal.classList.add('fullscreen-modal', 'account-statement-modal');
    overlay.classList.add('fullscreen');
    bindClose();

    const form = modal.querySelector('#accountStatementForm');
    const report = modal.querySelector('#accountStatementReport');
    const printButton = modal.querySelector('#printAccountStatement');
    const clientIdInput = modal.querySelector('#statementClient');
    const clientTrigger = modal.querySelector('#statementClientTrigger');
    const clientLabel = modal.querySelector('#statementClientLabel');
    const clientPicker = modal.querySelector('#statementClientPicker');
    const clientSearch = modal.querySelector('#statementClientSearch');
    const clientResults = modal.querySelector('#statementClientResults');
    const clientEmpty = modal.querySelector('#statementClientEmpty');
    printButton.addEventListener('click', () => {
      const values = new FormData(form);
      const client = db.clients.find(item => String(item.id) === values.get('clientId'));
      if (!client) {
        openClientPicker();
        return;
      }
      const from = String(values.get('from') || '');
      const to = String(values.get('to') || '');
      const fromTime = String(values.get('fromTime') || '');
      const toTime = String(values.get('toTime') || '');
      const currency = String(values.get('currency') || 'all');
      if ((from && to && from > to) || (from === to && fromTime && toTime && fromTime > toTime)) {
        toast('تحقق من التاريخ والوقت المحددين');
        return;
      }
      const originalLabel = printButton.textContent;
      printButton.disabled = true;
      printButton.textContent = 'جارٍ تجهيز PDF…';
      try {
        const pdf = buildStatementPdf(client, from, to, currency, fromTime, toTime);
        downloadStatementPdf(pdf, client.name);
        toast('تم تنزيل كشف الحساب بصيغة PDF');
      } catch (error) {
        console.error('Account statement PDF generation failed', error);
        toast('تعذر إنشاء ملف PDF. حاول مرة أخرى');
      } finally {
        printButton.disabled = false;
        printButton.textContent = originalLabel;
      }
    });

    const normalizeSearch = value => String(value ?? '').normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06F0))
      .toLocaleLowerCase('ar').replace(/\s+/g, ' ').trim();

    function renderClientOptions(query = '') {
      const normalizedQuery = normalizeSearch(query);
      const filteredClients = clients.filter(client => !normalizedQuery
        || normalizeSearch(`${client.name || ''} ${client.phone || ''}`).includes(normalizedQuery));
      clientResults.innerHTML = filteredClients.map(client => {
        const selected = String(client.id) === clientIdInput.value;
        return `<button class="account-statement-client-option" type="button" role="option" aria-selected="${selected}" data-client-id="${escapeHtml(client.id)}"><span><strong>${escapeHtml(client.name)}</strong><small>${client.phone ? escapeHtml(client.phone) : 'لا يوجد رقم هاتف'}</small></span><span class="account-statement-client-check" aria-hidden="true">${selected ? '✓' : ''}</span></button>`;
      }).join('');
      clientEmpty.hidden = filteredClients.length > 0;
    }

    function openClientPicker() {
      if (!clients.length) return;
      clientSearch.value = '';
      renderClientOptions();
      clientPicker.showModal();
      clientTrigger.setAttribute('aria-expanded', 'true');
      clientSearch.focus();
    }

    clientTrigger.addEventListener('click', openClientPicker);
    modal.querySelector('#closeStatementClientPicker').addEventListener('click', () => clientPicker.close());
    clientPicker.addEventListener('close', () => clientTrigger.setAttribute('aria-expanded', 'false'));
    clientSearch.addEventListener('input', () => renderClientOptions(clientSearch.value));
    clientResults.addEventListener('click', event => {
      const option = event.target.closest('[data-client-id]');
      if (!option) return;
      const client = clients.find(item => String(item.id) === option.dataset.clientId);
      if (!client) return;
      clientIdInput.value = String(client.id);
      clientLabel.textContent = `${client.name}${client.phone ? ` · ${client.phone}` : ''}`;
      clientTrigger.setAttribute('aria-label', `العميل المختار: ${client.name}${client.phone ? `، ${client.phone}` : ''}. اضغط لتغيير العميل`);
      clientPicker.close();
      renderFromForm();
    });

    function renderFromForm() {
      const values = new FormData(form);
      const client = db.clients.find(item => String(item.id) === values.get('clientId'));
      if (!client) return;
      const from = String(values.get('from') || '');
      const to = String(values.get('to') || '');
      const fromTime = String(values.get('fromTime') || '');
      const toTime = String(values.get('toTime') || '');
      const currency = String(values.get('currency') || 'all');
      if ((from && to && from > to) || (from === to && fromTime && toTime && fromTime > toTime)) {
        toast('تحقق من التاريخ والوقت المحددين');
        return;
      }
      renderStatement(client, from, to, currency, report, fromTime, toTime);
      printButton.hidden = false;
    }

    form.addEventListener('change', () => {
      if (form.querySelector('[name="clientId"]').value) renderFromForm();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!clientIdInput.value) {
        if (clients.length) openClientPicker();
        else toast('لا يوجد عملاء لعرض كشف الحساب');
        return;
      }
      renderFromForm();
    });

    const initialClient = clients.find(client => String(client.id) === String(initialClientId));
    if (initialClient) {
      clientIdInput.value = String(initialClient.id);
      clientLabel.textContent = `${initialClient.name}${initialClient.phone ? ` · ${initialClient.phone}` : ''}`;
      clientTrigger.setAttribute('aria-label', `العميل المختار: ${initialClient.name}${initialClient.phone ? `، ${initialClient.phone}` : ''}. اضغط لتغيير العميل`);
      renderClientOptions();
      renderFromForm();
    }
  }

  function renderStatement(client, from, to, currency, report, fromTime = '', toTime = '') {
    const records = Array.isArray(client.records) ? [...client.records] : [];
    const chronological = records.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    const matchesCurrency = record => currency === 'all' || record.currency === currency;
    const openingRecords = from ? chronological.filter(record => matchesCurrency(record) && record.date && recordMoment(record) < `${from}T${fromTime || '00:00'}`) : [];
    const opening = openingRecords.reduce((sum, record) => sum + statementValue(client, record, currency), 0);
    const period = chronological.filter(record => matchesCurrency(record) && matchesPeriod(record, from, to, fromTime, toTime));
    const periodAmount = record => currency === 'all'
      ? Math.abs(Number(recordUsd(client, record)) || 0)
      : Math.abs(Number(record.amount) || 0);
    const debts = period.filter(record => record.type === 'debt').reduce((sum, record) => sum + periodAmount(record), 0);
    const payments = period.filter(record => record.type === 'payment').reduce((sum, record) => sum + periodAmount(record), 0);
    const statementCurrency = currency === 'all' ? 'USD' : currency;
    let running = opening;
    const rows = period.map(record => {
      running += statementValue(client, record, currency);
      const originalCurrency = currencies[record.currency] || record.currency || '';
      const transaction = record.type === 'payment' ? 'تسديد' : 'إضافة دين';
      const amountClass = record.type === 'payment' ? 'pay' : 'add';
      const sign = record.type === 'payment' ? '−' : '+';
      const usdEquivalent = Math.abs(Number(recordUsd(client, record)) || 0);
      return `<tr><td>${escapeHtml(niceDate(record.date) || '—')}</td><td>${transaction}</td><td class="amount ${amountClass}">${sign} ${formatAmount(record.amount)} ${escapeHtml(originalCurrency)}</td><td>${formatBalance(usdEquivalent, 'USD')}</td><td>${formatBalance(running, statementCurrency)}</td><td>${escapeHtml(record.note || '—')}</td></tr>`;
    }).join('');
    const closing = opening + debts - payments;
    const selectedPeriod = periodText(from, to, fromTime, toTime);
    const contact = client.phone ? `رقم الهاتف: ${escapeHtml(client.phone)}` : 'لا يوجد رقم هاتف';
    const currencyLabel = currencyNames[currency] || currency;
    report.innerHTML = `<section class="account-statement-sheet">
      <header class="account-statement-heading"><div><h4>كشف حساب العميل: ${escapeHtml(client.name)}</h4><p>${contact} · ${escapeHtml(selectedPeriod)} · العملة: ${escapeHtml(currencyLabel)}</p></div><div class="account-statement-closing"><strong>${formatBalance(closing, statementCurrency)}</strong><small>${balanceLabel(closing)}</small></div></header>
      <div class="account-statement-summary"><div><small>الرصيد السابق</small><strong>${formatBalance(opening, statementCurrency)}</strong></div><div><small>إجمالي الديون</small><strong>${formatBalance(debts, statementCurrency)}</strong></div><div><small>إجمالي التسديدات</small><strong>${formatBalance(payments, statementCurrency)}</strong></div><div><small>الرصيد النهائي</small><strong>${formatBalance(closing, statementCurrency)}</strong></div></div>
      <div class="account-statement-table-wrap"><table class="account-statement-table"><thead><tr><th>التاريخ</th><th>الحركة</th><th>المبلغ المدخل</th><th>المكافئ USD</th><th>الرصيد ${escapeHtml(statementCurrency)}</th><th>الملاحظة</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="account-statement-empty">لا توجد عمليات بهذه العملة في هذه الفترة.</td></tr>'}</tbody></table></div>
    </section>`;
  }

  function wrapPdfText(context, value, maxWidth, maxLines = 4) {
    const words = String(value ?? '—').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return ['—'];
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (context.measureText(word).width <= maxWidth) {
        line = word;
        continue;
      }
      let fragment = '';
      for (const character of Array.from(word)) {
        if (fragment && context.measureText(fragment + character).width > maxWidth) {
          lines.push(fragment);
          fragment = character;
        } else fragment += character;
      }
      line = fragment;
    }
    if (line) lines.push(line);
    const clipped = lines.length > maxLines;
    const visible = lines.slice(0, maxLines);
    if (clipped && visible.length) {
      let last = visible[visible.length - 1];
      while (last && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      visible[visible.length - 1] = `${last}…`;
    }
    return visible.length ? visible : ['—'];
  }

  function drawPdfText(context, value, x, y, width, options = {}) {
    const {
      font = '13px Arial, Tahoma, sans-serif',
      color = '#202c27',
      direction = 'rtl',
      align = 'right',
      lineHeight = 17,
      maxLines = 3
    } = options;
    context.save();
    context.font = font;
    context.fillStyle = color;
    context.direction = direction;
    context.textAlign = align;
    context.textBaseline = 'top';
    const lines = wrapPdfText(context, value, width, maxLines);
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
    context.restore();
    return lines.length;
  }

  function roundedPdfBox(context, x, y, width, height, fill, stroke = '#dce7e1') {
    context.fillStyle = fill;
    context.fillRect(x, y, width, height);
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.strokeRect(x + .5, y + .5, width - 1, height - 1);
  }

  function buildStatementPdf(client, from, to, currency, fromTime = '', toTime = '') {
    const pageWidth = 794;
    const pageHeight = 1123;
    const margin = 38;
    const contentWidth = pageWidth - margin * 2;
    const colors = { ink: '#202c27', green: '#207755', muted: '#718078', line: '#dce7e1', soft: '#e9f4ee', paper: '#ffffff' };
    const records = Array.isArray(client.records) ? [...client.records] : [];
    const chronological = records.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    const matchesCurrency = record => currency === 'all' || record.currency === currency;
    const opening = from
      ? chronological.filter(record => matchesCurrency(record) && record.date && recordMoment(record) < `${from}T${fromTime || '00:00'}`)
        .reduce((sum, record) => sum + statementValue(client, record, currency), 0)
      : 0;
    const period = chronological.filter(record => matchesCurrency(record) && matchesPeriod(record, from, to, fromTime, toTime));
    const periodAmount = record => currency === 'all'
      ? Math.abs(Number(recordUsd(client, record)) || 0)
      : Math.abs(Number(record.amount) || 0);
    const debts = period.filter(record => record.type === 'debt').reduce((sum, record) => sum + periodAmount(record), 0);
    const payments = period.filter(record => record.type === 'payment').reduce((sum, record) => sum + periodAmount(record), 0);
    const statementCurrency = currency === 'all' ? 'USD' : currency;
    const closing = opening + debts - payments;
    const selectedPeriod = periodText(from, to, fromTime, toTime);
    const currencyLabel = currencyNames[currency] || currency;
    let running = opening;
    const rows = period.map(record => {
      running += statementValue(client, record, currency);
      const originalCurrency = currencies[record.currency] || record.currency || '';
      const sign = record.type === 'payment' ? '−' : '+';
      return [
        niceDate(record.date) || '—',
        record.type === 'payment' ? 'تسديد' : 'إضافة دين',
        `${sign} ${formatAmount(record.amount)} ${originalCurrency}`,
        formatBalance(Math.abs(Number(recordUsd(client, record)) || 0), 'USD'),
        formatBalance(running, statementCurrency),
        record.note || '—'
      ];
    });
    const columnWidths = [82, 88, 120, 116, 122, 192];
    const columnTitles = ['التاريخ', 'الحركة', 'المبلغ المدخل', 'المكافئ USD', 'الرصيد', 'الملاحظة'];

    function drawTableHead(context, y) {
      roundedPdfBox(context, margin, y, contentWidth, 38, colors.soft);
      let right = pageWidth - margin;
      columnTitles.forEach((title, index) => {
        drawPdfText(context, title, right - 8, y + 11, columnWidths[index] - 16, {
          font: 'bold 11px Arial, Tahoma, sans-serif', color: colors.green, maxLines: 2, lineHeight: 13
        });
        right -= columnWidths[index];
      });
    }

    const measureContext = document.createElement('canvas').getContext('2d');
    if (!measureContext) throw new Error('Canvas is unavailable');
    measureContext.font = '12px Arial, Tahoma, sans-serif';
    function rowHeight(cells) {
      const lineCounts = cells.map((cell, index) => wrapPdfText(measureContext, cell, columnWidths[index] - 16, 4).length);
      return Math.max(40, Math.max(...lineCounts) * 16 + 16);
    }

    function drawRow(context, cells, y, height, rowIndex) {
      context.fillStyle = rowIndex % 2 ? '#f8fbf9' : colors.paper;
      context.fillRect(margin, y, contentWidth, height);
      context.strokeStyle = colors.line;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(margin, y + height);
      context.lineTo(pageWidth - margin, y + height);
      context.stroke();
      let right = pageWidth - margin;
      cells.forEach((cell, index) => {
        const isAmount = index === 2 || index === 3 || index === 4;
        drawPdfText(context, cell, right - 8, y + 10, columnWidths[index] - 16, {
          font: '12px Arial, Tahoma, sans-serif',
          color: index === 1 ? colors.ink : (isAmount ? colors.ink : colors.muted),
          direction: isAmount || index === 0 ? 'ltr' : 'rtl',
          align: 'right',
          lineHeight: 16,
          maxLines: 4
        });
        right -= columnWidths[index];
      });
    }

    const pages = [];
    let rowIndex = 0;
    do {
      const canvas = document.createElement('canvas');
      canvas.width = pageWidth * 2;
      canvas.height = pageHeight * 2;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.scale(2, 2);
      context.fillStyle = colors.paper;
      context.fillRect(0, 0, pageWidth, pageHeight);
      context.strokeStyle = colors.line;
      context.strokeRect(22, 22, pageWidth - 44, pageHeight - 44);

      let tableY;
      if (!pages.length) {
        drawPdfText(context, 'كشف حساب العميل', pageWidth - margin, 40, contentWidth, {
          font: 'bold 26px Arial, Tahoma, sans-serif', color: colors.green, maxLines: 1
        });
        drawPdfText(context, `العميل: ${client.name || ''}`, pageWidth - margin, 82, contentWidth, {
          font: 'bold 16px Arial, Tahoma, sans-serif', color: colors.ink, maxLines: 1
        });
        drawPdfText(context, `رقم الهاتف: ${client.phone || 'لا يوجد'} · الفترة: ${selectedPeriod} · العملة: ${currencyLabel}`, pageWidth - margin, 110, contentWidth, {
          font: '13px Arial, Tahoma, sans-serif', color: colors.muted, maxLines: 2, lineHeight: 18
        });
        roundedPdfBox(context, margin, 154, contentWidth, 78, colors.soft);
        drawPdfText(context, `الرصيد النهائي · ${balanceLabel(closing)}`, pageWidth - margin - 14, 168, contentWidth - 28, {
          font: 'bold 14px Arial, Tahoma, sans-serif', color: colors.green, maxLines: 1
        });
        drawPdfText(context, formatBalance(closing, statementCurrency), margin + 16, 192, contentWidth - 32, {
          font: 'bold 22px Arial, Tahoma, sans-serif', color: colors.green, direction: 'ltr', align: 'left', maxLines: 1
        });
        const summaries = [
          { x: margin + contentWidth / 2 + 5, y: 246, label: 'الرصيد السابق', value: formatBalance(opening, statementCurrency) },
          { x: margin, y: 246, label: 'إجمالي الديون', value: formatBalance(debts, statementCurrency) },
          { x: margin + contentWidth / 2 + 5, y: 310, label: 'إجمالي التسديدات', value: formatBalance(payments, statementCurrency) },
          { x: margin, y: 310, label: 'الرصيد النهائي', value: formatBalance(closing, statementCurrency) }
        ];
        const summaryWidth = contentWidth / 2 - 5;
        summaries.forEach(item => {
          roundedPdfBox(context, item.x, item.y, summaryWidth, 54, '#f7fbf8');
          drawPdfText(context, item.label, item.x + summaryWidth - 12, item.y + 8, summaryWidth - 24, {
            font: '12px Arial, Tahoma, sans-serif', color: colors.muted, maxLines: 1
          });
          drawPdfText(context, item.value, item.x + 12, item.y + 30, summaryWidth - 24, {
            font: 'bold 14px Arial, Tahoma, sans-serif', color: colors.green, direction: 'ltr', align: 'left', maxLines: 1
          });
        });
        tableY = 382;
      } else {
        drawPdfText(context, 'كشف حساب العميل · متابعة', pageWidth - margin, 42, contentWidth, {
          font: 'bold 19px Arial, Tahoma, sans-serif', color: colors.green, maxLines: 1
        });
        drawPdfText(context, `${client.name || ''} · ${selectedPeriod} · ${currencyLabel}`, pageWidth - margin, 76, contentWidth, {
          font: '12px Arial, Tahoma, sans-serif', color: colors.muted, maxLines: 1
        });
        tableY = 112;
      }

      drawTableHead(context, tableY);
      let y = tableY + 38;
      let placedRows = 0;
      while (rowIndex < rows.length) {
        const height = rowHeight(rows[rowIndex]);
        if (y + height > pageHeight - 70) break;
        drawRow(context, rows[rowIndex], y, height, rowIndex);
        y += height;
        rowIndex += 1;
        placedRows += 1;
      }
      if (!rows.length) {
        drawPdfText(context, 'لا توجد عمليات بهذه العملة في هذه الفترة.', pageWidth - margin - 10, y + 14, contentWidth - 20, {
          font: '14px Arial, Tahoma, sans-serif', color: colors.muted, maxLines: 2
        });
      } else if (!placedRows && rowIndex < rows.length) {
        throw new Error('A statement row is too tall to fit on a PDF page');
      }
      pages.push({ canvas, context });
    } while (rowIndex < rows.length);

    pages.forEach((page, index) => {
      drawPdfText(page.context, `صفحة ${index + 1} من ${pages.length}`, pageWidth / 2, pageHeight - 49, pageWidth - 80, {
        font: '11px Arial, Tahoma, sans-serif', color: colors.muted, align: 'center', maxLines: 1
      });
    });

    const imagePages = pages.map(({ canvas }) => {
      const encoded = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return { bytes, width: canvas.width, height: canvas.height };
    });
    return assembleImagePdf(imagePages);
  }

  function assembleImagePdf(images) {
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [];
    let byteLength = 0;
    const append = value => {
      const bytes = typeof value === 'string' ? encoder.encode(value) : value;
      chunks.push(bytes);
      byteLength += bytes.length;
    };
    const object = (id, content) => {
      offsets[id] = byteLength;
      append(`${id} 0 obj\n${content}\nendobj\n`);
    };
    append('%PDF-1.4\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    const pageIds = images.map((_, index) => 3 + index * 3);
    object(2, `<< /Type /Pages /Count ${images.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`);
    images.forEach((image, index) => {
      const pageId = pageIds[index];
      const imageId = pageId + 1;
      const contentId = pageId + 2;
      object(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      const content = 'q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ';
      object(contentId, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`);
      offsets[imageId] = byteLength;
      append(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
      append(image.bytes);
      append('\nendstream\nendobj\n');
    });
    const xrefOffset = byteLength;
    const objectCount = 2 + images.length * 3;
    append(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
    for (let id = 1; id <= objectCount; id += 1) append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
    append(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
    return new Blob(chunks, { type: 'application/pdf' });
  }

  function downloadStatementPdf(blob, clientName) {
    const safeName = String(clientName || 'عميل').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 80);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كشف-حساب-${safeName || 'عميل'}.pdf`;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  window.openAccountStatements = openStatementService;
  card.addEventListener('click', () => window.openAccountStatements());
})();
