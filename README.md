STOCKR v2 — Factory Inventory System

🚀 What's New in v2

✓ HTTPS support — camera scanning now works on all phones
✓ Redesigned mobile UI — large buttons, easy to use
✓ Improved scanner — proper camera permission prompts
✓ Vibration feedback on successful scan
✓ Real‑time sync across all phones on the same WiFi

📦 Requirements
A PC or laptop that stays on during work hours
Node.js (LTS) — https://nodejs.org
openssl
Usually pre‑installed
Windows: included with Git
All phones must be on the same WiFi as the PC
🛠 First-Time Setup (one‑time only)
Install Node.js LTS from:
https://nodejs.org
Windows only — if openssl isn’t installed:
Install Git (includes openssl): https://git-scm.com
Or download openssl: https://slproweb.com/products/Win32OpenSSL.html
Extract this folder anywhere (Desktop recommended)
Done — No npm install needed!
▶ Starting the Server
Windows:
Double‑click START_SERVER.bat

Mac/Linux:

bash


bash start_server.sh
On first start, an SSL certificate is auto‑generated.

The console will show your network address, for example:



https://192.168.1.45:3443
Use that address on all phones.

📱 Connecting Phones (one‑time per phone)
Connect phone and PC to same WiFi
Open:
Chrome on Android
Safari on iPhone
Type the HTTPS address shown in console
Accept the security warning (self‑signed certificate):
Chrome
Advanced → Proceed to site (unsafe)

Safari
Show Details → visit this website

Allow Camera Access
Add to Home Screen:
Safari: Share → Add to Home Screen
Chrome: Menu → Add to Home Screen
The app will now appear as an icon.

📷 Using the Scanner
Go to Transfer IN or Transfer OUT
Tap camera area — allow permission if asked
Hold the barcode/QR 10–20cm away
Phone vibrates on successful scan
You can also type the SKU manually
💾 Data & Backup
All inventory data is stored here:



data/inventory.json
Back this file up regularly.
To restore, replace it with a backup copy.

🔧 Troubleshooting
Phone can't connect?
Ensure PC + phone are on same WiFi
Windows: allow Node.js through Defender Firewall
Temporarily disable firewall to test
Camera not working?
Must use HTTPS (http:// will not allow camera)
iPhone: Safari recommended (Chrome may block camera)
Ensure camera permission is granted
If denied:
Settings → Browser → Camera → Allow
Data not syncing?
Check the status dot (top-right)
Green = connected
Grey = disconnected → refresh page
Port already in use?
Change HTTPS_PORT in server.js (default: 3443)
Change HTTP_PORT too (default: 3000)
