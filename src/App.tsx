import React, { useState } from 'react';
import { WhatsAppProvider, useWhatsApp } from './context/WhatsAppContext';
import { LinkingScreen } from './components/LinkingScreen';
import { HeaderTopBar, MainNavTab } from './components/HeaderTopBar';
import { ChatList } from './components/ChatList';
import { ChatConversation } from './components/ChatConversation';
import { StatusView } from './components/StatusView';
import { StatusViewerModal } from './components/StatusViewerModal';
import { CallsView } from './components/CallsView';
import { CallScreenModal } from './components/CallScreenModal';
import { MediaGalleryView } from './components/MediaGalleryView';
import { ModSettingsView } from './components/ModSettingsView';
import { LinkedDevicesManager } from './components/LinkedDevicesManager';
import { ExportModal } from './components/ExportModal';

const MainApp: React.FC = () => {
  const {
    connectionState,
    activeStory,
    setActiveStory,
    openExportModal,
    selectChat,
  } = useWhatsApp();

  const [currentTab, setCurrentTab] = useState<MainNavTab>('chats');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // If not yet connected, render the Real Linked Device pairing screen
  if (connectionState !== 'connected') {
    return <LinkingScreen />;
  }

  const handleExportChat = (chatId: string) => {
    selectChat(chatId);
    openExportModal('instant');
  };

  return (
    <div className="relative h-screen w-full flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200 transition-colors duration-500">
      {/* Dynamic iOS 26 Liquid Glass Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-36 -left-36 w-[580px] h-[580px] bg-emerald-500/20 dark:bg-emerald-500/18 rounded-full blur-[130px] animate-liquid-orb" />
        <div className="absolute top-1/3 -right-36 w-[520px] h-[520px] bg-teal-400/18 dark:bg-teal-400/14 rounded-full blur-[140px] animate-liquid-orb-slow" />
        <div className="absolute -bottom-40 left-1/3 w-[640px] h-[640px] bg-indigo-500/16 dark:bg-indigo-500/15 rounded-full blur-[150px] animate-liquid-orb" />
      </div>

      {/* Main Top Bar */}
      <HeaderTopBar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setMobileChatOpen(false);
        }}
      />

      {/* Main View Area */}
      <main className="relative z-10 flex-1 flex w-full max-w-[1640px] mx-auto p-1 sm:p-3 md:p-4 overflow-hidden min-h-0">
        <div className="w-full flex-1 flex rounded-[18px] sm:rounded-[28px] ios-glass-card overflow-hidden min-h-0">
          {currentTab === 'chats' && (
            <div className="w-full h-full flex overflow-hidden">
              {/* Chat list (hidden on small screens if active chat is open) */}
              <div
                className={`w-full md:w-80 lg:w-96 h-full flex shrink-0 ${
                  mobileChatOpen ? 'hidden md:flex' : 'flex'
                }`}
              >
                <ChatList
                  onExportChat={handleExportChat}
                  onOpenChatMobile={() => setMobileChatOpen(true)}
                />
              </div>

              {/* Chat conversation (hidden on small screens if list is shown) */}
              <div
                className={`flex-1 h-full flex flex-col min-w-0 ${
                  !mobileChatOpen ? 'hidden md:flex' : 'flex'
                }`}
              >
                <ChatConversation
                  onBackMobile={() => setMobileChatOpen(false)}
                  onExportCurrentChat={() => openExportModal('instant')}
                  onOpenModSettings={() => setCurrentTab('mod')}
                />
              </div>
            </div>
          )}

          {currentTab === 'status' && <StatusView />}

          {currentTab === 'calls' && <CallsView />}

          {currentTab === 'media' && <MediaGalleryView />}

          {currentTab === 'mod' && <ModSettingsView />}

          {currentTab === 'devices' && <LinkedDevicesManager />}
        </div>
      </main>

      {/* Modals & Overlays */}
      <ExportModal />
      <CallScreenModal />
      {activeStory && (
        <StatusViewerModal
          story={activeStory}
          onClose={() => setActiveStory(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <WhatsAppProvider>
      <MainApp />
    </WhatsAppProvider>
  );
}
