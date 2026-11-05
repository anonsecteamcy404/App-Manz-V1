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
  isRealWhatsAppMode: boolean;
  setIsRealWhatsAppMode: (val: boolean) => void;
  realQrCodeDataUrl: string | null;
  realBackendStatus: string;
  realUser: { id: string; name?: string; phone?: string } | null;
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  contacts: Contact[];
  stories: StatusStory[];
  calls: CallRecord[];
  linkedSessions: LinkedDeviceSession[];
  autoExportConfig: AutoExportConfig;
  exportRecords: ExportRecord[];
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
  startPairing: (method: 'qr' | 'code') => void;
  startRealWhatsAppBackend: (phoneNumber?: string) => Promise<void>;
  disconnectDevice: () => void;
  selectChat: (chatId: string) => void;
  sendMessage: (chatId: string, text: string, attachments?: MediaAttachment[]) => void;
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

const STORAGE_KEY_CONNECTED = 'iglass_wa_connected';
const STORAGE_KEY_CONFIG = 'iglass_wa_autoexport_config';
const STORAGE_KEY_RECORDS = 'iglass_wa_export_records';

const DEFAULT_CONFIG: AutoExportConfig = {
  enabled: true,
  frequency: 'daily',
  includeMedia: true,
  includeVoiceNotes: true,
  includeDocuments: true,
  format: 'zip',
  destination: 'local_download',
  selectedChatIds: [],
  autoDownloadZip: true,
};

