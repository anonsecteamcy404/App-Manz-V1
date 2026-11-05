import JSZip from 'jszip';
import { Chat, Message, ExportFilter, AutoExportConfig, ExportRecord } from '../types/whatsapp';

/**
 * Formats a single chat into the official WhatsApp .txt export format
 * e.g.: [DD/MM/YYYY, HH:mm:ss] Sender: Message content
 */
export function formatWhatsAppChatTxt(chat: Chat, includeMediaPlaceholders = true): string {
  const header = [
    `=== WHATSAPP CHAT EXPORT ===`,
    `Obrolan: ${chat.name}`,
    `Tipe: ${chat.isGroup ? 'Grup WhatsApp' : 'Obrolan Personal'}`,
    `Jumlah Pesan: ${chat.messages.length}`,
    `Diekspor pada: ${new Date().toLocaleString('id-ID')}`,
    `Catatan: Pesan dan panggilan dienkripsi secara end-to-end. Tidak seorang pun di luar obrolan ini yang dapat membaca atau mendengarkannya.`,
    `------------------------------------------------------------\n`
  ].join('\n');

  const lines = chat.messages.map((msg) => {
    const timeFormatted = msg.fullTimestamp || msg.timestamp;
    const sender = msg.isOutgoing ? 'Anda' : msg.senderName;
    let content = msg.text || '';

    if (msg.attachments && msg.attachments.length > 0 && includeMediaPlaceholders) {
      const mediaNotes = msg.attachments
        .map((att) => `<Media terlampir: ${att.fileName} (${att.type.toUpperCase()}, ${att.fileSize})>`)
        .join(' ');
      content = content ? `${content}\n${mediaNotes}` : mediaNotes;
    }

    if (msg.replyTo) {
      content = `[Membalas ${msg.replyTo.senderName}: "${msg.replyTo.text.slice(0, 30)}..."]\n${content}`;
    }

    return `[${timeFormatted}] ${sender}: ${content}`;
  });

  return `${header}\n${lines.join('\n\n')}`;
}

/**
 * Formats chats into clean structured JSON
 */
