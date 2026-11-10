(() => {
  if (window.__DAFTARI_AUTH_INITIALIZED__) return;
  if (!document.querySelector('link[data-daftari-auth-style]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'supabase-auth.css';
    stylesheet.dataset.daftariAuthStyle = 'true';
    document.head.append(stylesheet);
  }
  const config = window.DAFTARI_SUPABASE_CONFIG;
  const LEDGER_KEY = 'daftari-ledger-v1';
  const LEGACY_KEY = `${LEDGER_KEY}:preauth-backup-v1`;
  const MIGRATION_KEY = `${LEDGER_KEY}:preauth-migrated-v1`;
  const LEGACY_TRANSFER_URL = 'http://127.0.0.1:8765/api/legacy-ledger';
  const cacheKey = userId => `${LEDGER_KEY}:cache:${userId}`;
  const emptyLedger = () => ({ clients: [], profits: [], personalWithdrawals: [], settings: {} });

  if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) {
    console.warn('Supabase Auth is not available.');
    const showUnavailableMessage = () => {
      if (document.querySelector('#daftariAuthUnavailable')) return;
      const message = document.createElement('section');
      message.className = 'daftari-auth-layer';
      message.id = 'daftariAuthUnavailable';
      message.innerHTML = '<div class="daftari-auth-card" role="alert"><div class="daftari-auth-mark" aria-hidden="true">د</div><h2>تعذر تحميل خدمة الدخول</h2><p>تأكد من اتصال الإنترنت، ثم أعد تحميل الصفحة. شغّل التطبيق دائمًا من الرابط المحلي وليس من ملف مباشر.</p><a class="daftari-auth-retry" href="http://127.0.0.1:8765/">فتح التطبيق المحلي</a></div>';
      document.body.append(message);
    };
    if (document.body) showUnavailableMessage();
    else document.addEventListener('DOMContentLoaded', showUnavailableMessage, { once: true });
    return;
  }
  window.__DAFTARI_AUTH_INITIALIZED__ = true;

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.DaftariAuth = client;

  let activeUser = null;
  let lastRemoteStamp = '';
  let syncing = false;
  let queuedUpload = null;
  let suppressLocalCapture = false;
  let syncStartedFor = '';

  const parse = (value, fallback = null) => {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  };
  const copy = value => parse(JSON.stringify(value), emptyLedger());
  const hasData = value => Boolean(value && ((value.clients || []).length || (value.profits || []).length || (value.personalWithdrawals || []).length));
  const readLocalLedger = () => normalize(parse(localStorage.getItem(LEDGER_KEY), emptyLedger()));
  const normalize = value => ({
    ...emptyLedger(),
    ...(value && typeof value === 'object' ? value : {}),
    clients: Array.isArray(value?.clients) ? value.clients : [],
    profits: Array.isArray(value?.profits) ? value.profits : [],
    personalWithdrawals: Array.isArray(value?.personalWithdrawals) ? value.personalWithdrawals : [],
    settings: value?.settings && typeof value.settings === 'object'
      ? Object.fromEntries(Object.entries(value.settings).filter(([key]) => key !== 'userProfile'))
      : {}
  });
  const isNewer = (next, current) => String(next?.updatedAt || next?.createdAt || '').localeCompare(String(current?.updatedAt || current?.createdAt || '')) >= 0;
  const mergeItems = (remote = [], local = []) => {
    const result = new Map();
    remote.forEach(item => result.set(item.id || crypto.randomUUID(), copy(item)));
    local.forEach(item => {
      const id = item.id || crypto.randomUUID();
      const existing = result.get(id);
      if (!existing || isNewer(item, existing)) result.set(id, copy({ ...existing, ...item }));
    });
    return [...result.values()];
  };
  const mergeClients = (remote = [], local = []) => {
    const result = new Map(remote.map(item => [item.id || crypto.randomUUID(), copy(item)]));
    local.forEach(item => {
      const id = item.id || crypto.randomUUID();
      const existing = result.get(id);
      if (!existing) { result.set(id, copy(item)); return; }
      const newest = isNewer(item, existing) ? item : existing;
      result.set(id, {
        ...existing,
        ...newest,
        records: mergeItems(existing.records || [], item.records || [])
      });
    });
    return [...result.values()];
  };
  const mergeLedger = (remote, local) => {
    const remoteLedger = normalize(remote);
    const localLedger = normalize(local);
    return normalize({
      ...remoteLedger,
      clients: mergeClients(remoteLedger.clients, localLedger.clients),
      profits: mergeItems(remoteLedger.profits, localLedger.profits),
      personalWithdrawals: mergeItems(remoteLedger.personalWithdrawals, localLedger.personalWithdrawals),
      settings: { ...remoteLedger.settings, ...(!hasData(remoteLedger) ? localLedger.settings : {}) }
    });
  };

  const layer = document.createElement('section');
  layer.className = 'daftari-auth-layer';
  layer.id = 'daftariAuthLayer';
  layer.innerHTML = `<div class="daftari-auth-card" role="dialog" aria-modal="true" aria-labelledby="daftariAuthTitle"><div class="daftari-auth-mark" aria-hidden="true">د</div><h2 id="daftariAuthTitle">مرحبًا بك في دفتري</h2><p>تابع بحساب Google أو أدخل بريدك الإلكتروني وسنرسل لك رابطًا آمنًا للدخول دون كلمة مرور.</p><button id="daftariGoogleLogin" class="daftari-google-login" type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.74-.06-1.28-.2-1.84H12v3.34h5.52c-.11.83-.72 2.08-2.08 2.92l-.02.11 3.02 2.34.21.02c1.94-1.79 2.95-4.42 2.95-7.89Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.89 6.63-2.41l-3.16-2.47c-.84.59-1.96 1-3.47 1-2.65 0-4.9-1.79-5.71-4.26l-.1.01-3.14 2.44-.03.1C4.66 19.68 8.07 22 12 22Z"/><path fill="#FBBC05" d="M6.29 13.86A6.06 6.06 0 0 1 5.97 12c0-.65.11-1.28.31-1.86v-.12L3.1 7.54l-.1.04A10 10 0 0 0 2 12c0 1.62.39 3.15 1.1 4.46l3.19-2.6Z"/><path fill="#EA4335" d="M12 5.88c1.89 0 3.17.82 3.9 1.5l2.85-2.78C16.96 2.96 14.7 2 12 2 8.07 2 4.66 4.32 3 7.59l3.28 2.55C7.1 7.67 9.35 5.88 12 5.88Z"/></svg><span>المتابعة عبر Google</span></button><div class="daftari-auth-divider"><span>أو</span></div><form id="daftariAuthForm"><label for="daftariAuthEmail">البريد الإلكتروني</label><input id="daftariAuthEmail" name="email" type="email" inputmode="email" autocomplete="email" placeholder="name@example.com" required><button type="submit">إرسال رابط الدخول</button><output class="daftari-auth-status" id="daftariAuthStatus" aria-live="polite"></output></form><p class="daftari-auth-tip">بيانات دفترك تبقى خاصة بحسابك، سواء دخلت عبر Google أو رابط البريد.</p></div>`;
  document.body.append(layer);
  const authForm = layer.querySelector('#daftariAuthForm');
  const authEmail = layer.querySelector('#daftariAuthEmail');
  const authStatus = layer.querySelector('#daftariAuthStatus');
  const authSubmit = authForm.querySelector('button');
  const googleLogin = layer.querySelector('#daftariGoogleLogin');
  const setStatus = (message = '', error = false) => {
    authStatus.textContent = message;
    authStatus.classList.toggle('error', error);
  };
  const lockedBackground = new Map();
  const lockBackground = () => {
    [...document.body.children].filter(element => element !== layer).forEach(element => {
      if (!lockedBackground.has(element)) {
        lockedBackground.set(element, {
          inert: element.hasAttribute('inert'),
          ariaHidden: element.getAttribute('aria-hidden')
        });
      }
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    });
  };
  const unlockBackground = () => {
    lockedBackground.forEach((original, element) => {
      if (original.inert) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
      if (original.ariaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', original.ariaHidden);
    });
    lockedBackground.clear();
  };
  const showGate = () => {
    layer.hidden = false;
    lockBackground();
    document.body.classList.add('daftari-auth-pending');
  };
  const hideGate = () => {
    layer.hidden = true;
    unlockBackground();
    document.body.classList.remove('daftari-auth-pending');
  };

  async function refreshGoogleAvailability() {
    googleLogin.hidden = true;
    layer.querySelector('.daftari-auth-divider').hidden = true;
    try {
      const response = await fetch(`${config.url}/auth/v1/settings`, {
        headers: { apikey: config.publishableKey },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('auth-settings-unavailable');
      const settings = await response.json();
      const enabled = settings?.external?.google === true;
      googleLogin.hidden = !enabled;
      layer.querySelector('.daftari-auth-divider').hidden = !enabled;
      layer.querySelector('.daftari-auth-card > p').textContent = enabled
        ? 'تابع بحساب Google أو أدخل بريدك الإلكتروني وسنرسل لك رابطًا آمنًا للدخول دون كلمة مرور.'
        : 'أدخل بريدك الإلكتروني وسنرسل لك رابطًا آمنًا للدخول دون كلمة مرور.';
      if (!enabled) setStatus('تسجيل Google غير مفعّل حاليًا؛ استخدم البريد الإلكتروني.', false);
    } catch {
      layer.querySelector('.daftari-auth-card > p').textContent = 'أدخل بريدك الإلكتروني وسنرسل لك رابطًا آمنًا للدخول دون كلمة مرور.';
      setStatus('تعذر التحقق من مزوّد Google. يمكنك تسجيل الدخول بالبريد الإلكتروني.', false);
    }
  }

  function snapshotLegacyLedger() {
    if (localStorage.getItem(MIGRATION_KEY) || localStorage.getItem(LEGACY_KEY)) return;
    const snapshot = readLocalLedger();
    if (hasData(snapshot)) localStorage.setItem(LEGACY_KEY, JSON.stringify(snapshot));
  }

  async function saveFileInstallationBackup() {
    const snapshot = readLocalLedger();
    if (!hasData(snapshot)) return { copied: false, reason: 'empty' };
    const response = await fetch(LEGACY_TRANSFER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot: JSON.stringify(snapshot) })
    });
    if (!response.ok) throw new Error('legacy-backup-failed');
    return { copied: true };
  }

  async function readFileInstallationBackup() {
    try {
      const response = await fetch('/api/legacy-ledger', { cache: 'no-store' });
      if (!response.ok) return emptyLedger();
      const body = await response.json();
      return normalize(parse(body?.snapshot, emptyLedger()));
    } catch {
      return emptyLedger();
    }
  }

  async function clearFileInstallationBackup() {
    try {
      await fetch('/api/legacy-ledger', { method: 'DELETE', cache: 'no-store' });
    } catch {}
  }

  function applyLedger(value, userId) {
    const next = normalize(value);
    suppressLocalCapture = true;
    try {
      db = next;
      localStorage.setItem(LEDGER_KEY, JSON.stringify(next));
      localStorage.setItem(cacheKey(userId), JSON.stringify(next));
      render();
    } finally {
      suppressLocalCapture = false;
    }
  }

  async function readRemoteLedger(userId) {
    const { data, error } = await client.from('user_ledgers').select('data, updated_at').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function writeRemoteLedger(userId, value) {
    const updatedAt = new Date().toISOString();
    const { error } = await client.from('user_ledgers').upsert({ user_id: userId, data: normalize(value), updated_at: updatedAt }, { onConflict: 'user_id' });
    if (error) throw error;
    lastRemoteStamp = updatedAt;
  }

  async function synchronizeSession(session) {
    const user = session?.user;
    if (!user || syncStartedFor === user.id) return;
    syncStartedFor = user.id;
    activeUser = user;
    window.DaftariCurrentUser = user;
    showGate();
    setStatus('جارٍ تأمين حسابك واستعادة بيانات الدفتر…');
    authSubmit.disabled = true;
    try {
      const remote = await readRemoteLedger(user.id);
      const cached = normalize(parse(localStorage.getItem(cacheKey(user.id)), emptyLedger()));
      const legacy = localStorage.getItem(MIGRATION_KEY) ? emptyLedger() : normalize(parse(localStorage.getItem(LEGACY_KEY), emptyLedger()));
      const transferred = await readFileInstallationBackup();
      const local = mergeLedger(hasData(cached) ? cached : legacy, transferred);
      const combined = remote ? mergeLedger(remote.data, local) : local;
      const changed = !remote || JSON.stringify(normalize(remote.data)) !== JSON.stringify(combined);
      if (changed) await writeRemoteLedger(user.id, combined);
      lastRemoteStamp = remote?.updated_at || lastRemoteStamp;
      applyLedger(combined, user.id);
      if (hasData(transferred)) await clearFileInstallationBackup();
      localStorage.setItem(MIGRATION_KEY, user.id);
      if (hasData(legacy)) localStorage.removeItem(LEGACY_KEY);
      addAccountButton(user.email || 'الحساب مرتبط');
      hideGate();
    } catch (error) {
      console.error('Supabase ledger sync failed:', error);
      setStatus('تعذر فتح البيانات السحابية. تأكد من تنفيذ ملف إعداد قاعدة البيانات في Supabase ثم أعد المحاولة.', true);
      syncStartedFor = '';
    } finally {
      authSubmit.disabled = false;
    }
  }

  function scheduleUpload(value) {
    if (!activeUser || suppressLocalCapture) return;
    const snapshot = normalize(parse(value, emptyLedger()));
    localStorage.setItem(cacheKey(activeUser.id), JSON.stringify(snapshot));
    clearTimeout(queuedUpload);
    queuedUpload = setTimeout(async () => {
      queuedUpload = null;
      if (!activeUser || syncing) return;
      syncing = true;
      try { await writeRemoteLedger(activeUser.id, snapshot); }
      catch (error) { console.error('Supabase ledger upload failed:', error); }
      finally { syncing = false; }
    }, 650);
  }

  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    const result = nativeSetItem.call(this, key, value);
    if (key === LEDGER_KEY && this === localStorage && !suppressLocalCapture) scheduleUpload(value);
    return result;
  };

  function addAccountButton(email) {
    const tools = document.querySelector('.top-tools');
    if (!tools) return;
    let button = document.querySelector('#daftariAccountButton');
    if (!button) {
      button = document.createElement('div');
      button.id = 'daftariAccountButton';
      button.className = 'soft-btn daftari-account-button';
      button.innerHTML = '<b aria-hidden="true">✉</b><span></span><button type="button" class="daftari-logout">خروج</button>';
      tools.prepend(button);
      button.querySelector('.daftari-logout').addEventListener('click', async event => {
        event.stopPropagation();
        await client.auth.signOut();
      });
    }
    button.querySelector('span').textContent = email;
  }

  if (location.protocol === 'file:') {
    showGate();
    layer.querySelector('h2').textContent = 'نقل بيانات دفتري';
    layer.querySelector('.daftari-auth-card > p').textContent = 'نحفظ بياناتك المحلية أولًا ثم تنتقل إلى النسخة المؤمّنة عبر البريد الإلكتروني.';
    googleLogin.hidden = true;
    layer.querySelector('.daftari-auth-divider').hidden = true;
    authForm.hidden = true;
    setStatus('جارٍ حفظ نسخة محلية آمنة من بياناتك…');
    saveFileInstallationBackup()
      .then(result => setStatus(result.copied
        ? 'تم حفظ بياناتك. افتح الآن http://127.0.0.1:8765 وسجّل بريدك الإلكتروني.'
        : 'لا توجد بيانات محلية جديدة للنقل. افتح http://127.0.0.1:8765 لتسجيل الدخول.'))
      .catch(() => setStatus('شغّل الخادم المحلي أولًا ثم حدّث هذه الصفحة لحفظ بياناتك قبل الانتقال.', true));
    return;
  }

  refreshGoogleAvailability();

  authForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = String(new FormData(authForm).get('email') || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setStatus('اكتب بريدًا إلكترونيًا صحيحًا.', true); return; }
    authSubmit.disabled = true;
    setStatus('جارٍ إرسال رابط الدخول…');
    const redirect = `${location.origin}${location.pathname}`;
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    authSubmit.disabled = false;
    setStatus(error ? (error.message || 'تعذر إرسال رابط الدخول.') : 'تم إرسال رابط الدخول. افتح بريدك الإلكتروني واضغط الرابط للمتابعة.', Boolean(error));
  });

  googleLogin.addEventListener('click', async () => {
    googleLogin.disabled = true;
    authSubmit.disabled = true;
    setStatus('جارٍ فتح Google لاختيار الحساب…');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}${location.pathname}` }
    });
    if (error) {
      googleLogin.disabled = false;
      authSubmit.disabled = false;
      setStatus(error.message || 'تعذر بدء تسجيل الدخول عبر Google. تأكد من تفعيل مزوّد Google في Supabase.', true);
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      activeUser = null;
      window.DaftariCurrentUser = null;
      syncStartedFor = '';
      document.querySelector('#daftariAccountButton')?.remove();
      showGate();
      setStatus('');
      return;
    }
    setTimeout(() => synchronizeSession(session), 0);
  });

  snapshotLegacyLedger();
  showGate();
  client.auth.getSession().then(({ data: { session } }) => {
    if (session) synchronizeSession(session);
  }).catch(() => setStatus('تعذر الاتصال بخدمة الدخول. تحقق من الإنترنت ثم أعد المحاولة.', true));

  setInterval(async () => {
    if (!activeUser || syncing || queuedUpload || document.visibilityState !== 'visible') return;
    try {
      const remote = await readRemoteLedger(activeUser.id);
      if (remote?.updated_at && remote.updated_at > lastRemoteStamp) {
        lastRemoteStamp = remote.updated_at;
        applyLedger(remote.data, activeUser.id);
      }
    } catch {}
  }, 15000);
})();
