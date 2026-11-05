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

interface RawMediaEntry {
  rawMsg?: any;
  innerMedia?: any;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  fileName: string;
  mimeType: string;
  thumbnailBuffer?: Buffer;
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
  rawMediaMessages: Map<string, RawMediaEntry>;
  contacts: Map<string, any>;
  profilePics: Map<string, string>;
  stories: Map<string, any>;
  calls: any[];
  lastConnectedTimestamp: number | null;
  modConfig: ModSettings;
  boomStatus: BoomState;
  knownInteractedJids: Set<string>;
}

const sseClients = new Set<Response>();

function broadcastSSE(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Default: ALL Mod features start OFF (false) so the user turns them on manually
const waState: WAState = {
  status: 'disconnected',
  qrCodeDataUrl: null,
  rawQr: null,
  pairingCode: null,
  user: null,
  errorMessage: null,
  chats: new Map(),
  messages: new Map(),
  rawMediaMessages: new Map(),
  contacts: new Map(),
  profilePics: new Map(),
  stories: new Map(),
  calls: [],
  lastConnectedTimestamp: null,
  knownInteractedJids: new Set(),
  modConfig: {
    antiBlueTick: false,
    antiBlueTickOnReply: false,
    antiViewOnce: false,
    autoSaveStatus: false,
    antiRevokeMessage: false,
    hideOnlineStatus: false,
    antiBanGuard: {
      enabled: false,
      humanTypingSimulation: false,
      adaptiveJitterDelay: false,
      invisibleZeroWidthVariation: false,
      autoWarmupNewContacts: false,
      minDelayMs: 1400,
      maxDelayMs: 3200,
    },
  },
  boomStatus: {
    isRunning: false,
    chatId: '',
    text: '',
    total: 0,
    sent: 0,
    currentDelayMs: 0,
    lastError: null,
    cancelRequested: false,
  },
};

let waSocket: WASocket | null = null;
let baileysModule: any = null;
let isStarting = false;
const pendingAvatarFetches = new Set<string>();

function normalizeJid(jid: string | undefined | null): string {
  if (!jid) return '';
  if (jid === 'status@broadcast') return jid;
  // Strip device suffix like 628123456:12@s.whatsapp.net -> 628123456@s.whatsapp.net
  if (jid.includes(':') && jid.includes('@')) {
    const [userPart, domainPart] = jid.split('@');
    return `${userPart.split(':')[0]}@${domainPart}`;
  }
  return jid;
}

function generateAvatarSvg(name: string, bg = '#059669'): string {
  const clean = (name || 'WA').replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const initials =
    clean
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'WA';
  const encodedBg = encodeURIComponent(bg);
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${encodedBg}"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><circle cx="60" cy="60" r="60" fill="url(%23g)"/><text x="60" y="70" font-size="38" font-weight="bold" fill="white" font-family="sans-serif" text-anchor="middle">${initials}</text></svg>`;
}

function getAvatarForJid(jid: string, displayName: string): string {
  const norm = normalizeJid(jid);
  const cached = waState.profilePics.get(norm);
  if (cached) return cached;
  // Trigger background fetch of real WhatsApp profile picture if connected
  queueProfilePicFetch(norm);
  const colors = ['#10b981', '#0ea5e9', '#6366f1', '#ec4899', '#f59e0b', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < norm.length; i++) hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  return generateAvatarSvg(displayName, color);
}

async function queueProfilePicFetch(jid: string) {
  const norm = normalizeJid(jid);
  if (!norm || norm === 'status@broadcast' || norm.endsWith('@broadcast')) return;
  if (waState.profilePics.has(norm) || pendingAvatarFetches.has(norm)) return;
  if (!waSocket || waState.status !== 'connected') return;

  pendingAvatarFetches.add(norm);
  try {
    const url = await waSocket.profilePictureUrl(norm, 'preview').catch(() =>
      waSocket?.profilePictureUrl(norm, 'image')
    );
    if (url) {
      waState.profilePics.set(norm, url);
      // Update chat avatar if exists
      const chat = waState.chats.get(norm);
      if (chat) {
        chat.avatar = url;
        waState.chats.set(norm, chat);
      }
      // Update contact avatar if exists
      const contact = waState.contacts.get(norm);
      if (contact) {
        contact.avatar = url;
        waState.contacts.set(norm, contact);
      }
      // Update story avatar if exists
      const story = waState.stories.get(norm);
      if (story) {
        story.contactAvatar = url;
        waState.stories.set(norm, story);
      }
      // Update self user avatar if matches
      if (waState.user && normalizeJid(waState.user.id) === norm) {
        waState.user.avatar = url;
      }
    }
  } catch {
    // Contact has no profile photo or privacy hidden
  } finally {
    pendingAvatarFetches.delete(norm);
  }
}

function formatBytesServer(bytes: number): string {
  if (!bytes || bytes === 0) return '120 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Unwraps ViewOnce (1x Lihat), Ephemeral, or Edited message wrappers so we can access the inner media/text
 */
function unwrapMessageContent(message: any): { innerMessage: any; isViewOnce: boolean } {
  if (!message) return { innerMessage: null, isViewOnce: false };

  if (message.ephemeralMessage?.message) {
    return unwrapMessageContent(message.ephemeralMessage.message);
  }
  if (message.viewOnceMessage?.message) {
    const res = unwrapMessageContent(message.viewOnceMessage.message);
    return { innerMessage: res.innerMessage, isViewOnce: true };
  }
  if (message.viewOnceMessageV2?.message) {
    const res = unwrapMessageContent(message.viewOnceMessageV2.message);
    return { innerMessage: res.innerMessage, isViewOnce: true };
  }
  if (message.viewOnceMessageV2Extension?.message) {
    const res = unwrapMessageContent(message.viewOnceMessageV2Extension.message);
    return { innerMessage: res.innerMessage, isViewOnce: true };
  }
  if (message.documentWithCaptionMessage?.message) {
    return unwrapMessageContent(message.documentWithCaptionMessage.message);
  }
  if (message.editedMessage?.message) {
    return unwrapMessageContent(message.editedMessage.message);
  }

  const hasViewOnceFlag =
    Boolean(message.imageMessage?.viewOnce) ||
    Boolean(message.videoMessage?.viewOnce) ||
    Boolean(message.audioMessage?.viewOnce);

  return { innerMessage: message, isViewOnce: hasViewOnceFlag };
}

/**
 * Robust multi-tiered WhatsApp Media Downloader:
 * 1. Disk cache
 * 2. Baileys downloadMediaMessage (supports reupload token refresh for View-Once & expired CDN media)
 * 3. Baileys downloadContentFromMessage stream
 * 4. Embedded jpegThumbnail fallback (guaranteed valid binary JPEG)
 */
async function downloadAndSaveMedia(
  rawMsg: any,
  mediaMsg: any,
  mediaType: 'image' | 'video' | 'audio' | 'document',
  fileName: string,
  thumbBuf?: Buffer
): Promise<string> {
  const savedPath = path.join(MEDIA_CACHE_DIR, fileName);
  if (fs.existsSync(savedPath)) {
    try {
      const stat = fs.statSync(savedPath);
      if (stat.size > 0) {
        return `/api/media-file/${encodeURIComponent(fileName)}`;
      }
    } catch {}
  }

  // Tier 1: Baileys downloadMediaMessage with socket reuploadRequest
  if (rawMsg && baileysModule?.downloadMediaMessage) {
    try {
      const buffer = await baileysModule.downloadMediaMessage(
        rawMsg,
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: waSocket ? waSocket.updateMediaMessage.bind(waSocket) : undefined,
        }
      );
      if (buffer && buffer.length > 0) {
        fs.writeFileSync(savedPath, buffer);
        return `/api/media-file/${encodeURIComponent(fileName)}`;
      }
    } catch {
      // Continue to next tier
    }
  }

  // Tier 2: Direct stream decrypt via downloadContentFromMessage
  if (mediaMsg && baileysModule?.downloadContentFromMessage) {
    try {
      const stream = await baileysModule.downloadContentFromMessage(mediaMsg, mediaType);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.length > 0) {
        fs.writeFileSync(savedPath, buffer);
        return `/api/media-file/${encodeURIComponent(fileName)}`;
      }
    } catch {
      // Continue to next tier
    }
  }

  // Tier 3: If full download failed, save thumbnail buffer as genuine JPEG
  if (thumbBuf && thumbBuf.length > 0) {
    try {
      fs.writeFileSync(savedPath, thumbBuf);
      return `/api/media-file/${encodeURIComponent(fileName)}`;
    } catch {}
  }

  return '';
}

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

