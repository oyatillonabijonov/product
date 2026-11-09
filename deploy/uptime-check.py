#!/usr/bin/env python3
"""ProDuct sayt monitoringi: sayt ochilmasa do'konning Telegram guruhiga xabar beradi.

Ilova ichida emas, serverning cron'ida ishlaydi (ilova yiqilsa o'zi haqida xabar bera olmaydi):
    /etc/cron.d/productstore-uptime  →  */2 * * * * root /usr/local/bin/productstore-uptime.py
Tekshiruv tashqi manzil orqali (Cloudflare → Traefik → ilova): bosh sahifa va uning asosiy JS/CSS fayllari.
Bot tokeni va guruh id'si ilova bazasidan o'qiladi (admin → Integratsiyalar) — bu yerda sir saqlanmaydi.

Sinash (xabar yubormaydi, ekranga chiqaradi):
    UPTIME_SITE=https://yoq.invalid UPTIME_STATE=/tmp/uptime-test ./uptime-check.py --dry-run
"""
import json
import os
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

SITE = os.environ.get('UPTIME_SITE', 'https://productstore.uz')
DB = '/data/coolify/applications/jijyiffp8f7souztzphrre8f/data/store.db'
# Fayl bor — sayt ishlamayapti deb xabar berilgan; ichida uzilish boshlangan vaqt.
STATE = os.environ.get('UPTIME_STATE', '/var/lib/productstore-uptime/down')
DRY_RUN = '--dry-run' in sys.argv
TASHKENT = timezone(timedelta(hours=5))
# ponytail: 3 so'rov × 10 s × 2 urinish + 20 s = eng ko'pi 80 s — cron oralig'idan (120 s) qisqa, qulf kerak emas.
TIMEOUT = 10


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'ProDuct-uptime/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            return res.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'{path} → HTTP {e.code}') from None
    except Exception as e:
        raise RuntimeError(f'{path} → {getattr(e, "reason", e)}') from None


def check():
    """Nosozlik sababi; hammasi joyida bo'lsa None."""
    try:
        html = fetch('/')
        for pattern in (r'/assets/entry\.client-[\w-]+\.js', r'/assets/[\w.-]+\.css'):
            found = re.search(pattern, html)
            if not found:
                return 'bosh sahifada JS/CSS havolasi topilmadi'
            fetch(found.group())
    except RuntimeError as e:
        return str(e)
    return None


def send(text):
    if DRY_RUN:
        print(text)
        return
    db = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
    token, chat = db.execute('SELECT telegram_bot_token, telegram_order_chat_id FROM site_config WHERE id = 1').fetchone()
    db.close()
    body = urllib.parse.urlencode({'chat_id': chat, 'text': text}).encode()
    with urllib.request.urlopen(f'https://api.telegram.org/bot{token}/sendMessage', body, timeout=TIMEOUT) as res:
        if not json.load(res).get('ok'):
            raise RuntimeError('Telegram xabarni qabul qilmadi')


def clock(ts):
    return datetime.fromtimestamp(ts, TASHKENT).strftime('%H:%M')


def main():
    reason = check()
    if reason:
        # Bir martalik tarmoq uzilishi uchun xabar bermaslik: 20 soniyadan keyin qayta tekshiriladi.
        time.sleep(20)
        reason = check()
    now = time.time()
    host = urllib.parse.urlparse(SITE).hostname
    # Holat fayli faqat xabar ketgandan keyin o'zgaradi — Telegram ishlamasa keyingi ishga tushishda qayta uriniladi.
    if reason and not os.path.exists(STATE):
        send(f'🔴 {host} ishlamayapti\nSabab: {reason}\nVaqt: {clock(now)}')
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        with open(STATE, 'w') as f:
            f.write(str(now))
        print(f'{datetime.now(TASHKENT):%F %T} ISHLAMAYAPTI: {reason}')
    elif not reason and os.path.exists(STATE):
        with open(STATE) as f:
            since = float(f.read())
        minutes = max(1, round((now - since) / 60))
        send(f'🟢 {host} tiklandi\n{minutes} daqiqa ishlamadi ({clock(since)} – {clock(now)})')
        os.remove(STATE)
        print(f'{datetime.now(TASHKENT):%F %T} TIKLANDI: {minutes} daqiqa')


if __name__ == '__main__':
    main()
