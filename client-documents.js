(() => {
  const modal = document.getElementById('modal');
  if (!modal) return;

  const maxFileSize = 10 * 1024 * 1024;
  let loadedClientId = null;
  const documentCache = new Map();

  function apiAvailable() {
    return location.protocol === 'http:' || location.protocol === 'https:';
  }

  function safeText(value) {
    return String(value ?? '');
  }

  function escapeHtml(value) {
    return safeText(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function localToday() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  }

  function messageFor(response, fallback) {
    return response.json().then(body => body.error || fallback).catch(() => fallback);
  }

  function makePanel(clientId) {
    const panel = document.createElement('section');
    panel.className = 'client-documents-panel';
    panel.id = 'clientDocumentsPanel';
    panel.dataset.clientId = clientId;

    const header = document.createElement('div');
    header.className = 'client-documents-header';
    const title = document.createElement('div');
    title.innerHTML = '<strong>مستندات PDF</strong><small>ملفات مرتبطة بهذا العميل</small>';
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'soft-btn client-document-add';
    add.dataset.addClientPdf = 'true';
    add.textContent = '＋ إرفاق PDF';
    header.append(title, add);

    const status = document.createElement('div');
    status.className = 'client-documents-status muted';
    status.textContent = 'جارٍ تحميل المستندات…';
    const list = document.createElement('div');
    list.className = 'client-documents-list';
    panel.append(header, status, list);
    return panel;
  }

  function makeDocumentRow(documentInfo) {
    const row = document.createElement('article');
    row.className = 'client-document-row';
    const details = document.createElement('div');
    details.className = 'client-document-details';
    const name = document.createElement('strong');
    name.textContent = safeText(documentInfo.fileName);
    name.title = name.textContent;
    const date = document.createElement('small');
    date.textContent = `التاريخ: ${safeText(documentInfo.date).split('-').reverse().join('/')}`;
    details.append(name, date);

    const actions = document.createElement('div');
    actions.className = 'client-document-actions';
    for (const [action, label] of [['share', 'مشاركة'], ['download', 'تنزيل']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action === 'share' ? 'client-document-share' : 'client-document-download';
      button.dataset.documentAction = action;
      button.dataset.documentId = safeText(documentInfo.id);
      button.textContent = label;
      actions.append(button);
    }
    row.append(details, actions);
    return row;
  }

  async function loadDocuments(clientId) {
    const panel = modal.querySelector('#clientDocumentsPanel');
    if (!panel || panel.dataset.clientId !== clientId) return;
    const status = panel.querySelector('.client-documents-status');
    const list = panel.querySelector('.client-documents-list');
    list.replaceChildren();

    if (!apiAvailable()) {
      status.textContent = 'لتخزين الملفات، شغّل الخادم ثم افتح http://127.0.0.1:8765';
      return;
    }

    status.textContent = 'جارٍ تحميل المستندات…';
    try {
      const response = await fetch(`/api/documents?clientId=${encodeURIComponent(clientId)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await messageFor(response, 'تعذر تحميل المستندات.'));
      const documents = await response.json();
      if (modal.querySelector('#clientDocumentsPanel') !== panel || panel.dataset.clientId !== clientId) return;
      documentCache.set(clientId, documents);
      if (!documents.length) {
        status.textContent = 'لا توجد مستندات PDF لهذا العميل.';
        return;
      }
      status.textContent = `عدد المستندات: ${documents.length}`;
      documents.forEach(item => list.append(makeDocumentRow(item)));
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? 'الخادم غير متصل. شغّل server.mjs وافتح التطبيق من http://127.0.0.1:8765.'
        : error.message || 'تعذر تحميل المستندات.';
    }
  }

  function ensurePanel() {
    const header = modal.querySelector('.person-head');
    const clientId = typeof activeClient === 'undefined' ? '' : String(activeClient || '');
    if (!header || !clientId) {
      loadedClientId = null;
      return;
    }
    const client = db.clients.find(item => String(item.id) === clientId);
    if (!client) return;

    let panel = modal.querySelector('#clientDocumentsPanel');
    if (!panel) {
      panel = makePanel(clientId);
      const links = modal.querySelector('.dialog-links');
      if (links) links.insertAdjacentElement('afterend', panel);
      else header.insertAdjacentElement('afterend', panel);
    }
    panel.dataset.clientId = clientId;
    if (loadedClientId !== clientId) {
      loadedClientId = clientId;
      loadDocuments(clientId);
    }
  }

  function showUploadForm(clientId) {
    const client = db.clients.find(item => String(item.id) === clientId);
    if (!client) return;
    savePreviousState();
    showModal(`<div class="modal-head"><h3>إرفاق ملف PDF · ${escapeHtml(client.name)}</h3>${closeButton()}</div><form id="clientPdfForm" novalidate><div class="field"><label for="clientPdfFile">ملف PDF *</label><input id="clientPdfFile" name="file" type="file" accept="application/pdf,.pdf" required><small class="muted">الحد الأقصى 10 ميجابايت</small></div><div class="field"><label for="clientPdfDate">تاريخ المستند *</label><input id="clientPdfDate" name="date" type="date" value="${localToday()}" required></div><div id="clientPdfFormStatus" class="client-pdf-form-status" role="status"></div><div class="form-actions"><button class="primary" id="clientPdfSubmit">حفظ المستند</button><button type="button" class="soft-btn" id="clientPdfCancel">إلغاء</button></div></form>`);
    bindClose();
    document.getElementById('clientPdfCancel').onclick = () => closeModal();
    document.getElementById('clientPdfForm').addEventListener('submit', event => submitDocument(event, client));
  }

  async function submitDocument(event, client) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.file.files?.[0];
    const date = form.elements.date.value;
    const status = document.getElementById('clientPdfFormStatus');
    const submit = document.getElementById('clientPdfSubmit');
    status.textContent = '';

    if (!apiAvailable()) {
      status.textContent = 'شغّل الخادم بالأمر node server.mjs ثم افتح http://127.0.0.1:8765.';
      return;
    }
    if (!file) {
      status.textContent = 'اختر ملف PDF أولًا.';
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      status.textContent = 'امتداد الملف يجب أن يكون PDF.';
      return;
    }
    if (file.type && !['application/pdf', 'application/octet-stream'].includes(file.type.toLowerCase())) {
      status.textContent = 'نوع الملف المحدد ليس PDF.';
      return;
    }
    if (!file.size || file.size > maxFileSize) {
      status.textContent = 'يجب أن يكون حجم الملف أقل من 10 ميجابايت.';
      return;
    }
    if (!isValidDate(date)) {
      status.textContent = 'اختر تاريخًا صالحًا للمستند.';
      return;
    }

    try {
      const header = new TextDecoder().decode(await file.slice(0, 1024).arrayBuffer());
      if (!header.includes('%PDF-')) {
        status.textContent = 'محتوى الملف لا يبدو ملف PDF صالحًا.';
        return;
      }
      const bytes = await file.arrayBuffer();
      const encoded = arrayBufferToBase64(bytes);
      submit.disabled = true;
      submit.textContent = 'جارٍ حفظ المستند…';
      status.textContent = 'جارٍ رفع الملف إلى الخادم المحلي…';
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: String(client.id),
          clientName: client.name,
          date,
          fileName: file.name,
          mimeType: file.type,
          data: encoded
        })
      });
      if (!response.ok) throw new Error(await messageFor(response, 'تعذر حفظ المستند.'));
      const saved = await response.json();
      const cached = documentCache.get(String(client.id)) || [];
      documentCache.set(String(client.id), [saved, ...cached]);
      toast('تم حفظ المستند وربطه بالعميل');
      closeModal();
      setTimeout(() => {
        if (String(activeClient) === String(client.id)) loadDocuments(String(client.id));
      }, 100);
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? 'تعذر الاتصال بالخادم. شغّل server.mjs وافتح التطبيق من http://127.0.0.1:8765.'
        : error.message || 'تعذر حفظ المستند.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'حفظ المستند';
    }
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  async function getDocumentBlob(documentInfo) {
    const response = await fetch(`/api/documents/${encodeURIComponent(documentInfo.id)}/file`, { cache: 'no-store' });
    if (!response.ok) throw new Error(await messageFor(response, 'تعذر فتح الملف.'));
    return response.blob();
  }

  function downloadBlob(blob, fileName) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  }

  async function downloadDocument(documentInfo) {
    try {
      const blob = await getDocumentBlob(documentInfo);
      downloadBlob(blob, documentInfo.fileName);
    } catch (error) {
      toast(error.message || 'تعذر تنزيل الملف');
    }
  }

  async function shareDocument(documentInfo) {
    try {
      const blob = await getDocumentBlob(documentInfo);
      const file = new File([blob], documentInfo.fileName, { type: 'application/pdf' });
      if (!navigator.share || !navigator.canShare || !navigator.canShare({ files: [file] })) {
        downloadBlob(blob, documentInfo.fileName);
        toast('تم تنزيل الملف؛ أرفقه من تطبيق التواصل لإرساله للعميل');
        return;
      }
      await navigator.share({
        files: [file],
        title: `مستند ${documentInfo.clientName || ''}`.trim(),
        text: `مستند PDF بتاريخ ${documentInfo.date}`
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      toast('تعذرت المشاركة المباشرة؛ جارٍ تنزيل الملف لإرساله يدويًا');
      try { downloadBlob(await getDocumentBlob(documentInfo), documentInfo.fileName); } catch (_) { /* Keep the first share error visible. */ }
    }
  }

  modal.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add-client-pdf]');
    if (addButton) {
      showUploadForm(addButton.closest('#clientDocumentsPanel')?.dataset.clientId || String(activeClient));
      return;
    }
    const actionButton = event.target.closest('[data-document-action]');
    if (!actionButton) return;
    const clientId = actionButton.closest('#clientDocumentsPanel')?.dataset.clientId;
    const documentInfo = documentCache.get(clientId)?.find(item => item.id === actionButton.dataset.documentId);
    if (!documentInfo) return;
    if (actionButton.dataset.documentAction === 'share') shareDocument(documentInfo);
    else downloadDocument(documentInfo);
  });

  new MutationObserver(ensurePanel).observe(modal, { childList: true, subtree: true });
  ensurePanel();
})();
