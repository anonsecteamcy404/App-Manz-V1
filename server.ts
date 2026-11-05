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
const MEDIA_CACHE_DIR = path.resolve('.baileys_media');

app.use(express.json({ limit: '50mb' }));

if (!fs.existsSync(MEDIA_CACHE_DIR)) {
  fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
}
app.use('/api/media-file', express.static(MEDIA_CACHE_DIR));

export interface ModSettings {
  antiBlueTick: boolean;
  antiBlueTickOnReply: boolean;
  antiViewOnce: boolean;
  autoSaveStatus: boolean;
  antiRevokeMessage: boolean;
  hideOnlineStatus: boolean;
  antiBanGuard: {
    enabled: boolean;
    humanTypingSimulation: boolean;
    adaptiveJitterDelay: boolean;
    invisibleZeroWidthVariation: boolean;
    autoWarmupNewContacts: boolean;
    minDelayMs: number;
    maxDelayMs: number;
  };
}

interface BoomState {
  isRunning: boolean;
  chatId: string;
  text?: string;
  total: number;
  sent: number;
  currentDelayMs: number;
  lastError: string | null;
  cancelRequested: boolean;
}

interface WAState {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';
  qrCodeDataUrl: string | null;
  rawQr: string | null;
  pairingCode: string | null;
  user: { id: string; name?: string; phone?: string; avatar?: string } | null;
  errorMessage: string | null;
  chats: Map<string, any>;
  messages: Map<string, any[]>;
  contacts: Map<string, any>;
  stories: Map<string, any>;
  calls: any[];
  lastConnectedTimestamp: number | null;
  modConfig: ModSettings;
  boomStatus: BoomState;
  knownInteractedJids: Set<string>;
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
  contacts: new Map(),
  stories: new Map(),
  calls: [],
  lastConnectedTimestamp: null,
  knownInteractedJids: new Set(),
  modConfig: {
    antiBlueTick: true,
    antiBlueTickOnReply: true,
    antiViewOnce: true,
    autoSaveStatus: true,
    antiRevokeMessage: true,
    hideOnlineStatus: false,
    antiBanGuard: {
      enabled: true,
      humanTypingSimulation: true,
      adaptiveJitterDelay: true,
      invisibleZeroWidthVariation: true,
      autoWarmupNewContacts: true,
      minDelayMs: 1400,
      maxDelayMs: 3200,
    },
  },
  boomStatus: {
    isRunning: false,
    chatId: '',
    total: 0,
    sent: 0,
    currentDelayMs: 0,
    lastError: null,
    cancelRequested: false,
  },
};

let waSocket: WASocket | null = null;
let isStarting = false;

function generateAvatarSvg(name: string, bg = '#10b981'): string {
  const initials = (name || 'WA')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'WA';
  const encodedBg = encodeURIComponent(bg);
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${encodedBg}"/><text x="50" y="58" font-size="32" font-weight="bold" fill="white" font-family="sans-serif" text-anchor="middle">${initials}</text></svg>`;
}

