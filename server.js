const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

const HTTPS_PORT = 3443;
const HTTP_PORT  = 3000;
const CERT_FILE  = path.join(__dirname, 'certs', 'cert.pem');
const KEY_FILE   = path.join(__dirname, 'certs', 'key.pem');
const DEPTS      = ['production', 'electronic'];

function ensureCerts() {
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) return;
  console.log('Generating SSL certificate...');
  fs.mkdirSync(path.join(__dirname, 'certs'), { recursive: true });
  try {
    execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 3650 -nodes -subj "/CN=stockr.local"`, { stdio:'ignore' });
    console.log('SSL certificate generated!');
  } catch (e) { console.error('openssl error:', e.message); process.exit(1); }
}

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces))
    for (const iface of ifaces[name])
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
  return 'localhost';
}

function dataFile(dept) { return path.join(__dirname, 'data', dept + '.json'); }

function loadDept(dept) {
  try {
    const f = dataFile(dept);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) { console.error('Load error:', e.message); }
  return { inventory: getDefaults(dept), history: [] };
}

function saveDept(dept, data) {
  try {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(dataFile(dept), JSON.stringify(data, null, 2));
  } catch (e) { console.error('Save error:', e.message); }
}

function getDefaults(dept) {
  if (dept === 'production') return [
    { sku:'PRD-001', name:'Assembly Bracket',  category:'Hardware',   qty:80,  unit:'pcs', location:'Line A',    threshold:20  },
    { sku:'PRD-002', name:'M6 Bolt Set',       category:'Fasteners',  qty:500, unit:'pcs', location:'Bin P1',    threshold:100 },
    { sku:'PRD-003', name:'Safety Gloves L',   category:'PPE',        qty:12,  unit:'prs', location:'Cabinet 1', threshold:10  },
    { sku:'PRD-004', name:'Hydraulic Oil 5L',  category:'Lubricants', qty:3,   unit:'can', location:'Store',     threshold:5   },
    { sku:'PRD-005', name:'Conveyor Belt A',   category:'Machinery',  qty:0,   unit:'pcs', location:'Warehouse', threshold:2   },
  ];
  if (dept === 'electronic') return [
    { sku:'ELC-001', name:'PCB Board Rev3',    category:'Components', qty:42,  unit:'pcs', location:'Shelf E1',  threshold:10 },
    { sku:'ELC-002', name:'Capacitor 100uF',   category:'Components', qty:350, unit:'pcs', location:'Bin E3',    threshold:50 },
    { sku:'ELC-003', name:'HDMI Cable 1m',     category:'Cables',     qty:7,   unit:'pcs', location:'Shelf E2',  threshold:10 },
    { sku:'ELC-004', name:'Power Supply 12V',  category:'Power',      qty:0,   unit:'pcs', location:'Shelf E4',  threshold:5  },
    { sku:'ELC-005', name:'Arduino Mega',      category:'Controllers',qty:15,  unit:'pcs', location:'Shelf E5',  threshold:5  },
  ];
  return [];
}

// ── WebSocket (zero deps) ─────────────────────────────────
let wsClients = [];

function wsHandshake(req, socket) {
  const accept = crypto.createHash('sha1')
    .update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
}

function wsEncode(msg) {
  const buf = Buffer.from(JSON.stringify(msg));
  const len = buf.length;
  const f = len < 126 ? Buffer.alloc(2+len) : Buffer.alloc(4+len);
  f[0] = 0x81;
  if (len < 126) { f[1] = len; buf.copy(f, 2); }
  else { f[1] = 126; f.writeUInt16BE(len, 2); buf.copy(f, 4); }
  return f;
}

function wsDecode(buf) {
  try {
    const masked = (buf[1] & 0x80) !== 0;
    let len = buf[1] & 0x7f, off = 2;
    if (len === 126) { len = buf.readUInt16BE(2); off = 4; }
    const mask = masked ? buf.slice(off, off+4) : null;
    off += masked ? 4 : 0;
    const data = Buffer.alloc(len);
    for (let i = 0; i < len; i++) data[i] = masked ? buf[off+i]^mask[i%4] : buf[off+i];
    return JSON.parse(data.toString());
  } catch { return null; }
}

function broadcast(msg) {
  const frame = wsEncode(msg);
  wsClients = wsClients.filter(c => !c.destroyed);
  wsClients.forEach(c => { try { c.write(frame); } catch {} });
}

// ── HTTP handler ──────────────────────────────────────────
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.ico':'image/x-icon' };

function handleRequest(req, res) {
  if (req.url.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const dm = req.url.match(/^\/api\/(production|electronic)(\/.*)?$/);
    if (!dm) { res.writeHead(404); res.end(JSON.stringify({error:'Unknown dept'})); return; }

    const dept = dm[1], sub = dm[2] || '/';
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const p = body ? (() => { try { return JSON.parse(body); } catch { return {}; } })() : {};
      const db = loadDept(dept);

      if (req.method === 'GET' && sub === '/data') {
        res.writeHead(200); res.end(JSON.stringify(db)); return;
      }

      if (req.method === 'POST' && sub === '/inventory') {
        if (!p.sku || !p.name) { res.writeHead(400); res.end(JSON.stringify({error:'SKU and name required'})); return; }
        if (db.inventory.find(i => i.sku === p.sku)) { res.writeHead(409); res.end(JSON.stringify({error:'SKU already exists'})); return; }
        const item = { sku:p.sku, name:p.name, category:p.category||'', qty:parseInt(p.qty)||0, unit:p.unit||'pcs', location:p.location||'', threshold:parseInt(p.threshold)||5 };
        db.inventory.push(item);
        saveDept(dept, db); broadcast({ type:'sync', dept, data:db });
        res.writeHead(200); res.end(JSON.stringify({ ok:true, item })); return;
      }

      const im = sub.match(/^\/inventory\/([^/]+)$/);

      if (req.method === 'PUT' && im) {
        const sku = decodeURIComponent(im[1]);
        const idx = db.inventory.findIndex(i => i.sku === sku);
        if (idx === -1) { res.writeHead(404); res.end(JSON.stringify({error:'Not found'})); return; }
        db.inventory[idx] = { ...db.inventory[idx], ...p, sku };
        saveDept(dept, db); broadcast({ type:'sync', dept, data:db });
        res.writeHead(200); res.end(JSON.stringify({ ok:true })); return;
      }

      if (req.method === 'DELETE' && im) {
        const sku = decodeURIComponent(im[1]);
        db.inventory = db.inventory.filter(i => i.sku !== sku);
        saveDept(dept, db); broadcast({ type:'sync', dept, data:db });
        res.writeHead(200); res.end(JSON.stringify({ ok:true })); return;
      }

      if (req.method === 'POST' && sub === '/transfer') {
        const { type, sku, qty, notes, user } = p;
        const item = db.inventory.find(i => i.sku.toLowerCase() === (sku||'').toLowerCase());
        if (!item) { res.writeHead(404); res.end(JSON.stringify({error:'Item not found: '+sku})); return; }
        const q = parseInt(qty);
        if (!q || q <= 0) { res.writeHead(400); res.end(JSON.stringify({error:'Invalid quantity'})); return; }
        if (type === 'out' && item.qty < q) { res.writeHead(400); res.end(JSON.stringify({error:'Only '+item.qty+' '+item.unit+' available'})); return; }
        item.qty += type === 'in' ? q : -q;
        const tx = { id:Date.now()+Math.random().toString(36).slice(2,6), type, sku:item.sku, name:item.name, qty:q, notes:notes||'', user:user||'Worker', time:Date.now() };
        db.history.unshift(tx);
        if (db.history.length > 2000) db.history.length = 2000;
        saveDept(dept, db); broadcast({ type:'sync', dept, data:db });
        res.writeHead(200); res.end(JSON.stringify({ ok:true, item, tx })); return;
      }

      res.writeHead(404); res.end(JSON.stringify({error:'Not found'}));
    });
    return;
  }

  let fp = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  fp = path.join(__dirname, 'public', fp);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' });
    res.end(data);
  });
}

// ── Start ─────────────────────────────────────────────────
ensureCerts();

const httpsServer = https.createServer(
  { key: fs.readFileSync(KEY_FILE), cert: fs.readFileSync(CERT_FILE) },
  handleRequest
);

httpsServer.on('upgrade', (req, socket) => {
  if (req.headers.upgrade !== 'websocket') { socket.destroy(); return; }
  wsHandshake(req, socket);
  wsClients.push(socket);
  socket.on('data', buf => { const m = wsDecode(buf); if (m) broadcast(m); });
  socket.on('close', () => { wsClients = wsClients.filter(c => c !== socket); });
  socket.on('error', () => { wsClients = wsClients.filter(c => c !== socket); });
  DEPTS.forEach(d => socket.write(wsEncode({ type:'sync', dept:d, data:loadDept(d) })));
});

const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${getLocalIP()}:${HTTPS_PORT}${req.url}` });
  res.end();
});

httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║    STOCKR — Inventory Server (2 Depts)       ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Local:   https://localhost:${HTTPS_PORT}           ║`);
  console.log(`║  Network: https://${ip}:${HTTPS_PORT}      ║`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Departments: Production | Electronic        ║');
  console.log('║  ⚠  First visit: tap Advanced → Proceed      ║');
  console.log('╚══════════════════════════════════════════════╝\n');
});

httpServer.listen(HTTP_PORT, '0.0.0.0');
