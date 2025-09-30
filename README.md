# Smartphone Compare Project
A class assignment to create mobile app project with React Native + Expo

โปรเจกต์แอป **Smartphone Compare** (React Native + Expo) สำหรับดูและเปรียบเทียบสเปคสมาร์ทโฟนแบบรวดเร็ว พร้อมระบบผู้ใช้และหน้าผู้ดูแลเพื่อจัดการสินค้า/ผู้ใช้ ข้อมูลถูกอ่านจากไฟล์ `db.json` ผ่าน **json-server** (mock backend)

<img width="1280" height="720" alt="PreviewIMG" src="https://github.com/user-attachments/assets/f962f571-8374-4047-b755-1fa4b2f3fbbf" />

---

## ฟีเจอร์หลัก
- **Home**: เลือกดูมือถือแยกตาม segment (budget / midrange / flagship)
- **Compare**: เลือก 2 รุ่นแล้วเทียบสเปค (CPU, GPU, Display size/type, RAM, ROM, Battery) แบบแถวต่อแถว
- **User**: สมัคร / ล็อกอิน / ออกจากระบบ / แก้ไขโปรไฟล์ (รองรับรูปโปรไฟล์ base64)
- **AdminPanel**: เพิ่ม/แก้ไข/ลบ สินค้าและผู้ใช้ผ่านป๊อปอัปฟอร์ม + ค้นหา + เรียงลำดับ

---

## เทคโนโลยีที่ใช้
- **React Native (Expo)**
- **json-server** เพื่อจำลอง REST API จากไฟล์ `db.json`
- **AsyncStorage** สำหรับเก็บสถานะผู้ใช้ฝั่งแอป
- Base64 images (ทั้งสินค้า/โปรไฟล์) เพื่อความสะดวกในสภาพแวดล้อม dev

---

## โครงสร้างข้อมูลโดยย่อ
**Products**
```json
{
  "id": "p001",
  "product_name": "Example Phone",
  "segment": "budget | midrange | flagship",
  "image_base64": "<...>",
  "spec_list": {
    "cpu": "", "gpu": "",
    "display_size": "", "display_type": "",
    "ram": "", "rom": "", "battery": ""
  }
}
```

**Users**
```json
{
  "id": "u001",
  "username": "alice",
  "password": "1234",  // ใช้เพื่อทดสอบ (โปรดเปลี่ยน/แฮชในโปรดักชัน)
  "role_type": "admin | user",
  "img_profile_base64": "<...>"
}
```

---

## การติดตั้งและเริ่มต้นใช้งาน (Setup)
> หมายเหตุ: คู่มือนี้อธิบายแบบ **ภาษามนุษย์** และตรงกับที่โปรเจกต์นี้ใช้งานจริง

### 1) โคลนโปรเจกต์
```bash
git clone <REPO_URL>
cd <REPO_FOLDER>
npm install
```

### 2) ตั้งค่า **IP ของตนเอง** ในไฟล์ `api.js`
เปิดไฟล์ `api.js` แล้วแก้ `BASE_URL` ให้ชี้ไปที่ IP ของเครื่องคุณ (และพอร์ตของ json-server คือ `3001`):
```js
// api.js (ตัวอย่าง)
export const BASE_URL = "http://<YOUR_IP>:3001";

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return await res.json();
}

// ... apiPost / apiPatch / apiDel ตามที่โปรเจกต์ใช้อยู่
```

### 3) หา IP ของเครื่องตนเองด้วย `ipconfig` (Windows)
เปิด Command Prompt แล้วพิมพ์:
```bash
ipconfig
```
ดูค่า **IPv4 Address** ของ Network ที่ใช้งานอยู่ (เช่น `192.168.1.23`) แล้วนำไปแทน `<YOUR_IP>` ใน `api.js`

> **macOS / Linux (ทางเลือก)**  
> ใช้คำสั่ง `ifconfig` หรือ `ip addr` แล้วดู IP ในเครือข่ายเดียวกับมือถือ/อีมูเลเตอร์

### 4) รัน Backend (json-server) จาก `db.json`
```bash
npx json-server --watch db.json --port 3001
```
- ต้องเปิดพอร์ต **3001** ให้เข้าถึงได้จากอุปกรณ์ที่รันแอป (มือถือ/อีมูเลเตอร์)
- ถ้าเปิดไฟร์วอลล์บน Windows ให้อนุญาต Node.js / พอร์ต 3001

