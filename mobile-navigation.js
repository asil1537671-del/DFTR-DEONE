(() => {
  window.__daftariNavigationManaged = true;
  const KEY = '__daftariNavigation';
  const SNAPSHOT_KEY = '__daftariReloadSnapshot';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const rawPushState = history.pushState.bind(history);
  const rawReplaceState = history.replaceState.bind(history);
  let restoring = false;
  let openingRoute = false;
  let pendingScreen = null;
  let lastState = null;
  let parentSnapshotOverride = null;
  let scrollRestoreVersion = 0;

  const homeState = () => ({ [KEY]: 'home' });
  const routeState = (route, clientId = null, parent = null) => ({
    [KEY]: 'route', route, clientId, ...(parent ? { parent } : {})
  });
  const normalizeState = state => {
    if (!state) return null;
    if (state[KEY]) return state;
    if (state.state === 'main') return homeState();
    if (state.state === 'directory') return routeState('directory');
    if (state.state === 'client') return routeState('client', state.clientId || null);
    return state;
  };
  const isAppState = state => ['home', 'route', 'screen', 'dialog'].includes(normalizeState(state)?.[KEY]);
  const sameRoute = (a, b) => {
    a = normalizeState(a); b = normalizeState(b);
    if (!a || !b) return false;
    if (a[KEY] === 'home' && b[KEY] === 'home') return true;
    if (a[KEY] !== 'route' || b[KEY] !== 'route') return false;
    return a.route === b.route && a.clientId === b.clientId;
  };
  const scrollSelectors = [
    '#modal', '.record-scroll', '.transaction-overlay .modal',
    '.profile-form-overlay .modal', '.account-summary-scroll', '.recent'
  ];
  function captureScroll() {
    const areas = {};
    for (const selector of scrollSelectors) {
      const nodes = [...document.querySelectorAll(selector)];
      if (nodes.length) areas[selector] = nodes.map(node => node.scrollTop);
    }
    return { x: window.scrollX || 0, y: window.scrollY || 0, areas };
  }
  function captureUIState() {
    const forms = [...document.forms].map((form, formIndex) => ({
      id: form.id || `form-${formIndex}`,
      values: [...form.elements].map(control => {
        const type = String(control.type || '').toLowerCase();
        if (type === 'file') return null;
        if (type === 'checkbox' || type === 'radio') return { checked: control.checked };
        if (control.multiple && control.options) {
          return { selected: [...control.selectedOptions].map(option => option.value) };
        }
        return { value: control.value };
      })
    }));
    const controls = {};
    for (const selector of ['#search', '#directorySearch']) {
      const control = document.querySelector(selector);
      if (control) controls[selector] = control.value;
    }
    return {
      forms,
      controls,
      calculator: {
        enabled: !Boolean(document.querySelector('.calc')?.hidden),
        open: Boolean(document.getElementById('calcBox')?.classList.contains('open')),
        expression: typeof expr === 'string' ? expr : null,
        result: typeof calcResult === 'string' ? calcResult : null,
        evaluated: typeof calcEvaluated === 'boolean' ? calcEvaluated : null
      }
    };
  }
  function applyUIState(snapshot) {
    if (!snapshot) return;
    const savedForms = new Map((snapshot.forms || []).map(form => [form.id, form.values || []]));
    [...document.forms].forEach((form, formIndex) => {
      const savedValues = savedForms.get(form.id || `form-${formIndex}`);
      if (!savedValues) return;
      [...form.elements].forEach((control, index) => {
        const saved = savedValues[index];
        if (!saved) return;
        if (Object.prototype.hasOwnProperty.call(saved, 'checked')) control.checked = saved.checked;
        else if (saved.selected && control.options) {
          [...control.options].forEach(option => { option.selected = saved.selected.includes(option.value); });
        } else if (Object.prototype.hasOwnProperty.call(saved, 'value')) control.value = saved.value;
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    for (const [selector, value] of Object.entries(snapshot.controls || {})) {
      const control = document.querySelector(selector);
      if (control) {
        control.value = value;
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    const calculator = snapshot.calculator;
    if (calculator) {
      const calculatorWidget = document.querySelector('.calc');
      if (typeof calculator.enabled === 'boolean' && calculatorWidget) {
        calculatorWidget.hidden = !calculator.enabled;
        window.syncCalculatorCardState?.();
      }
      if (calculator.expression != null && typeof expr === 'string') expr = calculator.expression;
      if (calculator.result != null && typeof calcResult === 'string') calcResult = calculator.result;
      if (calculator.evaluated != null && typeof calcEvaluated === 'boolean') calcEvaluated = calculator.evaluated;
      if (typeof paintCalc === 'function') paintCalc();
      document.getElementById('calcBox')?.classList.toggle('open', Boolean(calculator.open));
    }
  }
  function applyScroll(snapshot) {
    if (!snapshot) return;
    window.scrollTo(snapshot.x || 0, snapshot.y || 0);
    for (const [selector, positions] of Object.entries(snapshot.areas || {})) {
      [...document.querySelectorAll(selector)].forEach((node, index) => {
        if (positions[index] != null) node.scrollTop = positions[index];
      });
    }
  }
  function restoreScroll(snapshot) {
    if (!snapshot) return;
    const version = ++scrollRestoreVersion;
    const applyIfCurrent = () => {
      if (version === scrollRestoreVersion) applyScroll(snapshot);
    };
    requestAnimationFrame(() => requestAnimationFrame(applyIfCurrent));
    setTimeout(applyIfCurrent, 80);
  }
  function snapshotCurrentState() {
    const current = normalizeState(history.state) || lastState;
    if (!isAppState(current)) return null;
    const updated = { ...current, scroll: captureScroll(), ui: captureUIState() };
    rawReplaceState(updated, '');
    lastState = updated;
    return updated;
  }
  const nativePush = (state, { captureParent = true } = {}) => {
    let next = state;
    const parent = captureParent ? snapshotCurrentState() : null;
    if (next?.[KEY] === 'route' && !next.parent && parent) next = { ...next, parent };
    rawPushState(next, '');
    lastState = next;
    return next;
  };

  function readSessionSnapshot() {
    try {
      const raw = sessionStorage.getItem(SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function statePath(state) {
    const path = [];
    let cursor = normalizeState(state);
    let depth = 0;
    while (isAppState(cursor) && cursor[KEY] !== 'home' && depth++ < 12) {
      path.unshift(cursor);
      cursor = normalizeState(cursor.parent);
    }
    if (cursor?.[KEY] === 'home') path.unshift(cursor);
    else path.unshift(homeState());
    return path;
  }

  const savedSnapshot = readSessionSnapshot();
  const historyState = normalizeState(history.state);
  let bootState = isAppState(historyState)
    ? historyState
    : normalizeState(savedSnapshot?.state);
  const restoringReload = isAppState(bootState);

  if (isAppState(historyState)) {
    lastState = historyState;
    // Older builds saved only the client page; restore the expected client-list step.
    if (historyState[KEY] === 'route' && historyState.route === 'client' && !historyState.parent) {
      const directory = routeState('directory', null, homeState());
      rawReplaceState(directory, '');
      bootState = { ...historyState, parent: directory };
      nativePush(bootState, { captureParent: false });
    } else if (historyState[KEY] === 'route' && historyState.route === 'directory' && !historyState.parent) {
      bootState = { ...historyState, parent: homeState() };
      rawReplaceState(bootState, '');
      lastState = bootState;
    }
  } else if (restoringReload) {
    for (const item of statePath(bootState)) rawPushState(item, '');
    const restoredPath = statePath(bootState);
    lastState = restoredPath[restoredPath.length - 1] || homeState();
    bootState = lastState;
  } else {
    const home = homeState();
    rawReplaceState(home, '');
    lastState = home;
  }

  if (restoringReload) {
    document.documentElement.classList.add('dftr-restoring');
    if (typeof loadNavigationState === 'function') loadNavigationState = () => null;
  }

  function persistReloadState() {
    const current = normalizeState(history.state) || lastState;
    if (!isAppState(current)) return;
    const updated = { ...current, scroll: captureScroll(), ui: captureUIState() };
    rawReplaceState(updated, '');
    lastState = updated;
    try { sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ state: updated, savedAt: Date.now() })); }
    catch { /* The browser history state still preserves navigation when storage is full. */ }
  }
  window.addEventListener('pagehide', persistReloadState);
  window.addEventListener('beforeunload', persistReloadState);

  history.pushState = function (state, title, url) {
    if (restoring) return;
    const normalized = normalizeState(state);
    // Ignore the old startup hook's dashboard push while resuming a saved screen.
    if (restoringReload && normalized?.[KEY] === 'home' && history.state?.[KEY] !== 'home') return;
    if (sameRoute(history.state, normalized)) {
      lastState = normalizeState(history.state);
      return;
    }
    const parent = parentSnapshotOverride || snapshotCurrentState();
    const next = normalized?.[KEY] === 'route' && !normalized.parent && parent
      ? { ...normalized, parent }
      : normalized;
    if (url === undefined) rawPushState(next, title || '');
    else rawPushState(next, title || '', url);
    lastState = next;
  };

  const rawShowModal = showModal;
  const rawDirectory = customerDirectory;
  const rawOpenClient = openClient;

  showModal = function (html) {
    if (!restoring) scrollRestoreVersion++;
    const isRestoredClient = activeClient && navigationState === 'main' && String(html).includes('person-head');
    if (isRestoredClient && !parentSnapshotOverride) {
      const savedParent = snapshotCurrentState() || homeState();
      parentSnapshotOverride = savedParent;
      queueMicrotask(() => {
  window.__daftariNavigationManaged = true;
        if (parentSnapshotOverride === savedParent) parentSnapshotOverride = null;
      });
    }
    if (!restoring && !openingRoute && !isRestoredClient) {
      const parent = snapshotCurrentState() || homeState();
      const next = { [KEY]: 'screen', screen: pendingScreen, parent };
      const current = normalizeState(history.state);
      const replacingSavedEdit = current?.[KEY] === 'screen'
        && current.screen?.type === 'editRecordForm'
        && pendingScreen?.type === 'openTransactionDetails'
        && current.screen.args?.[0] === pendingScreen.args?.[0]
        && current.screen.args?.[1] === pendingScreen.args?.[1];
      if (replacingSavedEdit) {
        const parent = current.parent?.parent || current.parent;
        rawReplaceState({ ...next, parent }, '');
        lastState = { ...next, parent };
      } else {
        nativePush(next, { captureParent: false });
      }
    }
    document.body.classList.add('dftr-modal-open');
    return rawShowModal(html);
  };

  customerDirectory = function (...args) {
    if (!restoring) scrollRestoreVersion++;
    const previous = openingRoute;
    openingRoute = true;
    try { return rawDirectory.apply(this, args); }
    finally { openingRoute = previous; }
  };

  const returnToClientTypes = new Set([
    'transactionForm', 'editClient', 'editRecordForm',
    'clientExchangeForm', 'openTransactionDetails'
  ]);
  openClient = function (id, ...args) {
    if (!restoring) scrollRestoreVersion++;
    const current = normalizeState(history.state);
    const screen = current?.[KEY] === 'screen' ? current.screen : null;
    const returningFromClientScreen = !restoring && screen && returnToClientTypes.has(screen.type)
      && screen.args?.[0] === id;
    if (returningFromClientScreen) {
      history.back();
      return;
    }
    const parentBeforeOpen = !restoring ? snapshotCurrentState() : null;
    const previous = openingRoute;
    const previousParentOverride = parentSnapshotOverride;
    openingRoute = true;
    if (parentBeforeOpen) parentSnapshotOverride = parentBeforeOpen;
    try { rawOpenClient.call(this, id, ...args); }
    finally {
      openingRoute = previous;
      parentSnapshotOverride = previousParentOverride;
    }
    const backButton = document.querySelector('#modal #close');
    if (backButton && navigationState === 'client') {
      backButton.onclick = () => closeModal();
      backButton.setAttribute('aria-label', 'العودة إلى الشاشة السابقة');
    }
  };

  const chooseClient = document.getElementById('chooseClient');
  if (chooseClient) chooseClient.onclick = customerDirectory;

  function trackModalScreen(name) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (...args) {
      const previous = pendingScreen;
      const stateArgs = args.filter(arg => !(arg instanceof Event));
      pendingScreen = { type: name, args: stateArgs };
      try { return original.apply(this, args); }
      finally { pendingScreen = previous; }
    };
  }
  [
    'clientForm', 'transactionForm', 'editClient', 'profitForm', 'trashForm',
    'openTransactionDetails', 'editRecordForm', 'exchangeSettingsForm', 'openAccountStatements', 'openAnalytics'
  ]
    .forEach(trackModalScreen);

  const addClientButton = document.getElementById('addClient');
  if (addClientButton) addClientButton.onclick = clientForm;
  const profitButton = document.querySelector('.profit-btn');
  if (profitButton) profitButton.onclick = profitForm;
  const trashButton = [...document.querySelectorAll('button')]
    .find(button => button.textContent.includes('سلة المحذوفات'));
  if (trashButton) trashButton.onclick = trashForm;
  const exchangeButton = document.getElementById('exchangeSettings');
  if (exchangeButton) exchangeButton.onclick = exchangeSettingsForm;

  const originalClientExchangeForm = window.clientExchangeForm;
  if (typeof originalClientExchangeForm === 'function') {
    window.clientExchangeForm = function (...args) {
      if (!restoring) {
        scrollRestoreVersion++;
        const parent = snapshotCurrentState() || homeState();
        nativePush({ [KEY]: 'screen', screen: { type: 'clientExchangeForm', args }, parent }, { captureParent: false });
      }
      return originalClientExchangeForm.apply(this, args);
    };
  }

  function clearVisibleLayers() {
    document.querySelectorAll('.transaction-overlay, .profile-form-overlay, .client-menu-popover')
      .forEach(layer => layer.remove());
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    if (overlay) overlay.classList.remove('show', 'fullscreen');
    if (modal) {
      modal.classList.remove('fullscreen-modal');
      modal.replaceChildren();
    }
    document.body.classList.remove('dftr-modal-open');
  }

  function renderScreen(screen) {
    if (!screen || !screen.type) return;
    const args = screen.args || [];
    const openers = {
      transactionForm: () => transactionForm(...args),
      editClient: () => editClient(...args),
      clientForm: () => clientForm(...args),
      profitForm: () => profitForm(...args),
      trashForm: () => trashForm(...args),
      openTransactionDetails: () => openTransactionDetails(...args),
      editRecordForm: () => editRecordForm(...args),
      exchangeSettingsForm: () => exchangeSettingsForm(...args),
      openAccountStatements: () => window.openAccountStatements?.(),
      openAnalytics: () => window.openAnalytics?.(),
      clientExchangeForm: () => clientExchangeForm(...args)
    };
    if (args[0]) {
      activeClient = args[0];
      navigationState = 'client';
    }
    openers[screen.type]?.();
  }

  function renderState(state) {
    state = normalizeState(state);
    if (!state) return;
    if (state[KEY] === 'home') {
      activeClient = null;
      navigationState = 'main';
      clearNavigationState();
      if (typeof render === 'function') render();
      return;
    }
    if (state[KEY] === 'route') {
      if (state.route === 'directory') {
        navigationState = 'directory';
        saveNavigationState('directory');
        customerDirectory();
      } else if (state.route === 'client' && state.clientId) {
        activeClient = state.clientId;
        navigationState = 'client';
        saveNavigationState('client', state.clientId);
        openClient(state.clientId);
      } else {
        renderState(homeState());
      }
      return;
    }
    if (state.parent) renderState(state.parent);
    if (state[KEY] === 'screen') renderScreen(state.screen);
  }

  function restoreState(state) {
    const normalized = normalizeState(state) || homeState();
    restoring = true;
    try {
      clearVisibleLayers();
      renderState(normalized);
      applyUIState(normalized.ui || (restoringReload ? savedSnapshot?.state?.ui : null));
      applyScroll(normalized.scroll || (restoringReload ? savedSnapshot?.state?.scroll : null));
      rawReplaceState(normalized, '');
      lastState = normalized;
    } finally {
      restoring = false;
      openingRoute = false;
      document.documentElement.classList.remove('dftr-restoring');
    }
    restoreScroll(normalized.scroll || (restoringReload ? savedSnapshot?.state?.scroll : null));
    if (normalized[KEY] === 'home') document.body.classList.remove('dftr-modal-open');
  }

  // A screen made from a dialog or profile form returns to its parent screen first.
  window.addEventListener('popstate', event => {
    const previous = lastState;
    let target = normalizeState(event.state);

    const calc = document.getElementById('calcBox');
    if (calc?.classList.contains('open')) {
      event.stopImmediatePropagation();
      calc.classList.remove('open');
      const stayOn = previous ? { ...previous, scroll: captureScroll() } : homeState();
      rawPushState(stayOn, '');
      lastState = stayOn;
      return;
    }

    const openClientMenu = document.querySelector('.client-menu-popover:not([hidden])');
    if (openClientMenu) {
      event.stopImmediatePropagation();
      openClientMenu.hidden = true;
      document.querySelectorAll('.client-menu-toggle[aria-expanded="true"]').forEach(toggle => toggle.setAttribute('aria-expanded', 'false'));
      const stayOn = previous ? { ...previous, scroll: captureScroll() } : homeState();
      rawPushState(stayOn, '');
      lastState = stayOn;
      return;
    }

    if (!target || !target[KEY]) {
      if (previous?.[KEY] === 'home') {
        lastState = target;
        return;
      }
      event.stopImmediatePropagation();
      restoreState(homeState());
      nativePush(homeState(), { captureParent: false });
      return;
    }
    event.stopImmediatePropagation();
    lastState = target;
    if (target[KEY] === 'dialog') target = target.parent || homeState();
    restoreState(target);
  }, true);

  closeModal = function () {
    const current = normalizeState(history.state);
    if (current && current[KEY] !== 'home') {
      history.back();
      return;
    }
    clearVisibleLayers();
  };

  // Restore the exact saved screen after the app's initial dashboard render.
  window.addEventListener('DOMContentLoaded', () => {
    if (restoringReload) {
      setTimeout(() => restoreState(bootState), 40);
    } else {
      setTimeout(() => {
  window.__daftariNavigationManaged = true;
        if (navigationState === 'client' && activeClient) openClient(activeClient);
      }, 100);
    }
  });
})();


