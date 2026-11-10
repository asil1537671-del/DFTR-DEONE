(() => {
  'use strict';

  const baseTransactionForm = window.transactionForm;
  if (typeof baseTransactionForm !== 'function') return;

  const currentRiyadhTime = () => new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(new Date());

  function decorateTransactionForm(clientId) {
    const layer = document.querySelector('.transaction-overlay.show');
    const panel = layer?.querySelector('.transaction-modal-layer');
    const form = panel?.querySelector('#recordForm');
    const client = db.clients.find(item => String(item.id) === String(clientId));
    if (!layer || !panel || !form || !client || panel.dataset.transactionSheetReady) return;
    panel.dataset.transactionSheetReady = 'true';
    form.dataset.clientId = String(clientId);
    layer.id = 'transactionSheetOverlay';
    panel.id = 'transactionSheetModal';

    const heading = panel.querySelector('.modal-head h3');
    const header = panel.querySelector('.modal-head');
    if (heading && header) {
      const titleGroup = document.createElement('div');
      titleGroup.className = 'transaction-sheet-title';
      const subtitle = document.createElement('p');
      subtitle.className = 'transaction-sheet-subtitle';
      subtitle.textContent = client.name;
      header.insertBefore(titleGroup, heading);
      titleGroup.append(heading, subtitle);
      heading.textContent = form.dataset.type === 'payment' ? 'تسديد جديد' : 'دين جديد';
      header.classList.add('transaction-sheet-head');
    }

    const amountRow = form.querySelector(':scope > .grid2');
    const fee = form.querySelector('[name="commissionValue"]')?.closest('.field');
    const feeInput = fee?.querySelector('[name="commissionValue"]');
    const noteField = form.querySelector('textarea[name="note"]')?.closest('.field');
    const dateField = form.querySelector('input[name="date"]')?.closest('.field');
    const preview = form.querySelector('#recordRateNote');
    const actions = form.querySelector('.form-actions');
    const saveButton = actions?.querySelector('button:not(#cancel)');
    const cancelButton = actions?.querySelector('#cancel');
    const currency = form.querySelector('[name="currency"]');
    const amountInput = form.querySelector('[name="amount"]');
    if (!amountRow || !fee || !feeInput || !noteField || !dateField || !preview || !actions || !currency || !amountInput) return;

    const typeSwitch = document.createElement('div');
    typeSwitch.className = 'transaction-type-switch';
    typeSwitch.setAttribute('role', 'group');
    typeSwitch.setAttribute('aria-label', 'نوع العملية');
    typeSwitch.innerHTML = '<button type="button" data-transaction-type="debt"><span>دين (+)</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7m-9 0h9v9"/></svg></button><button type="button" data-transaction-type="payment"><span>تسديد (−)</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10m0-9v9H8"/></svg></button>';

    const rateField = document.createElement('div');
    rateField.className = 'field transaction-rate-field';
    rateField.innerHTML = '<label for="transactionExchangeRate">سعر الصرف لكل دولار</label><input id="transactionExchangeRate" name="exchangeRate" type="number" min="0.000001" step="any" inputmode="decimal" required>';

    const timeField = document.createElement('div');
    timeField.className = 'field transaction-time-field';
    timeField.innerHTML = '<label for="transactionTime">الوقت</label><input id="transactionTime" name="time" type="time" lang="en" dir="ltr" required value="' + currentRiyadhTime() + '">';

    const scheduleRow = document.createElement('div');
    scheduleRow.className = 'transaction-date-rate-row';
    scheduleRow.append(rateField, dateField, timeField);

    const modeInput = document.createElement('input');
    modeInput.type = 'hidden';
    modeInput.name = 'commissionMode';
    modeInput.value = 'auto';

    const modePicker = document.createElement('div');
    modePicker.className = 'transaction-commission-modes';
    modePicker.setAttribute('role', 'group');
    modePicker.setAttribute('aria-label', 'طريقة احتساب العمولة');
    modePicker.innerHTML = '<button type="button" data-commission-mode="auto" aria-pressed="true">تلقائي</button><button type="button" data-commission-mode="none" aria-pressed="false">بلا عمولة</button><button type="button" data-commission-mode="fixed" aria-pressed="false">مبلغ ثابت</button><button type="button" data-commission-mode="percent" aria-pressed="false">نسبة %</button>';

    fee.classList.add('transaction-commission-field');
    const feeLabel = fee.querySelector('label');
    const feeHint = fee.querySelector('.muted');
    feeLabel.textContent = 'العمولة';
    fee.insertBefore(modePicker, feeInput);
    fee.insertBefore(modeInput, feeInput);
    if (cancelButton) cancelButton.textContent = 'إلغاء';
    actions.classList.add('transaction-sheet-actions');
    amountRow.classList.add('transaction-amount-row');

    form.append(typeSwitch, amountRow, scheduleRow, fee, noteField, preview, actions);

    const rateInput = rateField.querySelector('input');
    const typeButtons = [...typeSwitch.querySelectorAll('[data-transaction-type]')];
    const modeButtons = [...modePicker.querySelectorAll('[data-commission-mode]')];
    let activeFeeKey = null;
    let activeRateKey = (form.dataset.type || 'debt') + '|' + currency.value;

    const activeRule = () => {
      const operationType = form.dataset.type;
      const code = currency.value;
      const value = Number(String(amountInput.value || 0).replace(/,/g, '')) || 0;
      return selectedFee(client, operationType, code, value);
    };

    const updatePreview = () => {
      const operationType = form.dataset.type || 'debt';
      const code = currency.value || 'USD';
      const value = Number(String(amountInput.value || 0).replace(/,/g, '')) || 0;
      const rate = Number(rateInput.value) || clientRate(client, code, operationType);
      const selectedMode = modeInput.value || 'auto';
      const rule = activeRule();
      let commissionType = 'none';
      let commissionValue = 0;

      if (code === 'USDT' && selectedMode === 'auto') {
        commissionType = rule.mode;
        commissionValue = Number(feeInput.value) || 0;
      } else if (code === 'USDT' && selectedMode === 'fixed') {
        commissionType = operationType === 'debt' ? 'fixed-add' : 'fixed-deduct';
        commissionValue = Number(feeInput.value) || 0;
      } else if (code === 'USDT' && selectedMode === 'percent') {
        commissionType = operationType === 'debt' ? 'percent-add' : 'percent-deduct';
        commissionValue = Number(feeInput.value) || 0;
      }

      fee.hidden = false;
      feeInput.hidden = code !== 'USDT' || selectedMode === 'none' || selectedMode === 'auto';
      feeHint.textContent = code !== 'USDT'
        ? (code === 'USD' ? 'لا تُحتسب عمولة على USD — العمولة على USDT فقط.' : 'العمولة تُحتسب على USDT فقط.')
        : selectedMode === 'none'
          ? 'لن تُحتسب عمولة على هذه العملية.'
          : selectedMode === 'auto'
            ? (operationType === 'debt' ? 'تُحدد العمولة تلقائيًا حسب مبلغ الدين.' : 'يُحدد الخصم تلقائيًا حسب مبلغ التسديد.')
            : (selectedMode === 'fixed' ? 'أدخل قيمة العمولة أو الخصم بالدولار.' : 'أدخل نسبة العمولة أو الخصم.');
      feeLabel.textContent = selectedMode === 'fixed' ? 'مبلغ العمولة بالدولار' : selectedMode === 'percent' ? 'نسبة العمولة (%)' : 'العمولة';

      modeButtons.forEach(button => {
        const selected = button.dataset.commissionMode === selectedMode;
        button.setAttribute('aria-pressed', String(selected));
        button.disabled = code !== 'USDT' && button.dataset.commissionMode !== 'auto';
      });

      const usdAmount = value > 0 && rate > 0
        ? convertUSD(value, operationType, code, rate, commissionType, commissionValue)
        : 0;
      preview.innerHTML = '<span class="usd-conversion-main"><span>المبلغ بعد العمولة</span><strong>$ ' + fmt(usdAmount) + '</strong></span><small>سعر الصرف: 1 USD = ' + fmt(rate) + ' ' + currencyDisplay(code) + '</small>';
    };

    const updateFeeFromMode = reset => {
      const operationType = form.dataset.type || 'debt';
      const selectedMode = modeInput.value || 'auto';
      const rule = activeRule();
      let key = rule.key;
      let newValue = rule.value;

      if (selectedMode === 'none') {
        key = 'none';
        newValue = 0;
      } else if (selectedMode === 'fixed') {
        key = operationType === 'debt' ? 'debtFixed' : 'paymentFixed';
        newValue = clientRule(client, key);
      } else if (selectedMode === 'percent') {
        key = operationType === 'debt' ? 'debtPercent' : 'paymentPercent';
        newValue = clientRule(client, key);
      }

      if (reset || key !== activeFeeKey) {
        feeInput.value = newValue;
        feeInput.dataset.changed = 'false';
        activeFeeKey = key;
      }
      updatePreview();
    };

    const setType = nextType => {
      form.dataset.type = nextType;
      if (heading) heading.textContent = nextType === 'payment' ? 'تسديد جديد' : 'دين جديد';
      typeButtons.forEach(button => {
        const selected = button.dataset.transactionType === nextType;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      if (saveButton) {
        saveButton.textContent = 'حفظ العملية';
        saveButton.className = nextType === 'payment' ? 'primary transaction-save-button' : 'danger-btn transaction-save-button';
      }
      modeInput.value = 'auto';
      activeFeeKey = null;
      currency.dispatchEvent(new Event('change', { bubbles: true }));
      updateFeeFromMode(true);
    };

    typeButtons.forEach(button => button.addEventListener('click', () => setType(button.dataset.transactionType)));
    modeButtons.forEach(button => button.addEventListener('click', () => {
      if (button.disabled) return;
      modeInput.value = button.dataset.commissionMode;
      activeFeeKey = null;
      updateFeeFromMode(true);
    }));
    currency.addEventListener('change', () => {
      const key = (form.dataset.type || 'debt') + '|' + currency.value;
      if (key !== activeRateKey) {
        rateInput.value = String(clientRate(client, currency.value || 'USD', form.dataset.type || 'debt'));
        activeRateKey = key;
      }
      updateFeeFromMode(false);
    });
    amountInput.addEventListener('input', () => updateFeeFromMode(false));
    feeInput.addEventListener('input', updatePreview);
    rateInput.value = String(clientRate(client, currency.value || 'USD', form.dataset.type || 'debt'));
    rateInput.addEventListener('input', updatePreview);
    dateField.querySelector('input').classList.add('transaction-date-input');
    timeField.querySelector('input').classList.add('transaction-time-input');
    typeSwitch.querySelector('[data-transaction-type="debt"]').classList.toggle('is-active', form.dataset.type !== 'payment');
    typeSwitch.querySelector('[data-transaction-type="debt"]').setAttribute('aria-pressed', String(form.dataset.type !== 'payment'));
    typeSwitch.querySelector('[data-transaction-type="payment"]').setAttribute('aria-pressed', String(form.dataset.type === 'payment'));

    typeButtons.forEach(button => button.classList.toggle('is-active', button.dataset.transactionType === form.dataset.type));
    if (heading) heading.textContent = form.dataset.type === 'payment' ? 'تسديد جديد' : 'دين جديد';
    if (saveButton) {
      saveButton.textContent = 'حفظ العملية';
      saveButton.className = form.dataset.type === 'payment' ? 'primary transaction-save-button' : 'danger-btn transaction-save-button';
    }
    activeFeeKey = null;
    updateFeeFromMode(true);
  }

  window.transactionForm = function (clientId, type) {
    const result = baseTransactionForm.apply(this, arguments);
    decorateTransactionForm(clientId, type);
    return result;
  };
})();