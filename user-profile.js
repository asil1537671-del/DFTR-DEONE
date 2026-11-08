(() => {
  'use strict';

  const profileKey = 'userProfile';
  const activeProfile = () => db?.settings?.[profileKey];
  const makeId = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const hasExistingData = () => Boolean(
    (db.clients || []).length || (db.profits || []).length ||
    (db.personalWithdrawals || []).length || (db.liquidityEntries || []).length
  );

  const style = document.createElement('style');
  style.textContent = `
    .daftari-user-layer{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:20px;background:linear-gradient(145deg,#e8f5efdd,#d8eee8ee);backdrop-filter:blur(8px);direction:rtl}
    .daftari-user-card{width:min(100%,480px);padding:clamp(24px,6vw,42px);border:1px solid #d5e5dc;border-radius:28px;background:#fff;box-shadow:0 24px 70px #1b594032;text-align:right}
    .daftari-user-mark{width:72px;height:72px;border-radius:24px;display:grid;place-items:center;background:#217957;color:#fff;font-size:38px;font-weight:800;margin:0 auto 20px}
    .daftari-user-card h2{margin:0 0 10px;color:#1c382d;font-size:clamp(26px,6vw,34px);text-align:center}.daftari-user-card p{margin:0 0 22px;color:#687b73;line-height:1.8;text-align:center}
    .daftari-user-card label{display:block;margin-bottom:8px;color:#29463a;font-weight:700}.daftari-user-card input{width:100%;min-height:54px;padding:12px 15px;border:1px solid #cddfd5;border-radius:14px;background:#fbfefc;color:#1d3027;font:inherit}.daftari-user-card input:focus{outline:3px solid #bfe3d0;border-color:#217957}
    .daftari-user-card button{width:100%;min-height:54px;margin-top:18px;border:0;border-radius:14px;background:#217957;color:#fff;font:inherit;font-weight:800;font-size:17px;cursor:pointer}.daftari-user-card button:hover{background:#176848}.daftari-user-note{margin-top:14px!important;font-size:13px;color:#7a8c84!important}
  `;
  document.head.append(style);

  function showFirstUseProfile() {
    if (activeProfile()?.id) return;
    const layer = document.createElement('section');
    layer.className = 'daftari-user-layer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    const migrationMessage = hasExistingData()
      ? 'وجدنا بياناتك الحالية في الدفتر. سيُربط هذا المستخدم بها الآن دون حذف أي عميل أو عملية.'
      : 'أنشئ اسم المستخدم مرة واحدة لبدء استخدام دفتري على هذا الجهاز.';
    layer.innerHTML = `<form class="daftari-user-card" id="daftariUserForm"><div class="daftari-user-mark" aria-hidden="true">د</div><h2>مرحبًا بك في دفتري</h2><p>${migrationMessage}</p><label for="daftariUserName">اسم المستخدم</label><input id="daftariUserName" name="name" maxlength="60" autocomplete="username" placeholder="اكتب اسمك أو اسم المنشأة" required><button type="submit">إنشاء المستخدم والمتابعة</button><p class="daftari-user-note">سيُحفظ هذا المستخدم محليًا، ولن تظهر هذه الشاشة مرة أخرى إلا بعد مسح بيانات التطبيق أو إعادة تثبيته.</p></form>`;
    document.body.append(layer);
    const form = layer.querySelector('#daftariUserForm');
    const input = layer.querySelector('#daftariUserName');
    queueMicrotask(() => input.focus());
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = String(new FormData(form).get('name') || '').trim();
      if (!name) { input.focus(); return; }
      db.settings = db.settings || {};
      db.settings[profileKey] = {
        id: makeId(),
        name: name.slice(0, 60),
        createdAt: new Date().toISOString(),
        migratedExistingData: hasExistingData()
      };
      save();
      layer.remove();
      toast(`أهلًا ${name}، تم حفظ مستخدمك وبياناتك.`);
    });
  }

  window.daftariUser = {
    get: () => activeProfile() || null
  };
  showFirstUseProfile();
})();
