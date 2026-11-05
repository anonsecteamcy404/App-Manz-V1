import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import type { WASocket } from '@whiskeysockets/baileys';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const AUTH_DIR = path.resolve('.baileys_auth');

app.use(express.json());

// Persistent state for WhatsApp connection
interface WAState {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';
  qrCodeDataUrl: string | null;
  rawQr: string | null;
  pairingCode: string | null;
  user: { id: string; name?: string; phone?: string } | null;
  errorMessage: string | null;
  chats: Map<string, any>;
  messages: Map<string, any[]>;
  lastConnectedTimestamp: number | null;
}

const waState: WAState = {
  status: 'disconnected',
  qrCodeDataUrl: null,
  rawQr: null,
  pairingCode: null,
  user: null,
  errorMessage: null,
  chats: new Map(),
  messages: new Map(),
  lastConnectedTimestamp: null,
};

let waSocket: WASocket | null = null;
let isStarting = false;

async function startWhatsApp(pairingPhone?: string): Promise<void> {
  if (isStarting) return;
  isStarting = true;
  waState.status = 'connecting';
  waState.errorMessage = null;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket: any = typeof baileys.default === 'function' ? baileys.default : baileys.makeWASocket;
    const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'silent' });

    const sock: WASocket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ['iGlass WA Companion', 'Safari', '18.1.0'],
      syncFullHistory: true,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    });
    waSocket = sock;

    // Handle pairing code by phone number if requested and not yet registered
    if (pairingPhone && !state.creds.registered) {
      setTimeout(async () => {
        try {
          const cleanedPhone = pairingPhone.replace(/[^0-9]/g, '');
          if (waSocket && cleanedPhone) {
            const code = await waSocket.requestPairingCode(cleanedPhone);
            waState.pairingCode = code;
          }
        } catch (err: any) {
          console.error('Error generating pairing code:', err?.message || err);
        }
      }, 3000);
    }

    // Credential updates
    sock.ev.on('creds.update', saveCreds);

    // Connection updates (QR code and connection changes)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        waState.rawQr = qr;
        try {
          const dataUrl = await QRCode.toDataURL(qr, {
            margin: 2,
            scale: 8,
            color: { dark: '#022c22', light: '#ffffff' },
          });
          waState.qrCodeDataUrl = dataUrl;
          waState.status = 'qr_ready';
        } catch (err) {
          console.error('QR code generation error:', err);
        }
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('WhatsApp connection closed, reason:', lastDisconnect?.error, 'reconnect:', shouldReconnect);

        waState.status = 'disconnected';
        waState.user = null;
        waState.qrCodeDataUrl = null;

        if (shouldReconnect) {
          setTimeout(() => {
            isStarting = false;
            startWhatsApp();
          }, 3000);
        } else {
          // Logged out: clean auth directory
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          isStarting = false;
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connection opened successfully!');
        waState.status = 'connected';
        waState.qrCodeDataUrl = null;
        waState.rawQr = null;
        waState.lastConnectedTimestamp = Date.now();

        if (sock.user) {
          const rawId = sock.user.id;
          const phone = rawId.split(':')[0] || rawId.split('@')[0];
          waState.user = {
            id: rawId,
            name: sock.user.name || 'Pengguna WhatsApp',
            phone: `+${phone}`,
          };
        }
        isStarting = false;
      }
    });

    // Sync incoming contacts and chats
    sock.ev.on('contacts.upsert', (contacts) => {
      contacts.forEach((c) => {
        if (!c.id) return;
        const existing = waState.chats.get(c.id) || {};
        waState.chats.set(c.id, {
          ...existing,
          id: c.id,
          name: c.name || c.notify || existing.name || c.id.split('@')[0],
        });
      });
    });

    sock.ev.on('chats.upsert', (chats) => {
      chats.forEach((c) => {
        if (!c.id) return;
        const existing = waState.chats.get(c.id) || {};
        waState.chats.set(c.id, {
          ...existing,
          ...c,
          id: c.id,
          name: c.name || existing.name || c.id.split('@')[0],
        });
      });
    });

    // Real incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
      messages.forEach((msg) => {
        if (!msg.key.remoteJid) return;
        const chatId = msg.key.remoteJid;
        const existingMsgs = waState.messages.get(chatId) || [];

        const isOut = !!msg.key.fromMe;
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          '';

        const time = new Date((msg.messageTimestamp as number) * 1000);
        const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const fullTimeStr = `${time.toLocaleDateString('id-ID')}, ${timeStr}`;

        const parsedMsg = {
          id: msg.key.id || `msg_${Date.now()}`,
          chatId,
          senderId: isOut ? 'me' : chatId,
          senderName: isOut ? 'Anda' : msg.pushName || chatId.split('@')[0],
          isOutgoing: isOut,
          text,
          timestamp: timeStr,
          fullTimestamp: fullTimeStr,
          status: isOut ? 'read' : 'delivered',
          rawMessage: msg,
        };

        waState.messages.set(chatId, [...existingMsgs, parsedMsg]);

        // Update chat's last message
        const chat = waState.chats.get(chatId) || {
          id: chatId,
          name: msg.pushName || chatId.split('@')[0],
          isGroup: chatId.endsWith('@g.us'),
          unreadCount: 0,
        };
        chat.lastMessage = parsedMsg;
        waState.chats.set(chatId, chat);
      });
    });
  } catch (err: any) {
    console.error('Failed to start WhatsApp socket:', err);
    waState.status = 'error';
    waState.errorMessage = err?.message || 'Gagal memulai koneksi WhatsApp.';
    isStarting = false;
  }
}