async function sendSafeAntiBanMessage(
  sock: WASocket,
  jid: string,
  content: any,
  msgIndex = 0
): Promise<any> {
  const guard = waState.modConfig.antiBanGuard;
  const stealthNoBlueTick = waState.modConfig.antiBlueTickOnReply || waState.modConfig.hideOnlineStatus;

  if (guard.enabled) {
    if (guard.autoWarmupNewContacts && !waState.knownInteractedJids.has(jid)) {
      try {
        await sock.presenceSubscribe(jid);
        await new Promise((r) => setTimeout(r, 350 + Math.floor(Math.random() * 350)));
      } catch {}
      waState.knownInteractedJids.add(jid);
    }

    if (guard.humanTypingSimulation && !stealthNoBlueTick) {
      try {
        await sock.sendPresenceUpdate('composing', jid);
        const textLen = typeof content?.text === 'string' ? content.text.length : 10;
        const typingMs = Math.min(1400, Math.max(300, textLen * 22 + Math.floor(Math.random() * 250)));
        await new Promise((r) => setTimeout(r, typingMs));
        await sock.sendPresenceUpdate('paused', jid);
      } catch {}
    }
  }

  if (typeof content?.text === 'string' && msgIndex > 0) {
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
    baileysModule = baileys;
    const makeWASocket: any = typeof baileys.default === 'function' ? baileys.default : baileys.makeWASocket;
    const {
      useMultiFileAuthState,
      fetchLatestBaileysVersion,
      DisconnectReason,
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
      markOnlineOnConnect: !waState.modConfig.hideOnlineStatus && !waState.modConfig.antiBlueTick,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });
    waSocket = sock;

    if (pairingPhone && !state.creds.registered) {
      setTimeout(async () => {
        try {
          let cleanedPhone = pairingPhone.replace(/[^0-9]/g, '');
          if (cleanedPhone.startsWith('0')) {
            cleanedPhone = '62' + cleanedPhone.slice(1);
          }
          if (waSocket && cleanedPhone) {
            const code = await waSocket.requestPairingCode(cleanedPhone);
            waState.pairingCode = code;
          }
        } catch (err: any) {
          console.error('Error generating pairing code:', err?.message || err);
        }
      }, 2500);
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
          const normId = normalizeJid(sock.user.id);
          const phone = normId.split('@')[0];
          const displayName = sock.user.name || `+${phone}`;
          waState.user = {
            id: normId,
            name: displayName,
            phone: `+${phone}`,
            avatar: getAvatarForJid(normId, displayName),
          };
          queueProfilePicFetch(normId);
        }

        if (waState.modConfig.hideOnlineStatus) {
          try {
            await sock.sendPresenceUpdate('unavailable');
          } catch {}
        }
        isStarting = false;
      }
    });

    const handleRevokeKey = (remoteJid: string, targetMsgId: string) => {
      const normJid = normalizeJid(remoteJid);
      const safeId = targetMsgId.replace(/[^a-zA-Z0-9_-]/g, '');

      const checkAndRevokeInChat = (chatId: string) => {
        const chatMsgs = waState.messages.get(chatId) || [];
        let found = false;
        const updated = chatMsgs.map((m) => {
          if (m.id === targetMsgId || m.id === safeId) {
            found = true;
            if (waState.modConfig.antiRevokeMessage) {
              return {
                ...m,
                isRevoked: true,
                revokedAt: Date.now(),
              };
            } else {
              return {
                ...m,
                isRevoked: true,
                originalText: m.text,
                originalAttachments: m.attachments,
                text: '🚫 Pesan ini telah dihapus oleh pengirim',
                attachments: undefined,
              };
            }
          }
          return m;
        });
        if (found) {
          waState.messages.set(chatId, updated);
          const chat = waState.chats.get(chatId);
          if (chat && (chat.lastMessage?.id === targetMsgId || chat.lastMessage?.id === safeId)) {
            chat.lastMessage = updated[updated.length - 1];
            waState.chats.set(chatId, chat);
          }
          broadcastSSE('message_revoked', { chatId, messageId: safeId });
        }
        return found;
      };

      if (!checkAndRevokeInChat(normJid)) {
        for (const chatId of waState.messages.keys()) {
          if (chatId !== normJid && checkAndRevokeInChat(chatId)) break;
        }
      }
    };

    const processIncomingMessage = async (msg: any, isHistorySync = false) => {
      if (!msg?.key?.remoteJid) return;
      const rawJid = msg.key.remoteJidAlt || msg.key.remoteJid;
      const remoteJid = normalizeJid(rawJid);

      if (msg.key.remoteJid === 'status@broadcast' || remoteJid === 'status@broadcast') {
        const participant = normalizeJid(msg.key.participant || msg.participant || '');
        if (!participant) return;

        const { innerMessage } = unwrapMessageContent(msg.message);
        if (!innerMessage) return;

        const contactObj = waState.contacts.get(participant);
        const senderName = msg.pushName || contactObj?.name || `+${participant.split('@')[0]}`;
        const rawTs = Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000);
        const time = new Date(rawTs * 1000);
        const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        let storyType: 'image' | 'video' | 'text' = 'text';
        let contentUrlOrText =
          innerMessage.extendedTextMessage?.text ||
          innerMessage.conversation ||
          innerMessage.imageMessage?.caption ||
          innerMessage.videoMessage?.caption ||
          'Pembaruan Status';
        const caption = innerMessage.imageMessage?.caption || innerMessage.videoMessage?.caption || '';
        const safeId = (msg.key.id || `st_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
        let fileName = `Status_${safeId}.jpg`;
        let mimeType = 'text/plain';

        if (innerMessage.imageMessage || innerMessage.videoMessage) {
          const isVideo = Boolean(innerMessage.videoMessage);
          storyType = isVideo ? 'video' : 'image';
          const mediaMsg = innerMessage.imageMessage || innerMessage.videoMessage;
          mimeType = mediaMsg?.mimetype || (isVideo ? 'video/mp4' : 'image/jpeg');
          const ext = isVideo ? 'mp4' : 'jpg';
          fileName = `Status_${safeId}.${ext}`;

          const thumbBuf = mediaMsg?.jpegThumbnail ? Buffer.from(mediaMsg.jpegThumbnail) : undefined;
          let thumbUrl = '';
          if (thumbBuf && thumbBuf.length > 0) {
            const thumbName = `thumb_Status_${safeId}.jpg`;
            try {
              fs.writeFileSync(path.join(MEDIA_CACHE_DIR, thumbName), thumbBuf);
              thumbUrl = `/api/media-file/${encodeURIComponent(thumbName)}`;
            } catch {}
          }

          waState.rawMediaMessages.set(safeId, {
            rawMsg: msg,
            innerMedia: mediaMsg,
            mediaType: storyType,
            fileName,
            mimeType,
            thumbnailBuffer: thumbBuf,
          });

          const localUrl = await downloadAndSaveMedia(msg, mediaMsg, storyType, fileName, thumbBuf);
          if (localUrl) {
            contentUrlOrText = localUrl;
          } else if (thumbUrl) {
            contentUrlOrText = thumbUrl;
          } else {
            contentUrlOrText = `/api/whatsapp/media/${encodeURIComponent(safeId)}`;
          }
        }

        const existingStory = waState.stories.get(participant) || {
          id: `story_${participant}`,
          contactId: participant,
          contactName: senderName,
          contactAvatar: getAvatarForJid(participant, senderName),
          updatedAt: `Hari ini, ${timeStr}`,
          stories: [],
        };

        if (!existingStory.stories.some((s: any) => s.id === safeId)) {
          existingStory.stories.push({
            id: safeId,
            type: storyType,
            content: contentUrlOrText,
            caption,
            timestamp: timeStr,
            seen: false,
            fileName,
            mimeType,
          });
          existingStory.updatedAt = `Hari ini, ${timeStr}`;
          existingStory.contactAvatar = getAvatarForJid(participant, senderName);
          waState.stories.set(participant, existingStory);
        }
        return;
      }

      if (remoteJid.endsWith('@broadcast') || remoteJid.endsWith('@newsletter')) return;

      waState.knownInteractedJids.add(remoteJid);

      // Check for message revoke (protocolMessage REVOKE)
      const protoMsg = msg.message?.protocolMessage;
      if (protoMsg && (protoMsg.type === 0 || protoMsg.type === 'REVOKE') && protoMsg.key?.id) {
        handleRevokeKey(remoteJid, protoMsg.key.id);
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

      const rawTs = Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000);
      const time = new Date(rawTs * 1000);
      const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const fullTimeStr = `${time.toLocaleDateString('id-ID')}, ${timeStr}`;

      const attachments: any[] = [];
      const hasMedia =
        innerMessage.imageMessage ||
        innerMessage.videoMessage ||
        innerMessage.audioMessage ||
        innerMessage.documentMessage;

      const safeId = (msg.key.id || `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`).replace(
        /[^a-zA-Z0-9_-]/g,
        ''
      );

      if (hasMedia) {
        let attType: 'image' | 'video' | 'audio' | 'document' = 'document';
        let mimeType = 'application/octet-stream';
        let ext = 'bin';
        let fileSize = '150 KB';
        let duration: string | undefined;
        let origName = '';
        let mediaObj: any = null;

        if (innerMessage.imageMessage) {
          attType = 'image';
          mediaObj = innerMessage.imageMessage;
          mimeType = mediaObj.mimetype || 'image/jpeg';
          ext = 'jpg';
          fileSize = formatBytesServer(Number(mediaObj.fileLength || 180000));
        } else if (innerMessage.videoMessage) {
          attType = 'video';
          mediaObj = innerMessage.videoMessage;
          mimeType = mediaObj.mimetype || 'video/mp4';
          ext = 'mp4';
          fileSize = formatBytesServer(Number(mediaObj.fileLength || 1200000));
          if (mediaObj.seconds) {
            duration = `0:${String(mediaObj.seconds).padStart(2, '0')}`;
          }
        } else if (innerMessage.audioMessage) {
          attType = 'audio';
          mediaObj = innerMessage.audioMessage;
          mimeType = mediaObj.mimetype || 'audio/ogg';
          ext = 'ogg';
          fileSize = formatBytesServer(Number(mediaObj.fileLength || 64000));
          const secs = mediaObj.seconds || 15;
          duration = `0:${String(secs).padStart(2, '0')}`;
        } else if (innerMessage.documentMessage) {
          attType = 'document';
          mediaObj = innerMessage.documentMessage;
          mimeType = mediaObj.mimetype || 'application/pdf';
          origName = mediaObj.fileName || '';
          ext = origName.split('.').pop() || 'pdf';
          fileSize = formatBytesServer(Number(mediaObj.fileLength || 450000));
        }

        const finalFileName =
          origName || `${isViewOnce ? '1X_LIHAT_' : 'WA_'}${attType.toUpperCase()}_${safeId}.${ext}`;

        let thumbBuf: Buffer | undefined;
        if (mediaObj?.jpegThumbnail) {
          try {
            thumbBuf = Buffer.from(mediaObj.jpegThumbnail);
          } catch {}
        }

        let thumbUrl: string | undefined;
        if (thumbBuf && thumbBuf.length > 0) {
          const thumbFileName = `thumb_${safeId}.jpg`;
          try {
            fs.writeFileSync(path.join(MEDIA_CACHE_DIR, thumbFileName), thumbBuf);
            thumbUrl = `/api/media-file/${encodeURIComponent(thumbFileName)}`;
          } catch {}
        }

        if (mediaObj) {
          waState.rawMediaMessages.set(safeId, {
            rawMsg: msg,
            innerMedia: mediaObj,
            mediaType: attType,
            fileName: finalFileName,
            mimeType,
            thumbnailBuffer: thumbBuf,
          });
        }

        // Always provide on-demand decrypting media endpoint URL so it works immediately and when clicked!
        let fileUrl = `/api/whatsapp/media/${encodeURIComponent(safeId)}`;

        // Pre-download immediately in background for live messages or ViewOnce
        downloadAndSaveMedia(msg, mediaObj, attType, finalFileName, thumbBuf)
          .then((savedUrl) => {
            if (savedUrl) {
              const list = waState.messages.get(remoteJid) || [];
              const target = list.find((m) => m.id === safeId);
              if (target && target.attachments?.[0]) {
                target.attachments[0].url = savedUrl;
              }
            }
          })
          .catch(() => {});

        attachments.push({
          id: `att_${safeId}`,
          type: attType,
          url: fileUrl,
          thumbnailUrl: thumbUrl,
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

      if (!isOut && msg.pushName && (!contactInfo || contactInfo.name.startsWith('+'))) {
        waState.contacts.set(remoteJid, {
          id: remoteJid,
          name: msg.pushName,
          phone: fallbackPhone,
          about: 'Kontak WhatsApp',
          avatar: getAvatarForJid(remoteJid, msg.pushName),
          isOnline: true,
        });
      }

      const parsedMsg = {
        id: safeId,
        chatId: remoteJid,
        senderId: isOut ? 'me' : remoteJid,
        senderName,
        isOutgoing: isOut,
        text: isViewOnce && !text ? '🔓 [Media 1x Lihat]' : text,
        timestamp: timeStr,
        fullTimestamp: fullTimeStr,
        rawTimestamp: rawTs,
        status: isOut ? 'read' : 'delivered',
        isViewOnce,
        attachments: attachments.length > 0 ? attachments : undefined,
        rawKey: msg.key,
      };

      const existingMsgs = waState.messages.get(remoteJid) || [];
      if (!existingMsgs.some((m) => m.id === parsedMsg.id)) {
        const updatedMsgs = [...existingMsgs, parsedMsg].sort(
          (a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0)
        );
        waState.messages.set(remoteJid, updatedMsgs);

        const existingChat = waState.chats.get(remoteJid);
        const latestContact = waState.contacts.get(remoteJid);
        const chatName =
          (existingChat?.name && !existingChat.name.startsWith('+') ? existingChat.name : '') ||
          latestContact?.name ||
          (!isOut && msg.pushName ? msg.pushName : fallbackPhone);

        waState.chats.set(remoteJid, {
          id: remoteJid,
          name: chatName,
          isGroup: remoteJid.endsWith('@g.us'),
          avatar: getAvatarForJid(remoteJid, chatName),
          unreadCount: isOut ? 0 : (existingChat?.unreadCount || 0) + (isHistorySync ? 0 : 1),
          isPinned: existingChat?.isPinned || false,
          isArchived: false,
          isMuted: existingChat?.isMuted || false,
          lastMessage: updatedMsgs[updatedMsgs.length - 1] || parsedMsg,
        });

        broadcastSSE('new_message', { chatId: remoteJid, message: parsedMsg });
        broadcastSSE('chats_updated', { chatId: remoteJid });
      }
    };

    // History sync event
    sock.ev.on('messaging-history.set', async ({ chats, contacts, messages }) => {
      contacts.forEach((c: any) => {
        if (!c?.id) return;
        const normId = normalizeJid(c.id);
        if (!normId || normId.endsWith('@broadcast')) return;
        const name = c.name || c.notify || c.verifiedName || `+${normId.split('@')[0]}`;
        waState.contacts.set(normId, {
          id: normId,
          name,
          phone: `+${normId.split('@')[0]}`,
          about: 'Kontak WhatsApp',
          avatar: getAvatarForJid(normId, name),
          isOnline: true,
        });
      });

      chats.forEach((c: any) => {
        if (!c?.id) return;
        const normId = normalizeJid(c.id);
        if (!normId || normId === 'status@broadcast' || normId.endsWith('@broadcast')) return;
        const contactInfo = waState.contacts.get(normId);
        const name = c.name || contactInfo?.name || `+${normId.split('@')[0]}`;
        const existing = waState.chats.get(normId) || {};
        waState.chats.set(normId, {
          ...existing,
          id: normId,
          name,
          isGroup: normId.endsWith('@g.us'),
          avatar: getAvatarForJid(normId, name),
          unreadCount: c.unreadCount || 0,
          isPinned: Boolean(c.pinned),
          isArchived: Boolean(c.archived),
          isMuted: Boolean(c.muteEndTime),
        });
      });

      const recentMessages = messages.slice(-250);
      for (const m of recentMessages) {
        await processIncomingMessage(m, true);
      }
    });

    sock.ev.on('contacts.upsert', (contacts) => {
      contacts.forEach((c) => {
        if (!c.id) return;
        const normId = normalizeJid(c.id);
        const name = c.name || c.notify || c.verifiedName || `+${normId.split('@')[0]}`;
        const avatar = getAvatarForJid(normId, name);
        waState.contacts.set(normId, {
          id: normId,
          name,
          phone: `+${normId.split('@')[0]}`,
          about: 'Kontak WhatsApp',
          avatar,
          isOnline: true,
        });
        const existingChat = waState.chats.get(normId);
        if (existingChat) {
          existingChat.name = name;
          existingChat.avatar = avatar;
          waState.chats.set(normId, existingChat);
        }
      });
    });

    sock.ev.on('contacts.update', (updates) => {
      updates.forEach((u) => {
        if (!u.id) return;
        const normId = normalizeJid(u.id);
        const existing = waState.contacts.get(normId);
        const name = u.name || u.notify || u.verifiedName || existing?.name || `+${normId.split('@')[0]}`;
        const avatar = getAvatarForJid(normId, name);
        waState.contacts.set(normId, {
          ...(existing || {}),
          id: normId,
          name,
          phone: `+${normId.split('@')[0]}`,
          about: 'Kontak WhatsApp',
          avatar,
          isOnline: true,
        });
        const existingChat = waState.chats.get(normId);
        if (existingChat) {
          if (u.name || u.notify) existingChat.name = name;
          existingChat.avatar = avatar;
          waState.chats.set(normId, existingChat);
        }
      });
    });

    sock.ev.on('chats.upsert', (chats) => {
      chats.forEach((c) => {
        if (!c.id) return;
        const normId = normalizeJid(c.id);
        if (normId === 'status@broadcast' || normId.endsWith('@broadcast')) return;
        const existing = waState.chats.get(normId) || {};
        const contactInfo = waState.contacts.get(normId);
        const name = c.name || existing.name || contactInfo?.name || `+${normId.split('@')[0]}`;
        waState.chats.set(normId, {
          ...existing,
          id: normId,
          name,
          isGroup: normId.endsWith('@g.us'),
          avatar: getAvatarForJid(normId, name),
          unreadCount: c.unreadCount ?? existing.unreadCount ?? 0,
          isPinned: existing.isPinned ?? Boolean(c.pinned),
          isArchived: false,
          isMuted: existing.isMuted ?? Boolean(c.muteEndTime),
        });
      });
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        await processIncomingMessage(msg, false);
      }
    });

    // Listen to messages.update for Anti-Revoke & Read Receipt status updates
    sock.ev.on('messages.update', (updates) => {
      for (const { key, update } of updates) {
        if (!key?.remoteJid || !key?.id) continue;
        const normJid = normalizeJid(key.remoteJid);
        const safeId = key.id.replace(/[^a-zA-Z0-9_-]/g, '');

        // Check if message was revoked/deleted for everyone
        if (
          update.messageStubType === 1 ||
          update.messageStubType === 132 ||
          update.message === null ||
          update.message?.protocolMessage?.type === 0 ||
          (typeof update.messageStubType === 'string' && (update.messageStubType as string).includes('REVOKE'))
        ) {
          handleRevokeKey(normJid, safeId);
          continue;
        }

        // Update delivery/read ticks for outgoing messages
        if (update.status) {
          const list = waState.messages.get(normJid) || [];
          const msg = list.find((m) => m.id === safeId);
          if (msg) {
            msg.status = update.status >= 4 ? 'read' : update.status >= 3 ? 'delivered' : 'sent';
            broadcastSSE('message_status', { chatId: normJid, messageId: safeId, status: msg.status });
          }
        }
      }
    });

    // Call events
    sock.ev.on('call', (callEvents) => {
      callEvents.forEach((call) => {
        const callerId = normalizeJid(call.from || call.chatId || 'unknown@s.whatsapp.net');
        const contact = waState.contacts.get(callerId);
        const callerName = contact?.name || `+${callerId.split('@')[0]}`;
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const existingIdx = waState.calls.findIndex((c) => c.id === call.id);
        const callRecord = {
          id: call.id,
          contactId: callerId,
          contactName: callerName,
          contactAvatar: getAvatarForJid(callerId, callerName),
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
        broadcastSSE('calls_updated', waState.calls);
      });
    });
  } catch (err: any) {
    console.error('Failed to start WhatsApp socket:', err);
    waState.status = 'error';
    waState.errorMessage = err?.message || 'Gagal memulai koneksi WhatsApp.';
    isStarting = false;
  }
}

// Real-Time Server-Sent Events (SSE) stream for instant zero-latency sync
app.get('/api/whatsapp/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// On-demand media decryption endpoint (unlocks ViewOnce 1x Lihat & Status media anytime)
app.get('/api/whatsapp/media/:msgId', async (req: Request, res: Response) => {
  const { msgId } = req.params;
  const entry = waState.rawMediaMessages.get(msgId);
  if (!entry) {
    // Check if file with this ID is already in the media cache folder
    try {
      const files = fs.readdirSync(MEDIA_CACHE_DIR);
      const matched = files.find((f) => f.includes(msgId));
      if (matched) {
        const full = path.join(MEDIA_CACHE_DIR, matched);
        const ext = path.extname(matched).toLowerCase();
        const mime = ext === '.mp4' ? 'video/mp4' : ext === '.png' ? 'image/png' : 'image/jpeg';
        res.setHeader('Content-Type', mime);
        return res.sendFile(full);
      }
    } catch {}
    // Return clean SVG image card instead of broken 404
    const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="#0f172a"/><rect x="20" y="20" width="560" height="360" rx="24" fill="#1e293b" stroke="#334155" stroke-width="2"/><text x="300" y="180" font-family="sans-serif" font-size="44" text-anchor="middle" fill="#10b981">🔓</text><text x="300" y="230" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#f8fafc">Media 1x Lihat Disimpan</text><text x="300" y="260" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#94a3b8">${msgId}</text></svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svgFallback);
  }

  const savedPath = path.join(MEDIA_CACHE_DIR, entry.fileName);
  if (fs.existsSync(savedPath)) {
    try {
      const stat = fs.statSync(savedPath);
      if (stat.size > 0) {
        res.setHeader('Content-Type', entry.mimeType);
        return res.sendFile(savedPath);
      }
    } catch {}
  }

  const downloadedUrl = await downloadAndSaveMedia(
    entry.rawMsg,
    entry.innerMedia,
    entry.mediaType,
    entry.fileName,
    entry.thumbnailBuffer
  );

  if (downloadedUrl && fs.existsSync(savedPath)) {
    res.setHeader('Content-Type', entry.mimeType);
    return res.sendFile(savedPath);
  }

  if (entry.thumbnailBuffer && entry.thumbnailBuffer.length > 0) {
    try {
      fs.writeFileSync(savedPath, entry.thumbnailBuffer);
      res.setHeader('Content-Type', 'image/jpeg');
      return res.sendFile(savedPath);
    } catch {}
  }

  const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="#0f172a"/><rect x="20" y="20" width="560" height="360" rx="24" fill="#1e293b" stroke="#334155" stroke-width="2"/><text x="300" y="180" font-family="sans-serif" font-size="44" text-anchor="middle" fill="#10b981">🔓</text><text x="300" y="230" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#f8fafc">Media 1x Lihat Terbuka</text><text x="300" y="260" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#94a3b8">${entry.fileName}</text></svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.send(svgFallback);
});

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
    waState.rawMediaMessages.clear();
    waState.profilePics.clear();
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
      const avatar = getAvatarForJid(chat.id, chat.name);
      return {
        ...chat,
        avatar,
        messages: msgs,
        lastMessage:
          msgs[msgs.length - 1] ||
          chat.lastMessage || {
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
    .filter((c) => c.messages.length > 0 || c.name)
    .sort((a, b) => {
      const tsA = a.lastMessage?.rawTimestamp || 0;
      const tsB = b.lastMessage?.rawTimestamp || 0;
      return tsB - tsA;
    });

  const contactsList = Array.from(waState.contacts.values()).map((c) => ({
    ...c,
    avatar: getAvatarForJid(c.id, c.name),
  }));

  const storiesList = Array.from(waState.stories.values()).map((s) => ({
    ...s,
    contactAvatar: getAvatarForJid(s.contactId, s.contactName),
  }));

  res.json({
    chats: chatList,
    contacts: contactsList,
    stories: storiesList,
    calls: waState.calls,
    isReal: waState.status === 'connected',
  });
});

// Mark chat read locally (and only send blue ticks to WhatsApp if antiBlueTick is OFF!)
app.post('/api/whatsapp/read', async (req: Request, res: Response) => {
  const { chatId } = req.body;
  if (!chatId) return res.status(400).json({ error: 'chatId required' });
  const normJid = normalizeJid(chatId);

  const chat = waState.chats.get(normJid);
  if (chat) {
    chat.unreadCount = 0;
    waState.chats.set(normJid, chat);
  }

  // Stealth Blue Tick Control: ONLY send readMessages if antiBlueTick is FALSE (OFF)
  if (!waState.modConfig.antiBlueTick && waSocket && waState.status === 'connected') {
    const msgs = waState.messages.get(normJid) || [];
    const unreadKeys = msgs.filter((m) => !m.isOutgoing && m.rawKey).map((m) => m.rawKey);
    if (unreadKeys.length > 0) {
      try {
        await waSocket.readMessages(unreadKeys.slice(-20));
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
      await waSocket.sendPresenceUpdate(
        waState.modConfig.hideOnlineStatus || waState.modConfig.antiBlueTickOnReply
          ? 'unavailable'
          : 'available'
      );
    } catch {}
  }

  res.json({ success: true, modConfig: waState.modConfig });
});

// Send Single Message or Media Attachment (with Anti-Blue-Tick-On-Reply and Anti-Ban Guard)
app.post('/api/whatsapp/send', async (req: Request, res: Response) => {
  const { chatId, text, mediaBase64, mediaType, mimeType, fileName } = req.body;
  if (!waSocket || waState.status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp belum terhubung. Silakan pindai QR terlebih dahulu.' });
  }
  if (!chatId || (!text && !mediaBase64)) {
    return res.status(400).json({ error: 'chatId dan pesan/media wajib diisi.' });
  }

  try {
    const formattedJid = normalizeJid(
      chatId.includes('@') ? chatId : `${chatId.replace(/[^0-9]/g, '')}@s.whatsapp.net`
    );

    // If antiBlueTickOnReply is OFF and antiBlueTick is OFF, send normal read receipts on reply
    if (!waState.modConfig.antiBlueTickOnReply && !waState.modConfig.antiBlueTick) {
      const msgs = waState.messages.get(formattedJid) || [];
      const unreadKeys = msgs.filter((m) => !m.isOutgoing && m.rawKey).map((m) => m.rawKey);
      if (unreadKeys.length > 0) {
        try {
          await waSocket.readMessages(unreadKeys.slice(-15));
        } catch {}
      }
    }

    let messagePayload: any = { text: text || '' };
    if (mediaBase64) {
      const base64Data = mediaBase64.includes(',') ? mediaBase64.split(',')[1] : mediaBase64;
      const buf = Buffer.from(base64Data, 'base64');
      if (mediaType === 'image') {
        messagePayload = { image: buf, caption: text || undefined, mimetype: mimeType || 'image/jpeg' };
      } else if (mediaType === 'video') {
        messagePayload = { video: buf, caption: text || undefined, mimetype: mimeType || 'video/mp4' };
      } else if (mediaType === 'audio') {
        messagePayload = { audio: buf, ptt: true, mimetype: mimeType || 'audio/ogg; codecs=opus' };
      } else {
        messagePayload = {
          document: buf,
          fileName: fileName || 'Dokumen.pdf',
          caption: text || undefined,
          mimetype: mimeType || 'application/octet-stream',
        };
      }
    }

    const sent = await sendSafeAntiBanMessage(waSocket, formattedJid, messagePayload, 0);

    // Record outgoing message in waState immediately
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const fullTimeStr = `${now.toLocaleDateString('id-ID')}, ${timeStr}`;
    const safeSentId = (sent?.key?.id || `out_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
    const outMsg = {
      id: safeSentId,
      chatId: formattedJid,
      senderId: 'me',
      senderName: waState.user?.name || 'Anda',
      isOutgoing: true,
      text: text || fileName || 'Media terkirim',
      timestamp: timeStr,
      fullTimestamp: fullTimeStr,
      rawTimestamp: Math.floor(Date.now() / 1000),
      status: 'sent',
      rawKey: sent?.key,
    };

    const existingMsgs = waState.messages.get(formattedJid) || [];
    if (!existingMsgs.some((m) => m.id === safeSentId)) {
      waState.messages.set(formattedJid, [...existingMsgs, outMsg]);
    }
    const existingChat = waState.chats.get(formattedJid);
    if (existingChat) {
      existingChat.lastMessage = outMsg;
      waState.chats.set(formattedJid, existingChat);
    }

    res.json({ success: true, sentId: safeSentId });
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
    return res
      .status(400)
      .json({ error: 'Chat Boom sedang berjalan. Klik Stop jika ingin memulai ulang.' });
  }

  const totalToSend = Math.min(Math.max(1, Number(count)), 500);
  const formattedJid = normalizeJid(
    chatId.includes('@') ? chatId : `${chatId.replace(/[^0-9]/g, '')}@s.whatsapp.net`
  );

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

  (async () => {
    const sock = waSocket;
    if (!sock) {
      waState.boomStatus.isRunning = false;
      return;
    }

    for (let i = 0; i < totalToSend; i++) {
      if (waState.boomStatus.cancelRequested || waState.status !== 'connected') {
        break;
      }

      try {
        const sent = await sendSafeAntiBanMessage(sock, formattedJid, { text }, i);
        waState.boomStatus.sent = i + 1;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const fullTimeStr = `${now.toLocaleDateString('id-ID')}, ${timeStr}`;
        const safeId = (sent?.key?.id || `boom_${Date.now()}_${i}`).replace(/[^a-zA-Z0-9_-]/g, '');
        const localMsg = {
          id: safeId,
          chatId: formattedJid,
          senderId: 'me',
          senderName: waState.user?.name || 'Anda',
          isOutgoing: true,
          text,
          timestamp: timeStr,
          fullTimestamp: fullTimeStr,
          rawTimestamp: Math.floor(Date.now() / 1000),
          status: 'sent',
        };
        const currMsgs = waState.messages.get(formattedJid) || [];
        if (!currMsgs.some((m) => m.id === safeId)) {
          waState.messages.set(formattedJid, [...currMsgs, localMsg]);
        }
        const chat = waState.chats.get(formattedJid);
        if (chat) {
          chat.lastMessage = localMsg;
          waState.chats.set(formattedJid, chat);
        }
      } catch (err: any) {
        waState.boomStatus.lastError = err?.message || 'Gagal mengirim salah satu pesan boom';
      }

      if (i < totalToSend - 1 && !waState.boomStatus.cancelRequested) {
        const guard = waState.modConfig.antiBanGuard;
        let delayMs = 650;
        if (guard.enabled && guard.adaptiveJitterDelay) {
          const min = Math.max(400, guard.minDelayMs || 1200);
          const max = Math.max(min + 300, guard.maxDelayMs || 2800);
          delayMs = min + Math.floor(Math.random() * (max - min));
          if ((i + 1) % 10 === 0) {
            delayMs += 2000 + Math.floor(Math.random() * 1500);
          }
        }
        waState.boomStatus.currentDelayMs = delayMs;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    waState.boomStatus.isRunning = false;
    waState.boomStatus.currentDelayMs = 0;
  })();

  res.json({
    success: true,
    message: `Chat Boom dimulai: mengirim ${totalToSend} pesan.`,
    boomStatus: waState.boomStatus,
  });
});

app.post('/api/whatsapp/boom/stop', (_req: Request, res: Response) => {
  waState.boomStatus.cancelRequested = true;
  waState.boomStatus.isRunning = false;
  res.json({ success: true, boomStatus: waState.boomStatus });
});

// Downloadable Full Project Source Code ZIP Endpoint
app.get('/api/source-zip', async (_req: Request, res: Response) => {
  try {
    const JSZipModule = await import('jszip');
    const JSZip = JSZipModule.default || JSZipModule;
    const zip = new JSZip();

    const rootDir = process.cwd();
    const excludeDirs = new Set([
      'node_modules',
      'dist',
      'build',
      '.git',
      '.baileys_auth',
      '.baileys_media',
      '.playwright-cli',
      'artifacts',
    ]);

    const addFilesRecursively = (currentPath: string, relativePath = '') => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (excludeDirs.has(entry.name)) continue;
        if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
        if (entry.name.endsWith('.zip')) continue;

        const fullPath = path.join(currentPath, entry.name);
        const zipEntryPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          addFilesRecursively(fullPath, zipEntryPath);
        } else if (entry.isFile()) {
          const fileContent = fs.readFileSync(fullPath);
          zip.file(zipEntryPath, fileContent);
        }
      }
    };

    addFilesRecursively(rootDir);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="iGlass-WA-Companion-SourceCode.zip"');
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal membuat arsip source code ZIP: ' + err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
      startWhatsApp();
    }
  });
}

startServer();