### 5) รันแอป (Frontend)
```bash
npm start
# หรือ
npx expo start
```
- สแกน QR ด้วยแอป **Expo Go** (บน iOS/Android) หรือกดเปิดบน emulator/simulator
- ตรวจสอบว่าโทรศัพท์/อีมูเลเตอร์ **อยู่ในเครือข่ายเดียวกับเครื่องพัฒนา**

---

## 🔗 ตัวอย่างเอ็นพอยต์ที่ใช้ในโปรเจกต์
- ดูรายการมือถือทั้งหมด: `GET /products`
- ดูเฉพาะ segment: `GET /products?segment=budget|midrange|flagship`
- ล็อกอิน (โหมดเดโม): `GET /users?username=<u>&password=<p>`
- เพิ่มผู้ใช้: `POST /users`
- เพิ่ม/แก้ไข/ลบ สินค้า: `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`
- เพิ่ม/แก้ไข/ลบ ผู้ใช้: `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`

> **คำแนะนำด้านความปลอดภัย**  
> - โค้ดเดโมใช้วิธีล็อกอินแบบ `GET` + query string เพื่อความง่ายใน dev เท่านั้น  
> - เมื่อนำไปใช้งานจริงควรเปลี่ยนเป็น `POST /auth/login` และ **แฮชรหัสผ่าน** เก็บในฐานข้อมูล

---

## เคล็ดลับการตั้งค่าเครือข่าย/อีมูเลเตอร์
- **Android Emulator (AVD):** แทน `localhost` ด้วย `http://10.0.2.2:3001`
- **Android (Genymotion):** ใช้ IP ของโฮสต์โดยตรง เช่น `http://192.168.1.23:3001`
- **iOS Simulator:** ใช้ `http://localhost:3001` ได้
- **จริงจังเรื่องเน็ตเวิร์ก:** อุปกรณ์ที่รันแอปต้องมองเห็นเครื่องที่รัน `json-server` (อยู่วง LAN เดียวกัน)

---

## ทดสอบการเชื่อมต่อเบื้องต้น
1. เปิด `json-server` แล้วลองเปิดเบราว์เซอร์ไปที่  
   `http://<YOUR_IP>:3001/products` — ควรเห็น JSON รายการมือถือ
2. รัน `npm start` แล้วเปิดแอป เลือก segment ใน Home — ควรโหลดรายการได้

---

## Troubleshooting ทั่วไป
- เปิด `json-server` แล้วแต่แอปเรียกไม่ติด  
  → ตรวจสอบว่า `BASE_URL` ถูกต้อง, IP ถูกต้อง, อยู่เครือข่ายเดียวกัน, ไฟร์วอลล์ไม่บล็อกพอร์ต 3001
- เปลี่ยน Wi‑Fi / สลับ Hotspot แล้วแอปใช้งานไม่ได้  
  → IP ของเครื่องพัฒนาจะเปลี่ยน ให้กลับไปแก้ `api.js` ใหม่
- Android Emulator ไม่เห็น `localhost`  
  → ใช้ `10.0.2.2` แทน (ตามด้านบน)

---

## 📂 โครงสร้างโฟลเดอร์
```
project-root/
├─ app/
│  ├─ screens/
│  │  ├─ Home.js
│  │  ├─ Compare.js
│  │  ├─ User.js
│  │  └─ AdminPanel.js
│  ├─ api.js         # ตั้งค่า BASE_URL ของคุณที่นี่
│  └─ ...
├─ assets/
├─ db.json           # mock database สำหรับ json-server
├─ package.json
└─ README.md         # ไฟล์นี้
```

---

## หมายเหตุด้านความปลอดภัย (เมื่อจะขึ้นโปรดักชัน)
- อย่าเก็บรหัสผ่านเป็น plain text ให้ **แฮช** (เช่น bcrypt)
- เปลี่ยนการยืนยันตัวตนเป็น `POST /auth/login` + token
- ย้ายรูปจาก base64 ไปเป็นไฟล์บน storage/CDN แล้วเก็บเป็น URL
