import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

const PORT = Number(process.env.PORT || 3001);
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const TO_USER_ID = process.env.LINE_TO_USER_ID || '';
const DAILY_HH = Number(process.env.LINE_DAILY_REMINDER_HH || 8);
const DAILY_MM = Number(process.env.LINE_DAILY_REMINDER_MM || 0);
function hasPlaceholder(value) {
  const v = String(value || '');
  return v.includes('_CHANNEL_ACCESS_TOKEN') || v.includes('LINE_USER_ID') || v.includes('YOUR_');
}

let lastSeen = {
  userId: null,
  groupId: null,
  roomId: null,
  at: null,
  eventType: null
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const DAILY_SENT_FILE = path.join(projectRoot, '.mh_daily_line_last_sent.json');
const MEETINGS_FILE = path.join(projectRoot, '.mh_meetings.json');

function readMeetings() {
  try {
    const raw = fs.readFileSync(MEETINGS_FILE, 'utf8');
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeMeetings(meetings) {
  try {
    fs.writeFileSync(MEETINGS_FILE, JSON.stringify(Array.isArray(meetings) ? meetings : []), 'utf8');
  } catch (_) {}
}

// เสิร์ฟหน้าเว็บจากโปรเจกต์ (แก้ปัญหาเปิด index.html ผ่าน file:// ไม่ได้)
app.use(express.static(projectRoot));
app.get('/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// ใช้สำหรับ "ขอ LINE ID" ของผู้ใช้/กลุ่ม ผ่าน webhook
// หมายเหตุ: LINE จะยิง webhook มาจากอินเทอร์เน็ต ต้องใช้ URL สาธารณะ (เช่น ngrok)
app.post('/api/line/webhook', (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    const ev = events[0];
    const source = ev?.source || {};

    lastSeen = {
      userId: source.userId || null,
      groupId: source.groupId || null,
      roomId: source.roomId || null,
      at: Date.now(),
      eventType: ev?.type || null
    };

    console.log('[webhook] eventType=', lastSeen.eventType, 'userId=', lastSeen.userId, 'groupId=', lastSeen.groupId, 'roomId=', lastSeen.roomId);
  } catch (e) {
    console.log('[webhook] parse error', String(e?.message || e));
  }
  // ตอบ 200 ทันที
  res.json({ ok: true });
});

app.get('/api/line/last-seen', (_req, res) => {
  res.json({ ok: true, lastSeen });
});

app.get('/api/meetings', (_req, res) => {
  res.json({ meetings: readMeetings() });
});

app.post('/api/meetings', (req, res) => {
  const list = req.body?.meetings;
  if (!Array.isArray(list)) return res.status(400).json({ ok: false, error: 'meetings array required' });
  writeMeetings(list);
  res.json({ ok: true });
});

function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readDailySent() {
  try {
    const raw = fs.readFileSync(DAILY_SENT_FILE, 'utf8');
    const j = JSON.parse(raw || '{}');
    return { lastSentDate: j.lastSentDate || null };
  } catch {
    return { lastSentDate: null };
  }
}

function writeDailySent(lastSentDate) {
  try {
    fs.writeFileSync(DAILY_SENT_FILE, JSON.stringify({ lastSentDate }), 'utf8');
  } catch (_) {}
}

async function pushLine(message) {
  if (!CHANNEL_ACCESS_TOKEN || !TO_USER_ID) {
    return { ok: false, error: 'missing_env' };
  }
  if (hasPlaceholder(CHANNEL_ACCESS_TOKEN) || hasPlaceholder(TO_USER_ID)) {
    return { ok: false, error: 'placeholder_detected' };
  }

  const msg = String(message || '').trim();
  if (!msg) return { ok: false, error: 'missing_message' };

  const r = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: TO_USER_ID,
      messages: [{ type: 'text', text: msg }]
    })
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return { ok: false, error: 'line_api_error', status: r.status, detail };
  }

  return { ok: true };
}

// Daily LINE reminder at 08:00 — ส่งการประชุมที่กำลังจะมาถึงในวันถัดไป
let dailyState = readDailySent();

function getDateKeyFromDatetime(datetimeStr) {
  if (!datetimeStr) return '';
  const d = new Date(datetimeStr);
  if (Number.isNaN(d.getTime())) return '';
  return localDateKey(d);
}

