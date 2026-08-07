# บันทึกฟาร์มกุ้งรายสัปดาห์

แอปบันทึกข้อมูลฟาร์มกุ้งรายสัปดาห์ (ไซส์กุ้ง, อาหาร/วัน, ADG) เป็น **PWA (Progressive Web App)** ที่ติดตั้งลงมือถือ/เครื่องได้ **ใช้งานได้แบบออฟไลน์** และ **ซิงก์ข้อมูลกับทีมแบบเรียลไทม์ผ่าน Firebase (Firestore)**

## ใช้งาน / ติดตั้งเป็นแอป

1. เปิดลิงก์เว็บแอป (GitHub Pages) บนมือถือด้วย Chrome/Safari
2. ใส่รหัสผ่านของทีม (ดูหัวข้อ "ตั้งค่า Firebase" ด้านล่าง) เพื่อเข้าใช้งานครั้งแรก
3. แตะเมนู "เพิ่มลงหน้าจอโฮม" (Add to Home Screen) หรือ "ติดตั้งแอป"
4. เปิดใช้งานได้เหมือนแอปปกติ แม้ไม่มีอินเทอร์เน็ต — ข้อมูลที่แก้ไขระหว่างออฟไลน์จะซิงก์ขึ้น Firebase อัตโนมัติเมื่อกลับมาออนไลน์ และเครื่องอื่นในทีมจะเห็นข้อมูลใหม่แบบเรียลไทม์

## โครงสร้างไฟล์

- `index.html` — ตัวแอปทั้งหมด (UI + logic + การเชื่อม Firebase)
- `manifest.webmanifest` — ข้อมูล PWA (ชื่อแอป, ไอคอน, สี, การติดตั้ง)
- `sw.js` — Service Worker สำหรับแคชไฟล์ให้ใช้งานออฟไลน์ได้ และคอยอัปเดตเวอร์ชันใหม่อัตโนมัติ
- `icons/` — ไอคอนแอปขนาดต่างๆ
- `.github/workflows/deploy-pages.yml` — deploy อัตโนมัติขึ้น GitHub Pages ทุกครั้งที่ push

## ตั้งค่า Firebase (ทำครั้งเดียว)

แอปนี้เชื่อมกับ Firebase project `shrimp-farm-data` แล้วในโค้ด แต่ต้องเปิดใช้งาน 3 อย่างนี้ในฝั่ง [Firebase Console](https://console.firebase.google.com/) ก่อนใช้งานได้จริง:

1. **เปิด Firestore Database** — ไปที่ Build → Firestore Database → Create database → เลือกโหมด **Production** และภูมิภาคที่ต้องการ
2. **เปิด Email/Password sign-in** — ไปที่ Build → Authentication → Sign-in method → เปิดใช้งาน **Email/Password**
3. **สร้างบัญชีล็อกอินของทีม (บัญชีเดียว ใช้ร่วมกัน)** — ไปที่ Build → Authentication → Users → Add user
   - Email: `team@sharimp-farm-data.local`
   - Password: ตั้งรหัสผ่านที่ต้องการให้ทีมใช้ (นี่คือรหัสผ่านที่ใส่ตอนเข้าแอป)

จากนั้นไปที่ Firestore Database → Rules แล้ววางกฎนี้แทนของเดิม เพื่อให้ต้องล็อกอินก่อนถึงจะอ่าน/เขียนข้อมูลได้ (ป้องกันคนนอกที่ไม่รู้รหัสผ่านเข้าถึงข้อมูล):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

กด **Publish** เพื่อบันทึกกฎ — เสร็จแล้วแอปพร้อมใช้งานทันที ไม่ต้อง redeploy

## การอัปเดตเวอร์ชันอัตโนมัติ

ทุกครั้งที่ push โค้ดใหม่ GitHub Actions จะ:

1. แทนที่ `__BUILD_VERSION__` ใน `index.html` และ `sw.js` ด้วยเลขเวอร์ชันใหม่ (จาก git commit + เวลา)
2. Deploy ขึ้น GitHub Pages
3. Service worker จะสร้างแคชใหม่ตามเวอร์ชันนี้ และลบแคชเก่าทิ้งอัตโนมัติ (`activate` event)
4. หน้าเว็บ/แอปที่เปิดค้างไว้จะตรวจพบเวอร์ชันใหม่ และแสดงข้อความ "มีอัปเดตเวอร์ชันใหม่ของแอป" พร้อมปุ่มโหลดใหม่ทันที

ผู้ใช้จึงมั่นใจได้ว่าจะได้ใช้แอปเวอร์ชันล่าสุดเสมอ โดยไม่ต้องลบแอปแล้วติดตั้งใหม่

## เปิดใช้งาน GitHub Pages (ทำครั้งเดียว)

ไปที่ **Settings → Pages → Build and deployment → Source** แล้วเลือก **GitHub Actions** (เวิร์กโฟลว์ `deploy-pages.yml` จะ deploy ให้อัตโนมัติในการ push ครั้งถัดไป)

## พัฒนาโค้ดต่อ

รันไฟล์ `index.html` ด้วย local server ใดก็ได้ เช่น:

```bash
python3 -m http.server 8080
```

แล้วเปิด `http://localhost:8080`