function formatBytesServer(bytes: number): string {
  if (!bytes || bytes === 0) return '120 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Unwraps ViewOnce (1x Lihat) or Ephemeral message wrappers so we can access the inner media/text
 */
function unwrapMessageContent(message: any): { innerMessage: any; isViewOnce: boolean } {
  if (!message) return { innerMessage: null, isViewOnce: false };

  if (message.ephemeralMessage?.message) {
    return unwrapMessageContent(message.ephemeralMessage.message);
  }
  if (message.viewOnceMessage?.message) {
    return { innerMessage: message.viewOnceMessage.message, isViewOnce: true };
  }
  if (message.viewOnceMessageV2?.message) {
    return { innerMessage: message.viewOnceMessageV2.message, isViewOnce: true };
  }
  if (message.viewOnceMessageV2Extension?.message) {
    return { innerMessage: message.viewOnceMessageV2Extension.message, isViewOnce: true };
  }
  if (message.documentWithCaptionMessage?.message) {
    return unwrapMessageContent(message.documentWithCaptionMessage.message);
  }

  const hasViewOnceFlag =
    Boolean(message.imageMessage?.viewOnce) ||
    Boolean(message.videoMessage?.viewOnce) ||
    Boolean(message.audioMessage?.viewOnce);

  return { innerMessage: message, isViewOnce: hasViewOnceFlag };
}

/**
 * Adds invisible zero-width non-joiner characters at varying positions so WhatsApp's
 * automated spam hash detector sees each message as cryptographically distinct while looking identical to humans.
 */
function applyAntiBanTextVariation(text: string, index: number): string {
  if (!waState.modConfig.antiBanGuard.enabled || !waState.modConfig.antiBanGuard.invisibleZeroWidthVariation) {
    return text;
  }
  const zwChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
  const suffixLen = (index % 5) + 1;
  let invisibleSuffix = '';
  for (let i = 0; i < suffixLen; i++) {
    invisibleSuffix += zwChars[(index + i) % zwChars.length];
  }
  return `${text}${invisibleSuffix}`;
}

/**
 * Safe Anti-Ban message sender with human presence simulation, typing duration, and new-contact warm-up
 */
async function sendSafeAntiBanMessage(
  sock: WASocket,
  jid: string,
  content: any,
  msgIndex = 0
): Promise<any> {
  const guard = waState.modConfig.antiBanGuard;

  if (guard.enabled) {
    // 1. Auto Warm-up for new contacts (prevents instant block when messaging unsaved numbers)
    if (guard.autoWarmupNewContacts && !waState.knownInteractedJids.has(jid)) {
      try {
        await sock.presenceSubscribe(jid);
        await new Promise((r) => setTimeout(r, 450 + Math.floor(Math.random() * 400)));
      } catch {}
      waState.knownInteractedJids.add(jid);
    }

    // 2. Human typing simulation (composing -> wait -> paused)
    if (guard.humanTypingSimulation && !waState.modConfig.hideOnlineStatus) {
      try {
        await sock.sendPresenceUpdate('composing', jid);
        const textLen = typeof content?.text === 'string' ? content.text.length : 12;
        const typingMs = Math.min(1800, Math.max(350, textLen * 28 + Math.floor(Math.random() * 300)));
        await new Promise((r) => setTimeout(r, typingMs));
        await sock.sendPresenceUpdate('paused', jid);
      } catch {}
    }
  }

  if (typeof content?.text === 'string') {
    content = {
      ...content,
      text: applyAntiBanTextVariation(content.text, msgIndex),
    };
  }

  return await sock.sendMessage(jid, content);
}

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
    const {
      useMultiFileAuthState,
      fetchLatestBaileysVersion,
      DisconnectReason,
      downloadMediaMessage,
    } = baileys;

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const logger = pino({ level: 'silent' });

    const sock: WASocket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ['Mac OS', 'Safari', '18.1.0'],
      syncFullHistory: true,
      markOnlineOnConnect: !waState.modConfig.hideOnlineStatus,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });
    waSocket = sock;

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

    sock.ev.on('creds.update', saveCreds);

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

        waState.status = 'disconnected';
        waState.user = null;
        waState.qrCodeDataUrl = null;

        if (shouldReconnect) {
          setTimeout(() => {
            isStarting = false;
            startWhatsApp();
          }, 3000);
        } else {
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          isStarting = false;
        }
      } else if (connection === 'open') {
        waState.status = 'connected';
        waState.qrCodeDataUrl = null;
        waState.rawQr = null;
        waState.lastConnectedTimestamp = Date.now();

        if (sock.user) {
          const rawId = sock.user.id;
          const phone = rawId.split(':')[0] || rawId.split('@')[0];
          const displayName = sock.user.name || `+${phone}`;
          waState.user = {
            id: rawId,
            name: displayName,
            phone: `+${phone}`,
            avatar: generateAvatarSvg(displayName, '#059669'),
          };
        }

        if (waState.modConfig.hideOnlineStatus) {
          try {
            await sock.sendPresenceUpdate('unavailable');
          } catch {}
        }
        isStarting = false;
      }
    });

    // Helper to process a single WAMessage (handles history sync, normal messages, ViewOnce, Status broadcasts, and Anti-Revoke)
    const processIncomingMessage = async (msg: any) => {
      if (!msg?.key?.remoteJid) return;
      const remoteJid = msg.key.remoteJid;
      if (remoteJid === 'status@broadcast') {
        // Handle Status / Story Broadcast!
        const participant = msg.key.participant || msg.participant || 'status_user';
        if (!participant) return;

        const { innerMessage } = unwrapMessageContent(msg.message);
        if (!innerMessage) return;

        const contactObj = waState.contacts.get(participant);
        const senderName = msg.pushName || contactObj?.name || `+${participant.split('@')[0]}`;
        const time = new Date(((msg.messageTimestamp as number) || Math.floor(Date.now() / 1000)) * 1000);
        const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        let storyType: 'image' | 'video' | 'text' = 'text';
        let contentUrlOrText =
          innerMessage.extendedTextMessage?.text ||
          innerMessage.conversation ||
          innerMessage.imageMessage?.caption ||
          innerMessage.videoMessage?.caption ||
          'Pembaruan Status';
        let caption = innerMessage.imageMessage?.caption || innerMessage.videoMessage?.caption || '';
        let fileName = `Status_${senderName.replace(/[^a-zA-Z0-9]/g, '_')}_${msg.key.id}.jpg`;
        let mimeType = 'text/plain';

        if (innerMessage.imageMessage || innerMessage.videoMessage) {
          const isVideo = Boolean(innerMessage.videoMessage);
          storyType = isVideo ? 'video' : 'image';
          const mediaMsg = innerMessage.imageMessage || innerMessage.videoMessage;
          mimeType = mediaMsg?.mimetype || (isVideo ? 'video/mp4' : 'image/jpeg');
          const ext = isVideo ? 'mp4' : 'jpg';
          fileName = `Status_${senderName.replace(/[^a-zA-Z0-9]/g, '_')}_${msg.key.id}.${ext}`;

          if (waState.modConfig.autoSaveStatus) {
            try {
              const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                { logger, reuploadRequest: sock.updateMediaMessage }
              );
              if (buffer) {
                const savedPath = path.join(MEDIA_CACHE_DIR, fileName);
                fs.writeFileSync(savedPath, buffer);
                contentUrlOrText = `/api/media-file/${encodeURIComponent(fileName)}`;
              }
            } catch (e) {
              // Fallback if media download fails on older status
            }
          }
        }

        const existingStory = waState.stories.get(participant) || {
          id: `story_${participant}`,
          contactId: participant,
          contactName: senderName,
          contactAvatar: generateAvatarSvg(senderName, '#6366f1'),
          updatedAt: `Hari ini, ${timeStr}`,
          stories: [],
        };

        if (!existingStory.stories.some((s: any) => s.id === msg.key.id)) {
          existingStory.stories.push({
            id: msg.key.id || `st_${Date.now()}`,
            type: storyType,
            content: contentUrlOrText,
            caption,
            timestamp: timeStr,
            seen: false,
            fileName,
            mimeType,
          });
          existingStory.updatedAt = `Hari ini, ${timeStr}`;
          waState.stories.set(participant, existingStory);
        }
        return;
      }

      // Ignore broadcast/newsletter channels if empty
      if (remoteJid.endsWith('@broadcast')) return;

      waState.knownInteractedJids.add(remoteJid);

      // Check for message revoke (protocolMessage REVOKE)
      const protoMsg = msg.message?.protocolMessage;
      if (protoMsg && protoMsg.type === 0 && protoMsg.key?.id) {
        const targetId = protoMsg.key.id;
        const chatMsgs = waState.messages.get(remoteJid) || [];
        const updated = chatMsgs.map((m) =>
          m.id === targetId
            ? {
                ...m,
                isRevoked: true,
                text: `${m.text || ''} [🛡️ Anti-Delete: Pesan ini telah dihapus oleh pengirim]`.trim(),
              }
            : m
        );
        waState.messages.set(remoteJid, updated);
        return;
      }

      const { innerMessage, isViewOnce } = unwrapMessageContent(msg.message);
      if (!innerMessage) return;

      const isOut = Boolean(msg.key.fromMe);
      const text =
        innerMessage.conversation ||
        innerMessage.extendedTextMessage?.text ||
        innerMessage.imageMessage?.caption ||
        innerMessage.videoMessage?.caption ||
        innerMessage.documentMessage?.caption ||
        '';

      const rawTs = (msg.messageTimestamp as number) || Math.floor(Date.now() / 1000);
      const time = new Date(rawTs * 1000);
      const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const fullTimeStr = `${time.toLocaleDateString('id-ID')}, ${timeStr}`;

      const attachments: any[] = [];
      const hasMedia =
        innerMessage.imageMessage ||
        innerMessage.videoMessage ||
        innerMessage.audioMessage ||
        innerMessage.documentMessage;

      if (hasMedia) {
        let attType: 'image' | 'video' | 'audio' | 'document' = 'document';
        let mimeType = 'application/octet-stream';
        let ext = 'bin';
        let fileSize = '150 KB';
        let duration: string | undefined;
        let origName = '';

        if (innerMessage.imageMessage) {
          attType = 'image';
          mimeType = innerMessage.imageMessage.mimetype || 'image/jpeg';
          ext = 'jpg';
          fileSize = formatBytesServer(Number(innerMessage.imageMessage.fileLength || 180000));
        } else if (innerMessage.videoMessage) {
          attType = 'video';
          mimeType = innerMessage.videoMessage.mimetype || 'video/mp4';
          ext = 'mp4';
          fileSize = formatBytesServer(Number(innerMessage.videoMessage.fileLength || 1200000));
          if (innerMessage.videoMessage.seconds) {
            duration = `0:${String(innerMessage.videoMessage.seconds).padStart(2, '0')}`;
          }
        } else if (innerMessage.audioMessage) {
          attType = 'audio';
          mimeType = innerMessage.audioMessage.mimetype || 'audio/ogg';
          ext = 'ogg';
          fileSize = formatBytesServer(Number(innerMessage.audioMessage.fileLength || 64000));
          const secs = innerMessage.audioMessage.seconds || 15;
          duration = `0:${String(secs).padStart(2, '0')}`;
        } else if (innerMessage.documentMessage) {
          attType = 'document';
          mimeType = innerMessage.documentMessage.mimetype || 'application/pdf';
          origName = innerMessage.documentMessage.fileName || '';
          ext = origName.split('.').pop() || 'pdf';
          fileSize = formatBytesServer(Number(innerMessage.documentMessage.fileLength || 450000));
        }

        const safeId = (msg.key.id || `${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
        const finalFileName =
          origName || `${isViewOnce ? 'VIEWONCE_UNLOCKED_' : 'WA_'}${attType.toUpperCase()}_${safeId}.${ext}`;
        let fileUrl = '';

        try {
          const buffer = await downloadMediaMessage(
            { ...msg, message: innerMessage },
            'buffer',
            {},
            { logger, reuploadRequest: sock.updateMediaMessage }
          );
          if (buffer) {
            const savedPath = path.join(MEDIA_CACHE_DIR, finalFileName);
            fs.writeFileSync(savedPath, buffer);
            fileUrl = `/api/media-file/${encodeURIComponent(finalFileName)}`;
          }
        } catch (err) {
          // Media might be expired on server during old history sync
        }

        attachments.push({
          id: `att_${safeId}`,
          type: attType,
          url: fileUrl,
          fileName: finalFileName,
          fileSize,
          duration,
          mimeType,
          isViewOnce,
        });
      }

      if (!text && attachments.length === 0) return;

      const contactInfo = waState.contacts.get(remoteJid);
      const fallbackPhone = `+${remoteJid.split('@')[0]}`;
      const senderName = isOut
        ? waState.user?.name || 'Anda'
        : msg.pushName || contactInfo?.name || fallbackPhone;

      const parsedMsg = {
        id: msg.key.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        chatId: remoteJid,
        senderId: isOut ? 'me' : remoteJid,
        senderName,
        isOutgoing: isOut,
        text: isViewOnce && !text ? '🔓 [Media 1x Lihat Terbuka Otomatis]' : text,
        timestamp: timeStr,
        fullTimestamp: fullTimeStr,
        status: isOut ? 'read' : 'delivered',
        isViewOnce,
        attachments: attachments.length > 0 ? attachments : undefined,
        rawKey: msg.key,
      };

      const existingMsgs = waState.messages.get(remoteJid) || [];
      if (!existingMsgs.some((m) => m.id === parsedMsg.id)) {
        const updatedMsgs = [...existingMsgs, parsedMsg];
        waState.messages.set(remoteJid, updatedMsgs);

        const existingChat = waState.chats.get(remoteJid);
        const chatName =
          existingChat?.name ||
          contactInfo?.name ||
          (!isOut && msg.pushName ? msg.pushName : fallbackPhone);

        waState.chats.set(remoteJid, {
          id: remoteJid,
          name: chatName,
          isGroup: remoteJid.endsWith('@g.us'),
          avatar: existingChat?.avatar || generateAvatarSvg(chatName, remoteJid.endsWith('@g.us') ? '#0ea5e9' : '#10b981'),
          unreadCount: isOut ? 0 : (existingChat?.unreadCount || 0) + 1,
          isPinned: existingChat?.isPinned || false,
          isArchived: false,
          isMuted: existingChat?.isMuted || false,
          lastMessage: parsedMsg,
        });
      }
    };

    // Full history sync event when linking device
    sock.ev.on('messaging-history.set', async ({ chats, contacts, messages }) => {
      contacts.forEach((c: any) => {
        if (!c?.id) return;
        const name = c.name || c.notify || c.verifiedName || `+${c.id.split('@')[0]}`;
        waState.contacts.set(c.id, {
          id: c.id,
          name,
          phone: `+${c.id.split('@')[0]}`,
          about: 'Kontak WhatsApp',
          avatar: generateAvatarSvg(name, '#6366f1'),
          isOnline: true,
        });
      });

      chats.forEach((c: any) => {
        if (!c?.id || c.id === 'status@broadcast' || c.id.endsWith('@broadcast')) return;
        const contactInfo = waState.contacts.get(c.id);
        const name = c.name || contactInfo?.name || `+${c.id.split('@')[0]}`;
        const existing = waState.chats.get(c.id) || {};
        waState.chats.set(c.id, {
          ...existing,
          id: c.id,
          name,
          isGroup: c.id.endsWith('@g.us'),
          avatar: existing.avatar || generateAvatarSvg(name, c.id.endsWith('@g.us') ? '#0ea5e9' : '#10b981'),
          unreadCount: c.unreadCount || 0,
          isPinned: Boolean(c.pinned),
          isArchived: Boolean(c.archived),
          isMuted: Boolean(c.muteEndTime),
        });
      });

      for (const m of messages.slice(-150)) {
        await processIncomingMessage(m);
      }
    });

    sock.ev.on('contacts.upsert', (contacts) => {
      contacts.forEach((c) => {
        if (!c.id) return;
        const name = c.name || c.notify || `+${c.id.split('@')[0]}`;
        waState.contacts.set(c.id, {
          id: c.id,
          name,
          phone: `+${c.id.split('@')[0]}`,
          about: 'Kontak WhatsApp',
          avatar: generateAvatarSvg(name, '#6366f1'),
          isOnline: true,
        });
        const existingChat = waState.chats.get(c.id);
        if (existingChat) {
          existingChat.name = name;
          waState.chats.set(c.id, existingChat);
        }
      });
    });

    sock.ev.on('chats.upsert', (chats) => {
      chats.forEach((c) => {
        if (!c.id || c.id === 'status@broadcast' || c.id.endsWith('@broadcast')) return;
        const existing = waState.chats.get(c.id) || {};
        const contactInfo = waState.contacts.get(c.id);
        const name = c.name || existing.name || contactInfo?.name || `+${c.id.split('@')[0]}`;
        waState.chats.set(c.id, {
          ...existing,
          id: c.id,
          name,
          isGroup: c.id.endsWith('@g.us'),
          avatar: existing.avatar || generateAvatarSvg(name, c.id.endsWith('@g.us') ? '#0ea5e9' : '#10b981'),
          unreadCount: c.unreadCount ?? existing.unreadCount ?? 0,
          isPinned: existing.isPinned ?? false,
          isArchived: false,
          isMuted: existing.isMuted ?? false,
        });
      });
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        await processIncomingMessage(msg);
      }
    });

    // Real Incoming / Outgoing Call Events
    sock.ev.on('call', (callEvents) => {
      callEvents.forEach((call) => {
        const callerId = call.from || call.chatId || 'unknown@s.whatsapp.net';
        const contact = waState.contacts.get(callerId);
        const callerName = contact?.name || `+${callerId.split('@')[0]}`;
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const existingIdx = waState.calls.findIndex((c) => c.id === call.id);
        const callRecord = {
          id: call.id,
          contactId: callerId,
          contactName: callerName,
          contactAvatar: generateAvatarSvg(callerName, '#ec4899'),
          type: call.isVideo ? 'video' : 'audio',
          direction: call.status === 'reject' || call.status === 'timeout' ? 'missed' : 'incoming',
          timestamp: `Hari ini, ${timeStr}`,
          duration: call.status === 'accept' ? 'Tersambung' : call.status,
        };

        if (existingIdx >= 0) {
          waState.calls[existingIdx] = callRecord;
        } else {
          waState.calls.unshift(callRecord);
        }
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
    modConfig: waState.modConfig,
    boomStatus: waState.boomStatus,
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
    waState.stories.clear();
    waState.calls = [];
    res.json({ success: true, message: 'Berhasil keluar dan menghapus sesi.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/whatsapp/chats', (_req: Request, res: Response) => {
  const chatList = Array.from(waState.chats.values())
    .map((chat) => {
      const msgs = waState.messages.get(chat.id) || [];
      return {
        ...chat,
        messages: msgs,
        lastMessage: chat.lastMessage || msgs[msgs.length - 1] || {
          id: 'empty',
          chatId: chat.id,
          senderId: chat.id,
          senderName: chat.name,
          isOutgoing: false,
          text: 'Ketuk untuk mulai percakapan',
          timestamp: '',
          fullTimestamp: '',
          status: 'read',
        },
      };
    })
    .filter((c) => c.messages.length > 0 || c.name);

  res.json({
    chats: chatList,
    contacts: Array.from(waState.contacts.values()),
    stories: Array.from(waState.stories.values()),
    calls: waState.calls,
    isReal: waState.status === 'connected',
  });
});

// Mark chat read locally (and only send blue ticks to WhatsApp if antiBlueTick is OFF!)
app.post('/api/whatsapp/read', async (req: Request, res: Response) => {
  const { chatId } = req.body;
  if (!chatId) return res.status(400).json({ error: 'chatId required' });

  const chat = waState.chats.get(chatId);
  if (chat) {
    chat.unreadCount = 0;
    waState.chats.set(chatId, chat);
  }

  // Stealth Blue Tick Control: ONLY send readMessages if antiBlueTick is FALSE
  if (!waState.modConfig.antiBlueTick && waSocket && waState.status === 'connected') {
    const msgs = waState.messages.get(chatId) || [];
    const unreadKeys = msgs.filter((m) => !m.isOutgoing && m.rawKey).map((m) => m.rawKey);
    if (unreadKeys.length > 0) {
      try {
        await waSocket.readMessages(unreadKeys);
      } catch {}
    }
  }

  res.json({ success: true, stealthActive: waState.modConfig.antiBlueTick });
});

// Update Mod & Anti-Ban Configuration
app.post('/api/whatsapp/mod-config', async (req: Request, res: Response) => {
  const updates = req.body || {};
  waState.modConfig = {
    ...waState.modConfig,
    ...updates,
    antiBanGuard: {
      ...waState.modConfig.antiBanGuard,
      ...(updates.antiBanGuard || {}),
    },
  };

  if (waSocket && waState.status === 'connected') {
    try {
      await waSocket.sendPresenceUpdate(waState.modConfig.hideOnlineStatus ? 'unavailable' : 'available');
    } catch {}
  }

  res.json({ success: true, modConfig: waState.modConfig });
});

// Send Single Message (with Anti-Blue-Tick-On-Reply and Anti-Ban Guard)
app.post('/api/whatsapp/send', async (req: Request, res: Response) => {
  const { chatId, text } = req.body;
  if (!waSocket || waState.status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp belum terhubung. Silakan pindai QR terlebih dahulu.' });
  }
  if (!chatId || !text) {
    return res.status(400).json({ error: 'chatId dan text wajib diisi.' });
  }

  try {
    const formattedJid = chatId.includes('@') ? chatId : `${chatId.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

    // Notice: even when replying, if antiBlueTickOnReply is enabled, we DO NOT call sock.readMessages()!
    if (!waState.modConfig.antiBlueTickOnReply && !waState.modConfig.antiBlueTick) {
      const msgs = waState.messages.get(formattedJid) || [];
      const unreadKeys = msgs.filter((m) => !m.isOutgoing && m.rawKey).map((m) => m.rawKey);
      if (unreadKeys.length > 0) {
        try {
          await waSocket.readMessages(unreadKeys);
        } catch {}
      }
    }

    const sent = await sendSafeAntiBanMessage(waSocket, formattedJid, { text }, 0);
    res.json({ success: true, sent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Chat Boom / Auto-Repeater with Anti-Ban Smart Queue
app.post('/api/whatsapp/boom', async (req: Request, res: Response) => {
  const { chatId, text, count } = req.body;
  if (!waSocket || waState.status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp belum terhubung.' });
  }
  if (!chatId || !text || !count) {
    return res.status(400).json({ error: 'chatId, pesan, dan jumlah kirim wajib diisi.' });
  }
  if (waState.boomStatus.isRunning) {
    return res.status(400).json({ error: 'Chat Boom sedang berjalan. Hentikan terlebih dahulu jika ingin memulai baru.' });
  }

  const totalToSend = Math.min(Math.max(1, Number(count)), 500);
  const formattedJid = chatId.includes('@') ? chatId : `${chatId.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

  waState.boomStatus = {
    isRunning: true,
    chatId: formattedJid,
    text,
    total: totalToSend,
    sent: 0,
    currentDelayMs: 0,
    lastError: null,
    cancelRequested: false,
  };

  // Run boom asynchronously in background with Anti-Ban Adaptive Jitter
  (async () => {
    const sock = waSocket;
    if (!sock) return;

    for (let i = 0; i < totalToSend; i++) {
      if (waState.boomStatus.cancelRequested || waState.status !== 'connected') {
        break;
      }

      try {
        await sendSafeAntiBanMessage(sock, formattedJid, { text }, i);
        waState.boomStatus.sent = i + 1;

        // Add optimistic message to local state if not echoed yet
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const fullTimeStr = `${now.toLocaleDateString('id-ID')}, ${timeStr}`;
        const localMsg = {
          id: `boom_${Date.now()}_${i}`,
          chatId: formattedJid,
          senderId: 'me',
          senderName: waState.user?.name || 'Anda',
          isOutgoing: true,
          text,
          timestamp: timeStr,
          fullTimestamp: fullTimeStr,
          status: 'read',
        };
        const existingMsgs = waState.messages.get(formattedJid) || [];
        waState.messages.set(formattedJid, [...existingMsgs, localMsg]);
      } catch (err: any) {
        waState.boomStatus.lastError = err?.message || 'Gagal mengirim pesan';
      }

      if (i < totalToSend - 1 && !waState.boomStatus.cancelRequested) {
        const guard = waState.modConfig.antiBanGuard;
        let delayMs = 600;
        if (guard.enabled && guard.adaptiveJitterDelay) {
          const min = Math.max(400, guard.minDelayMs || 1200);
          const max = Math.max(min + 300, guard.maxDelayMs || 2800);
          delayMs = min + Math.floor(Math.random() * (max - min));
          // Extra cooldown pause every 10 messages to bypass rate-limit buckets
          if ((i + 1) % 10 === 0) {
            delayMs += 2500;
          }
        }
        waState.boomStatus.currentDelayMs = delayMs;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    waState.boomStatus.isRunning = false;
  })();

  res.json({
    success: true,
    message: `Chat Boom dimulai: mengirim "${text}" sebanyak ${totalToSend}x dengan proteksi Anti-Ban.`,
    boomStatus: waState.boomStatus,
  });
});

app.post('/api/whatsapp/boom/stop', (_req: Request, res: Response) => {
  waState.boomStatus.cancelRequested = true;
  waState.boomStatus.isRunning = false;
  res.json({ success: true, boomStatus: waState.boomStatus });
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
      '.baileys_media',
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

    const readmeContent = `# iGlass WA Companion - Real Multi-Device + Mod & Anti-Ban Edition

Aplikasi Full-Stack WhatsApp Companion (Perangkat Tertaut Real) dengan antarmuka **Apple iOS Liquid Glassmorphism**, fitur **Mod Privasi & Anti-Ban**, **Chat Boom**, **Pembuka Foto/Video 1x Lihat**, **Pengunduh Status**, dan **Ekspor Otomatis**.

## Cara Menjalankan & Build Secara Lokal

Pastikan Anda telah menginstal **Node.js v20+ (direkomendasikan v22 LTS)**.

### 1. Instal Dependensi
\`\`\`bash
npm install
\`\`\`

### 2. Jalankan Server Full-Stack
\`\`\`bash
npm run dev
\`\`\`
Buka \`http://localhost:3000\` di browser Anda, lalu scan QR Code menggunakan aplikasi WhatsApp di HP Anda.
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
