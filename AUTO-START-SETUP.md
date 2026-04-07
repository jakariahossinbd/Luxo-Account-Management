# Luxo Account Management - Auto-Start Setup Guide

## সমস্যা 
PC restart হলে site offline হয়ে যায় কারণ dev server চালু থাকে না।

## সমাধান
আমি 3টি স্ক্রিপ্ট তৈরি করেছি যা Windows Task Scheduler এর মাধ্যমে PC startup এ স্বয়ংক্রিয়ভাবে dev server শুরু করবে।

---

## ফাইল বিবরণ

### 1. `start-server.bat`
- Simple batch file যা npm dev server চালায়
- Manual startup এর জন্য ব্যবহার করুন
- ব্যবহার: ডাবল-ক্লিক করুন

### 2. `start-server-monitor.ps1`
- PowerShell monitoring script
- Dev server ক্র্যাশ হলে automatically restart করে
- Background এ চলে
- Health check করে প্রতি 30 সেকেন্ডে

### 3. `start-server-background.bat`
- PowerShell script কে run করে
- Windows Task Scheduler থেকে চালানোর জন্য optimized

### 4. `setup-autostart.ps1`
- Scheduled task স্বয়ংক্রিয়ভাবে তৈরি করে
- **এটাই একমাত্র script যা আপনাকে manually চালাতে হবে** (একবারই)

---

## সেটআপ নির্দেশনা (SETUP STEPS)

### Step 1: PowerShell কে Administrator হিসেবে খুলুন
1. Windows এ `PowerShell` সার্চ করুন
2. **Windows PowerShell** এ right-click করুন
3. **"Run as administrator"** নির্বাচন করুন

### Step 2: Setup Script চালান
নিচের কমান্ড PowerShell এ পেস্ট করুন এবং Enter চাপুন:

```powershell
powershell -ExecutionPolicy Bypass -File "c:\laragon\www\Luxo-Account-Management\setup-autostart.ps1"
```

### Step 3: Confirmation দেখুন
আপনি এমন message দেখবেন:
```
SUCCESS: Scheduled task created successfully!
Task Name: Luxo-DevServer-Startup
Script: c:\laragon\www\Luxo-Account-Management\start-server-background.bat
Trigger: Run at system startup
```

### Step 4: PC Restart করুন
পরবর্তী restart এর পর, dev server স্বয়ংক্রিয়ভাবে চলবে।

---

## Troubleshooting

### Q: Scheduled task কাজ করছে কিনা কীভাবে যাচাই করব?
**A:** Task Scheduler খুলুন:
1. Windows এ `Task Scheduler` লিখুন
2. খুঁজুন "Luxo-DevServer-Startup" 
3. Status হবে "Ready"

### Q: Manual override করতে চাই
**A:** এই command চালান PowerShell (Admin) থেকে:
```powershell
Get-ScheduledTask -TaskName "Luxo-DevServer-Startup" | Stop-ScheduledTask
```

Resume করতে:
```powershell
Get-ScheduledTask -TaskName "Luxo-DevServer-Startup" | Start-ScheduledTask
```

### Q: Task remove করতে চাই
**A:** PowerShell (Admin) এ:
```powershell
Unregister-ScheduledTask -TaskName "Luxo-DevServer-Startup" -Confirm:$false
```

### Q: Logs চেক করতে চাই
**A:** এই ফাইলগুলি দেখুন:
- `c:\laragon\www\Luxo-Account-Management\server.log` - Server log
- `c:\laragon\www\Luxo-Account-Management\task-setup.log` - Setup log
- `c:\laragon\www\Luxo-Account-Management\npm.log` - NPM output

### Q: কমান্ড লাইনে "Administrator" কেন প্রয়োজন?
**A:** Windows Task Scheduler এ task লিখতে administrator permission দরকার।

---

## Manual Testing

Setup এর আগে manual test করতে চাইলে:

```powershell
# PowerShell (Regular) এ চালান:
cd "c:\laragon\www\Luxo-Account-Management"
npm run dev
```

---

## Support

যদি কোনো সমস্যা হয়:
1. `server.log` ফাইল চেক করুন
2. নিশ্চিত করুন Node.js এবং npm installed are আছে
3. নিশ্চিত করুন port 3000 কোনো অন্য application use করছে না

---

**Created:** April 7, 2026  
**Project:** Luxo Account Management  
**Purpose:** Automatic dev server startup on Windows boot
