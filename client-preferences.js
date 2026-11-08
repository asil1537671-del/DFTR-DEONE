(() => {
  'use strict';

  const preferredCurrencyOptions = () => Object.entries(currencies)
    .map(([code, label]) => `<option value="${code}">${label}</option>`)
    .join('');

  function createClientFromForm(form) {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const preferredCurrency = String(data.get('preferredCurrency') || 'USD');
    const note = String(data.get('note') || '').trim();
    if (!name) {
      toast('أدخل اسم العميل أولاً');
      form.querySelector('[name="name"]')?.focus();
      return null;
    }
    const defaultCurrency = Object.hasOwn(currencies, preferredCurrency) ? preferredCurrency : 'USD';
    // Keep both names in sync for existing ledger features that still read
    // the currency property, while preferredCurrency remains the UI setting.
    const client = { id: crypto.randomUUID(), name, phone, note, currency: defaultCurrency, preferredCurrency: defaultCurrency, records: [] };
    const customRates = { debt: {}, payment: {} };
    let hasCustomRate = false;
    for (const type of ['debt', 'payment']) for (const currency of ['USD', 'SAR', 'YER', 'USDT']) {
      const raw = String(data.get(`rate_${type}_${currency}`) || '').trim();
      if (!raw) continue;
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount <= 0) { toast(`تحقق من سعر ${currency}`); form.querySelector(`[name="rate_${type}_${currency}"]`)?.focus(); return null; }
      customRates[type][currency] = amount;
      hasCustomRate = true;
    }
    const customCommissions = {};
    let hasCustomCommission = false;
    for (const key of ['debtFixed', 'debtLimit', 'debtPercent', 'paymentFixed', 'paymentLimit', 'paymentPercent']) {
      const raw = String(data.get(key) || '').trim();
      if (!raw) continue;
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount < 0 || (key.endsWith('Percent') && amount > 100)) { toast('تحقق من قواعد العمولة المخصصة'); form.querySelector(`[name="${key}"]`)?.focus(); return null; }
      customCommissions[key] = amount;
      hasCustomCommission = true;
    }
    if (hasCustomRate) { client.useCustomRates = true; client.rates = customRates; }
    if (hasCustomCommission) { client.useCustomCommissions = true; client.commissionRules = customCommissions; }
    db.clients.unshift(client);
    save();
    return client;
  }

  clientForm = () => {
    const rateRows = ['USD', 'SAR', 'YER', 'USDT'].map(currency => `<div class="client-rate-row"><strong>${currency}</strong><input name="rate_debt_${currency}" type="number" min="0.000001" step="any" inputmode="decimal" placeholder="${globalRate(currency, 'debt')}"><input name="rate_payment_${currency}" type="number" min="0.000001" step="any" inputmode="decimal" placeholder="${globalRate(currency, 'payment')}"></div>`).join('');
    const ruleValue = key => Number(db.settings?.commissionRules?.[key] ?? ({ debtFixed: 1, debtLimit: 30, debtPercent: 3, paymentFixed: 1, paymentLimit: 30, paymentPercent: 2 })[key]);
    showModal(`<div class="modal-head client-sheet-head"><div><h3>عميل جديد</h3><p>أضف عميلًا ليبدأ حسابك معه</p></div>${closeButton()}</div>
      <form id="clientForm">
        <div class="field"><label>اسم العميل</label><input name="name" autocomplete="name" required maxlength="80" placeholder="مثال: محمد علي"></div>
        <div class="field"><label>رقم الهاتف <button type="button" class="client-contact-inline" id="pickClientContact">♙ من جهات الاتصال</button></label><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="7xxxxxxxx"><small class="muted">يُستخدم للاتصال والواتساب من ملف العميل.</small></div>
        <div class="field contact-phone-options" id="clientPhoneChoices" hidden><label for="clientPhoneChoice">اختر رقم الهاتف</label><select id="clientPhoneChoice"></select></div>
        <div class="field"><label>العملة الافتراضية للعمليات</label><select name="preferredCurrency">${preferredCurrencyOptions()}</select><small class="muted">تُختار تلقائيًا عند إضافة دين أو تسديد، ويمكن تغييرها في العملية عند الحاجة.</small></div>
        <details class="client-custom-settings"><summary><span>⚖</span> أسعار وعمولات مخصصة لهذا العميل</summary><div class="client-custom-settings-body"><p class="client-custom-intro">اترك أي حقل فارغًا لاستخدام سعر الدفتر وقواعده العامة. القيم هنا تستخدم لهذا العميل فقط.</p><h4>أسعار الصرف (لكل دولار)</h4><div class="client-rate-head"><span>العملة</span><span>سعر الدين</span><span>سعر التسديد</span></div><div class="client-rate-table">${rateRows}</div><h4>المبالغ الصغيرة</h4><div class="client-commission-groups"><section class="client-commission-block debt"><strong>الديون (تُضاف للرصيد)</strong><div class="client-commission-grid"><div><label>عمولة الدين (دولار)</label><input name="debtFixed" type="number" min="0" step="0.01" placeholder="${ruleValue('debtFixed')}"></div><div><label>حد الدين (دولار)</label><input name="debtLimit" type="number" min="0" step="0.01" placeholder="${ruleValue('debtLimit')}"></div></div></section><section class="client-commission-block payment"><strong>التسديدات (تُخصم من الرصيد)</strong><div class="client-commission-grid"><div><label>عمولة التسديد (دولار)</label><input name="paymentFixed" type="number" min="0" step="0.01" placeholder="${ruleValue('paymentFixed')}"></div><div><label>حد التسديد (دولار)</label><input name="paymentLimit" type="number" min="0" step="0.01" placeholder="${ruleValue('paymentLimit')}"></div></div></section></div><h4>نسبة المبالغ الكبيرة %</h4><p class="client-custom-hint">تُحتسب العمولة على USDT فقط. بقية العملات لا تُسجل لها نسبة.</p><div class="client-rate-head"><span>العملة</span><span>نسبة الدين</span><span>نسبة التسديد</span></div><div class="client-rate-row client-percent-row"><strong>USDT</strong><input name="debtPercent" type="number" min="0" max="100" step="0.01" placeholder="${ruleValue('debtPercent')}"><input name="paymentPercent" type="number" min="0" max="100" step="0.01" placeholder="${ruleValue('paymentPercent')}"></div></div></details>
        <div class="field"><label>ملاحظة</label><textarea name="note" maxlength="300" placeholder="عنوان، وصف، أي تفصيل يفيدك لاحقًا"></textarea></div>
        <div class="form-actions client-sheet-actions"><button class="primary" type="button" id="saveClient">إضافة العميل</button><button type="button" class="client-add-debt" id="addDebtForClient">إضافة دين</button></div>
      </form>`);
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('overlay');
    modal.classList.add('client-sheet-modal');
    overlay.classList.add('client-sheet-overlay');
    const form = $('#clientForm');
    $('#pickClientContact').onclick = () => pickClientContact(form);
    form.querySelector('[name="phone"]').oninput = () => { $('#clientPhoneChoices').hidden = true; };
    const closeSheet = () => { overlay.classList.remove('client-sheet-overlay'); closeModal(); };
    $('#close').onclick = closeSheet;
    requestAnimationFrame(() => form.querySelector('[name="name"]')?.focus());
    const saveClient = () => {
      const client = createClientFromForm(form);
      if (!client) return;
      closeSheet();
      toast('تم حفظ العميل');
    };
    document.getElementById('saveClient').onclick = saveClient;
    form.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') { event.preventDefault(); saveClient(); }
    });
    $('#addDebtForClient').onclick = () => {
      const client = createClientFromForm(form);
      if (client) { overlay.classList.remove('client-sheet-overlay'); transactionForm(client.id, 'debt'); }
    };
  };

  const transactionFormBase = transactionForm;
  transactionForm = (clientId, type) => {
    transactionFormBase(clientId, type);
    const client = db.clients.find(item => String(item.id) === String(clientId));
    const currency = client?.currency || client?.preferredCurrency || 'USD';
    const selector = document.querySelector('#recordForm [name="currency"]');
    if (selector && Object.hasOwn(currencies, currency)) {
      selector.value = currency;
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  // Keep the advanced client finance settings out of the way until the user
  // explicitly opens them.  The inputs remain in the same form, so saving the
  // client still uses exactly the same values and validation as before.
  const editClientBase = editClient;
  editClient = id => {
    editClientBase(id);
    const settings = document.querySelector('#editForm .client-finance-settings');
    if (!settings || settings.dataset.collapsibleReady) return;

    settings.dataset.collapsibleReady = 'true';
    const originalTitle = settings.querySelector(':scope > h4');
    const content = document.createElement('div');
    content.className = 'client-finance-settings-content';
    [...settings.children].forEach(element => {
      if (element !== originalTitle) content.appendChild(element);
    });
    originalTitle?.remove();

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'client-finance-settings-toggle';
    toggle.innerHTML = '<span class="client-finance-settings-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v18M7 6h10M5 20h14M7 6 3.5 13h7L7 6Zm10 0-3.5 7h7L17 6Z"/></svg></span><span>أسعار الصرف والعمولات لهذا العميل</span><span class="client-finance-settings-chevron" aria-hidden="true">⌄</span>';
    toggle.setAttribute('aria-expanded', 'false');

    const setExpanded = expanded => {
      settings.classList.toggle('is-open', expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      content.hidden = !expanded;
    };
    toggle.addEventListener('click', () => setExpanded(!settings.classList.contains('is-open')));
    settings.append(toggle, content);
    setExpanded(false);
  };

  document.querySelectorAll('#addClient').forEach(button => { button.onclick = clientForm; });
})();
