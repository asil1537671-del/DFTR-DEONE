(() => {
  const compareBySelectedDate = (a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')) ||
    String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

  const openNativeDatePicker = selector => {
    const field = document.querySelector(selector);
    if (!field) return;
    field.type = 'date';
    field.lang = 'en';
    field.dir = 'ltr';
    field.autocomplete = 'off';
    field.setAttribute('aria-label', 'اختر التاريخ من التقويم');
    field.addEventListener('click', () => {
      try { field.showPicker?.(); } catch {}
    });
  };

  westernDateField = openNativeDatePicker;

  const renderRecentByDate = () => {
    const recent = document.querySelector('#recentList');
    if (!recent) return;
    const all = [];
    db.clients.forEach(client => (client.records || []).forEach(record => all.push({ ...record, clientName: client.name })));
    db.profits.forEach(profit => all.push({ ...profit, clientName: 'ربح مسجل' }));
    all.sort(compareBySelectedDate);
    recent.innerHTML = all.length
      ? all.slice(0, 12).map(record => `<div class="activity"><div><strong>${esc(record.clientName)} · ${record.type === 'debt' ? 'إضافة دين' : record.type === 'payment' ? 'تسديد دين' : 'تسجيل ربح'}</strong><small>${niceDate(record.date)}${record.note ? ' · ' + esc(record.note) : ''}</small></div><div class="amount ${record.type === 'payment' || record.type === 'profit' ? 'pay' : 'add'}">${record.type === 'debt' ? '+' : record.type === 'payment' ? '−' : ''}${fmt(record.amount)}<small style="display:block;text-align:left;font-size:10px;font-weight:400">${currencyDisplay(record.currency)}</small></div></div>`).join('')
      : '<div class="empty">ستظهر عملياتك الأخيرة هنا</div>';
  };

  const renderBase = render;
  render = () => {
    renderBase();
    renderRecentByDate();
  };

  const openClientBase = openClient;
  openClient = id => {
    openClientBase(id);
    const client = db.clients.find(item => item.id === id);
    const nodes = [...(document.querySelector('#modal')?.querySelectorAll('.record') || [])];
    if (!client || !nodes.length) return;
    const displayed = [...(client.records || [])].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const nodeByRecordId = new Map(displayed.map((record, index) => [record.id, nodes[index]]));
    const parent = nodes[0].parentElement;
    [...(client.records || [])].sort(compareBySelectedDate).forEach(record => {
      const node = nodeByRecordId.get(record.id);
      if (node) parent.append(node);
    });
  };
})();
