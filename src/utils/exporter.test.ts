import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatWhatsAppChatTxt,
  formatChatJson,
  generateHtmlTranscript,
  shouldTriggerAutoExport,
  formatBytes,
} from './exporter';
import { Chat, Message, AutoExportConfig } from '../types/whatsapp';

const sampleMessages: Message[] = [
  {
    id: 'm1',
    chatId: 'c1',
    senderId: 'contact-1',
    senderName: 'Sarah Designer',
    isOutgoing: false,
    text: 'Halo Dimas! Ini preview mockup iOS Glass yang baru ya.',
    timestamp: '09:30',
    fullTimestamp: '04/11/2026, 09:30:15',
    status: 'read',
    attachments: [
      {
        id: 'att-1',
        type: 'image',
        url: 'blob:simulated',
        fileName: 'mockup_ios_glass.png',
        fileSize: '1.4 MB',
        mimeType: 'image/png',
      },
    ],
  },
  {
    id: 'm2',
    chatId: 'c1',
    senderId: 'me',
    senderName: 'Dimas',
    isOutgoing: true,
    text: 'Keren banget! Blur acrylic-nya kelihatan mewah banget.',
    timestamp: '09:32',
    fullTimestamp: '04/11/2026, 09:32:00',
    status: 'read',
  },
];

const sampleChat: Chat = {
  id: 'c1',
  name: 'Sarah Designer',
  isGroup: false,
  avatar: 'https://images.unsplash.com/sample',
  unreadCount: 0,
  isPinned: true,
  isArchived: false,
  isMuted: false,
  lastMessage: sampleMessages[1],
  messages: sampleMessages,
};

test('formatWhatsAppChatTxt formats standard WhatsApp text transcript', () => {
  const result = formatWhatsAppChatTxt(sampleChat, true);
  assert.ok(result.includes('=== WHATSAPP CHAT EXPORT ==='));
  assert.ok(result.includes('Obrolan: Sarah Designer'));
  assert.ok(result.includes('Sarah Designer: Halo Dimas!'));
  assert.ok(result.includes('Anda: Keren banget!'));
  assert.ok(result.includes('mockup_ios_glass.png'));
});

test('formatChatJson exports structured valid JSON', () => {
  const jsonStr = formatChatJson(sampleChat);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.totalChats, 1);
  assert.equal(parsed.chats[0].name, 'Sarah Designer');
  assert.equal(parsed.chats[0].messages.length, 2);
  assert.equal(parsed.chats[0].messages[0].attachments.length, 1);
});

test('generateHtmlTranscript creates an HTML document with message bubbles', () => {
  const html = generateHtmlTranscript(sampleChat);
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('Sarah Designer'));
  assert.ok(html.includes('mockup_ios_glass.png'));
  assert.ok(html.includes('Halo Dimas!'));
});

test('shouldTriggerAutoExport handles frequency conditions properly', () => {
  const configDisabled: AutoExportConfig = {
    enabled: false,
    frequency: 'daily',
    includeMedia: true,
    includeVoiceNotes: true,
    includeDocuments: true,
    format: 'zip',
    destination: 'local_download',
    selectedChatIds: [],
    autoDownloadZip: true,
  };
  assert.equal(shouldTriggerAutoExport(Date.now(), configDisabled), false);

  const configEnabled: AutoExportConfig = {
    ...configDisabled,
    enabled: true,
    frequency: 'realtime',
  };
  // Has never exported before -> triggers
  assert.equal(shouldTriggerAutoExport(undefined, configEnabled), true);
  // Just exported 2 seconds ago with 30s realtime throttle -> does not trigger
  assert.equal(shouldTriggerAutoExport(Date.now() - 2000, configEnabled), false);
  // Exported 40s ago with 30s realtime throttle -> triggers
  assert.equal(shouldTriggerAutoExport(Date.now() - 40000, configEnabled), true);
});

test('formatBytes properly formats file sizes', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1024 * 1024 * 2.5), '2.5 MB');
});
