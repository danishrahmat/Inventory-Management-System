╔══════════════════════════════════════════════════════╗
║         STOCKR v2 — Factory Inventory System         ║
╚══════════════════════════════════════════════════════╝

WHAT'S NEW IN v2
─────────────────
✓ HTTPS — camera scanning now works on all phones
✓ Redesigned mobile UI — large buttons, easy to use
✓ Better scanner — asks for camera permission properly
✓ Vibration feedback when scan succeeds
✓ Real-time sync across all phones on same WiFi


REQUIREMENTS
─────────────
• A PC or laptop that stays on during work hours
• Node.js (free) from https://nodejs.org — get the LTS version
• openssl (usually pre-installed; on Windows: comes with Git)
• All phones on the same WiFi as the PC


FIRST-TIME SETUP (once only)
──────────────────────────────
1. Install Node.js from https://nodejs.org

2. (Windows only) If openssl is not installed:
   Install Git from https://git-scm.com — it includes openssl.
   OR: Download openssl from https://slproweb.com/products/Win32OpenSSL.html

3. Extract this folder to your Desktop (or anywhere)

4. That's it — no npm install needed!


STARTING THE SERVER
─────────────────────
Windows → Double-click: START_SERVER.bat
Mac     → Terminal: bash start_server.sh
Linux   → Terminal: bash start_server.sh

On first start it auto-generates an SSL certificate.

The console will show your network address:
  https://192.168.1.45:3443   ← use THIS on phones


CONNECTING PHONES (one-time per phone)
────────────────────────────────────────
1. Connect phone to the same WiFi as the PC
2. Open Chrome (Android) or Safari (iPhone)
3. Type the HTTPS network address shown above
4. You'll see a security warning — this is normal for
   self-signed certificates:

   ┌─ Chrome ─────────────────────────────────────┐
   │ Tap "Advanced" → "Proceed to site (unsafe)"  │
   └──────────────────────────────────────────────┘
   ┌─ Safari ─────────────────────────────────────┐
   │ Tap "Show Details" → "visit this website"    │
   └──────────────────────────────────────────────┘

5. ALLOW CAMERA when the browser asks
6. Tap Share button (Safari) or Menu → "Add to Home Screen"
   → The app appears as an icon on the phone!


USING THE SCANNER
──────────────────
• Go to Transfer IN or Transfer OUT tab
• Tap the camera area — browser asks for camera permission
• Point at barcode or QR code — hold steady 10–20cm away
• Phone vibrates when scan succeeds
• Or type the SKU manually in the field below


DATA & BACKUP
──────────────
All data is saved to:  data/inventory.json
Back up this file regularly. To restore, replace the file.


TROUBLESHOOTING
────────────────
Phone can't connect?
→ Make sure both phone and PC are on the same WiFi
→ Windows: allow Node.js through Windows Defender Firewall
  (Windows will ask automatically the first time)
→ Try disabling Windows Firewall temporarily to test

Camera won't work?
→ Must be HTTPS (https://...) — plain http:// won't allow camera
→ On iPhone: Safari works best; Chrome may block camera
→ Allow camera permission when asked
→ If accidentally denied: go to phone Settings → Browser → Camera

Data not syncing?
→ Check the green dot in the top-right of the app
→ Grey = disconnected; refresh the page

Server port already in use?
→ Change HTTPS_PORT in server.js (default 3443)
→ Change HTTP_PORT too (default 3000)
