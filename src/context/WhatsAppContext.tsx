import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Chat,
  Message,
  Contact,
  StatusStory,
  CallRecord,
  LinkedDeviceSession,
  AutoExportConfig,
  ExportRecord,
  ExportFilter,
  MediaAttachment,
  ModConfig,
  BoomJobStatus,
} from '../types/whatsapp';
import {
  INITIAL_CHATS,
  INITIAL_CONTACTS,
  INITIAL_STORIES,
  INITIAL_CALLS,
  INITIAL_LINKED_SESSIONS,
  CURRENT_USER,
} from '../data/mockData';
import {
  buildExportZip,
  formatWhatsAppChatTxt,
  formatChatJson,
  generateHtmlTranscript,
  triggerFileDownload,
  shouldTriggerAutoExport,
  formatBytes,
} from '../utils/exporter';

export type ConnectionState = 'disconnected' | 'pairing' | 'syncing' | 'connected';

interface WhatsAppContextType {
  connectionState: ConnectionState;
  syncProgress: number;
  syncStatusText: string;
  pairingCode: string;
  phoneInfo: {
    model: string;
    battery: number;
    isCharging: boolean;
    network: string;
    phoneNumber: string;
  };
  realQrCodeDataUrl: string | null;
  realBackendStatus: string;
  realUser: { id: string; name?: string; phone?: string; avatar?: string } | null;
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  contacts: Contact[];
  stories: StatusStory[];
  calls: CallRecord[];
  linkedSessions: LinkedDeviceSession[];
  autoExportConfig: AutoExportConfig;
  exportRecords: ExportRecord[];
  modConfig: ModConfig;
  boomStatus: BoomJobStatus;
  isExportModalOpen: boolean;
  exportActiveTab: 'instant' | 'auto' | 'history';
  isMediaGalleryOpen: boolean;
  isLinkedDevicesOpen: boolean;
  activeStory: StatusStory | null;
  activeCall: {
    contact: Contact;
    type: 'audio' | 'video';
    startTime: number;
    status: 'ringing' | 'connected';
  } | null;
  darkMode: boolean;

  // Actions
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  startRealWhatsAppBackend: (phoneNumber?: string) => Promise<void>;
  disconnectDevice: () => void;
  selectChat: (chatId: string) => void;
  startNewChatByPhone: (phone: string, initialName?: string) => string;
  sendMessage: (chatId: string, text: string, attachments?: MediaAttachment[], rawFile?: File) => Promise<void>;
  startChatBoom: (chatId: string, text: string, count: number) => Promise<{ success: boolean; error?: string }>;
  stopChatBoom: () => Promise<void>;
  updateModConfig: (updates: Partial<ModConfig>) => Promise<void>;
  reactToMessage: (chatId: string, messageId: string, emoji: string) => void;
  togglePinChat: (chatId: string) => void;
  toggleMuteChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  openExportModal: (tab?: 'instant' | 'auto' | 'history') => void;
  closeExportModal: () => void;
  setIsMediaGalleryOpen: (val: boolean) => void;
  setIsLinkedDevicesOpen: (val: boolean) => void;
  setActiveStory: (story: StatusStory | null) => void;
  startCall: (contactId: string, type: 'audio' | 'video') => void;
  endCall: () => void;
  updateAutoExportConfig: (config: Partial<AutoExportConfig>) => void;
  runExport: (filter: ExportFilter, triggerType?: 'manual' | 'auto') => Promise<void>;
  unlinkSession: (sessionId: string) => void;
}

const WhatsAppContext = createContext<WhatsAppContextType | null>(null);

const STORAGE_KEY_CONFIG = 'iglass_wa_autoexport_config_v3';
const STORAGE_KEY_RECORDS = 'iglass_wa_export_records_v3';
const STORAGE_KEY_MOD = 'iglass_wa_mod_config_v3_all_off';

