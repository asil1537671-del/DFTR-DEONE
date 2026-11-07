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
    if (!name) {
      toast('أدخل اسم العميل أولاً');
      form.querySelector('[name="name"]')?.focus();
      return null;
    }
    const client = { id: crypto.randomUUID(), name, phone, preferredCurrency: Object.hasOwn(currencies, preferredCurrency) ? preferredCurrency : 'USD', records: [] };
    db.clients.unshift(client);
    save();
    return client;
  }

  clientForm = () => {
    showModal(`<div class="modal-head"><h3>إضافة عميل جديد</h3>${closeButton()}</div>
      <form id="clientForm">
        <div class="field"><label>اسم العميل *</label><input name="name" autocomplete="name" required maxlength="80" placeholder="اكتب اسم العميل"></div>
        <div class="field"><label>رقم الهاتف <span class="muted">(اختياري)</span></label><div class="contact-picker-row"><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="05xxxxxxxx"><button type="button" class="soft-btn contact-picker-button" id="pickClientContact"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg><span>اختيار من جهات الاتصال</span></button></div></div>
        <div class="field contact-phone-options" id="clientPhoneChoices" hidden><label for="clientPhoneChoice">اختر رقم الهاتف</label><select id="clientPhoneChoice"></select></div>
        <div class="field"><label>العملة المفضلة للعميل</label><select name="preferredCurrency">${preferredCurrencyOptions()}</select><small class="muted">تُختار تلقائيًا عند إضافة دين أو تسديد لهذا العميل.</small></div>
        <div class="form-actions"><button class="primary" type="submit">حفظ العميل</button><button type="button" class="soft-btn" id="addDebtForClient">إضافة دين</button></div>
      </form>`);
    const form = $('#clientForm');
    $('#pickClientContact').onclick = () => pickClientContact(form);
    form.querySelector('[name="phone"]').oninput = () => { $('#clientPhoneChoices').hidden = true; };
    bindClose();
    form.onsubmit = event => {
      event.preventDefault();
      const client = createClientFromForm(form);
      if (!client) return;
      closeModal();
      toast('تم حفظ العميل');
    };
    $('#addDebtForClient').onclick = () => {
      const client = createClientFromForm(form);
      if (client) transactionForm(client.id, 'debt');
    };
  };

  const transactionFormBase = transactionForm;
  transactionForm = (clientId, type) => {
    transactionFormBase(clientId, type);
    const currency = db.clients.find(item => String(item.id) === String(clientId))?.preferredCurrency;
    const selector = document.querySelector('#recordForm [name="currency"]');
    if (selector && currency && Object.hasOwn(currencies, currency)) selector.value = currency;
  };
  document.querySelectorAll('#addClient').forEach(button => { button.onclick = clientForm; });
})();
