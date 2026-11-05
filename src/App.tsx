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

  // If not yet connected, render the Linked Device pairing screen
  if (connectionState !== 'connected') {
    return <LinkingScreen />;
  }

  const handleExportChat = (chatId: string) => {
    selectChat(chatId);
    openExportModal('instant');
  };

  return (
    <div className="relative h-screen w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic iOS Ambient Glass Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-600/15 dark:bg-emerald-500/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-teal-500/10 dark:bg-teal-400/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] bg-indigo-600/15 dark:bg-indigo-500/15 rounded-full blur-[150px]" />
      </div>

      {/* Main Top Bar */}
      <HeaderTopBar currentTab={currentTab} onTabChange={(tab) => {
        setCurrentTab(tab);
        setMobileChatOpen(false);
      }} />

      {/* Main View Area */}
      <main className="relative z-10 flex-1 flex w-full max-w-[1600px] mx-auto p-2 sm:p-3 md:p-4 overflow-hidden min-h-0">
        <div className="w-full flex-1 flex rounded-3xl ios-glass-card border border-white/20 shadow-2xl overflow-hidden min-h-0">
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
                />
              </div>
            </div>
          )}

          {currentTab === 'status' && <StatusView />}

          {currentTab === 'calls' && <CallsView />}

          {currentTab === 'media' && <MediaGalleryView />}

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
