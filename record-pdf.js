(() => {
  'use strict';

  const escapeFileName = value => String(value || 'سجل').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 80);
  const textLines = (context, value, width) => {
    const words = String(value ?? '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const trial = line ? `${line} ${word}` : word;
      if (line && context.measureText(trial).width > width) { lines.push(line); line = word; }
      else line = trial;
    });
    if (line) lines.push(line);
    return lines.length ? lines : ['—'];
  };

  const assemblePdf = image => {
    const encoder = new TextEncoder();
    const chunks = [];
    let length = 0;
    const push = value => { const bytes = typeof value === 'string' ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length; };
    const offsets = [];
    const object = (id, content) => { offsets[id] = length; push(`${id} 0 obj\n${content}\nendobj\n`); };
    push('%PDF-1.4\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, '<< /Type /Pages /Count 1 /Kids [3 0 R] >>');
    object(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4] = length;
    push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
    push(image.bytes);
    push('\nendstream\nendobj\n');
    const content = 'q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ';
    object(5, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`);
    const xref = length;
    push('xref\n0 6\n0000000000 65535 f \n');
    for (let id = 1; id <= 5; id += 1) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks, { type: 'application/pdf' });
  };

  window.downloadDaftariRecordPdf = ({ title, subtitle = '', sections = [], fileName = 'سجل' }) => {
    const width = 1588, height = 2246, scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height);
    context.strokeStyle = '#d7e4dc'; context.lineWidth = 3; context.strokeRect(42, 42, width - 84, height - 84);
    let y = 105;
    const draw = (value, x, font, color, maxWidth, lineHeight = 44) => {
      context.save(); context.font = font; context.fillStyle = color; context.direction = 'rtl'; context.textAlign = 'right'; context.textBaseline = 'top';
      const lines = textLines(context, value, maxWidth);
      lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
      context.restore(); y += lines.length * lineHeight;
    };
    draw(title, width - 100, 'bold 56px Arial, Tahoma, sans-serif', '#176b50', width - 200, 70);
    if (subtitle) { y += 15; draw(subtitle, width - 100, '30px Arial, Tahoma, sans-serif', '#718078', width - 200, 42); }
    y += 38;
    sections.forEach(section => {
      if (y > height - 250) return;
      context.fillStyle = '#edf7f1'; context.fillRect(92, y, width - 184, 56);
      context.save(); context.font = 'bold 31px Arial, Tahoma, sans-serif'; context.fillStyle = '#176b50'; context.direction = 'rtl'; context.textAlign = 'right'; context.textBaseline = 'middle'; context.fillText(section.title || '', width - 116, y + 29); context.restore();
      y += 82;
      (section.rows || []).forEach(row => {
        if (y > height - 150) return;
        context.fillStyle = '#f9fcfa'; context.fillRect(92, y, width - 184, 64);
        context.save(); context.font = '27px Arial, Tahoma, sans-serif'; context.fillStyle = '#60716a'; context.direction = 'rtl'; context.textAlign = 'right'; context.textBaseline = 'middle'; context.fillText(row.label || '', width - 116, y + 32); context.direction = 'ltr'; context.textAlign = 'left'; context.fillStyle = '#202c27'; context.font = 'bold 28px Arial, Tahoma, sans-serif'; context.fillText(row.value || '—', 120, y + 32); context.restore();
        y += 74;
      });
      y += 26;
    });
    context.save(); context.font = '24px Arial, Tahoma, sans-serif'; context.fillStyle = '#718078'; context.direction = 'rtl'; context.textAlign = 'center'; context.fillText(`تم الإنشاء من دفتري · ${new Date().toLocaleString('en-GB')}`, width / 2, height - 90); context.restore();
    const encoded = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    const binary = atob(encoded); const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const url = URL.createObjectURL(assemblePdf({ bytes, width: canvas.width, height: canvas.height }));
    const link = document.createElement('a'); link.href = url; link.download = `${escapeFileName(fileName)}.pdf`; link.hidden = true; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const localDate = value => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  };
  const localTime = value => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Every downloadable ledger uses the same period chooser.  It is a second
  // overlay so the current ledger stays open after the user downloads or cancels.
  window.openDaftariPdfPeriodChooser = ({ title = 'تنزيل السجل PDF', entries = [], getDate, getTime, onDownload }) => {
    const today = localDate();
    const layer = document.createElement('div');
    const panel = document.createElement('div');
    layer.className = 'overlay show pdf-period-overlay';
    layer.style.zIndex = '90';
    panel.className = 'modal pdf-period-modal';
    panel.innerHTML = `<div class="modal-head"><div><h3>${title}</h3><p class="muted">حدد الفترة والوقت قبل إنشاء ملف PDF.</p></div><button type="button" class="x" id="closePdfPeriod">×</button></div><form id="pdfPeriodForm"><label class="settings-check"><input name="allPeriod" type="checkbox"> كامل السجل دون تصفية</label><div class="grid2"><div class="field"><label>من تاريخ</label><input name="fromDate" type="date" lang="en" dir="ltr" required value="${today}"></div><div class="field"><label>إلى تاريخ</label><input name="toDate" type="date" lang="en" dir="ltr" required value="${today}"></div><div class="field"><label>من وقت (اختياري)</label><input name="fromTime" type="time" lang="en" dir="ltr"></div><div class="field"><label>إلى وقت (اختياري)</label><input name="toTime" type="time" lang="en" dir="ltr"></div></div><div class="form-actions"><button class="primary" type="submit">حفظ وتنزيل PDF</button><button class="soft-btn" type="button" id="cancelPdfPeriod">إلغاء</button></div></form>`;
    layer.append(panel);
    document.body.append(layer);
    const remove = () => layer.remove();
    panel.querySelector('#closePdfPeriod').onclick = remove;
    panel.querySelector('#cancelPdfPeriod').onclick = remove;
    layer.addEventListener('click', event => { if (event.target === layer) remove(); });
    const form = panel.querySelector('#pdfPeriodForm');
    const allPeriodInput = form.elements.allPeriod;
    const periodInputs = [form.elements.fromDate, form.elements.toDate, form.elements.fromTime, form.elements.toTime];
    allPeriodInput.addEventListener('change', () => periodInputs.forEach(input => { input.disabled = allPeriodInput.checked; }));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const allPeriod = values.get('allPeriod') === 'on';
      const fromDate = String(values.get('fromDate') || '');
      const toDate = String(values.get('toDate') || '');
      const fromTime = String(values.get('fromTime') || '00:00').slice(0, 5);
      const toTime = String(values.get('toTime') || '23:59').slice(0, 5);
      const start = `${fromDate}T${fromTime}`;
      const end = `${toDate}T${toTime}`;
      if (!allPeriod && (!fromDate || !toDate || start > end)) {
        toast('تحقق من التاريخ والوقت المحددين');
        return;
      }
      const selected = allPeriod ? [...entries] : entries.filter(entry => {
        const date = String(getDate?.(entry) || entry?.date || localDate(entry?.createdAt) || '');
        const time = String(getTime?.(entry) || entry?.time || localTime(entry?.createdAt) || '00:00').slice(0, 5);
        if (!date) return false;
        const stamp = `${date}T${time || '00:00'}`;
        return stamp >= start && stamp <= end;
      });
      const period = allPeriod
        ? { label: 'كامل السجل', fileSuffix: 'كامل-السجل' }
        : { label: `${fromDate}${values.get('fromTime') ? ` ${fromTime}` : ''} — ${toDate}${values.get('toTime') ? ` ${toTime}` : ''}`, fileSuffix: `${fromDate}-إلى-${toDate}` };
      remove();
      onDownload?.(selected, period);
    });
  };

  const openClientBase = openClient;
  openClient = clientId => {
    openClientBase(clientId);
    const client = db.clients.find(item => String(item.id) === String(clientId));
    const actions = document.querySelector('#modal .dialog-links');
    if (!client || !actions || actions.querySelector('[data-client-pdf]')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'soft-btn'; button.dataset.clientPdf = 'true'; button.textContent = '↓ تنزيل سجل العميل PDF';
    button.onclick = () => {
      const rows = [...(client.records || [])].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
      window.openDaftariPdfPeriodChooser({
        title: 'تنزيل سجل العميل PDF', entries: rows, getDate: record => record.date,
        onDownload: (selected, period) => {
          window.downloadDaftariRecordPdf({ title: 'سجل عمليات العميل', subtitle: `${client.name}${client.phone ? ` · ${client.phone}` : ''} · ${period.label}`, fileName: `سجل-${client.name}-${period.fileSuffix}`, sections: [{ title: 'العمليات', rows: selected.length ? selected.map(record => ({ label: `${record.type === 'payment' ? 'تسديد' : 'إضافة دين'} · ${niceDate(record.date) || '—'}${record.note ? ` · ${record.note}` : ''}`, value: `${record.type === 'payment' ? '−' : '+'} ${fmt(record.amount)} ${record.currency || ''}` })) : [{ label: 'العمليات', value: 'لا توجد عمليات في الفترة المحددة' }] }] });
          toast('تم تنزيل سجل العميل بصيغة PDF');
        }
      });
    };
    actions.append(button);
  };
})();
