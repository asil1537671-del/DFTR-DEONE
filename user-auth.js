(() => {
  'use strict';

  const USERS_KEY = 'daftari-local-users-v1';
  const SESSION_KEY = 'daftari-auth-session-v1';
  const LEDGER_KEY = 'daftari-ledger-v1';
  const emptyLedger = () => ({ clients: [], profits: [], settings: {} });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const usernameKey = value => String(value || '').trim().normalize('NFKC').toLocaleLowerCase('ar');
  const safeJson = (value, fallback) => { try { return JSON.parse(value || ''); } catch { return fallback; } };
  const users = () => { const value = safeJson(localStorage.getItem(USERS_KEY), []); return Array.isArray(value) ? value : []; };
  const storeUsers = value => localStorage.setItem(USERS_KEY, JSON.stringify(value));
  const newId = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const randomSalt = () => typeof crypto !== 'undefined' && crypto.getRandomValues ? Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join('') : `${Date.now()}-${Math.random()}`;

  async function hashPassword(password, salt) {
    const input = new TextEncoder().encode(`${salt}:${password}`);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const digest = await crypto.subtle.digest('SHA-256', input);
        return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
      } catch { /* Use the local fallback below in file-mode browsers. */ }
    }
    let hash = 2166136261;
    for (const value of input) { hash ^= value; hash = Math.imul(hash, 16777619); }
    return `fallback-${(hash >>> 0).toString(16)}`;
  }

  function activeSession() { return safeJson(localStorage.getItem(SESSION_KEY), null); }
  function installPersistenceBridge() {
    if (Storage.prototype.__daftariLedgerBridge) return;
    const nativeSetItem = Storage.prototype.setItem;
    Object.defineProperty(Storage.prototype, '__daftariLedgerBridge', { value: true });
    Storage.prototype.setItem = function (key, value) {
      nativeSetItem.call(this, key, value);
      const session = activeSession();
      if (key === LEDGER_KEY && session?.dataKey) nativeSetItem.call(this, session.dataKey, value);
    };
  }

  function addProfileToCurrentLedger(user) {
    db.settings = db.settings || {};
    db.settings.userProfile = { id: user.id, username: user.username, createdAt: user.createdAt };
  }

  function addLogoutButton(user) {
    const tools = document.querySelector('.top-tools');
    if (!tools || tools.querySelector('#daftariLogout')) return;
    const button = document.createElement('button');
    button.id = 'daftariLogout';
    button.type = 'button';
    button.className = 'soft-btn';
    button.textContent = `خروج · ${user.username}`;
    button.title = 'تسجيل الخروج وتبديل المستخدم';
    button.onclick = () => {
      localStorage.removeItem(SESSION_KEY);
      location.reload();
    };
    tools.prepend(button);
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = '.daftari-auth-layer{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:linear-gradient(145deg,#e8f5efee,#d8eee8f2);backdrop-filter:blur(8px);direction:rtl}.daftari-auth-card{width:min(100%,480px);padding:clamp(24px,6vw,42px);border:1px solid #d5e5dc;border-radius:28px;background:#fff;box-shadow:0 24px 70px #1b594032;text-align:right}.daftari-auth-mark{width:72px;height:72px;border-radius:24px;display:grid;place-items:center;background:#217957;color:#fff;font-size:38px;font-weight:800;margin:0 auto 20px}.daftari-auth-card h2{margin:0 0 10px;color:#1c382d;font-size:clamp(26px,6vw,34px);text-align:center}.daftari-auth-card p{margin:0 0 22px;color:#687b73;line-height:1.8;text-align:center}.daftari-auth-card label{display:block;margin-bottom:8px;color:#29463a;font-weight:700}.daftari-auth-card input{width:100%;min-height:54px;margin-bottom:14px;padding:12px 15px;border:1px solid #cddfd5;border-radius:14px;background:#fbfefc;color:#1d3027;font:inherit}.daftari-auth-card input:focus{outline:3px solid #bfe3d0;border-color:#217957}.daftari-auth-card button{width:100%;min-height:54px;margin-top:7px;border:0;border-radius:14px;background:#217957;color:#fff;font:inherit;font-weight:800;font-size:17px;cursor:pointer}.daftari-auth-card button:hover{background:#176848}.daftari-auth-card .daftari-auth-alt{background:#f3f7f4;color:#267451;border:1px solid #cfe0d6}.daftari-auth-card .daftari-auth-note{margin-top:15px!important;font-size:13px;color:#7a8c84!important}.daftari-auth-error{min-height:22px;color:#bd332b!important;font-size:13px!important;margin:0 0 10px!important;text-align:right!important}';
    document.head.append(style);
  }

  function showAuth(mode = users().length ? 'login' : 'register') {
    addStyles();
    const layer = document.createElement('section');
    layer.className = 'daftari-auth-layer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    const registering = mode === 'register';
    layer.innerHTML = `<form class="daftari-auth-card" id="daftariAuthForm"><div class="daftari-auth-mark" aria-hidden="true">د</div><h2>${registering ? 'إنشاء مستخدم جديد' : 'تسجيل الدخول'}</h2><p>${registering ? (users().length ? 'أنشئ مستخدمًا إضافيًا، وستبقى بيانات كل مستخدم منفصلة.' : 'أنشئ مستخدمك لأول مرة. سننقل بيانات الدفتر الحالية إليه دون حذفها.') : 'أدخل اسم المستخدم وكلمة المرور للمتابعة.'}</p><label for="daftariUsername">اسم المستخدم</label><input id="daftariUsername" name="username" maxlength="60" autocomplete="username" placeholder="مثال: أصيل" required><label for="daftariPassword">كلمة المرور</label><input id="daftariPassword" name="password" type="password" minlength="6" autocomplete="${registering ? 'new-password' : 'current-password'}" placeholder="6 أحرف على الأقل" required><p class="daftari-auth-error" id="daftariAuthError" aria-live="polite"></p><button type="submit">${registering ? 'إنشاء المستخدم والمتابعة' : 'دخول'}</button><button type="button" class="daftari-auth-alt" id="daftariAuthSwitch">${registering ? 'لدي مستخدم، تسجيل الدخول' : 'إنشاء مستخدم جديد'}</button><p class="daftari-auth-note">الحسابات محفوظة على هذا الجهاز. عند حذف بيانات التطبيق أو إلغاء تثبيته، تُمسح الحسابات المحلية ما لم تحتفظ بنسخة احتياطية.</p></form>`;
    document.body.append(layer);
    const form = layer.querySelector('#daftariAuthForm');
    const error = layer.querySelector('#daftariAuthError');
    const nameInput = layer.querySelector('#daftariUsername');
    queueMicrotask(() => nameInput.focus());
    layer.querySelector('#daftariAuthSwitch').onclick = () => { layer.remove(); showAuth(registering ? 'login' : 'register'); };
    form.addEventListener('submit', async event => {
      event.preventDefault();
      error.textContent = '';
      const values = new FormData(form);
      const username = String(values.get('username') || '').trim();
      const password = String(values.get('password') || '');
      const normalized = usernameKey(username);
      if (username.length < 2) { error.textContent = 'اكتب اسم مستخدم من حرفين على الأقل.'; return; }
      if (password.length < 6) { error.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.'; return; }
      const list = users();
      if (registering) {
        if (list.some(user => user.usernameKey === normalized)) { error.textContent = 'اسم المستخدم مستخدم بالفعل على هذا الجهاز.'; return; }
        const user = { id: newId(), username, usernameKey: normalized, salt: randomSalt(), createdAt: new Date().toISOString() };
        user.passwordHash = await hashPassword(password, user.salt);
        const isFirstUser = list.length === 0;
        const ledger = isFirstUser ? safeJson(localStorage.getItem(LEDGER_KEY), emptyLedger()) : emptyLedger();
        ledger.settings = ledger.settings || {};
        ledger.settings.userProfile = { id: user.id, username: user.username, createdAt: user.createdAt, migratedExistingData: isFirstUser };
        user.dataKey = `daftari-ledger-user-${user.id}`;
        localStorage.setItem(user.dataKey, JSON.stringify(ledger));
        storeUsers([...list, user]);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, dataKey: user.dataKey }));
        location.reload();
        return;
      }
      const user = list.find(item => item.usernameKey === normalized);
      if (!user || await hashPassword(password, user.salt) !== user.passwordHash) { error.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة.'; return; }
      localStorage.setItem(LEDGER_KEY, localStorage.getItem(user.dataKey) || JSON.stringify(emptyLedger()));
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, dataKey: user.dataKey }));
      location.reload();
    });
  }

  const session = activeSession();
  const user = session && users().find(item => item.id === session.userId && item.dataKey === session.dataKey);
  if (!user) showAuth();
  else {
    installPersistenceBridge();
    addProfileToCurrentLedger(user);
    addLogoutButton(user);
  }
})();