const DEFAULT_CONFIG: AutoExportConfig = {
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

// Initially ALL OFF (false) so the user turns on each Mod / Anti-Ban feature manually!
const DEFAULT_MOD_CONFIG: ModConfig = {
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
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const WhatsAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('Menghubungkan ke soket enkripsi WhatsApp...');
  const [pairingCode, setPairingCode] = useState('');

  const [realQrCodeDataUrl, setRealQrCodeDataUrl] = useState<string | null>(null);
  const [realBackendStatus, setRealBackendStatus] = useState<string>('disconnected');
  const [realUser, setRealUser] = useState<{ id: string; name?: string; phone?: string; avatar?: string } | null>(null);

  const [phoneInfo, setPhoneInfo] = useState({
    model: 'Menunggu Perangkat Tertaut',
    battery: 100,
    isCharging: true,
    network: 'WebSocket Terenkripsi',
    phoneNumber: '',
  });

  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Real Data States
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [stories, setStories] = useState<StatusStory[]>(INITIAL_STORIES);
  const [calls, setCalls] = useState<CallRecord[]>(INITIAL_CALLS);
  const [linkedSessions, setLinkedSessions] = useState<LinkedDeviceSession[]>(INITIAL_LINKED_SESSIONS);

  // Mod & Boom states (Starts all OFF unless user explicitly toggled in v3)
  const [modConfig, setModConfig] = useState<ModConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MOD);
      return saved ? { ...DEFAULT_MOD_CONFIG, ...JSON.parse(saved) } : DEFAULT_MOD_CONFIG;
    } catch {
      return DEFAULT_MOD_CONFIG;
    }
  });

  const [boomStatus, setBoomStatus] = useState<BoomJobStatus>({
    isRunning: false,
    chatId: '',
    text: '',
    total: 0,
    sent: 0,
    currentDelayMs: 0,
    lastError: null,
  });

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportActiveTab, setExportActiveTab] = useState<'instant' | 'auto' | 'history'>('instant');
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [isLinkedDevicesOpen, setIsLinkedDevicesOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<StatusStory | null>(null);
  const [activeCall, setActiveCall] = useState<{
    contact: Contact;
    type: 'audio' | 'video';
    startTime: number;
    status: 'ringing' | 'connected';
  } | null>(null);

  const [autoExportConfig, setAutoExportConfig] = useState<AutoExportConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [exportRecords, setExportRecords] = useState<ExportRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(autoExportConfig));
  }, [autoExportConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MOD, JSON.stringify(modConfig));
  }, [modConfig]);

  useEffect(() => {
    const toSave = exportRecords.map((rec) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { blobData, ...rest } = rec;
      return rest;
    });
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(toSave));
  }, [exportRecords]);

  // Sync modConfig to server on mount
  useEffect(() => {
    fetch('/api/whatsapp/mod-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modConfig),
    }).catch(() => {});
  }, []);

  // Real-Time Server-Sent Events (SSE) + fast polling backup for 100% instant sync
  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;

    const setupSSE = () => {
      try {
        eventSource = new EventSource('/api/whatsapp/events');
        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'new_message' && parsed.data?.message) {
              const { chatId, message } = parsed.data;
              setChats((prev) => {
                let chatFound = false;
                const next = prev.map((c) => {
                  if (c.id === chatId) {
                    chatFound = true;
                    const exists = c.messages.some((m) => m.id === message.id);
                    const updatedMsgs = exists ? c.messages : [...c.messages, message];
                    return {
                      ...c,
                      messages: updatedMsgs,
                      lastMessage: message,
                      unreadCount: message.isOutgoing ? 0 : c.unreadCount + 1,
                    };
                  }
                  return c;
                });
                if (!chatFound) {
                  // Fetch updated chats list if new chat
                  fetchChatsData();
                }
                return next;
              });
            } else if (parsed.type === 'message_revoked' && parsed.data?.messageId) {
              const { chatId, messageId } = parsed.data;
              setChats((prev) =>
                prev.map((c) => {
                  if (c.id === chatId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === messageId ? { ...m, isRevoked: true } : m
                      ),
                    };
                  }
                  return c;
                })
              );
            } else if (parsed.type === 'message_status' && parsed.data?.messageId) {
              const { chatId, messageId, status } = parsed.data;
              setChats((prev) =>
                prev.map((c) => {
                  if (c.id === chatId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === messageId ? { ...m, status } : m
                      ),
                    };
                  }
                  return c;
                })
              );
            } else if (parsed.type === 'stories_updated') {
              fetch('/api/whatsapp/chats')
                .then((r) => r.json())
                .then((d) => {
                  if (isMounted && Array.isArray(d.stories)) setStories(d.stories);
                })
                .catch(() => {});
            } else if (parsed.type === 'chats_updated') {
              fetchChatsData();
            }
          } catch {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Retry SSE in 3 seconds
          if (isMounted) {
            setTimeout(setupSSE, 3000);
          }
        };
      } catch {}
    };

    const fetchChatsData = async () => {
      try {
        const chatRes = await fetch('/api/whatsapp/chats');
        if (!chatRes.ok || !isMounted) return;
        const chatData = await chatRes.json();
        if (Array.isArray(chatData.chats)) {
          setChats((prev) => {
            const serverIds = new Set(chatData.chats.map((c: Chat) => c.id));
            const localOnly = prev.filter((p) => !serverIds.has(p.id));
            return [...chatData.chats, ...localOnly];
          });
          setActiveChatId((curr) => curr || chatData.chats[0]?.id || null);
        }
        if (Array.isArray(chatData.contacts)) {
          setContacts(chatData.contacts);
        }
        if (Array.isArray(chatData.stories)) {
          setStories(chatData.stories);
        }
        if (Array.isArray(chatData.calls)) {
          setCalls(chatData.calls);
        }
      } catch {}
    };

    const pollBackend = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        setRealBackendStatus(data.status);

        if (data.qrCodeDataUrl) {
          setRealQrCodeDataUrl(data.qrCodeDataUrl);
        } else if (data.status === 'connected') {
          setRealQrCodeDataUrl(null);
        }

        if (data.pairingCode) {
          setPairingCode(data.pairingCode);
        }

        if (data.boomStatus) {
          setBoomStatus(data.boomStatus);
        }

        if (data.status === 'connected') {
          setConnectionState('connected');
          if (data.user) {
            setRealUser(data.user);
            setPhoneInfo({
              model: data.user.name ? `${data.user.name} (Tertaut Real)` : 'WhatsApp Tertaut Real',
              battery: 96,
              isCharging: false,
              network: 'Multi-Device Noise Socket',
              phoneNumber: data.user.phone || `+${data.user.id.split('@')[0]}`,
            });
          }
          await fetchChatsData();
        } else if (data.status === 'disconnected') {
          setConnectionState('disconnected');
        }
      } catch {}
    };

    setupSSE();
    pollBackend();
    const interval = setInterval(pollBackend, 1200);

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(interval);
    };
  }, []);

  const startRealWhatsAppBackend = async (phoneNumber?: string) => {
    try {
      setSyncProgress(35);
      setSyncStatusText('Menghubungkan ke server WhatsApp Meta via Baileys...');
      await fetch('/api/whatsapp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      setSyncProgress(75);
      setSyncStatusText('Menunggu pemindaian QR atau kode tautan...');
    } catch (err) {
      console.error('Failed to trigger real WhatsApp start:', err);
    }
  };

  const disconnectDevice = async () => {
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
    } catch {}

    setConnectionState('disconnected');
    setRealQrCodeDataUrl(null);
    setRealUser(null);
    setChats([]);
    setStories([]);
    setCalls([]);
    setActiveChatId(null);
  };

  const selectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    );
    fetch('/api/whatsapp/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId }),
    }).catch(() => {});
  };

  const startNewChatByPhone = (rawPhone: string, initialName?: string): string => {
    const cleaned = rawPhone.replace(/[^0-9]/g, '');
    const normalized = cleaned.startsWith('0') ? `62${cleaned.slice(1)}` : cleaned;
    const jid = `${normalized}@s.whatsapp.net`;
    const displayName = initialName?.trim() || `+${normalized}`;

    setChats((prev) => {
      if (prev.some((c) => c.id === jid)) return prev;
      const newChat: Chat = {
        id: jid,
        name: displayName,
        isGroup: false,
        avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="%2310b981"/><text x="60" y="70" font-size="36" font-weight="bold" fill="white" font-family="sans-serif" text-anchor="middle">WA</text></svg>`,
        unreadCount: 0,
        isPinned: true,
        isArchived: false,
        isMuted: false,
        messages: [],
        lastMessage: {
          id: `init_${Date.now()}`,
          chatId: jid,
          senderId: 'me',
          senderName: 'Anda',
          isOutgoing: true,
          text: 'Ketuk untuk mulai percakapan',
          timestamp: 'Baru',
          fullTimestamp: '',
          status: 'read',
        },
      };
      return [newChat, ...prev];
    });

    setActiveChatId(jid);
    return jid;
  };

  const updateModConfig = async (updates: Partial<ModConfig>) => {
    const nextConfig: ModConfig = {
      ...modConfig,
      ...updates,
      antiBanGuard: {
        ...modConfig.antiBanGuard,
        ...(updates.antiBanGuard || {}),
      },
    };
    setModConfig(nextConfig);
    try {
      await fetch('/api/whatsapp/mod-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextConfig),
      });
    } catch {}
  };

  const startChatBoom = async (
    chatId: string,
    text: string,
    count: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/whatsapp/boom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, text, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal menjalankan Chat Boom' };
      }
      if (data.boomStatus) {
        setBoomStatus(data.boomStatus);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Koneksi ke server gagal' };
    }
  };

  const stopChatBoom = async () => {
    try {
      const res = await fetch('/api/whatsapp/boom/stop', { method: 'POST' });
      const data = await res.json();
      if (data.boomStatus) setBoomStatus(data.boomStatus);
    } catch {}
  };

  const runExport = async (filter: ExportFilter, triggerType: 'manual' | 'auto' = 'manual') => {
    try {
      const selectedChats = filter.chatId
        ? chats.filter((c) => c.id === filter.chatId)
        : autoExportConfig.selectedChatIds.length > 0
        ? chats.filter((c) => autoExportConfig.selectedChatIds.includes(c.id))
        : chats;

      const targetChat = filter.chatId ? chats.find((c) => c.id === filter.chatId) : null;
      const targetLabel = targetChat ? targetChat.name : `Semua Obrolan (${selectedChats.length})`;
      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (filter.format === 'zip') {
        const { blob, record } = await buildExportZip(chats, filter);
        const enrichedRecord: ExportRecord = {
          ...record,
          triggerType,
          chatName: targetLabel,
        };
        setExportRecords((prev) => [enrichedRecord, ...prev]);
        if (autoExportConfig.autoDownloadZip || triggerType === 'manual') {
          triggerFileDownload(blob, `WhatsApp_Backup_${targetLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${timestampStr}.zip`);
        }
      } else if (filter.format === 'json') {
        const jsonContent = formatChatJson(selectedChats);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const record: ExportRecord = {
          id: `export_${Date.now()}`,
          date: new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          timestamp: Date.now(),
          chatName: targetLabel,
          format: 'JSON',
          messageCount: selectedChats.reduce((acc, c) => acc + c.messages.length, 0),
          mediaCount: 0,
          fileSizeBytes: blob.size,
          fileSizeFormatted: formatBytes(blob.size),
          status: 'completed',
          triggerType,
          blobData: blob,
        };
        setExportRecords((prev) => [record, ...prev]);
        triggerFileDownload(blob, `WhatsApp_Data_${timestampStr}.json`);
      } else if (filter.format === 'txt') {
        const txtParts = selectedChats.map((c) => formatWhatsAppChatTxt(c, filter.includeMedia));
        const combinedTxt = txtParts.join('\n\n========================================\n\n');
        const blob = new Blob([combinedTxt], { type: 'text/plain;charset=utf-8' });
        const record: ExportRecord = {
          id: `export_${Date.now()}`,
          date: new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          timestamp: Date.now(),
          chatName: targetLabel,
          format: 'TXT',
          messageCount: selectedChats.reduce((acc, c) => acc + c.messages.length, 0),
          mediaCount: 0,
          fileSizeBytes: blob.size,
          fileSizeFormatted: formatBytes(blob.size),
          status: 'completed',
          triggerType,
          blobData: blob,
        };
        setExportRecords((prev) => [record, ...prev]);
        triggerFileDownload(blob, `WhatsApp_Chat_${targetLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${timestampStr}.txt`);
      } else if (filter.format === 'html') {
        const html = selectedChats[0] ? generateHtmlTranscript(selectedChats[0]) : '';
        const blob = new Blob([html], { type: 'text/html' });
        const record: ExportRecord = {
          id: `export_${Date.now()}`,
          date: new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          timestamp: Date.now(),
          chatName: targetLabel,
          format: 'HTML',
          messageCount: selectedChats.reduce((acc, c) => acc + c.messages.length, 0),
          mediaCount: 0,
          fileSizeBytes: blob.size,
          fileSizeFormatted: formatBytes(blob.size),
          status: 'completed',
          triggerType,
          blobData: blob,
        };
        setExportRecords((prev) => [record, ...prev]);
        triggerFileDownload(blob, `WhatsApp_Transcript_${targetLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${timestampStr}.html`);
      }

      setAutoExportConfig((prev) => ({ ...prev, lastExportTimestamp: Date.now() }));
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const configRef = useRef(autoExportConfig);
  configRef.current = autoExportConfig;

  useEffect(() => {
    if (connectionState !== 'connected') return;
    const interval = setInterval(() => {
      const cfg = configRef.current;
      if (shouldTriggerAutoExport(cfg.lastExportTimestamp, cfg) && chats.length > 0) {
        runExport(
          {
            format: cfg.format,
            includeMedia: cfg.includeMedia,
            includeVoiceNotes: cfg.includeVoiceNotes,
            includeDocuments: cfg.includeDocuments,
          },
          'auto'
        );
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [connectionState, chats.length]);

  const sendMessage = async (
    chatId: string,
    text: string,
    attachments?: MediaAttachment[],
    rawFile?: File
  ) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const fullTimeStr = `${now.toLocaleDateString('id-ID')}, ${now.toLocaleTimeString('id-ID')}`;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      chatId,
      senderId: CURRENT_USER.id,
      senderName: realUser?.name || CURRENT_USER.name,
      isOutgoing: true,
      text,
      timestamp: timeStr,
      fullTimestamp: fullTimeStr,
      status: 'sent',
      attachments,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) return chat;
        return {
          ...chat,
          messages: [...chat.messages, newMsg],
          lastMessage: newMsg,
        };
      })
    );

    try {
      let mediaBase64: string | undefined;
      let mediaType: string | undefined;
      let mimeType: string | undefined;
      let fileName: string | undefined;

      if (rawFile) {
        mediaBase64 = await fileToBase64(rawFile);
        mediaType = rawFile.type.startsWith('image/')
          ? 'image'
          : rawFile.type.startsWith('video/')
          ? 'video'
          : rawFile.type.startsWith('audio/')
          ? 'audio'
          : 'document';
        mimeType = rawFile.type || 'application/octet-stream';
        fileName = rawFile.name;
      }

      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          text,
          mediaBase64,
          mediaType,
          mimeType,
          fileName,
        }),
      });
    } catch (err) {
      console.error('Failed to send via real WhatsApp backend:', err);
    }
  };

  const reactToMessage = (chatId: string, messageId: string, emoji: string) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== chatId) return chat;
        return {
          ...chat,
          messages: chat.messages.map((msg) => {
            if (msg.id !== messageId) return msg;
            const existingReactions = msg.reactions || [];
            const found = existingReactions.find((r) => r.emoji === emoji);
            const updatedReactions = found
              ? existingReactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1 } : r))
              : [...existingReactions, { emoji, count: 1, users: ['me'] }];
            return { ...msg, reactions: updatedReactions };
          }),
        };
      })
    );
  };

  const togglePinChat = (chatId: string) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c)));
  };

  const toggleMuteChat = (chatId: string) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, isMuted: !c.isMuted } : c)));
  };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      const remaining = chats.filter((c) => c.id !== chatId);
      setActiveChatId(remaining[0]?.id || null);
    }
  };

  const openExportModal = (tab: 'instant' | 'auto' | 'history' = 'instant') => {
    setExportActiveTab(tab);
    setIsExportModalOpen(true);
  };

  const closeExportModal = () => {
    setIsExportModalOpen(false);
  };

  const startCall = (contactId: string, type: 'audio' | 'video') => {
    const contact = contacts.find((c) => c.id === contactId) || {
      id: contactId,
      name: `+${contactId.split('@')[0]}`,
      phone: `+${contactId.split('@')[0]}`,
      about: 'WhatsApp User',
      avatar: CURRENT_USER.avatar,
      isOnline: true,
    };

    setActiveCall({
      contact,
      type,
      startTime: Date.now(),
      status: 'ringing',
    });
  };

  const endCall = () => {
    setActiveCall(null);
  };

  const updateAutoExportConfig = (config: Partial<AutoExportConfig>) => {
    setAutoExportConfig((prev) => ({ ...prev, ...config }));
  };

  const unlinkSession = (sessionId: string) => {
    setLinkedSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  return (
    <WhatsAppContext.Provider
      value={{
        connectionState,
        syncProgress,
        syncStatusText,
        pairingCode,
        phoneInfo,
        realQrCodeDataUrl,
        realBackendStatus,
        realUser,
        chats,
        activeChatId,
        activeChat,
        contacts,
        stories,
        calls,
        linkedSessions,
        autoExportConfig,
        exportRecords,
        modConfig,
        boomStatus,
        isExportModalOpen,
        exportActiveTab,
        isMediaGalleryOpen,
        isLinkedDevicesOpen,
        activeStory,
        activeCall,
        darkMode,
        setDarkMode,
        startRealWhatsAppBackend,
        disconnectDevice,
        selectChat,
        startNewChatByPhone,
        sendMessage,
        startChatBoom,
        stopChatBoom,
        updateModConfig,
        reactToMessage,
        togglePinChat,
        toggleMuteChat,
        deleteChat,
        openExportModal,
        closeExportModal,
        setIsMediaGalleryOpen,
        setIsLinkedDevicesOpen,
        setActiveStory,
        startCall,
        endCall,
        updateAutoExportConfig,
        runExport,
        unlinkSession,
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  );
};

export const useWhatsApp = () => {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  return ctx;
};
