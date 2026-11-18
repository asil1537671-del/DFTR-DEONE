import os
import re
import json
from copy import deepcopy
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from threading import Lock
from uuid import uuid4
from urllib.parse import urlsplit

import bcrypt
import jwt
from dotenv import load_dotenv
from email_validator import validate_email, EmailNotValidError
from fastapi import FastAPI, Depends, HTTPException, Request, Response, Body
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

if __package__:
    from .models import Base, User, UserControl, AuditEvent, Client, Record, Withdrawal, Settings, LiquiditySettings, LiquidityMonth, LegacyArchive, serialize, camel
    from .logic import DEFAULTS, calculate, automatic_commission, exchange_rate, aggregate, statement, number, rounded, custom_pricing_enabled
    from .database import initialize_database, make_engine
else:
    from models import Base, User, UserControl, AuditEvent, Client, Record, Withdrawal, Settings, LiquiditySettings, LiquidityMonth, LegacyArchive, serialize, camel
    from logic import DEFAULTS, calculate, automatic_commission, exchange_rate, aggregate, statement, number, rounded, custom_pricing_enabled
    from database import initialize_database, make_engine

MODULE_ROOT = Path(__file__).resolve().parent
ROOT = MODULE_ROOT.parent if (MODULE_ROOT.parent / 'frontend').is_dir() else MODULE_ROOT
load_dotenv(ROOT / '.env')
COLLECTIONS = {'clients': Client, 'records': Record, 'withdrawals': Withdrawal, 'liquidity': LiquidityMonth, 'liquidity-settings': LiquiditySettings}
FEATURE_LABELS = {
    'clients': 'العملاء',
    'transactions': 'الديون والتسديدات',
    'withdrawals': 'السحوبات',
    'liquidity': 'السيولة',
    'reports': 'التقارير والكشوف',
    'settings': 'الإعدادات',
    'backup': 'النسخ والاستيراد',
}
COLLECTION_FEATURES = {'clients': 'clients', 'records': 'transactions', 'withdrawals': 'withdrawals', 'liquidity': 'liquidity', 'liquidity-settings': 'liquidity'}


