import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');
const INDEX_FILE = path.join(DATA_DIR, 'documents.json');
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 15 * 1024 * 1024;
const PORT = Number(process.env.PORT || 8765);
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};
const allowedOrigins = new Set([
  `http://127.0.0.1:${PORT}`,
  `http://localhost:${PORT}`
]);
let metadataQueue = Promise.resolve();

await mkdir(DATA_DIR, { recursive: true });
await mkdir(UPLOADS_DIR, { recursive: true });

function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(value));
}

function fail(res, status, message) {
  json(res, status, { error: message });
}

async function readDocuments() {
  try {
    const text = await readFile(INDEX_FILE, 'utf8');
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function addDocument(document) {
  metadataQueue = metadataQueue.catch(() => {}).then(async () => {
    const documents = await readDocuments();
    documents.push(document);
    const tempFile = `${INDEX_FILE}.${randomUUID()}.tmp`;
    await writeFile(tempFile, JSON.stringify(documents, null, 2), 'utf8');
    await rename(tempFile, INDEX_FILE);
  });
  return metadataQueue;
}

async function readJsonBody(req) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    const error = new Error('يجب إرسال البيانات بصيغة JSON.');
    error.status = 415;
    throw error;
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_REQUEST_BYTES) {
      const error = new Error('حجم الطلب أكبر من المسموح.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('بيانات الطلب غير صالحة.');
    error.status = 400;
    throw error;
  }
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function cleanFileName(value) {
  if (typeof value !== 'string') return '';
  return value.replaceAll('\\', '/').split('/').pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 120);
}

function validId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateOrigin(req, res) {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    fail(res, 403, 'مصدر الطلب غير مسموح. افتح التطبيق من عنوان الخادم المحلي.');
    return false;
  }
  const host = String(req.headers.host || '').toLowerCase();
  if (!allowedOrigins.has(`http://${host}`)) {
    fail(res, 403, 'يقبل الخادم الاتصالات المحلية فقط.');
    return false;
  }
  return true;
}

async function createDocument(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    fail(res, error.status || 400, error.message);
    return;
  }

  const clientId = typeof body.clientId === 'string' ? body.clientId.slice(0, 100) : '';
  const clientName = typeof body.clientName === 'string' ? body.clientName.trim().slice(0, 80) : '';
  const date = body.date;
  const fileName = cleanFileName(body.fileName);
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.toLowerCase() : '';
  const encoded = body.data;

  if (!clientId || !clientName) return fail(res, 400, 'اختر عميلًا صالحًا قبل رفع الملف.');
  if (!isDate(date)) return fail(res, 400, 'التاريخ غير صالح.');
  if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) return fail(res, 400, 'يجب اختيار ملف PDF.');
  if (mimeType && !['application/pdf', 'application/octet-stream'].includes(mimeType)) {
    return fail(res, 400, 'نوع الملف ليس PDF.');
  }
  if (typeof encoded !== 'string' || encoded.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 8
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    return fail(res, 400, 'بيانات ملف PDF غير صالحة.');
  }

  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > MAX_FILE_BYTES || bytes.toString('base64') !== encoded) {
    return fail(res, 413, 'حجم الملف غير صالح أو يتجاوز 10 ميجابايت.');
  }
  if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
    return fail(res, 400, 'محتوى الملف لا يطابق ملف PDF صالحًا.');
  }

  const id = randomUUID();
  const savedFile = path.join(UPLOADS_DIR, `${id}.pdf`);
  const document = {
    id,
    clientId,
    clientName,
    date,
    fileName,
    size: bytes.length,
    createdAt: new Date().toISOString()
  };

  try {
    await writeFile(savedFile, bytes, { flag: 'wx' });
    await addDocument(document);
    json(res, 201, document);
  } catch (error) {
    await rm(savedFile, { force: true }).catch(() => {});
    console.error('تعذر حفظ المستند:', error);
    fail(res, 500, 'تعذر حفظ المستند على الجهاز.');
  }
}

async function handleApi(req, res, url) {
  if (!validateOrigin(req, res)) return;
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/documents') {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) return fail(res, 400, 'معرّف العميل مطلوب.');
    try {
      const documents = await readDocuments();
      const matching = documents
        .filter(item => item.clientId === clientId)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
      return json(res, 200, matching);
    } catch (error) {
      console.error('تعذر قراءة سجل المستندات:', error);
      return fail(res, 500, 'تعذر قراءة سجل المستندات.');
    }
  }

  if (req.method === 'POST' && pathname === '/api/documents') {
    return createDocument(req, res);
  }

  const fileMatch = pathname.match(/^\/api\/documents\/([0-9a-f-]{36})\/file$/i);
  if (req.method === 'GET' && fileMatch && validId(fileMatch[1])) {
    try {
      const documents = await readDocuments();
      const document = documents.find(item => item.id === fileMatch[1]);
      if (!document) return fail(res, 404, 'المستند غير موجود.');
      const file = path.join(UPLOADS_DIR, `${document.id}.pdf`);
      const fileInfo = await stat(file).catch(() => null);
      if (!fileInfo?.isFile()) return fail(res, 404, 'ملف المستند غير موجود.');
      const asciiName = document.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': fileInfo.size,
        'Content-Disposition': `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store'
      });
      createReadStream(file).pipe(res);
      return;
    } catch (error) {
      console.error('تعذر فتح المستند:', error);
      return fail(res, 500, 'تعذر فتح المستند.');
    }
  }

  return fail(res, 404, 'المسار غير موجود.');
}

const server = createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${PORT}`}`);
  } catch {
    return fail(res, 400, 'عنوان الطلب غير صالح.');
  }

  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'طريقة الطلب غير مدعومة.');

  let decodedPath;
  try { decodedPath = decodeURIComponent(url.pathname); } catch { return fail(res, 400, 'مسار الملف غير صالح.'); }
  const relative = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const target = path.resolve(PROJECT_ROOT, relative);
  const rootPrefix = `${PROJECT_ROOT}${path.sep}`;
  if (target !== PROJECT_ROOT && !target.startsWith(rootPrefix)) return fail(res, 403, 'المسار غير مسموح.');
  if (target === DATA_DIR || target.startsWith(`${DATA_DIR}${path.sep}`)
      || target === UPLOADS_DIR || target.startsWith(`${UPLOADS_DIR}${path.sep}`)) {
    return fail(res, 404, 'الملف غير موجود.');
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) return fail(res, 404, 'الملف غير موجود.');
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store'
    });
    if (req.method === 'HEAD') return res.end();
    createReadStream(target).pipe(res);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return fail(res, 404, 'الملف غير موجود.');
    console.error('تعذر تقديم الملف:', error);
    return fail(res, 500, 'تعذر فتح الصفحة.');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`الخادم المحلي جاهز: http://127.0.0.1:${PORT}`);
  console.log('أوقف الخادم بالضغط على Ctrl+C.');
});
