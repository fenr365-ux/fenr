import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ChannelList({ server, selectedChannel, onSelectChannel }) {
  const { session } = useAuth();
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (server) loadChannels();
  }, [server?.id]);

  async function loadChannels() {
    const res = await fetch(`/api/channels/${server.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setChannels(data);
      if (data.length > 0) onSelectChannel(data[0]);
    }
  }

  async function openInvite() {
    const res = await fetch(`/api/servers/${server.id}/invite`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setInviteCode(data.invite_code);
      setShowInvite(true);
    }
  }

  async function createChannel(e) {
    e.preventDefault();
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ server_id: server.id, name: newChannelName })
    });
    if (res.ok) {
      const channel = await res.json();
      setChannels(prev => [...prev, channel]);
      setNewChannelName('');
      setShowNewChannel(false);
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Server header */}
      <div className="h-12 flex items-center justify-between px-4 shadow-md border-b border-black/20 flex-shrink-0">
        <h2 className="font-semibold text-white truncate text-sm">{server.name}</h2>
        <button
          onClick={openInvite}
          title="Invite People"
          className="text-discord-muted hover:text-discord-text text-xl ml-2 leading-none"
        >
          +
        </button>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center justify-between px-1 mb-1 mt-2">
          <span className="text-xs font-semibold text-discord-muted uppercase tracking-wide">
            Text Channels
          </span>
          <button
            onClick={() => setShowNewChannel(!showNewChannel)}
            className="text-discord-muted hover:text-discord-text text-lg leading-none"
            title="Create Channel"
          >
            +
          </button>
        </div>

        {showNewChannel && (
          <form onSubmit={createChannel} className="mb-2 px-1">
            <input
              type="text"
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              placeholder="new-channel"
              className="w-full bg-discord-servers text-discord-text px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-discord-brand"
              autoFocus
              onBlur={() => { if (!newChannelName) setShowNewChannel(false); }}
            />
          </form>
        )}

        {channels.map(channel => (
          <button
            key={channel.id}
            onClick={() => onSelectChannel(channel)}
            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors
              ${selectedChannel?.id === channel.id
                ? 'bg-discord-active text-white'
                : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'
              }`}
          >
            <span className="text-base leading-none">#</span>
            <span className="truncate">{channel.name}</span>
          </button>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowInvite(false)}
        >
          <div
            className="bg-discord-sidebar rounded-lg p-6 w-80 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-1">Invite Friends</h3>
            <p className="text-discord-muted text-sm mb-4">
              Share this code to invite people to <strong className="text-discord-text">{server.name}</strong>
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteCode}
                className="flex-1 bg-discord-servers text-discord-text px-3 py-2 rounded text-sm"
              />
              <button
                onClick={copyInvite}
                className="bg-discord-brand hover:bg-indigo-500 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