def create_app(database_url=None, secret=None):
    engine = make_engine(database_url)
    initialization_lock = Lock()
    initialized = False

    def ensure_database():
        nonlocal initialized
        with initialization_lock:
            if not initialized:
                initialize_database(engine)
                initialized = True
    secret = secret or os.environ.get('JWT_SECRET')
    if not secret or len(secret) < 32:
        raise RuntimeError('JWT_SECRET must contain at least 32 characters')

    @asynccontextmanager
    async def lifespan(app):
        ensure_database()
        yield

    app = FastAPI(title='دفتري', lifespan=lifespan)
    app.state.engine = engine

    @app.middleware('http')
    async def safeguards(request, call_next):
        if request.url.path.startswith('/api/') and request.method not in ('GET', 'HEAD', 'OPTIONS'):
            origin = request.headers.get('origin')
            if origin and urlsplit(origin).netloc != request.headers.get('host'):
                return JSONResponse({'detail': 'الطلب غير مسموح'}, status_code=403)
        response = await call_next(request)
        if request.url.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        return response

    @app.exception_handler(ValueError)
    async def invalid(request, exc):
        return JSONResponse({'detail': str(exc)}, status_code=422)

    def db():
        ensure_database()
        with Session(engine) as session:
            yield session

    def configured_admin_emails():
        return {value.strip().lower() for value in os.getenv('ADMIN_EMAILS', '').split(',') if value.strip()}

    def control_for(session, user):
        return session.get(UserControl, user.id)

    def is_admin(user):
        return bool(user and user.email.lower() in configured_admin_emails())

    def user_payload(user, session):
        control = control_for(session, user)
        disabled = set(control.disabled_features or []) if control else set()
        payload = serialize(user)
        payload.update({
            'isAdmin': is_admin(user),
            'suspended': bool(control.suspended) if control else False,
            'lastLoginAt': control.last_login_at.isoformat() if control and control.last_login_at else None,
            'lastSeenAt': control.last_seen_at.isoformat() if control and control.last_seen_at else None,
            'featureFlags': {name: name not in disabled for name in FEATURE_LABELS},
        })
        return payload

    def write_audit(session, event_type, actor=None, target=None, entity_type='', entity_id='', details=None):
        session.add(AuditEvent(
            actor_user_id=actor.id if actor else None,
            target_user_id=target.id if target else None,
            actor_email=actor.email if actor else '',
            actor_name=actor.display_name if actor else '',
            target_email=target.email if target else '',
            target_name=target.display_name if target else '',
            event_type=event_type,
            entity_type=entity_type,
            entity_id=str(entity_id or ''),
            details=details or {},
        ))

    def require_admin(user):
        if not is_admin(user):
            raise HTTPException(403, 'هذه الصفحة مخصّصة لمالك التطبيق')

    def require_feature(session, user, feature):
        control = control_for(session, user)
        if control and feature in (control.disabled_features or []):
            raise HTTPException(403, 'هذه الخاصية غير مفعّلة لهذا الحساب')

    def require_all_data_features(session, user):
        for feature in ('clients', 'transactions', 'withdrawals', 'liquidity'):
            require_feature(session, user, feature)

    def require_report_data_features(session, user):
        for feature in ('clients', 'transactions'):
            require_feature(session, user, feature)

    def event_payload(event):
        return {
            'id': event.id,
            'actorEmail': event.actor_email,
            'actorName': event.actor_name,
            'targetEmail': event.target_email,
            'targetName': event.target_name,
            'eventType': event.event_type,
            'entityType': event.entity_type,
            'entityId': event.entity_id,
            'details': event.details or {},
            'createdAt': event.created_at.isoformat(),
        }

    def entity_snapshot(row):
        if isinstance(row, Client):
            return {'name': row.name, 'phone': row.phone, 'currency': row.currency}
        if isinstance(row, Record):
            return {'clientId': row.client_id, 'type': row.type, 'date': row.date, 'time': row.time, 'amount': row.amount, 'currency': row.currency, 'netAmount': row.net_amount, 'voided': row.voided}
        if isinstance(row, Withdrawal):
            return {'type': 'withdrawal', 'date': row.date, 'time': row.time, 'amount': row.total, 'currency': row.currency, 'voided': row.voided}
        if isinstance(row, LiquidityMonth):
            return {'month': row.month, 'entryCount': len(row.entries or [])}
        if isinstance(row, LiquiditySettings):
            return {'currencyCount': len(row.currencies or [])}
        return {}

    def current(request: Request, session: Session = Depends(db)):
        authorization = request.headers.get('authorization', '')
        token = authorization[7:] if authorization.lower().startswith('bearer ') else request.cookies.get('daftari_session')
        try:
            payload = jwt.decode(token or '', secret, algorithms=['HS256'], options={'require': ['exp', 'sub']})
            user = session.get(User, payload['sub'])
        except jwt.PyJWTError:
            user = None
        if not user:
            raise HTTPException(401, 'يرجى تسجيل الدخول')
        control = control_for(session, user)
        if control and control.suspended:
            raise HTTPException(423, 'تم إيقاف هذا الحساب من قبل إدارة التطبيق')
        now = datetime.now(timezone.utc)
        if not control:
            control = UserControl(user_id=user.id)
            session.add(control)
        last_seen = control.last_seen_at
        if last_seen and last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)
        if not last_seen or (now - last_seen).total_seconds() >= 300:
            control.last_seen_at = now
            session.commit()
        return user

    def login_cookie(response, user, request):
        token = jwt.encode({'sub': user.id, 'iat': datetime.now(timezone.utc), 'exp': datetime.now(timezone.utc) + timedelta(days=7)}, secret, algorithm='HS256')
        response.set_cookie('daftari_session', token, httponly=True, samesite='lax', secure=request.url.scheme == 'https' or os.getenv('COOKIE_SECURE', 'false').lower() == 'true', max_age=604800, path='/')

    def config(session, user):
        row = session.get(Settings, (user.id, 'main'))
        if not row:
            row = Settings(user_id=user.id, id='main', **mapped(Settings, deepcopy(DEFAULTS)))
            session.add(row)
            session.commit()
        return row

    def owned(session, model, user, row_id):
        row = session.get(model, (user.id, row_id))
        if not row:
            raise HTTPException(404, 'العنصر غير موجود')
        return row

    def rows(session, model, user):
        return [serialize(row) for row in session.scalars(select(model).where(model.user_id == user.id))]

    @app.get('/api/auth/config')
    def auth_config():
        return {'googleClientId': os.getenv('GOOGLE_CLIENT_ID', '')}

    @app.post('/api/auth/signup')
    def signup(request: Request, response: Response, body: dict = Body(...), session: Session = Depends(db)):
        email, password = credentials(body)
        if len(password) < 6:
            raise HTTPException(422, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
        user = User(email=email, password_hash=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(), display_name=str(body.get('displayName') or email.split('@')[0])[:200])
        session.add(user)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            raise HTTPException(409, 'البريد الإلكتروني مستخدم بالفعل')
        config(session, user)
        control = control_for(session, user) or UserControl(user_id=user.id)
        control.last_login_at = datetime.now(timezone.utc)
        control.last_seen_at = control.last_login_at
        session.add(control)
        write_audit(session, 'account.signup', user, user, 'account', user.id)
        write_audit(session, 'account.login', user, user, 'account', user.id)
        session.commit()
        login_cookie(response, user, request)
        return user_payload(user, session)

    @app.post('/api/auth/login')
    def login(request: Request, response: Response, body: dict = Body(...), session: Session = Depends(db)):
        email, password = credentials(body)
        user = session.scalar(select(User).where(User.email == email))
        if not user or not user.password_hash or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
            raise HTTPException(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
        control = control_for(session, user)
        if control and control.suspended:
            raise HTTPException(423, 'تم إيقاف هذا الحساب من قبل إدارة التطبيق')
        control = control or UserControl(user_id=user.id)
        control.last_login_at = datetime.now(timezone.utc)
        control.last_seen_at = control.last_login_at
        session.add(control)
        write_audit(session, 'account.login', user, user, 'account', user.id)
        session.commit()
        login_cookie(response, user, request)
        return user_payload(user, session)

    @app.post('/api/auth/google')
    def google(request: Request, response: Response, body: dict = Body(...), session: Session = Depends(db)):
        audience = os.getenv('GOOGLE_CLIENT_ID')
        if not audience:
            raise HTTPException(400, 'تسجيل الدخول عبر Google غير مفعّل')
        from google.oauth2 import id_token
        from google.auth.transport.requests import Request as GoogleRequest
        try:
            info = id_token.verify_oauth2_token(str(body.get('credential', '')), GoogleRequest(), audience)
            if not info.get('email_verified') or not info.get('sub'):
                raise ValueError()
        except (ValueError, Exception) as exc:
            raise HTTPException(401, 'تعذّر التحقق من حساب Google') from exc
        email = info['email'].lower()
        user = session.scalar(select(User).where(User.google_sub == info['sub']))
        if not user:
            user = session.scalar(select(User).where(User.email == email))
            if user and user.google_sub and user.google_sub != info['sub']:
                raise HTTPException(409, 'الحساب مرتبط بمعرّف آخر')
            if not user:
                user = User(email=email, display_name=info.get('name', email.split('@')[0])[:200])
                session.add(user)
            user.google_sub = info['sub']
            session.commit()
        control = control_for(session, user)
        if control and control.suspended:
            raise HTTPException(423, 'تم إيقاف هذا الحساب من قبل إدارة التطبيق')
        control = control or UserControl(user_id=user.id)
        control.last_login_at = datetime.now(timezone.utc)
        control.last_seen_at = control.last_login_at
        session.add(control)
        write_audit(session, 'account.login_google', user, user, 'account', user.id)
        session.commit()
        config(session, user)
        login_cookie(response, user, request)
        return user_payload(user, session)

    @app.post('/api/auth/reset')
    def reset(body: dict = Body(...)):
        return {'ok': True, 'message': 'إذا كان البريد مسجّلًا فستصلك رسالة لاستعادة كلمة المرور.'}

    @app.post('/api/auth/logout')
    def logout(request: Request, response: Response, session: Session = Depends(db)):
        authorization = request.headers.get('authorization', '')
        token = authorization[7:] if authorization.lower().startswith('bearer ') else request.cookies.get('daftari_session')
        try:
            payload = jwt.decode(token or '', secret, algorithms=['HS256'], options={'require': ['exp', 'sub']})
            user = session.get(User, payload['sub'])
            if user:
                write_audit(session, 'account.logout', user, user, 'account', user.id)
                session.commit()
        except jwt.PyJWTError:
            pass
        response.delete_cookie('daftari_session', path='/')
        return {'ok': True}

    @app.get('/api/auth/me')
    def me(user=Depends(current), session: Session = Depends(db)):
        return user_payload(user, session)

    @app.get('/api/admin/users')
    def admin_users(q: str = '', offset: int = 0, limit: int = 100, admin=Depends(current), session: Session = Depends(db)):
        require_admin(admin)
        search = q.strip().lower()
        filters = [or_(func.lower(User.email).contains(search, autoescape=True), func.lower(User.display_name).contains(search, autoescape=True))] if search else []
        offset, limit = max(0, offset), min(100, max(1, limit))
        total = session.scalar(select(func.count()).select_from(User).where(*filters)) or 0
        suspended_count = session.scalar(
            select(func.count()).select_from(User).join(UserControl, UserControl.user_id == User.id)
            .where(*filters).where(UserControl.suspended.is_(True))
        ) or 0
        users = session.scalars(select(User).where(*filters).order_by(User.created_at.desc()).offset(offset).limit(limit)).all()
        ids = [account.id for account in users]
        if ids:
            client_counts = dict(session.execute(select(Client.user_id, func.count()).where(Client.user_id.in_(ids)).group_by(Client.user_id)).all())
            record_counts = dict(session.execute(select(Record.user_id, func.count()).where(Record.user_id.in_(ids)).group_by(Record.user_id)).all())
            withdrawal_counts = dict(session.execute(select(Withdrawal.user_id, func.count()).where(Withdrawal.user_id.in_(ids)).group_by(Withdrawal.user_id)).all())
            liquidity_counts = dict(session.execute(select(LiquidityMonth.user_id, func.count()).where(LiquidityMonth.user_id.in_(ids)).group_by(LiquidityMonth.user_id)).all())
        else:
            client_counts, record_counts, withdrawal_counts, liquidity_counts = {}, {}, {}, {}
        result = []
        for account in users:
            item = user_payload(account, session)
            item.update({
                'clientCount': client_counts.get(account.id, 0),
                'recordCount': record_counts.get(account.id, 0),
                'withdrawalCount': withdrawal_counts.get(account.id, 0),
                'liquidityCount': liquidity_counts.get(account.id, 0),
            })
            result.append(item)
        return {'items': result, 'total': total, 'activeCount': total - suspended_count, 'suspendedCount': suspended_count, 'offset': offset, 'limit': limit}

    def admin_account(user_id, admin, session):
        require_admin(admin)
        account = session.get(User, user_id)
        if not account:
            raise HTTPException(404, 'الحساب غير موجود')
        return account

    def ensure_manageable(account, admin):
        if account.id == admin.id or is_admin(account):
            raise HTTPException(409, 'لا يمكن تعليق حساب المالك أو تعديل صلاحياته من هذه الشاشة')

    @app.get('/api/admin/users/{user_id}')
    def admin_user_detail(user_id: str, admin=Depends(current), session: Session = Depends(db)):
        account = admin_account(user_id, admin, session)
        write_audit(session, 'admin.user_view', admin, account, 'account', account.id)
        session.commit()
        clients = session.scalars(select(Client).where(Client.user_id == account.id).order_by(Client.name)).all()
        records_count = session.scalar(select(func.count()).select_from(Record).where(Record.user_id == account.id)) or 0
        withdrawals_count = session.scalar(select(func.count()).select_from(Withdrawal).where(Withdrawal.user_id == account.id)) or 0
        liquidity_count = session.scalar(select(func.count()).select_from(LiquidityMonth).where(LiquidityMonth.user_id == account.id)) or 0
        events = session.scalars(
            select(AuditEvent).where(AuditEvent.target_user_id == account.id)
            .order_by(AuditEvent.created_at.desc()).limit(100)
        ).all()
        return {
            'user': user_payload(account, session),
            'clients': [serialize(row) for row in clients],
            'recordsCount': records_count,
            'withdrawalsCount': withdrawals_count,
            'liquidityCount': liquidity_count,
            'events': [event_payload(event) for event in events],
        }

    @app.get('/api/admin/users/{user_id}/ledger')
    def admin_user_ledger(user_id: str, kind: str = 'records', offset: int = 0, limit: int = 50, admin=Depends(current), session: Session = Depends(db)):
        account = admin_account(user_id, admin, session)
        if kind not in ('records', 'withdrawals', 'liquidity'):
            raise HTTPException(422, 'نوع السجل غير صالح')
        offset, limit = max(0, offset), min(100, max(1, limit))
        model = Record if kind == 'records' else Withdrawal if kind == 'withdrawals' else LiquidityMonth
        total = session.scalar(select(func.count()).select_from(model).where(model.user_id == account.id)) or 0
        query = select(model).where(model.user_id == account.id)
        if kind == 'liquidity':
            query = query.order_by(model.month.desc(), model.created_at.desc())
        else:
            query = query.order_by(model.date.desc(), model.time.desc(), model.created_at.desc())
        rows_page = session.scalars(query.offset(offset).limit(limit)).all()
        items = [serialize(row) for row in rows_page]
        if kind == 'records' and items:
            client_ids = {row['clientId'] for row in items}
            client_names = dict(session.execute(
                select(Client.id, Client.name).where(Client.user_id == account.id, Client.id.in_(client_ids))
            ).all())
            for item in items:
                item['clientName'] = client_names.get(item['clientId'], 'عميل محذوف')
        return {'items': items, 'total': total, 'offset': offset, 'limit': limit}

    @app.put('/api/admin/users/{user_id}/status')
    def admin_user_status(user_id: str, body: dict = Body(...), admin=Depends(current), session: Session = Depends(db)):
        account = admin_account(user_id, admin, session)
        ensure_manageable(account, admin)
        suspended = body.get('suspended')
        if not isinstance(suspended, bool):
            raise HTTPException(422, 'حالة الحساب غير صالحة')
        control = control_for(session, account) or UserControl(user_id=account.id)
        previous = bool(control.suspended)
        control.suspended = suspended
        session.add(control)
        write_audit(session, 'account.suspended' if suspended else 'account.reactivated', admin, account, 'account', account.id, {'previous': previous, 'suspended': suspended})
        session.commit()
        return user_payload(account, session)

    @app.put('/api/admin/users/{user_id}/features')
    def admin_user_features(user_id: str, body: dict = Body(...), admin=Depends(current), session: Session = Depends(db)):
        account = admin_account(user_id, admin, session)
        ensure_manageable(account, admin)
        flags = body.get('featureFlags')
        if not isinstance(flags, dict) or set(flags) != set(FEATURE_LABELS) or any(not isinstance(value, bool) for value in flags.values()):
            raise HTTPException(422, 'قائمة الخصائص غير صالحة')
        control = control_for(session, account) or UserControl(user_id=account.id)
        before = {feature: feature not in (control.disabled_features or []) for feature in FEATURE_LABELS}
        control.disabled_features = sorted(feature for feature, enabled in flags.items() if not enabled)
        session.add(control)
        write_audit(session, 'account.features_changed', admin, account, 'account', account.id, {'before': before, 'after': flags})
        session.commit()
        return user_payload(account, session)

    @app.delete('/api/auth/account')
    def delete_account(response: Response, body: dict = Body(...), user=Depends(current), session: Session = Depends(db)):
        if body.get('confirm') != 'حذف':
            raise HTTPException(422, 'اكتب حذف للتأكيد')
        write_audit(session, 'account.deleted', user, user, 'account', user.id)
        session.delete(user)
        session.commit()
        response.delete_cookie('daftari_session', path='/')
        return {'ok': True}

    @app.get('/api/settings')
    def get_settings(user=Depends(current), session: Session = Depends(db)):
        return serialize(config(session, user))

    @app.put('/api/settings')
    def put_settings(body: dict = Body(...), user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'settings')
        row = config(session, user)
        clean = validate_settings(body)
        for key, value in mapped(Settings, clean).items():
            setattr(row, key, value)
        session.commit()
        return serialize(row)

    def prepare(collection, body, session, user):
        if collection == 'liquidity-settings':
            return validate_liquidity_settings(body)
        if collection == 'liquidity':
            return validate_liquidity_month(body)
        settings = serialize(config(session, user))
        codes = [c['code'] for c in settings['currencies']]
        currency = str(body.get('currency', 'USD')).upper()
        if currency not in codes:
            raise ValueError('العملة غير موجودة في إعدادات الدفتر')
        if collection == 'clients':
            name = str(body.get('name', '')).strip()
            if not name or len(name) > 200:
                raise ValueError('أدخل اسم العميل')
            rates = numeric_tree(body.get('rates', {}))
            commissions = numeric_tree(body.get('commissions', {}))
            pricing = {'rates': rates, 'commissions': commissions}
            if body.get('customPricingEnabled') is not None:
                pricing['customPricingEnabled'] = body.get('customPricingEnabled')
            rates['_customEnabled'] = int(custom_pricing_enabled(pricing))
            return {'name': name, 'phone': str(body.get('phone', ''))[:50], 'note': str(body.get('note', ''))[:5000], 'currency': currency, 'archived': bool(body.get('archived', False)), 'rates': rates, 'commissions': commissions}
        day = str(body.get('date', date.today().isoformat()))
        date.fromisoformat(day)
        clock = str(body.get('time') or datetime.now().strftime('%H:%M'))
        if not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d', clock):
            raise ValueError('الوقت غير صالح')
        common = {'currency': currency, 'date': day, 'time': clock, 'note': str(body.get('note', ''))[:5000], 'createdName': str(body.get('createdName', user.display_name))[:200], 'voided': bool(body.get('voided', False))}
        if collection == 'withdrawals':
            amounts = [number(v) for v in body.get('amounts', []) if number(v) > 0]
            if not amounts or len(amounts) > 1000:
                raise ValueError('أدخل مبلغًا واحدًا على الأقل')
            return {**common, 'amounts': amounts, 'count': len(amounts), 'total': rounded(sum(amounts))}
        client_id = str(body.get('clientId', ''))
        client = serialize(owned(session, Client, user, client_id))
        kind = body.get('type', 'debt')
        if kind not in ['debt', 'payment']:
            raise ValueError('نوع العملية غير صالح')
        rate = number(body.get('exchangeRate'), exchange_rate(settings, client, kind, currency))
        if rate <= 0:
            raise ValueError('سعر الصرف يجب أن يكون أكبر من صفر')
        commission_type = body.get('commissionType', 'auto')
        commission = automatic_commission(settings, client, kind, currency, body.get('amount'), rate) if commission_type == 'auto' else {'commissionType': commission_type, 'commissionValue': body.get('commissionValue', 0)}
        return {**common, 'clientId': client_id, 'type': kind, **calculate(kind, body.get('amount'), currency, rate, commission['commissionType'], commission['commissionValue'])}

    def model_for(collection):
        if collection not in COLLECTIONS:
            raise HTTPException(404)
        return COLLECTIONS[collection]

    @app.get('/api/aggregates')
    def aggregates(user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'reports')
        require_feature(session, user, 'transactions')
        return aggregate(rows(session, Record, user))

    @app.get('/api/clients/{client_id}/statement')
    def get_statement(client_id: str, start: str = '', end: str = '', currency: str = 'ALL', user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'reports')
        require_feature(session, user, 'clients')
        require_feature(session, user, 'transactions')
        client = owned(session, Client, user, client_id)
        records = [r for r in rows(session, Record, user) if r['clientId'] == client_id]
        return {'client': serialize(client), **statement(records, start, end, currency)}

    @app.get('/api/backup')
    def backup(user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'backup')
        require_all_data_features(session, user)
        return {'version': 1, 'exportedAt': datetime.now(timezone.utc).isoformat(), 'settings': serialize(config(session, user)), **{coll: rows(session, model, user) for coll, model in COLLECTIONS.items()}}

    @app.post('/api/legacy-archives')
    def save_legacy_archive(body: dict = Body(...), user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'backup')
        data = body.get('data')
        if not isinstance(data, dict):
            raise ValueError('ملف الأرشيف غير صالح')
        size = len(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
        if size > 4 * 1024 * 1024:
            raise ValueError('ملف النسخة القديمة أكبر من حد الرفع؛ قسّم الملف أو احذف المرفقات المحلية ثم أعد التصدير')
        row = LegacyArchive(user_id=user.id, label=str(body.get('label') or 'نسخة التطبيق السابق')[:160], data=data)
        session.add(row)
        session.commit()
        return {'id': row.id, 'label': row.label, 'createdAt': row.created_at.isoformat()}

    @app.get('/api/legacy-archives')
    def list_legacy_archives(user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'backup')
        archives = session.scalars(select(LegacyArchive).where(LegacyArchive.user_id == user.id).order_by(LegacyArchive.created_at.desc())).all()
        return [{'id': row.id, 'label': row.label, 'createdAt': row.created_at.isoformat()} for row in archives]

    @app.get('/api/legacy-archives/{archive_id}')
    def get_legacy_archive(archive_id: str, user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'backup')
        row = session.get(LegacyArchive, (user.id, archive_id))
        if not row:
            raise HTTPException(404, 'الأرشيف غير موجود')
        return {'id': row.id, 'label': row.label, 'createdAt': row.created_at.isoformat(), 'data': row.data}

    @app.post('/api/restore')
    def restore(body: dict = Body(...), user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'backup')
        require_all_data_features(session, user)
        if body.get('version') != 1 or any(not isinstance(body.get(k, []), list) for k in COLLECTIONS):
            raise ValueError('ملف النسخة الاحتياطية غير صالح')
        if sum(len(body.get(k, [])) for k in COLLECTIONS) > 50000:
            raise ValueError('الملف كبير جدًا')
        counts = {key: 0 for key in COLLECTIONS}
        try:
            if body.get('replaceSettings') and body.get('settings'):
                row = session.get(Settings, (user.id, 'main'))
                clean_settings = mapped(Settings, validate_settings(body['settings']))
                if row:
                    for key, value in clean_settings.items():
                        setattr(row, key, value)
                else:
                    session.add(Settings(user_id=user.id, id='main', **clean_settings))
                session.flush()

            # Fetch existing IDs in batches instead of issuing a SELECT and
            # flush for every imported row. Large restores otherwise exceed
            # the browser's request timeout on serverless deployments.
            pending = {}
            for coll, model in COLLECTIONS.items():
                unique_items = []
                seen_ids = set()
                for item in body.get(coll, []):
                    if not isinstance(item, dict):
                        raise ValueError('صف في النسخة الاحتياطية غير صالح')
                    row_id = valid_id(item.get('id'))
                    if row_id in seen_ids:
                        continue
                    seen_ids.add(row_id)
                    unique_items.append((row_id, item))

                existing_ids = set()
                for offset in range(0, len(unique_items), 500):
                    batch_ids = [row_id for row_id, _ in unique_items[offset:offset + 500]]
                    existing_ids.update(session.scalars(
                        select(model.id).where(
                            model.user_id == user.id,
                            model.id.in_(batch_ids),
                        )
                    ).all())
                pending[coll] = [
                    (row_id, item) for row_id, item in unique_items
                    if row_id not in existing_ids
                ]

            client_rows = []
            for row_id, item in pending['clients']:
                clean = prepare('clients', item, session, user)
                client_rows.append(Client(user_id=user.id, id=row_id, **mapped(Client, clean)))
            session.add_all(client_rows)
            counts['clients'] = len(client_rows)
            session.flush()

            # Load referenced clients once so prepare() can validate records
            # from the session identity map instead of querying per record.
            record_client_ids = list(dict.fromkeys(
                str(item.get('clientId', '')) for _, item in pending['records']
            ))
            for offset in range(0, len(record_client_ids), 500):
                session.scalars(select(Client).where(
                    Client.user_id == user.id,
                    Client.id.in_(record_client_ids[offset:offset + 500]),
                )).all()

            for coll in ('records', 'withdrawals', 'liquidity-settings', 'liquidity'):
                model = COLLECTIONS[coll]
                rows_to_add = []
                for row_id, item in pending[coll]:
                    clean = prepare(coll, item, session, user)
                    rows_to_add.append(model(user_id=user.id, id=row_id, **mapped(model, clean)))
                session.add_all(rows_to_add)
                counts[coll] = len(rows_to_add)
            if not body.get('replaceSettings') and not session.get(Settings, (user.id, 'main')) and body.get('settings'):
                session.add(Settings(user_id=user.id, id='main', **mapped(Settings, validate_settings(body['settings']))))
            write_audit(session, 'data.restored', user, user, 'backup', '', counts)
            session.commit()
        except Exception:
            session.rollback()
            raise
        return {'ok': True, **counts}

    @app.get('/api/reports/pdf')
    def report_pdf(user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'reports')
        require_report_data_features(session, user)
        from .pdf import report
        content = report(serialize(config(session, user)), rows(session, Client, user), aggregate(rows(session, Record, user)))
        return Response(content, media_type='application/pdf', headers={'Content-Disposition': 'attachment; filename="daftari-report.pdf"'})

    @app.get('/api/clients/{client_id}/statement/pdf')
    def statement_pdf(client_id: str, start: str = '', end: str = '', currency: str = 'ALL', user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'reports')
        require_feature(session, user, 'clients')
        require_feature(session, user, 'transactions')
        from .pdf import client_statement
        client = serialize(owned(session, Client, user, client_id))
        data = statement([r for r in rows(session, Record, user) if r['clientId'] == client_id], start, end, currency)
        content = client_statement(serialize(config(session, user)), client, data, start, end, currency)
        return Response(content, media_type='application/pdf', headers={'Content-Disposition': 'attachment; filename="statement.pdf"'})

    @app.get('/api/liquidity/{month}/pdf')
    def liquidity_pdf(month: str, user=Depends(current), session: Session = Depends(db)):
        require_feature(session, user, 'liquidity')
        monthly = bool(re.fullmatch(r'\d{4}-(?:0[1-9]|1[0-2])', month))
        daily = bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', month))
        if daily:
            try:
                date.fromisoformat(month)
            except ValueError:
                daily = False
        if not monthly and not daily:
            raise HTTPException(422, 'اختر يومًا أو شهرًا صالحًا')
        from .pdf import liquidity_report
        record = serialize(owned(session, LiquidityMonth, user, month))
        content = liquidity_report(serialize(config(session, user)), record)
        return Response(content, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="liquidity-{month}.pdf"'})

    @app.get('/api/{collection}')
    def list_rows(collection: str, user=Depends(current), session: Session = Depends(db)):
        model = model_for(collection)
        require_feature(session, user, COLLECTION_FEATURES[collection])
        return rows(session, model, user)

    @app.get('/api/{collection}/{row_id}')
    def get_row(collection: str, row_id: str, user=Depends(current), session: Session = Depends(db)):
        model = model_for(collection)
        require_feature(session, user, COLLECTION_FEATURES[collection])
        return serialize(owned(session, model, user, row_id))

    @app.post('/api/{collection}', status_code=201)
    def insert(collection: str, body: dict = Body(...), user=Depends(current), session: Session = Depends(db)):
        model = model_for(collection)
        require_feature(session, user, COLLECTION_FEATURES[collection])
        row_id = valid_id(body.get('id') or str(uuid4()))
        existing = session.get(model, (user.id, row_id))
        if existing:
            return serialize(existing)
        clean = prepare(collection, body, session, user)
        row = model(user_id=user.id, id=row_id, **mapped(model, clean))
        session.add(row)
        write_audit(session, 'data.created', user, user, collection, row_id, {'after': entity_snapshot(row)})
        session.commit()
        return serialize(row)

    @app.put('/api/{collection}/{row_id}')
    def update(collection: str, row_id: str, body: dict = Body(...), user=Depends(current), session: Session = Depends(db)):
        model = model_for(collection)
        require_feature(session, user, COLLECTION_FEATURES[collection])
        row = owned(session, model, user, row_id)
        before = entity_snapshot(row)
        clean = prepare(collection, {**serialize(row), **body}, session, user)
        for key, value in mapped(model, clean).items():
            setattr(row, key, value)
        write_audit(session, 'data.updated', user, user, collection, row_id, {'before': before, 'after': entity_snapshot(row)})
        session.commit()
        return serialize(row)

    @app.post('/api/{collection}/{row_id}/{action}')
    def toggle(collection: str, row_id: str, action: str, body: dict = Body(default={}), user=Depends(current), session: Session = Depends(db)):
        model = model_for(collection)
        require_feature(session, user, COLLECTION_FEATURES[collection])
        row = owned(session, model, user, row_id)
        field = 'archived' if collection == 'clients' and action == 'archive' else 'voided' if collection in ['records', 'withdrawals'] and action == 'void' else None
        if not field:
            raise HTTPException(404)
        before = entity_snapshot(row)
        setattr(row, field, bool(body.get(field, not getattr(row, field))))
        write_audit(session, 'data.toggled', user, user, collection, row_id, {'field': field, 'before': before, 'after': entity_snapshot(row)})
        session.commit()
        return serialize(row)

    @app.delete('/api/{collection}/{row_id}')
    def remove(collection: str, row_id: str, user=Depends(current), session: Session = Depends(db)):
        model = model_for(collection)
        require_feature(session, user, COLLECTION_FEATURES[collection])
        row = owned(session, model, user, row_id)
        write_audit(session, 'data.deleted', user, user, collection, row_id, {'before': entity_snapshot(row)})
        session.delete(row)
        session.commit()
        return {'ok': True}

    dist = ROOT / 'frontend' / 'dist'
    if (dist / 'assets').exists():
        app.mount('/assets', StaticFiles(directory=dist / 'assets'), name='assets')
    if (dist / 'control-panel').exists():
        app.mount('/control-panel', StaticFiles(directory=dist / 'control-panel'), name='control-static')

    @app.get('/control', include_in_schema=False)
    @app.get('/control/', include_in_schema=False)
    def control_panel():
        control_page = dist / 'control-panel' / 'control.html'
        if control_page.is_file():
            return FileResponse(control_page, headers={'Cache-Control': 'no-store'})
        raise HTTPException(503, 'Build the standalone control panel first')

    @app.get('/{path:path}', include_in_schema=False)
    def spa(path: str):
        if path.startswith('api/'):
            raise HTTPException(404)
        candidate = (dist / path).resolve()
        if candidate.is_relative_to(dist.resolve()) and candidate.is_file():
            return FileResponse(candidate)
        if (dist / 'index.html').exists():
            return FileResponse(dist / 'index.html', headers={'Cache-Control': 'no-cache'})
        raise HTTPException(503, 'Build frontend first')
    return app


def mapped(model, body):
    return {col.name: body[camel(col.name)] for col in model.__table__.columns if col.name not in ['user_id', 'id', 'created_at', 'updated_at'] and camel(col.name) in body}


def credentials(body):
    try:
        email = validate_email(str(body.get('email', '')).strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        raise HTTPException(422, 'أدخل بريدًا إلكترونيًا صالحًا')
    password = str(body.get('password', ''))
    if not password or len(password.encode()) > 72:
        raise HTTPException(422, 'كلمة المرور مطلوبة ولا تتجاوز 72 بايت')
    return email, password


def valid_id(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', value):
        raise ValueError('معرّف غير صالح')
    return value


def numeric_tree(value):
    if not isinstance(value, dict):
        raise ValueError('بيانات غير صالحة')
    return {str(k): numeric_tree(v) if isinstance(v, dict) else number(v) for k, v in value.items() if v is not None and v != ''}


def validate_settings(body):
    data = {**deepcopy(DEFAULTS), **body}
    currencies = data['currencies']
    if not isinstance(currencies, list) or not currencies or len(currencies) > 40:
        raise ValueError('أضف عملة واحدة على الأقل')
    codes = [c.get('code', '') for c in currencies]
    if len(set(codes)) != len(codes) or any(not re.fullmatch(r'[A-Z0-9]{2,12}', c) for c in codes):
        raise ValueError('رموز العملات غير صالحة أو مكرّرة')
    data['currencies'] = [{'code': c['code'], 'name': str(c.get('name', c['code']))[:100], 'symbol': str(c.get('symbol', c['code']))[:20]} for c in currencies]
    data['rates'] = numeric_tree(data['rates'])
    for kind in ['debt', 'payment']:
        if any(number(data['rates'].get(kind, {}).get(code)) <= 0 for code in codes):
            raise ValueError('أسعار الصرف يجب أن تكون أكبر من صفر')
        rule = data['commissions'][kind]
        for key in ['smallUsd', 'threshold', 'percent', 'fixed']:
            rule[key] = max(0, number(rule.get(key), DEFAULTS['commissions'][kind][key]))
        rule['byCurrency'] = numeric_tree(rule.get('byCurrency', {}))
        rule['mode'], rule['currencies'] = 'tiered', ['USDT']
    data['shopName'] = str(data.get('shopName', 'دفتري'))[:200]
    data['shopPhone'] = str(data.get('shopPhone', ''))[:50]
    return data


def validate_liquidity_settings(body):
    currencies = body.get('currencies')
    if not isinstance(currencies, list) or not currencies or len(currencies) > 40:
        raise ValueError('أضف عملة واحدة على الأقل')
    clean_currencies = []
    seen = set()
    for item in currencies:
        if not isinstance(item, dict):
            raise ValueError('بيانات العملة غير صالحة')
        code = str(item.get('code', '')).strip().upper()
        if not re.fullmatch(r'[A-Z0-9]{2,12}', code) or code in seen:
            raise ValueError('رمز العملة غير صالح أو مكرّر')
        seen.add(code)
        clean_currencies.append({
            'code': code,
            'name': str(item.get('name') or code).strip()[:100],
            'symbol': str(item.get('symbol') or code).strip()[:20],
        })
    if 'USD' not in seen:
        raise ValueError('عملة USD مطلوبة كأساس للمقارنة')
    source_rates = body.get('rates')
    if not isinstance(source_rates, dict):
        raise ValueError('أسعار صرف السيولة غير صالحة')
    rates = {}
    for currency in clean_currencies:
        code = currency['code']
        value = 1 if code == 'USD' else number(source_rates.get(code))
        if value <= 0:
            raise ValueError(f'أدخل سعر صرف صحيحًا لعملة {code}')
        rates[code] = value
    return {'currencies': clean_currencies, 'rates': rates}


def validate_liquidity_month(body):
    month = str(body.get('month', ''))
    monthly = bool(re.fullmatch(r'\d{4}-(?:0[1-9]|1[0-2])', month))
    daily = bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', month))
    if daily:
        try:
            date.fromisoformat(month)
        except ValueError:
            daily = False
    if not monthly and not daily:
        raise ValueError('اختر يومًا أو شهرًا صالحًا')
    if body.get('id') not in (None, '', month):
        raise ValueError('معرّف سجل السيولة يجب أن يطابق الشهر')
    entries = body.get('entries')
    if not isinstance(entries, list) or not entries or len(entries) > 500:
        raise ValueError('أضف مبلغًا واحدًا على الأقل')
    source_rates = body.get('rates')
    if not isinstance(source_rates, dict):
        raise ValueError('أسعار صرف الشهر غير صالحة')
    rates = {}
    for code, value in source_rates.items():
        code = str(code).strip().upper()
        if not re.fullmatch(r'[A-Z0-9]{2,12}', code):
            raise ValueError('رمز عملة غير صالح في أسعار الشهر')
        rate = 1 if code == 'USD' else number(value)
        if rate <= 0:
            raise ValueError(f'سعر صرف {code} يجب أن يكون أكبر من صفر')
        rates[code] = rate
    if 'USD' not in rates:
        rates['USD'] = 1
    clean_entries = []
    for item in entries:
        if not isinstance(item, dict):
            raise ValueError('بيانات المبلغ غير صالحة')
        code = str(item.get('currency', '')).strip().upper()
        if not re.fullmatch(r'[A-Z0-9]{2,12}', code):
            raise ValueError('اختر عملة صالحة لكل مبلغ')
        if number(rates.get(code)) <= 0:
            raise ValueError(f'أدخل سعر صرف صحيحًا لعملة {code}')
        amount = number(item.get('amount'))
        if amount < 0:
            raise ValueError('المبلغ لا يمكن أن يكون سالبًا')
        clean_entries.append({
            'id': valid_id(str(item.get('id') or uuid4())),
            'description': str(item.get('description') or '').strip()[:120],
            'currency': code,
            'currencyName': str(item.get('currencyName') or code).strip()[:100],
            'currencySymbol': str(item.get('currencySymbol') or code).strip()[:20],
            'amount': amount,
            'direction': 'owed' if item.get('direction') == 'owed' else 'ours',
        })
    return {'month': month, 'entries': clean_entries, 'rates': rates}
