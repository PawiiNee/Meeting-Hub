# Meeting Hub LINE Server

เซิร์ฟเวอร์ตัวกลางสำหรับส่งข้อความไป LINE อย่างปลอดภัย (ไม่เก็บ Token ไว้ในหน้าเว็บ)

## วิธีรัน

1) ติดตั้ง dependencies

```bash
cd server
npm install
```

2) สร้างไฟล์ `.env`

- คัดลอก `.env.example` เป็น `.env`
- ใส่ค่า `LINE_CHANNEL_ACCESS_TOKEN` และ `LINE_TO_USER_ID`

3) รันเซิร์ฟเวอร์

```bash
npm start
```

เซิร์ฟเวอร์จะเปิดที่ `http://localhost:3001`

## ทดสอบ

- เปิดหน้าเว็บผ่านเซิร์ฟเวอร์: `http://localhost:3001`
- (ไม่แนะนำเปิดผ่าน `file://` เพราะบางเครื่อง/เบราว์เซอร์จะบล็อกบางฟีเจอร์)
- ไปที่เมนู `ตั้งค่า`
- Server URL: `http://localhost:3001`
- ติ๊ก “เปิดใช้การส่งแจ้งเตือนไป LINE”
- กด “ทดสอบส่ง”

## ขอ LINE userId (U...) ของตัวเอง

> LINE จะยิง webhook มาจากอินเทอร์เน็ต ดังนั้น `localhost` ใช้ตรง ๆ ไม่ได้ ต้องใช้ URL สาธารณะ เช่น **ngrok**

1) รันเซิร์ฟเวอร์ (พอร์ต 3001)
2) เปิด tunnel ด้วย ngrok:

```bash
ngrok http 3001
```

3) เอา URL ที่ ngrok ให้ (เช่น `https://xxxx.ngrok-free.app`) ไปใส่ใน LINE Developers → Messaging API → Webhook URL:

- `https://xxxx.ngrok-free.app/api/line/webhook`
- เปิด Use webhooks

4) แอด OA เป็นเพื่อน แล้วส่งข้อความหา OA 1 ข้อความ
5) เปิดดู `http://localhost:3001/api/line/last-seen` จะเห็น `userId` จริง (ขึ้นต้นด้วย `U...`)

## Endpoint

- `POST /api/line/push`
  - body: `{ "message": "ข้อความ" }`

## แจ้งเตือน LINE ทุกวัน 08:00

เซิร์ฟเวอร์จะส่งข้อความอัตโนมัติทุกวันตอน `08:00` ถ้า `.env` ตั้งค่า `LINE_CHANNEL_ACCESS_TOKEN` และ `LINE_TO_USER_ID` ไว้แล้ว

ค่าเริ่มต้น:
- เวลา: `08:00`
- ข้อความ: `แจ้งเตือนอัตโนมัติเวลา 08:00 น. จาก Meeting Hub`

ปรับแต่งผ่าน `.env` ได้ด้วยตัวแปร:
- `LINE_DAILY_REMINDER_HH` (ค่าเลขชั่วโมง, ค่าเริ่มต้น `8`)
- `LINE_DAILY_REMINDER_MM` (ค่านาที, ค่าเริ่มต้น `0`)
- `LINE_DAILY_REMINDER_MESSAGE` (ข้อความที่ส่ง)