// REST API Endpoints
app.get('/api/whatsapp/status', (_req: Request, res: Response) => {
  res.json({
    status: waState.status,
    qrCodeDataUrl: waState.qrCodeDataUrl,
    pairingCode: waState.pairingCode,
    user: waState.user,
    lastConnected: waState.lastConnectedTimestamp,
    errorMessage: waState.errorMessage,
    totalChats: waState.chats.size,
    isRealConnection: true,
  });
});

app.post('/api/whatsapp/start', async (req: Request, res: Response) => {
  const { phone } = req.body || {};
  await startWhatsApp(phone);
  res.json({ success: true, message: 'Inisialisasi koneksi WhatsApp dimulai.' });
});

app.post('/api/whatsapp/logout', async (_req: Request, res: Response) => {
  try {
    if (waSocket) {
      await waSocket.logout();
      waSocket = null;
    }
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    waState.status = 'disconnected';
    waState.user = null;
    waState.qrCodeDataUrl = null;
    waState.chats.clear();
    waState.messages.clear();
    res.json({ success: true, message: 'Berhasil keluar dan menghapus sesi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/whatsapp/chats', (_req: Request, res: Response) => {
  const chatList = Array.from(waState.chats.values()).map((chat) => {
    const msgs = waState.messages.get(chat.id) || [];
    return {
      ...chat,
      messages: msgs,
    };
  });
  res.json({ chats: chatList, isReal: waState.status === 'connected' });
});

app.post('/api/whatsapp/send', async (req: Request, res: Response) => {
  const { chatId, text } = req.body;
  if (!waSocket || waState.status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp tidak terhubung.' });
  }
  if (!chatId || !text) {
    return res.status(400).json({ error: 'chatId dan text wajib diisi.' });
  }

  try {
    const formattedJid = chatId.includes('@') ? chatId : `${chatId.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    const sent = await waSocket.sendMessage(formattedJid, { text });
    res.json({ success: true, sent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download full project source code as a ready-to-build ZIP archive
app.get('/api/source-zip', async (_req: Request, res: Response) => {
  try {
    const JSZipModule = await import('jszip');
    const JSZip = JSZipModule.default || JSZipModule;
    const zip = new JSZip();

    const excludedDirs = new Set([
      'node_modules',
      'dist',
      '.git',
      '.baileys_auth',
      '.playwright-cli',
      '.aistudio',
    ]);

    const addDirToZip = (dirPath: string, zipFolder: any) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (excludedDirs.has(entry.name)) continue;
        if (entry.name === 'bun.lock' || entry.name.endsWith('.log') || entry.name.endsWith('.zip')) continue;

        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const subFolder = zipFolder.folder(entry.name);
          addDirToZip(fullPath, subFolder);
        } else if (entry.isFile()) {
          const content = fs.readFileSync(fullPath);
          zipFolder.file(entry.name, content);
        }
      }
    };

    addDirToZip(path.resolve('.'), zip);

    // Add a comprehensive README.md for local build & deployment
    const readmeContent = `# iGlass WA Companion - Linked Device & Auto Exporter

Aplikasi Full-Stack WhatsApp Companion (Perangkat Tertaut) dengan antarmuka **Apple iOS Liquid Glassmorphism** dan sistem **Ekspor Otomatis & Manual** (ZIP, HTML, JSON, TXT) menggunakan **Express + Vite + React 19 + Tailwind CSS v4 + @whiskeysockets/baileys**.

## Cara Menjalankan & Build Secara Lokal

Pastikan Anda telah menginstal **Node.js v20+ (direkomendasikan v22 LTS)**.

### 1. Instal Dependensi
\`\`\`bash
npm install
\`\`\`

### 2. Jalankan Mode Development (Full-Stack Server + Vite)
\`\`\`bash
npm run dev
\`\`\`
Buka \`http://localhost:3000\` di browser Anda.

### 3. Build untuk Production
\`\`\`bash
npm run build
\`\`\`

### 4. Jalankan Server Production
\`\`\`bash
NODE_ENV=production npm start
\`\`\`
`;
    zip.file('README.md', readmeContent);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="iGlass-WA-Companion-SourceCode.zip"');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating source zip:', err);
    res.status(500).json({ error: err?.message || 'Gagal membuat arsip source code.' });
  }
});

// Mount Vite or serve static
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`iGlass WhatsApp Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
