# Luxo Account Management - Auto-Start Setup Guide

## সমস্যা 
PC sign-in হলে site offline হয়ে যায় কারণ dev server চালু থাকে না।

## সমাধান
আমি 3টি স্ক্রিপ্ট তৈরি করেছি যা Windows এর user-level Run key এর মাধ্যমে user sign-in এ স্বয়ংক্রিয়ভাবে dev server শুরু করবে।

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
- User-level Run entry স্বয়ংক্রিয়ভাবে তৈরি করে
- Hidden VBS launcher ব্যবহার করে, তাই sign-in এর পর কোনো terminal window/taskbar entry দেখানোর কথা না
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
SUCCESS: Run key entry created successfully!
Entry Name: Luxo-DevServer-Startup
Command: wscript.exe //B //NoLogo "c:\laragon\www\Luxo-Account-Management\hidden-run.vbs"
Trigger: Run at user sign-in (hidden VBS launcher)
```

### Step 4: PC Sign-in করুন
পরবর্তী sign-in এর পর, dev server স্বয়ংক্রিয়ভাবে চলবে।

---

## Troubleshooting

### Q: Autostart কাজ করছে কিনা কীভাবে যাচাই করব?
**A:** Registry Run entry চেক করুন:
1. `regedit` খুলুন
2. যান `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
3. `Luxo-DevServer-Startup` entry আছে কিনা দেখুন

### Q: Manual override করতে চাই
**A:** এই command চালান PowerShell এ:
```powershell
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Luxo-DevServer-Startup"
```

Restore করতে আবার `setup-autostart.ps1` চালান।

### Q: Autostart remove করতে চাই
**A:** PowerShell এ:
```powershell
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Luxo-DevServer-Startup"
```

### Q: Logs চেক করতে চাই
**A:** এই ফাইলগুলি দেখুন:
- `c:\laragon\www\Luxo-Account-Management\server.log` - Server log
- `c:\laragon\www\Luxo-Account-Management\task-setup.log` - Setup log
- `c:\laragon\www\Luxo-Account-Management\npm.log` - NPM output

### Q: কমান্ড লাইনে "Administrator" কেন প্রয়োজন?
**A:** এখন আর administrator permission দরকার নেই; এটি user-level Run key ব্যবহার করে।

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
**Purpose:** Automatic dev server startup on Windows sign-in