function formatTime(datetimeStr) {
  if (!datetimeStr) return '';
  const d = new Date(datetimeStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function buildTomorrowMeetingsMessage() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow);
  const meetings = readMeetings();
  const tomorrowMeetings = meetings
    .filter((m) => getDateKeyFromDatetime(m.datetime) === tomorrowKey)
    .sort((a, b) => new Date(a.datetime || 0) - new Date(b.datetime || 0));

  const dateLabel = tomorrow.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let text = `📅 แจ้งเตือนการประชุมวันถัดไป\nวันที่ ${dateLabel}\n\n`;

  if (tomorrowMeetings.length === 0) {
    text += 'ไม่มีกำหนดการประชุมในวันนี้';
    return text;
  }

  tomorrowMeetings.forEach((m, i) => {
    const time = formatTime(m.datetime);
    const title = m.title || '(ไม่มีหัวข้อ)';
    const location = m.location ? ` สถานที่: ${m.location}` : '';
    const participants = Array.isArray(m.participants) && m.participants.length ? ` ผู้เข้าร่วม: ${m.participants.join(', ')}` : '';
    const link = m.link ? ` ลิงค์: ${m.link}` : '';
    text += `${i + 1}. ${time} - ${title}${location}${participants}${link}\n`;
  });

  return text.trim();
}

async function maybeSendDailyReminder() {
  try {
    const now = new Date();
    if (now.getHours() !== DAILY_HH || now.getMinutes() !== DAILY_MM) return;

    const today = localDateKey(now);
    if (dailyState.lastSentDate === today) return;

    const message = buildTomorrowMeetingsMessage();
    const res = await pushLine(message);
    if (res.ok) {
      dailyState.lastSentDate = today;
      writeDailySent(today);
      console.log(`[daily] sent to LINE (${today})`);
    } else {
      console.log('[daily] failed:', res);
    }
  } catch (e) {
    console.log('[daily] error:', String(e?.message || e));
  }
}

setInterval(maybeSendDailyReminder, 15000); // เช็คทุก 15 วินาที
// ลองยิงรอบแรกเผื่อเปิดเซิร์ฟเวอร์ตอนใกล้ 08:00
setTimeout(() => maybeSendDailyReminder(), 2000);

app.post('/api/line/push', async (req, res) => {
  try {
    if (!CHANNEL_ACCESS_TOKEN || !TO_USER_ID) {
      return res.status(500).json({
        ok: false,
        error: 'missing_env',
        message: 'กรุณาตั้งค่า LINE_CHANNEL_ACCESS_TOKEN และ LINE_TO_USER_ID ในไฟล์ .env'
      });
    }
    if (hasPlaceholder(CHANNEL_ACCESS_TOKEN) || hasPlaceholder(TO_USER_ID)) {
      return res.status(500).json({
        ok: false,
        error: 'placeholder_detected',
        message:
          'พบว่าค่าใน .env ยังเป็นข้อความตัวอย่าง (placeholder) อยู่ กรุณาแทนที่ด้วยค่าจริงทั้งหมด: LINE_CHANNEL_ACCESS_TOKEN ต้องเป็น Channel access token (long-lived) และ LINE_TO_USER_ID ต้องเป็น userId ที่ขึ้นต้นด้วย U...'
      });
    }

    const message = String(req.body?.message || '').trim();
    const res2 = await pushLine(message);
    if (!res2.ok) {
      return res.status(502).json(res2);
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'server_error', message: String(e?.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`Meeting Hub server listening on http://localhost:${PORT}`);
  console.log(`[env] LINE_CHANNEL_ACCESS_TOKEN: ${CHANNEL_ACCESS_TOKEN ? `set (len=${CHANNEL_ACCESS_TOKEN.length})` : 'missing'}`);
  console.log(`[env] LINE_TO_USER_ID: ${TO_USER_ID ? `set (${TO_USER_ID.slice(0, 2)}...)` : 'missing'}`);
  console.log(`[daily] แจ้งเตือน LINE อัตโนมัติทุกวันเวลา ${String(DAILY_HH).padStart(2, '0')}:${String(DAILY_MM).padStart(2, '0')} (เวลาของเครื่องที่รันเซิร์ฟเวอร์)`);
});

