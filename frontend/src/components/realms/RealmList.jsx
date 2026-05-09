import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import CreateRealmModal from './CreateRealmModal';

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function RealmList({ selectedRealm, onSelectRealm, onSelectDMs, isDMView }) {
  const { session } = useAuth();
  const [realms, setRealms] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (session) fetchRealms();
  }, [session]);

  async function fetchRealms() {
    const res = await fetch('/api/servers', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) setRealms(await res.json());
  }

  return (
    <div
      className="flex flex-col items-center py-3 gap-2 overflow-y-auto flex-shrink-0"
      style={{ width: '72px', background: '#141618' }}
    >
      {/* FENR home icon */}
      <div
        className="w-12 h-12 flex items-center justify-center rounded-2xl flex-shrink-0 mb-1 cursor-default select-none"
        style={{ background: 'rgba(74,122,255,0.15)', border: '1px solid rgba(74,122,255,0.3)' }}
        title="FENR"
      >
        <span className="font-display text-fenr-brand text-xs font-bold tracking-wider">FNR</span>
      </div>

      {/* DMs button */}
      <button
        onClick={onSelectDMs}
        title="Direct Messages"
        className={`w-12 h-12 flex items-center justify-center transition-all duration-200 text-lg
          ${isDMView ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'}`}
        style={{
          background: isDMView ? 'linear-gradient(135deg, #4A7AFF, #4DD1C4)' : 'rgba(60,66,74,0.6)',
          border: isDMView ? 'none' : '1px solid rgba(74,122,255,0.1)'
        }}
      >
        💬
      </button>

      {/* Runic divider */}
      <div className="w-8 h-px" style={{ background: 'rgba(74,122,255,0.2)' }} />

      {realms.map(realm => (
        <div key={realm.id} className="relative flex items-center">
          {/* Active pill */}
          <span
            className="absolute -left-1 w-1 rounded-r transition-all duration-200"
            style={{
              background: '#4A7AFF',
              height: selectedRealm?.id === realm.id ? '36px' : '8px',
              opacity: selectedRealm?.id === realm.id ? 1 : 0
            }}
          />
          <button
            onClick={() => onSelectRealm(realm)}
            title={realm.name}
            className={`realm-icon text-xs font-bold text-white ${selectedRealm?.id === realm.id ? 'active' : ''}`}
            style={{
              background: selectedRealm?.id === realm.id
                ? 'linear-gradient(135deg, #4A7AFF, #4DD1C4)'
                : 'rgba(50,55,63,0.8)',
              border: selectedRealm?.id === realm.id ? 'none' : '1px solid rgba(74,122,255,0.12)',
              color: selectedRealm?.id === realm.id ? 'white' : '#9AA3AF',
              boxShadow: selectedRealm?.id === realm.id ? '0 4px 16px rgba(74,122,255,0.35)' : 'none'
            }}
          >
            {realm.icon_url
              ? <img src={realm.icon_url} alt={realm.name} className="w-12 h-12 rounded-full object-cover" />
              : getInitials(realm.name)
            }
          </button>
        </div>
      ))}

      <div className="w-8 h-px mt-1" style={{ background: 'rgba(74,122,255,0.2)' }} />

      {/* Add realm button */}
      <button
        onClick={() => setShowModal(true)}
        title="Create or Join a Realm"
        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-light transition-all duration-200 hover:rounded-2xl"
        style={{
          background: 'rgba(77,209,196,0.1)',
          color: '#4DD1C4',
          border: '1px solid rgba(77,209,196,0.2)'
        }}
      >
        +
      </button>

      {showModal && (
        <CreateRealmModal
          onClose={() => setShowModal(false)}
          onCreated={realm => {
            setRealms(prev => [...prev, realm]);
            onSelectRealm(realm);
            setShowModal(false);
          }}
          onJoined={realm => {
            if (!realms.find(r => r.id === realm.id)) setRealms(prev => [...prev, realm]);
            onSelectRealm(realm);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
