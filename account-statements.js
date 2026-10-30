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

  function statementValue(client, record, currency) {
    const value = currency === 'all'
      ? Number(recordUsd(client, record)) || 0
      : Number(record.amount) || 0;
    return record.type === 'payment' ? -value : value;
  }

  function openStatementService() {
    const clients = [...db.clients].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const clientOptions = clients.map(client => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name)}${client.phone ? ` · ${escapeHtml(client.phone)}` : ''}</option>`).join('');
    const currencyOptions = [
      ['all', 'جميع العملات'],
      ['YER', '🇾🇪 ريال يمني'],
      ['SAR', '🇸🇦 ريال سعودي'],
      ['USD', '🇺🇸 دولار أمريكي'],
      ['USDT', '₮ USDT']
    ].map(([value, label]) => `<option value="${value}">${label}</option>`).join('');

    showModal(`<div class="modal-head"><h3>كشف الحسابات</h3><button type="button" class="x" id="close">×</button></div>
      <form id="accountStatementForm" class="account-statement-controls">
        <div class="field"><label for="statementClient">اختر العميل</label><select id="statementClient" name="clientId" required ${clients.length ? '' : 'disabled'}><option value="">${clients.length ? 'اختر عميلًا' : 'لا يوجد عملاء بعد'}</option>${clientOptions}</select></div>
        <div class="field"><label for="statementCurrency">العملة</label><select id="statementCurrency" name="currency">${currencyOptions}</select></div>
        <div class="account-statement-dates"><div class="field"><label for="statementFrom">من تاريخ</label><input id="statementFrom" name="from" type="date" lang="en" dir="ltr"></div><div class="field"><label for="statementTo">إلى تاريخ</label><input id="statementTo" name="to" type="date" lang="en" dir="ltr"></div></div>
        <div class="account-statement-actions"><button class="primary" type="submit" ${clients.length ? '' : 'disabled'}>عرض الكشف</button><button class="soft-btn account-statement-print" type="button" id="printAccountStatement" hidden>طباعة / حفظ PDF</button></div>
      </form>
      <div class="account-statement-report" id="accountStatementReport"><div class="empty">اختر عميلًا والعملة والفترة لعرض كشف الحساب.</div></div>`);
    modal.classList.add('fullscreen-modal', 'account-statement-modal');
    overlay.classList.add('fullscreen');
    bindClose();

    const form = modal.querySelector('#accountStatementForm');
    const report = modal.querySelector('#accountStatementReport');
    const printButton = modal.querySelector('#printAccountStatement');
    printButton.addEventListener('click', () => window.print());

    function renderFromForm() {
      const values = new FormData(form);
      const client = db.clients.find(item => String(item.id) === values.get('clientId'));
      if (!client) return;
      const from = String(values.get('from') || '');
      const to = String(values.get('to') || '');
      const currency = String(values.get('currency') || 'all');
      if (from && to && from > to) {
        toast('تاريخ البداية يجب أن يسبق تاريخ النهاية');
        return;
      }
      renderStatement(client, from, to, currency, report);
      printButton.hidden = false;
    }

    form.addEventListener('change', () => {
      if (form.querySelector('[name="clientId"]').value) renderFromForm();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      renderFromForm();
    });
  }

  function renderStatement(client, from, to, currency, report) {
    const records = Array.isArray(client.records) ? [...client.records] : [];
    const chronological = records.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    const matchesCurrency = record => currency === 'all' || record.currency === currency;
    const openingRecords = from ? chronological.filter(record => matchesCurrency(record) && record.date && record.date < from) : [];
    const opening = openingRecords.reduce((sum, record) => sum + statementValue(client, record, currency), 0);
    const period = chronological.filter(record => matchesCurrency(record) && (!from || String(record.date || '') >= from) && (!to || String(record.date || '') <= to));
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
    const periodText = from || to ? `${from ? niceDate(from) : 'البداية'} — ${to ? niceDate(to) : 'اليوم'}` : 'كامل الفترة';
    const contact = client.phone ? `رقم الهاتف: ${escapeHtml(client.phone)}` : 'لا يوجد رقم هاتف';
    const currencyLabel = currencyNames[currency] || currency;
    report.innerHTML = `<section class="account-statement-sheet">
      <header class="account-statement-heading"><div><h4>كشف حساب العميل: ${escapeHtml(client.name)}</h4><p>${contact} · ${escapeHtml(periodText)} · العملة: ${escapeHtml(currencyLabel)}</p></div><div class="account-statement-closing"><strong>${formatBalance(closing, statementCurrency)}</strong><small>${balanceLabel(closing)}</small></div></header>
      <div class="account-statement-summary"><div><small>الرصيد السابق</small><strong>${formatBalance(opening, statementCurrency)}</strong></div><div><small>إجمالي الديون</small><strong>${formatBalance(debts, statementCurrency)}</strong></div><div><small>إجمالي التسديدات</small><strong>${formatBalance(payments, statementCurrency)}</strong></div><div><small>الرصيد النهائي</small><strong>${formatBalance(closing, statementCurrency)}</strong></div></div>
      <div class="account-statement-table-wrap"><table class="account-statement-table"><thead><tr><th>التاريخ</th><th>الحركة</th><th>المبلغ المدخل</th><th>المكافئ USD</th><th>الرصيد ${escapeHtml(statementCurrency)}</th><th>الملاحظة</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="account-statement-empty">لا توجد عمليات بهذه العملة في هذه الفترة.</td></tr>'}</tbody></table></div>
    </section>`;
  }

  window.openAccountStatements = openStatementService;
  card.addEventListener('click', () => window.openAccountStatements());
})();