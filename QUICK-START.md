# 🚀 Quick Start - Luxo Account Management

## ✅ Setup হয়ে গেছে! এখন শুরু করুন:

### সবচেয়ে সহজ উপায় (মাত্র ২ ধাপ):

#### **ধাপ ১:** MySQL Server চালু করুন
1. **Laragon Control Panel** খুলুন (আপনার taskbar এ আছে)
2. **MySQL** এর পাশে ক্লিক করুন (সবুজ হতে হবে)
3. **উইন্ডো minimize করুন** (চালু রাখুন background এ)

#### **ধাপ ২:** প্রজেক্ট folder এ যান এবং RUN-DEV-SERVER.bat ডাবল-ক্লিক করুন
```
📂 c:\laragon\www\Luxo-Account-Management\
   📄 RUN-DEV-SERVER.bat ← এই ফাইলটি ডাবল-ক্লিক করুন
```

**এটাই!** এর পরে:
- Dependencies automatically install হবে
- Prisma client generate হবে  
- Dev server http://localhost:3000 এ চলবে
- Browser এ site দেখুন!

---

## ✅ Next Step: Autostart (Optional)

যদি PC restart হলে server auto-start হতে চান:

```
📂 c:\laragon\www\Luxo-Account-Management\
   📄 SETUP-AUTOSTART.bat ← এই ফাইলটি ডাবল-ক্লিক করুন
```

এটা করবে:
1. ✅ Administrator permission নেবে
2. ✅ Windows Task Scheduler এ register করবে
3. ✅ পরবর্তী PC restart এ server auto-start করবে

---

## 🔧 Manual Control (Advanced)

যদি command line এ নিয়ন্ত্রণ করতে চান:

```powershell
# Project folder এ যান
cd c:\laragon\www\Luxo-Account-Management

# Dependencies install করুন (first time only)
npm install

# Prisma setup করুন
npm run db:generate
npm run db:push

# Dev server চালান
npm run dev

# Background এ চালাতে চাইলে:
npm run dev &
```

---

## 🆘 Troubleshooting

### Q: "Connection Refused" দেখাচ্ছে?
**A:** নিশ্চিত করুন:
1. ✅ **MySQL চালু আছে** (Laragon control panel এ green light)
2. ✅ **RUN-DEV-SERVER.bat** চলছে
3. ✅ **Browser refresh করুন** (Ctrl+R)

### Q: "npm: command not found"?
**A:** Node.js install করুন: https://nodejs.org/

### Q: port 3000 already in use?
**A:** অন্য কোনো app চলছে সেই port এ:
```powershell
# Port খুঁজে বের করুন
netstat -ano | findstr :3000

# Process kill করুন (PID ২৩৪ এর example এ)
taskkill /PID 2340 /F
```

---

## 📁 ফাইলের অর্থ:

| ফাইল | উদ্দেশ্য |
|------|----------|
| **RUN-DEV-SERVER.bat** | 🟢 এখান থেকে শুরু করুন! সব কিছু automatic setup করে server চালায় |
| **SETUP-AUTOSTART.bat** | ⚙️ Windows startup এ auto-run setup করে |
| **start-server.bat** | 📦 সাধারণ server start script |
| **start-server-monitor.ps1** | 🔄 Server crash হলে auto-restart করে |
| **.env** | 🔐 Database এবং auth configuration |

---

## 🎯 একদম প্রথমবার?

```
1. MySQL চালু করুন (Laragon)
   ↓
2. RUN-DEV-SERVER.bat ডাবল-ক্লিক করুন
   ↓
3. অপেক্ষা করুন ~30 সেকেন্ড
   ↓
4. Browser খুলুন: http://localhost:3000
   ↓
5. ✅ Done! Site দেখুন
```

---

## 📱 Site Details:

- **URL:** http://localhost:3000
- **Database:** MySQL (lunxo_accounts)
- **Framework:** Next.js 14
- **Default Route:** Redirects to login (first visit)

---

**সব কিছু সেটআপ হয়ে গেছে। শুধু RUN-DEV-SERVER.bat চালান!** 🚀