export const WhatsAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONNECTED);
    return saved === 'true' ? 'connected' : 'disconnected';
  });
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('Menginisialisasi handshake enkripsi...');
  const [pairingCode, setPairingCode] = useState('W9A4-KQ7P');

  // Real WhatsApp Baileys mode states
  const [isRealWhatsAppMode, setIsRealWhatsAppMode] = useState(true);
  const [realQrCodeDataUrl, setRealQrCodeDataUrl] = useState<string | null>(null);
  const [realBackendStatus, setRealBackendStatus] = useState<string>('disconnected');
  const [realUser, setRealUser] = useState<{ id: string; name?: string; phone?: string } | null>(null);

  // Device & Phone status
  const [phoneInfo, setPhoneInfo] = useState({
    model: 'iPhone 16 Pro Max',
    battery: 88,
    isCharging: false,
    network: 'Wi-Fi 5GHz · 140 Mbps',
    phoneNumber: '+62 812-8899-7721',
  });

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || true;
    }
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Data states
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(INITIAL_CHATS[0]?.id || null);
  const [contacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [stories, setStories] = useState<StatusStory[]>(INITIAL_STORIES);
  const [calls, setCalls] = useState<CallRecord[]>(INITIAL_CALLS);
  const [linkedSessions, setLinkedSessions] = useState<LinkedDeviceSession[]>(INITIAL_LINKED_SESSIONS);

  // Modals & Navigation
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

  // Auto-export configuration & records
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

  // Save config changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(autoExportConfig));
  }, [autoExportConfig]);

  // Save export history
  useEffect(() => {
    const toSave = exportRecords.map((rec) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { blobData, ...rest } = rec;
      return rest;
    });
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(toSave));
  }, [exportRecords]);

  // Poll real backend status when on linking screen or connected
  useEffect(() => {
    let isMounted = true;
    const checkBackendStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        setRealBackendStatus(data.status);

        if (data.qrCodeDataUrl) {
          setRealQrCodeDataUrl(data.qrCodeDataUrl);
        }

        if (data.pairingCode) {
          setPairingCode(data.pairingCode);
        }

        if (data.status === 'connected') {
          setConnectionState('connected');
          localStorage.setItem(STORAGE_KEY_CONNECTED, 'true');
          if (data.user) {
            setRealUser(data.user);
            setPhoneInfo((prev) => ({
              ...prev,
              phoneNumber: data.user.phone || data.user.id.split('@')[0],
              model: data.user.name ? `${data.user.name} (WhatsApp Asli)` : 'Ponsel WhatsApp Asli',
            }));
          }

          // Fetch real chats if available
          try {
            const chatRes = await fetch('/api/whatsapp/chats');
            if (chatRes.ok) {
              const chatData = await chatRes.json();
              if (chatData.chats && chatData.chats.length > 0) {
                setChats(chatData.chats);
              }
            }
          } catch (e) {
            console.error('Error fetching real chats:', e);
          }
        }
      } catch (err) {
        // Backend not running or offline
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Start real backend WhatsApp connection
  const startRealWhatsAppBackend = async (phoneNumber?: string) => {
    try {
      setConnectionState('syncing');
      setSyncProgress(30);
      setSyncStatusText('Menghubungkan ke server WhatsApp Meta via Baileys...');
      await fetch('/api/whatsapp/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      setSyncProgress(65);
      setSyncStatusText('Menunggu respon kode QR dari server WhatsApp...');
    } catch (err) {
      console.error('Failed to trigger real WhatsApp start:', err);
    }
  };

  // Handle pairing and handshake simulator
  const startPairing = (_method: 'qr' | 'code') => {
    setConnectionState('syncing');
    setSyncProgress(15);
    setSyncStatusText('Menghubungkan ke server enkripsi WhatsApp Signal...');

    const stages = [
      { p: 35, text: 'Memverifikasi sesi perangkat tertaut aman...' },
      { p: 60, text: 'Mengunduh riwayat obrolan & kontak terbaru...' },
      { p: 85, text: 'Menyelaraskan media, status, dan riwayat panggilan...' },
      { p: 100, text: 'Selesai! Sesi aman terhubung.' },
    ];

    stages.forEach((stage, idx) => {
      setTimeout(() => {
        setSyncProgress(stage.p);
        setSyncStatusText(stage.text);
        if (idx === stages.length - 1) {
          setTimeout(() => {
            setConnectionState('connected');
            localStorage.setItem(STORAGE_KEY_CONNECTED, 'true');
            // Check auto-export on connect
            if (autoExportConfig.enabled && autoExportConfig.frequency === 'on_connect') {
              runExport({
                format: autoExportConfig.format,
                includeMedia: autoExportConfig.includeMedia,
                includeVoiceNotes: autoExportConfig.includeVoiceNotes,
                includeDocuments: autoExportConfig.includeDocuments,
              }, 'auto');
            }
          }, 600);
        }
      }, (idx + 1) * 700);
    });
  };

  const disconnectDevice = async () => {
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
    } catch {}

    setConnectionState('disconnected');
    localStorage.removeItem(STORAGE_KEY_CONNECTED);
    setRealQrCodeDataUrl(null);
    setRealUser(null);
    const codes = ['P8M2-LX9Q', 'K4N9-RT2Y', 'B7C3-HV6W', 'W9A4-KQ7P'];
    setPairingCode(codes[Math.floor(Math.random() * codes.length)]);
  };

  const selectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Run Export logic
  const runExport = async (filter: ExportFilter, triggerType: 'manual' | 'auto' = 'manual') => {
    try {
      const selectedChats = filter.chatId
        ? chats.filter((c) => c.id === filter.chatId)
        : (autoExportConfig.selectedChatIds.length > 0
            ? chats.filter((c) => autoExportConfig.selectedChatIds.includes(c.id))
            : chats);

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

  // Background auto-export interval
  const configRef = useRef(autoExportConfig);
  configRef.current = autoExportConfig;
  const chatsRef = useRef(chats);
  chatsRef.current = chats;

  useEffect(() => {
    if (connectionState !== 'connected') return;

    const interval = setInterval(() => {
      const cfg = configRef.current;
      if (shouldTriggerAutoExport(cfg.lastExportTimestamp, cfg)) {
        runExport({
          format: cfg.format,
          includeMedia: cfg.includeMedia,
          includeVoiceNotes: cfg.includeVoiceNotes,
          includeDocuments: cfg.includeDocuments,
        }, 'auto');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [connectionState]);

  // Send message
  const sendMessage = async (chatId: string, text: string, attachments?: MediaAttachment[]) => {
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

    // If real backend connected, send to WhatsApp server
    if (realBackendStatus === 'connected') {
      try {
        await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, text }),
        });
      } catch (err) {
        console.error('Failed to send via real WhatsApp backend:', err);
      }
    }

    setTimeout(() => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => (m.id === newMsg.id ? { ...m, status: 'delivered' } : m)),
          };
        })
      );
    }, 800);

    setTimeout(() => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => (m.id === newMsg.id ? { ...m, status: 'read' } : m)),
          };
        })
      );
    }, 1800);

    // If simulated chat, trigger auto-reply
    const targetChat = chats.find((c) => c.id === chatId);
    if (targetChat && !targetChat.isGroup && realBackendStatus !== 'connected') {
      setTimeout(() => {
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, isTyping: true } : c))
        );

        setTimeout(() => {
          const replyTextOptions = [
            `Siap! Pesanmu sudah tersinkronisasi sempurna di perangkat tertaut iOS Glass.`,
            `Oke mengerti, terima kasih infonya! Nanti segera aku cek ya.`,
            `Mantap, sistem cadangan otomatisnya juga langsung aktif dan mencatat log obrolan ini.`,
            `Noted! Semua media dan voice note juga aman tersimpan di cache lokal.`,
          ];
          const chosenReply = replyTextOptions[Math.floor(Math.random() * replyTextOptions.length)];
          const replyTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const replyFullTime = `${new Date().toLocaleDateString('id-ID')}, ${new Date().toLocaleTimeString('id-ID')}`;

          const replyMsg: Message = {
            id: `reply_${Date.now()}`,
            chatId,
            senderId: targetChat.id,
            senderName: targetChat.name,
            isOutgoing: false,
            text: chosenReply,
            timestamp: replyTime,
            fullTimestamp: replyFullTime,
            status: 'read',
          };

          setChats((prev) =>
            prev.map((c) => {
              if (c.id !== chatId) return c;
              return {
                ...c,
                isTyping: false,
                messages: [...c.messages, replyMsg],
                lastMessage: replyMsg,
              };
            })
          );
        }, 2200);
      }, 1000);
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
            let updatedReactions;
            if (found) {
              updatedReactions = existingReactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1 } : r
              );
            } else {
              updatedReactions = [...existingReactions, { emoji, count: 1, users: ['me'] }];
            }
            return { ...msg, reactions: updatedReactions };
          }),
        };
      })
    );
  };

  const togglePinChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const toggleMuteChat = (chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isMuted: !c.isMuted } : c))
    );
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
      name: 'Kontak WhatsApp',
      phone: '+62 812-0000-0000',
      about: 'WhatsApp User',
      avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%2310b981"/><text x="50" y="58" font-size="32" font-weight="bold" fill="white" font-family="sans-serif" text-anchor="middle">WA</text></svg>',
      isOnline: true,
    };

    setActiveCall({
      contact,
      type,
      startTime: Date.now(),
      status: 'ringing',
    });

    setTimeout(() => {
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
    }, 2500);

    const newCall: CallRecord = {
      id: `call_${Date.now()}`,
      contactId: contact.id,
      contactName: contact.name,
      contactAvatar: contact.avatar,
      type,
      direction: 'outgoing',
      timestamp: 'Baru saja',
      duration: 'Sedang berlangsung',
    };
    setCalls((prev) => [newCall, ...prev]);
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
        isRealWhatsAppMode,
        setIsRealWhatsAppMode,
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
        isExportModalOpen,
        exportActiveTab,
        isMediaGalleryOpen,
        isLinkedDevicesOpen,
        activeStory,
        activeCall,
        darkMode,
        setDarkMode,
        startPairing,
        startRealWhatsAppBackend,
        disconnectDevice,
        selectChat,
        sendMessage,
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
