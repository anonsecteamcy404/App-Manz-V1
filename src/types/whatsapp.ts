export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'location';
  url: string;
  fileName: string;
  fileSize: string;
  duration?: string; // For audio/video
  mimeType: string;
  thumbnailUrl?: string;
  isViewOnce?: boolean; // 1x Lihat (View Once) unlocked by Mod
  locationDetails?: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  isOutgoing: boolean;
  text: string;
  timestamp: string; // ISO or HH:mm
  fullTimestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isViewOnce?: boolean; // 1x Lihat message
  isRevoked?: boolean; // Anti-Delete (Pesan ditarik tapi tetap tersimpan)
  attachments?: MediaAttachment[];
  reactions?: MessageReaction[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  isStarred?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  about: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  avatar: string;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  lastMessage: Message;
  messages: Message[];
  participants?: string[];
  groupDescription?: string;
  isTyping?: boolean;
}

export interface StatusStoryItem {
  id: string;
  type: 'image' | 'video' | 'text';
  content: string; // image/video data url or text
  bgColor?: string;
  caption?: string;
  timestamp: string;
  seen: boolean;
  fileName?: string;
  mimeType?: string;
}

export interface StatusStory {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar: string;
  stories: StatusStoryItem[];
  updatedAt: string;
}

export interface CallRecord {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  duration?: string;
}

export interface LinkedDeviceSession {
  id: string;
  name: string;
  os: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  ipAddress: string;
}

export interface AutoExportConfig {
  enabled: boolean;
  frequency: 'realtime' | 'hourly' | 'daily' | 'on_connect';
  includeMedia: boolean;
  includeVoiceNotes: boolean;
  includeDocuments: boolean;
  format: 'zip' | 'json' | 'txt' | 'html';
  destination: 'local_download' | 'indexeddb_cache' | 'cloud_sync_sim';
  selectedChatIds: string[];
  lastExportTimestamp?: number;
  autoDownloadZip: boolean;
}

export interface ExportRecord {
  id: string;
  date: string;
  timestamp: number;
  chatName: string;
  format: 'ZIP' | 'JSON' | 'TXT' | 'HTML';
  messageCount: number;
  mediaCount: number;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  status: 'completed' | 'in_progress' | 'failed';
  triggerType: 'auto' | 'manual';
  downloadUrl?: string;
  blobData?: Blob;
}

export interface ExportFilter {
  chatId?: string;
  format: 'zip' | 'json' | 'txt' | 'html';
  includeMedia: boolean;
  includeVoiceNotes: boolean;
  includeDocuments: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface ModConfig {
  antiBlueTick: boolean; // Jangan kirim centang biru saat buka chat
  antiBlueTickOnReply: boolean; // Jangan kirim centang biru meskipun sudah membalas chat
  antiViewOnce: boolean; // Buka & simpan otomatis semua foto/video 1x lihat
  autoSaveStatus: boolean; // Simpan & unduh status otomatis tanpa ketahuan
  antiRevokeMessage: boolean; // Anti-tarik pesan (pesan dihapus pengirim tetap terbaca)
  hideOnlineStatus: boolean; // Sembunyikan status Online / Typing (Ghost Mode)
  antiBanGuard: {
    enabled: boolean;
    humanTypingSimulation: boolean; // Simulasi mengetik manusia sebelum kirim
    adaptiveJitterDelay: boolean; // Jeda acak dinamis antar pesan (1.2s - 3.4s)
    invisibleZeroWidthVariation: boolean; // Sisipkan variasi karakter zero-width tak terlihat agar hash unik & tidak dianggap spam
    autoWarmupNewContacts: boolean; // Presence subscribe & delay otomatis saat kirim ke nomor baru
    minDelayMs: number;
    maxDelayMs: number;
  };
}

export interface BoomJobStatus {
  isRunning: boolean;
  chatId: string;
  text?: string;
  total: number;
  sent: number;
  currentDelayMs: number;
  lastError: string | null;
}
