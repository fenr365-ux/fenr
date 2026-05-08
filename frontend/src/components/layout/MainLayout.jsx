import { useState } from 'react';
import RealmList from '../realms/RealmList';
import HallList from '../halls/HallList';
import ChatArea from '../chat/ChatArea';
import VoiceChannel from '../voice/VoiceChannel';
import DMList from '../dms/DMList';
import DMChat from '../dms/DMChat';
import MemberList from '../members/MemberList';
import UserPanel from '../user/UserPanel';
import { useAuth } from '../../context/AuthContext';

export default function MainLayout() {
  const { session } = useAuth();
  const [selectedRealm, setSelectedRealm] = useState(null);
  const [selectedHall, setSelectedHall] = useState(null);
  const [selectedDM, setSelectedDM] = useState(null);
  const [view, setView] = useState('realms'); // 'realms' | 'dms'
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile

  function handleSelectRealm(realm) {
    setSelectedRealm(realm);
    setSelectedHall(null);
    setSelectedDM(null);
    setView('realms');
  }

  function handleSelectDMView() {
    setSelectedRealm(null);
    setSelectedHall(null);
    setView('dms');
  }

  async function handleDMUser(userId) {
    // Open DM with user from member list
    const res = await fetch('/api/dms/open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ target_user_id: userId })
    });
    if (res.ok) {
      const dm = await res.json();
      setSelectedDM(dm);
      setView('dms');
    }
  }

  const isVoiceHall = selectedHall?.is_voice;

  return (
    <div className="flex h-full bg-fenr-bg overflow-hidden">
      {/* Realm icon strip */}
      <RealmList
        selectedRealm={selectedRealm}
        onSelectRealm={handleSelectRealm}
        onSelectDMs={handleSelectDMView}
        isDMView={view === 'dms'}
      />

      {/* Sidebar — Halls or DMs (hidden on mobile unless open) */}
      <div
        className={`flex flex-col flex-shrink-0 transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative z-30 md:z-auto h-full`}
        style={{ width: '240px', background: '#22262C' }}
      >
        {view === 'dms' ? (
          <DMList selectedDM={selectedDM} onSelectDM={(dm) => { setSelectedDM(dm); setSidebarOpen(false); }} />
        ) : selectedRealm ? (
          <HallList
            realm={selectedRealm}
            selectedHall={selectedHall}
            onSelectHall={(hall) => { setSelectedHall(hall); setSidebarOpen(false); }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-fenr-muted text-sm px-6 text-center gap-3">
            <span className="text-4xl opacity-30">🐺</span>
            <p>Select a Realm to explore</p>
          </div>
        )}
        <UserPanel />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-fenr-bg">
        {/* Mobile top bar */}
        <div className="flex items-center h-12 px-4 border-b md:hidden flex-shrink-0" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-fenr-muted hover:text-fenr-text mr-3 text-xl">☰</button>
          <span className="text-fenr-text font-semibold text-sm truncate">
            {selectedHall ? `#${selectedHall.name}` : selectedDM ? 'Direct Message' : 'FENR'}
          </span>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Chat / Voice area */}
          <div className="flex-1 min-w-0">
            {view === 'dms' && selectedDM ? (
              <DMChat dm={selectedDM} />
            ) : selectedHall ? (
              isVoiceHall ? (
                <VoiceChannel hall={selectedHall} />
              ) : (
                <ChatArea hall={selectedHall} serverId={selectedRealm?.id} />
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-fenr-muted h-full gap-3">
                <span className="text-6xl opacity-20">ᚠ</span>
                <p className="text-sm">
                  {view === 'dms' ? 'Select a conversation' : selectedRealm ? 'Select a Hall to start howling' : 'Enter a Realm to begin'}
                </p>
              </div>
            )}
          </div>

          {/* Member list — only show in realm view on larger screens */}
          {view === 'realms' && selectedRealm && selectedHall && !isVoiceHall && (
            <div className="hidden lg:flex flex-col flex-shrink-0 border-l" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
              <MemberList realm={selectedRealm} onDMUser={handleDMUser} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
