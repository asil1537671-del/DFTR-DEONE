const DEFAULT_CURRENCIES = [
  { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'YER', name: 'ريال يمني', symbol: 'ر.ي' },
  { code: 'USDT', name: 'تيثر', symbol: '₮' },
];

const DEFAULT_RATES = {
  debt: { USD: 1, SAR: 3.8, YER: 535, USDT: 1 },
  payment: { USD: 1, SAR: 3.79, YER: 530, USDT: 1 },
};

const normalizeDigits = value => String(value ?? '')
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

function numeric(value, fallback = 0) {
  const parsed = Number(normalizeDigits(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function newId(value, used) {
  const candidate = String(value ?? '');
  const id = /^[A-Za-z0-9_-]{1,80}$/.test(candidate) && !used.has(candidate)
    ? candidate
    : crypto.randomUUID();
  used.add(id);
  return id;
}

function sourceData(payload) {
  if (payload?.format === 'daftari-backup' && payload.data && typeof payload.data === 'object') return payload.data;
  if (payload?.data && typeof payload.data === 'object' && Array.isArray(payload.data.clients)) return payload.data;
  return payload;
}

function isoParts(row) {
  const value = row?.createdAt || row?.occurredAt || row?.updatedAt || '';
  const parsed = value ? new Date(value) : null;
  const valid = parsed && !Number.isNaN(parsed.getTime());
  const storedDate = String(row?.date || '').slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(storedDate)
    ? storedDate
    : valid
      ? parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
      : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
  const storedTime = String(row?.time || '').slice(0, 5);
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(storedTime)
    ? storedTime
    : valid
      ? parsed.toLocaleTimeString('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hour12: false })
      : '12:00';
  return { date, time };
}

function currencyList(source, ledger) {
  const known = new Map(DEFAULT_CURRENCIES.map(item => [item.code, item]));
  const configured = source?.settings?.currencies;
  if (Array.isArray(configured)) {
    configured.forEach(item => {
      const code = String(item?.code || '').toUpperCase();
      if (/^[A-Z0-9]{2,12}$/.test(code)) known.set(code, { code, name: String(item.name || code), symbol: String(item.symbol || code) });
    });
  } else if (configured && typeof configured === 'object') {
    Object.entries(configured).forEach(([rawCode, value]) => {
      const code = rawCode.toUpperCase();
      if (/^[A-Z0-9]{2,12}$/.test(code)) known.set(code, { code, name: String(value?.name || value || code), symbol: String(value?.symbol || code) });
    });
  }
  const add = value => {
    const code = String(value || '').toUpperCase();
    if (/^[A-Z0-9]{2,12}$/.test(code) && !known.has(code)) known.set(code, { code, name: code, symbol: code });
  };
  (ledger.clients || []).forEach(client => {
    add(client.currency);
    (client.records || []).forEach(record => add(record.currency));
  });
  ['personalWithdrawals', 'profits', 'liquidityEntries'].forEach(key => (ledger[key] || []).forEach(item => add(item.currency)));
  return [...known.values()];
}

function mappedSettings(source, ledger, currencies) {
  const old = source?.settings || {};
  const oldRates = old.exchangeRatesByType || {};
  const legacyRates = old.exchangeRates || {};
  const rateFor = (kind, code) => {
    const value = oldRates[kind]?.[code] ?? legacyRates[kind]?.[code] ?? legacyRates[code] ?? DEFAULT_RATES[kind]?.[code] ?? 1;
    return Math.max(Number.EPSILON, numeric(value, 1));
  };
  const oldRules = old.commissionRules || {};
  const currentRules = old.commissions || {};
  const rule = (kind, fixedKey, percentKey, defaultPercent, threshold) => {
    const current = currentRules[kind] || {};
    const smallUsd = numeric(current.smallUsd ?? oldRules[fixedKey], 1);
    const percent = numeric(current.byCurrency?.USDT ?? current.percent ?? oldRules[percentKey], defaultPercent);
    return {
      mode: 'tiered',
      smallUsd,
      threshold: numeric(current.threshold, threshold),
      percent,
      fixed: numeric(current.fixed ?? oldRules[fixedKey], smallUsd),
      currencies: ['USDT'],
      byCurrency: { ...(current.byCurrency || {}), USDT: percent },
    };
  };
  return {
    shopName: old.shopName || old.businessName || 'دفتري',
    shopPhone: old.shopPhone || old.phone || '',
    currencies,
    rates: Object.fromEntries(['debt', 'payment'].map(kind => [
      kind,
      Object.fromEntries(currencies.map(item => [item.code, rateFor(kind, item.code)])),
    ])),
    commissions: {
      debt: rule('debt', 'debtFixed', 'debtPercent', 3, 30),
      payment: rule('payment', 'paymentFixed', 'paymentPercent', 2, 50),
    },
  };
}

function numericCurrencyMap(value, currencies) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(currencies.flatMap(({ code }) => {
    const amount = Number(value[code]);
    return Number.isFinite(amount) && amount > 0 ? [[code, amount]] : [];
  }));
}

function clientOverrides(client, currencies) {
  const rates = client.rates || {};
  const customRates = client.useCustomRates
    ? { debt: rates.debt || rates, payment: rates.payment || rates }
    : {};
  const oldRules = client.commissionRules || {};
  const oldRates = client.commissionRates || {};
  const hasLegacyRules = client.useCustomCommissions || (!Object.hasOwn(client, 'useCustomCommissions') && Object.keys(oldRates).length > 0);
  const custom = client.commissions || {};
  const commissionKind = (kind, fixedKey, percentKey) => {
    const current = custom[kind] || {};
    if (!hasLegacyRules && !Object.keys(current).length) return {};
    const smallUsd = numeric(current.smallUsd ?? oldRules[fixedKey], NaN);
    const percent = numeric(current.byCurrency?.USDT ?? current.percent ?? oldRules[percentKey] ?? oldRates[kind], NaN);
    return {
      ...(Number.isFinite(smallUsd) ? { smallUsd } : {}),
      ...(Number.isFinite(percent) ? { percent, byCurrency: { USDT: percent } } : {}),
    };
  };
  return {
    rates: Object.fromEntries(['debt', 'payment'].flatMap(kind => {
      const mapped = numericCurrencyMap(customRates[kind], currencies);
      return Object.keys(mapped).length ? [[kind, mapped]] : [];
    })),
    commissions: {
      debt: commissionKind('debt', 'debtFixed', 'debtPercent'),
      payment: commissionKind('payment', 'paymentFixed', 'paymentPercent'),
    },
  };
}

export function convertLegacyBackup(payload) {
  if (payload?.version === 1 && Array.isArray(payload.clients) && Array.isArray(payload.records)) {
    return { isLegacy: false, backup: payload };
  }
  const source = sourceData(payload);
  if (!source || !Array.isArray(source.clients)) throw new Error('هذا الملف لا يحتوي بيانات دفتري قابلة للاستيراد');

  const legacy = {
    clients: source.clients,
    profits: Array.isArray(source.profits) ? source.profits : [],
    personalWithdrawals: Array.isArray(source.personalWithdrawals) ? source.personalWithdrawals : [],
    liquidityEntries: Array.isArray(source.liquidityEntries) ? source.liquidityEntries : [],
    trash: Array.isArray(source.trash) ? source.trash : [],
  };
  const currencies = currencyList(source, legacy);
  const settings = mappedSettings(source, legacy, currencies);
  const usedIds = new Set();
  const clients = [];
  const records = [];
  for (const client of legacy.clients) {
    const id = newId(client.id, usedIds);
    const overrides = clientOverrides(client, currencies);
    clients.push({
      id,
      name: client.name || 'عميل',
      phone: client.phone || '',
      note: client.note || '',
      currency: String(client.currency || 'USD').toUpperCase(),
      archived: Boolean(client.archived),
      rates: overrides.rates,
      commissions: overrides.commissions,
    });
    for (const record of Array.isArray(client.records) ? client.records : []) {
      const { date, time } = isoParts(record);
      const type = record.type === 'payment' ? 'payment' : 'debt';
      const amount = numeric(record.amount, NaN);
      if (!(amount > 0)) continue;
      records.push({
        id: newId(record.id, usedIds),
        clientId: id,
        type,
        date,
        time,
        note: record.note || '',
        createdName: record.createdName || '',
        amount,
        currency: String(record.currency || client.currency || 'USD').toUpperCase(),
        exchangeRate: numeric(record.exchangeRate ?? record.rate, 1),
        commissionType: record.commissionType || (numeric(record.commissionValue ?? record.commissionRate) > 0 ? `fixed-${type === 'debt' ? 'add' : 'deduct'}` : 'none'),
        commissionValue: numeric(record.commissionValue ?? record.commissionRate),
        voided: Boolean(record.voided),
      });
    }
  }

  const withdrawals = legacy.personalWithdrawals.flatMap(item => {
    const amounts = Array.isArray(item.amounts)
      ? item.amounts.map(value => numeric(value)).filter(value => value > 0)
      : [numeric(item.amount)].filter(value => value > 0);
    if (!amounts.length) return [];
    const { date, time } = isoParts(item);
    const note = [item.source ? `المصدر: ${item.source}` : '', item.note || ''].filter(Boolean).join(' — ');
    return [{
      id: newId(item.id, usedIds),
      currency: String(item.currency || 'USD').toUpperCase(),
      amounts,
      date,
      time,
      note,
      createdName: '',
      voided: Boolean(item.voided),
    }];
  });

  return {
    isLegacy: true,
    source: payload,
    unsupported: {
      profits: legacy.profits.length,
      liquidityEntries: legacy.liquidityEntries.length,
      trash: legacy.trash.length,
    },
    backup: { version: 1, replaceSettings: true, settings, clients, records, withdrawals },
  };
}
