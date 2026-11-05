import { Chat, Contact, StatusStory, CallRecord, LinkedDeviceSession } from '../types/whatsapp';

export const CURRENT_USER: Contact = {
  id: 'me',
  name: 'Pengguna WhatsApp',
  phone: '',
  about: 'Terhubung via iGlass WA Companion',
  avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%2310b981"/><text x="50" y="58" font-size="34" font-weight="bold" fill="white" font-family="sans-serif" text-anchor="middle">WA</text></svg>',
  isOnline: true,
};

export const INITIAL_CONTACTS: Contact[] = [];
export const INITIAL_CHATS: Chat[] = [];
export const INITIAL_STORIES: StatusStory[] = [];
export const INITIAL_CALLS: CallRecord[] = [];
export const INITIAL_LINKED_SESSIONS: LinkedDeviceSession[] = [
  {
    id: 'session_current',
    name: 'iGlass Web Companion (Sesi Ini)',
    os: 'Linux / macOS / Windows',
    browser: 'Baileys Multi-Device Engine v7',
    location: 'Sesi Enkripsi Lokal',
    lastActive: 'Aktif Sekarang',
    isCurrent: true,
    ipAddress: '127.0.0.1 (Direct Socket)',
  },
];