export function formatChatJson(chats: Chat[] | Chat): string {
  const data = Array.isArray(chats) ? chats : [chats];
  const payload = {
    exportedAt: new Date().toISOString(),
    generator: 'iGlass WA Companion Exporter v2.4',
    totalChats: data.length,
    chats: data.map((c) => ({
      id: c.id,
      name: c.name,
      isGroup: c.isGroup,
      totalMessages: c.messages.length,
      participants: c.participants || [],
      messages: c.messages.map((m) => ({
        id: m.id,
        senderName: m.senderName,
        isOutgoing: m.isOutgoing,
        text: m.text,
        timestamp: m.timestamp,
        fullTimestamp: m.fullTimestamp,
        status: m.status,
        attachments: m.attachments || [],
        reactions: m.reactions || [],
      })),
    })),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Generates an interactive, standalone HTML transcript viewable in any browser offline.
 */
export function generateHtmlTranscript(chat: Chat): string {
  const messagesHtml = chat.messages
    .map((msg) => {
      const isOut = msg.isOutgoing;
      const alignClass = isOut ? 'flex justify-end' : 'flex justify-start';
      const bubbleBg = isOut
        ? 'background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff;'
        : 'background: rgba(255, 255, 255, 0.9); color: #0f172a; border: 1px solid rgba(0,0,0,0.08);';

      let attachHtml = '';
      if (msg.attachments && msg.attachments.length > 0) {
        attachHtml = msg.attachments
          .map(
            (a) => `
          <div style="margin-top: 6px; padding: 6px 10px; background: rgba(0,0,0,0.06); border-radius: 8px; font-size: 12px; display: flex; align-items: center; gap: 8px;">
            <span>📎</span>
            <span><strong>${a.fileName}</strong> (${a.type.toUpperCase()} · ${a.fileSize})</span>
          </div>`
          )
          .join('');
      }

      return `
      <div class="${alignClass}" style="margin-bottom: 12px;">
        <div style="max-width: 75%; padding: 10px 14px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); ${bubbleBg}">
          ${!isOut && chat.isGroup ? `<div style="font-size: 11px; font-weight: 700; color: #059669; margin-bottom: 2px;">${msg.senderName}</div>` : ''}
          <div style="font-size: 14px; line-height: 1.4; word-break: break-word;">${msg.text ? msg.text.replace(/\n/g, '<br/>') : ''}</div>
          ${attachHtml}
          <div style="font-size: 10px; opacity: 0.75; text-align: right; margin-top: 4px;">
            ${msg.timestamp} ${isOut ? '✓✓' : ''}
          </div>
        </div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cadangan Obrolan: ${chat.name}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .header {
      padding: 18px 24px;
      background: rgba(248, 250, 252, 0.95);
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .chat-body {
      padding: 24px;
      background: #f8fafc;
      min-height: 500px;
    }
    .meta-tag {
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h2 style="margin: 0 0 4px 0; font-size: 18px;">${chat.name}</h2>
        <div class="meta-tag">Cadangan Diekspor · ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</div>
      </div>
      <div class="meta-tag">Total ${chat.messages.length} Pesan</div>
    </div>
    <div class="chat-body">
      ${messagesHtml}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Checks if auto-export criteria is met based on configured frequency and last export timestamp
 */
export function shouldTriggerAutoExport(lastExportTimestamp: number | undefined, config: AutoExportConfig): boolean {
  if (!config.enabled) return false;
  if (!lastExportTimestamp) return true;

  const now = Date.now();
  const elapsedMs = now - lastExportTimestamp;

  switch (config.frequency) {
    case 'realtime':
      return elapsedMs > 1000 * 30; // Min 30s throttle
    case 'hourly':
      return elapsedMs >= 1000 * 60 * 60;
    case 'daily':
      return elapsedMs >= 1000 * 60 * 60 * 24;
    case 'on_connect':
      return true;
    default:
      return false;
  }
}

/**
 * Formats raw byte size into human readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Builds a complete ZIP archive with chats, HTML transcripts, and media files
 */
export async function buildExportZip(chats: Chat[], options: ExportFilter): Promise<{ blob: Blob; record: ExportRecord }> {
  const zip = new JSZip();

  const selectedChats = options.chatId
    ? chats.filter((c) => c.id === options.chatId)
    : chats;

  let totalMessages = 0;
  let totalMedia = 0;

  const chatsFolder = zip.folder('chats') || zip;
  const mediaFolder = zip.folder('media') || zip;

  selectedChats.forEach((chat) => {
    totalMessages += chat.messages.length;
    const sanitizedName = chat.name.replace(/[^a-zA-Z0-9_\-]/g, '_');

    // 1. WhatsApp standard format TXT
    const txtContent = formatWhatsAppChatTxt(chat, options.includeMedia);
    chatsFolder.file(`${sanitizedName}.txt`, txtContent);

    // 2. Beautiful standalone HTML transcript
    const htmlContent = generateHtmlTranscript(chat);
    chatsFolder.file(`${sanitizedName}.html`, htmlContent);

    // 3. Media items
    if (options.includeMedia) {
      chat.messages.forEach((msg) => {
        if (msg.attachments) {
          msg.attachments.forEach((att) => {
            if (
              (att.type === 'audio' && !options.includeVoiceNotes) ||
              (att.type === 'document' && !options.includeDocuments)
            ) {
              return;
            }
            totalMedia += 1;
            // Generate simulated binary payload or text representation
            const mediaContent = `[Simulated WhatsApp Media File]\nNama: ${att.fileName}\nTipe: ${att.type}\nUkuran: ${att.fileSize}\nPengirim: ${msg.senderName}\nWaktu: ${msg.fullTimestamp}`;
            mediaFolder.file(att.fileName, mediaContent);
          });
        }
      });
    }
  });

  // 4. Full JSON export in root
  const jsonContent = formatChatJson(selectedChats);
  zip.file('database_export.json', jsonContent);

  // 5. Export Manifest / Readme
  const manifest = {
    appName: 'iGlass WhatsApp Linked Device Companion',
    exportDate: new Date().toISOString(),
    totalChatsExported: selectedChats.length,
    totalMessages,
    totalMedia,
    options,
    encryption: 'End-to-End Encrypted Session Archive',
  };
  zip.file('MANIFEST.json', JSON.stringify(manifest, null, 2));

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const sizeBytes = zipBlob.size;

  const chatLabel = selectedChats.length === 1 ? selectedChats[0].name : `Semua Obrolan (${selectedChats.length})`;

  const record: ExportRecord = {
    id: `export_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    timestamp: Date.now(),
    chatName: chatLabel,
    format: 'ZIP',
    messageCount: totalMessages,
    mediaCount: totalMedia,
    fileSizeBytes: sizeBytes,
    fileSizeFormatted: formatBytes(sizeBytes),
    status: 'completed',
    triggerType: 'manual',
    blobData: zipBlob,
  };

  return { blob: zipBlob, record };
}

/**
 * Triggers a real browser file download for a Blob
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
