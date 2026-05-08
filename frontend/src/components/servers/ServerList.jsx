import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import CreateServerModal from './CreateServerModal';

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ServerList({ selectedServer, onSelectServer }) {
  const { session } = useAuth();
  const [servers, setServers] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (session) fetchServers();
  }, [session]);

  async function fetchServers() {
    const res = await fetch('/api/servers', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) setServers(await res.json());
  }

  return (
    <div className="flex flex-col items-center py-3 gap-2 overflow-y-auto flex-shrink-0 bg-discord-servers" style={{ width: '72px' }}>
      {servers.map(server => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server)}
          title={server.name}
          className={`w-12 h-12 flex items-center justify-center text-sm font-semibold transition-all duration-150
            ${selectedServer?.id === server.id
              ? 'bg-discord-brand text-white rounded-2xl'
              : 'bg-discord-sidebar text-discord-text hover:bg-discord-brand hover:text-white hover:rounded-2xl rounded-full'
            }`}
        >
          {server.icon_url
            ? <img src={server.icon_url} alt={server.name} className="w-12 h-12 rounded-full" />
            : getInitials(server.name)
          }
        </button>
      ))}

      <div className="w-8 h-px bg-discord-sidebar/50 my-1" />

      <button
        onClick={() => setShowModal(true)}
        title="Add a Server"
        className="w-12 h-12 rounded-full bg-discord-sidebar text-discord-green hover:bg-discord-green hover:text-white hover:rounded-2xl flex items-center justify-center text-2xl font-light transition-all duration-150"
      >
        +
      </button>

      {showModal && (
        <CreateServerModal
          onClose={() => setShowModal(false)}
          onCreated={(server) => {
            setServers(prev => [...prev, server]);
            onSelectServer(server);
            setShowModal(false);
          }}
          onJoined={(server) => {
            if (!servers.find(s => s.id === server.id)) {
              setServers(prev => [...prev, server]);
            }
            onSelectServer(server);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
