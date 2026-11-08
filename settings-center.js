(() => {
  'use strict';
  const fourCurrencies = [
    ['USD', 'دولار أمريكي', '$'], ['SAR', 'ريال سعودي', 'ر.س'],
    ['YER', 'ريال يمني', 'ر.ي'], ['USDT', 'تيثر', '₮']
  ];
  const value = (object, key, fallback) => {
    const number = Number(object?.[key]);
    return Number.isFinite(number) ? number : fallback;
  };
  const localSize = () => {
    try { return new Blob([localStorage.getItem('daftari-ledger-v1') || '']).size; } catch (_) { return 0; }
  };
  const sizeText = bytes => bytes < 1024 ? `${bytes} بايت` : `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  const currentUserName = () => {
    try {
      const session = JSON.parse(localStorage.getItem('daftari-auth-session-v1') || 'null');
      const users = JSON.parse(localStorage.getItem('daftari-local-users-v1') || '[]');
      return users.find(user => user.id === session?.userId)?.username || 'المستخدم المحلي';
    } catch (_) { return 'المستخدم المحلي'; }
  };
  const saveSettings = () => {
    if (typeof save === 'function') save();
    else localStorage.setItem('daftari-ledger-v1', JSON.stringify(db));
  };
  const commissionRule = (client, key, fallback) => {
    const custom = client?.useCustomCommissions ? Number(client.commissionRules?.[key]) : NaN;
    if (Number.isFinite(custom)) return custom;
    return value(db?.settings?.commissionRules, key, fallback);
  };
  const applyCommissionRule = () => {
    // The application previously used 50 USD for payments. Both limits are now
    // configurable and default to 30 USD, as specified in the settings design.
    window.selectedFee = (client, type, currency, amount) => {
      if (currency !== 'USDT') return { key: null, mode: 'none', value: 0 };
      const isDebt = type === 'debt';
      const limit = commissionRule(client, isDebt ? 'debtLimit' : 'paymentLimit', 30);
      if (Number(amount) <= limit) return { key: isDebt ? 'debtFixed' : 'paymentFixed', mode: isDebt ? 'fixed-add' : 'fixed-deduct', value: commissionRule(client, isDebt ? 'debtFixed' : 'paymentFixed', 1) };
      return { key: isDebt ? 'debtPercent' : 'paymentPercent', mode: isDebt ? 'percent-add' : 'percent-deduct', value: commissionRule(client, isDebt ? 'debtPercent' : 'paymentPercent', isDebt ? 3 : 2) };
    };
  };
  applyCommissionRule();

  window.openDaftariSettings = () => {
    db.settings = db.settings || {};
    const debtRates = db.settings.exchangeRatesByType?.debt || db.settings.exchangeRates || {};
    const rules = db.settings.commissionRules || {};
    const rates = fourCurrencies.map(([code, name, symbol]) => `<div class="settings-currency-row"><strong>${code}</strong><input name="rate_${code}" type="number" min="0.000001" step="any" value="${value(debtRates, code, code === 'USD' || code === 'USDT' ? 1 : code === 'SAR' ? 3.8 : 535)}" aria-label="سعر صرف ${name}"><input value="${symbol}" readonly aria-label="رمز ${name}"></div>`).join('');
    showModal(`<div class="settings-page"><div class="modal-head"><div><h3>الإعدادات</h3><p>أسعار الصرف والعملات وقواعد دفترك، خاصة بحسابك أنت.</p></div>${closeButton()}</div><button id="saveSettingsCenter" class="settings-save" type="button" disabled>حفظ التغييرات</button><details class="settings-section" open><summary>العملات وأسعار الصرف <span class="settings-summary-icon">⌘</span></summary><div class="settings-body"><p class="settings-intro">السعر يوضح كم وحدة من العملة تساوي دولارًا واحدًا. يظهر الرمز بجانب المبالغ في السجلات والكشوف.</p><div class="settings-currency-head"><span>العملة</span><span>سعر الدولار</span><span>الرمز</span></div><div class="settings-currency-table">${rates}</div><p class="settings-rate-note">العملات المعتمدة: USD وSAR وYER وUSDT. يمكن استخدام العملات الإضافية يدويًا في السجلات المتاحة.</p></div></details><details class="settings-section" open><summary>قواعد العمولة <span class="settings-summary-icon">%</span></summary><div class="settings-body"><p class="settings-intro">تطبّق العمولة على USDT فقط. للمبالغ حتى الحد المحدد عمولة ثابتة، وما فوقه نسبة مئوية.</p><div class="settings-subtitle"><strong>الديون (تُضاف للرصيد)</strong><span class="settings-badge">صغيرة $1 · كبيرة 3%</span></div><div class="settings-commission-grid"><div class="settings-field"><label>عمولة المبالغ الصغيرة (دولار)</label><input name="debtFixed" type="number" min="0" step="0.01" value="${value(rules, 'debtFixed', 1)}"></div><div class="settings-field"><label>حد المبلغ الصغير (دولار)</label><input name="debtLimit" type="number" min="0" step="0.01" value="${value(rules, 'debtLimit', 30)}"></div><div class="settings-field wide"><label>نسبة المبالغ الكبيرة (%)</label><input name="debtPercent" type="number" min="0" max="100" step="0.01" value="${value(rules, 'debtPercent', 3)}"></div></div><div class="settings-subtitle"><strong>التسديدات (تُخصم من الرصيد)</strong><span class="settings-badge">صغيرة $1 · كبيرة 2%</span></div><div class="settings-commission-grid"><div class="settings-field"><label>عمولة المبالغ الصغيرة (دولار)</label><input name="paymentFixed" type="number" min="0" step="0.01" value="${value(rules, 'paymentFixed', 1)}"></div><div class="settings-field"><label>حد المبلغ الصغير (دولار)</label><input name="paymentLimit" type="number" min="0" step="0.01" value="${value(rules, 'paymentLimit', 30)}"></div><div class="settings-field wide"><label>نسبة المبالغ الكبيرة (%)</label><input name="paymentPercent" type="number" min="0" max="100" step="0.01" value="${value(rules, 'paymentPercent', 2)}"></div></div></div></details><details class="settings-section"><summary>الحفظ والنسخة الاحتياطية <span class="settings-summary-icon">▣</span></summary><div class="settings-body"><p class="settings-intro">بياناتك محفوظة محليًا على هذا الجهاز. استخدم النسخة الاحتياطية لنقلها أو استعادتها بأمان.</p><div class="settings-status"><div><span>الحالة</span><strong>محفوظ محليًا</strong></div><div><span>حجم البيانات</span><strong>${sizeText(localSize())}</strong></div></div><div class="settings-actions"><button type="button" class="settings-sync" id="settingsBackup">نسخة احتياطية على جهازي</button><button type="button" id="settingsRestore">استعادة من نسخة</button></div></div></details><details class="settings-section" open><summary>الحساب <span class="settings-summary-icon">♙</span></summary><div class="settings-body"><div class="settings-account"><strong>${currentUserName()}</strong><span>الدفتر خاص بهذا المستخدم على هذا الجهاز.</span><button type="button" id="settingsLogout" class="settings-account-button">إدارة الحساب / تسجيل الخروج</button></div></div></details><details class="settings-section"><summary>خيارات متقدمة <span class="settings-summary-icon">⚒</span></summary><div class="settings-body"><p class="settings-advanced-note">يمكنك تعديل الصرف والحاسبة وسلة المحذوفات من هذه القائمة دون حذف بيانات الدفتر.</p><div class="settings-actions"><button type="button" id="settingsTheme">تغيير المظهر</button><button type="button" id="settingsCalculator">تفعيل / إيقاف الحاسبة</button><button type="button" id="settingsExchange">تعديل الصرف المتقدم</button><button type="button" id="settingsTrash">سلة المحذوفات</button></div></div></details></div>`);
    const modal = document.getElementById('modal');
    document.getElementById('overlay').classList.add('fullscreen');
    modal.classList.add('fullscreen-modal', 'settings-modal');
    bindClose();
    const saveButton = modal.querySelector('#saveSettingsCenter');
    const controls = [...modal.querySelectorAll('input[type="number"]')];
    controls.forEach(input => input.addEventListener('input', () => { saveButton.disabled = false; }));
    saveButton.onclick = () => {
      const nextRates = {};
      for (const [code] of fourCurrencies) {
        const input = modal.querySelector(`[name="rate_${code}"]`);
        const amount = Number(input?.value);
        if (!Number.isFinite(amount) || amount <= 0) { toast('تحقق من أسعار الصرف'); return; }
        nextRates[code] = amount;
      }
      const nextRules = {};
      for (const key of ['debtFixed', 'debtLimit', 'debtPercent', 'paymentFixed', 'paymentLimit', 'paymentPercent']) {
        const amount = Number(modal.querySelector(`[name="${key}"]`)?.value);
        if (!Number.isFinite(amount) || amount < 0 || key.endsWith('Percent') && amount > 100) { toast('تحقق من قواعد العمولة'); return; }
        nextRules[key] = amount;
      }
      db.settings.exchangeRatesByType = { debt: { ...nextRates }, payment: { ...nextRates } };
      db.settings.exchangeRates = { ...nextRates };
      db.settings.commissionRules = { ...(db.settings.commissionRules || {}), ...nextRules };
      applyCommissionRule();
      saveSettings();
      saveButton.disabled = true;
      toast('تم حفظ تغييرات الإعدادات');
    };
    modal.querySelector('#settingsBackup').onclick = () => document.getElementById('backup-card')?.click();
    modal.querySelector('#settingsRestore').onclick = () => document.getElementById('backup-card')?.click();
    modal.querySelector('#settingsTheme').onclick = () => window.toggleAppTheme?.();
    modal.querySelector('#settingsCalculator').onclick = () => document.getElementById('calculatorSettings')?.click();
    modal.querySelector('#settingsExchange').onclick = () => typeof exchangeSettingsForm === 'function' && exchangeSettingsForm();
    modal.querySelector('#settingsTrash').onclick = () => document.getElementById('trash-card')?.click();
    modal.querySelector('#settingsLogout').onclick = () => {
      if (!confirm('هل تريد تسجيل الخروج من هذا المستخدم؟')) return;
      localStorage.removeItem('daftari-auth-session-v1');
      location.reload();
    };
  };
})();

/* Compact settings landing page: each group opens only when it is needed. */
(() => {
  const baseOpenSettings = window.openDaftariSettings;
  if (typeof baseOpenSettings !== 'function') return;

  const icons = {
    exchange: '<svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3M18 7a7 7 0 0 1 0 10M6 17a7 7 0 0 1 0-10"/></svg>',
    commission: '<svg viewBox="0 0 24 24"><path d="M19 5 5 19M7.5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',
    backup: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V4h10v3M8 15h8"/></svg>',
    account: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6"/></svg>',
    advanced: '<svg viewBox="0 0 24 24"><path d="m14.5 6.5 3-3 3 3-3 3M9.5 17.5l-3 3-3-3 3-3M13.2 10.8l-6.4 6.4M9.5 6.5l8 8"/></svg>'
  };
  const sections = [
    ['العملات وأسعار الصرف', 'USD · SAR · YER · USDT', 'exchange'],
    ['قواعد العمولة', 'صغيرة $1 · دين 3% · تسديد 2%', 'commission'],
    ['الحفظ والمزامنة', 'محفوظ محليًا · 0 عملية بانتظار الإرسال', 'backup'],
    ['الحساب', '', 'account'],
    ['خيارات متقدمة', 'استيراد الدفتر المشترك القديم', 'advanced']
  ];

  window.openDaftariSettings = () => {
    baseOpenSettings();
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.querySelectorAll('.settings-section').forEach((section, index) => {
      const [title, subtitle, icon] = sections[index] || [];
      const summary = section.querySelector('summary');
      if (!summary || !title) return;
      section.removeAttribute('open');
      summary.innerHTML = `<span class="settings-summary-icon" aria-hidden="true">${icons[icon]}</span><span class="settings-summary-copy"><strong>${title}</strong>${subtitle ? `<small>${subtitle}</small>` : ''}</span><span class="settings-summary-chevron" aria-hidden="true">⌄</span>`;
      summary.setAttribute('aria-label', `${title} — فتح أو إغلاق القسم`);
    });
    const accountName = modal.querySelector('.settings-account strong')?.textContent?.trim();
    const accountSummary = modal.querySelectorAll('.settings-section')[3]?.querySelector('.settings-summary-copy small');
    if (accountSummary && accountName) accountSummary.textContent = accountName;
  };
})();
