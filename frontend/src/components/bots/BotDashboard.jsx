import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function BotDashboard({ realm, onClose }) {
  const { session } = useAuth();
  const [bots, setBots] = useState([]);
  const [realmBots, setRealmBots] = useState([]);
  const [newBotName, setNewBotName] = useState('');
  const [createdBot, setCreatedBot] = useState(null); // holds token on creation
  const [revealedToken, setRevealedToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('realm'); // 'realm' | 'manage'

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };

  useEffect(() => {
    fetchBots();
    if (realm) fetchRealmBots();
  }, [realm?.id]);

  async function fetchBots() {
    const res = await fetch('/api/bots', { headers });
    if (res.ok) setBots(await res.json());
  }

  async function fetchRealmBots() {
    const res = await fetch(`/api/bots/realm/${realm.id}`, { headers });
    if (res.ok) setRealmBots(await res.json());
  }

  async function createBot(e) {
    e.preventDefault();
    if (!newBotName.trim()) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/bots', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: newBotName.trim() })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    setCreatedBot(data);
    setNewBotName('');
    await fetchBots();
    setLoading(false);
  }

  async function addBotToRealm(botId) {
    const res = await fetch(`/api/bots/${botId}/realms`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ server_id: realm.id })
    });
    if (res.ok) await fetchRealmBots();
  }

  async function removeBotFromRealm(botId) {
    await fetch(`/api/bots/${botId}/realms/${realm.id}`, { method: 'DELETE', headers });
    await fetchRealmBots();
  }

  async function deleteBot(botId) {
    if (!confirm('Delete this bot permanently?')) return;
    await fetch(`/api/bots/${botId}`, { method: 'DELETE', headers });
    await fetchBots();
    await fetchRealmBots();
  }

  async function revealToken(botId) {
    const res = await fetch(`/api/bots/${botId}/token`, { headers });
    const data = await res.json();
    if (res.ok) setRevealedToken({ id: botId, token: data.token });
  }

  const realmBotIds = new Set(realmBots.map(b => b.id));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(74,122,255,0.15)' }}>
          <div>
            <h2 className="font-display text-fenr-text text-lg">Bot Workshop</h2>
            {realm && <p className="text-fenr-muted text-xs mt-0.5">{realm.name}</p>}
          </div>
          <button onClick={onClose} className="text-fenr-muted hover:text-fenr-text text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'rgba(74,122,255,0.15)' }}>
          {['realm', 'manage'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors capitalize ${
                tab === t ? 'text-fenr-brand border-b-2 border-fenr-brand' : 'text-fenr-muted hover:text-fenr-text'
              }`}
            >
              {t === 'realm' ? '🐺 Realm Bots' : '⚙️ My Bots'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* === REALM BOTS TAB === */}
          {tab === 'realm' && (
            <>
              <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold">Active in {realm?.name}</p>

              {/* Built-in Fen bot info */}
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(77,209,196,0.08)', border: '1px solid rgba(77,209,196,0.2)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(74,122,255,0.2)' }}>🐺</div>
                <div className="flex-1">
                  <p className="text-fenr-text text-sm font-semibold">Fen Bot <span className="text-fenr-teal text-xs ml-1">Built-in</span></p>
                  <p className="text-fenr-muted text-xs">Always active · !help, !roll, !flip, !8ball, !poll</p>
                </div>
                <span className="text-fenr-teal text-xs font-semibold">Online</span>
              </div>

              {/* User bots in realm */}
              {realmBots.length === 0 ? (
                <p className="text-fenr-muted text-sm text-center py-3">No custom bots added yet. Switch to "My Bots" to create one.</p>
              ) : (
                realmBots.map(bot => (
                  <div key={bot.id} className="flex items-center gap-3 p-3 rounded-lg group" style={{ background: 'rgba(60,66,74,0.4)', border: '1px solid rgba(74,122,255,0.1)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'rgba(74,122,255,0.15)' }}>🤖</div>
                    <div className="flex-1">
                      <p className="text-fenr-text text-sm font-semibold">{bot.name}</p>
                      <p className="text-fenr-muted text-xs">Custom Bot</p>
                    </div>
                    <button
                      onClick={() => removeBotFromRealm(bot.id)}
                      className="text-fenr-muted hover:text-fenr-red text-xs opacity-0 group-hover:opacity-100 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}

              {/* Add existing bots to realm */}
              {bots.filter(b => !realmBotIds.has(b.id)).length > 0 && (
                <>
                  <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold mt-4">Add Your Bots</p>
                  {bots.filter(b => !realmBotIds.has(b.id)).map(bot => (
                    <div key={bot.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(60,66,74,0.3)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background: 'rgba(74,122,255,0.1)' }}>🤖</div>
                      <span className="text-fenr-text text-sm flex-1">{bot.name}</span>
                      <button onClick={() => addBotToRealm(bot.id)} className="fenr-btn px-3 py-1 text-xs">Add</button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {/* === MY BOTS TAB === */}
          {tab === 'manage' && (
            <>
              {/* Create bot form */}
              <div>
                <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold mb-2">Create a New Bot</p>
                <form onSubmit={createBot} className="flex gap-2">
                  <input
                    type="text"
                    value={newBotName}
                    onChange={e => setNewBotName(e.target.value)}
                    placeholder="Bot name"
                    className="fenr-input flex-1 text-sm"
                  />
                  <button type="submit" disabled={loading} className="fenr-btn px-4 py-2 text-sm whitespace-nowrap">
                    {loading ? 'Creating...' : 'Create Bot'}
                  </button>
                </form>
                {error && <p className="text-fenr-red text-xs mt-1">{error}</p>}
              </div>

              {/* Token shown after creation */}
              {createdBot && (
                <div className="p-3 rounded-lg" style={{ background: 'rgba(77,209,196,0.08)', border: '1px solid rgba(77,209,196,0.3)' }}>
                  <p className="text-fenr-teal text-xs font-semibold mb-1">✅ Bot created! Save this token — it won't be shown again:</p>
                  <code className="text-fenr-text text-xs break-all block bg-fenr-bg rounded p-2">{createdBot.token}</code>
                  <button onClick={() => { navigator.clipboard.writeText(createdBot.token); }} className="text-fenr-brand text-xs mt-1 hover:underline">Copy token</button>
                  <button onClick={() => setCreatedBot(null)} className="text-fenr-muted text-xs mt-1 ml-4 hover:text-fenr-text">Dismiss</button>
                </div>
              )}

              {/* Revealed token */}
              {revealedToken && (
                <div className="p-3 rounded-lg" style={{ background: 'rgba(255,122,61,0.08)', border: '1px solid rgba(255,122,61,0.3)' }}>
                  <p className="text-fenr-orange text-xs font-semibold mb-1">🔑 Bot Token:</p>
                  <code className="text-fenr-text text-xs break-all block bg-fenr-bg rounded p-2">{revealedToken.token}</code>
                  <button onClick={() => { navigator.clipboard.writeText(revealedToken.token); }} className="text-fenr-brand text-xs mt-1 hover:underline">Copy</button>
                  <button onClick={() => setRevealedToken(null)} className="text-fenr-muted text-xs mt-1 ml-4 hover:text-fenr-text">Hide</button>
                </div>
              )}

              {/* Bot list */}
              <div>
                <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold mb-2">Your Bots</p>
                {bots.length === 0 ? (
                  <p className="text-fenr-muted text-sm text-center py-4">No bots yet — create one above</p>
                ) : (
                  bots.map(bot => (
                    <div key={bot.id} className="flex items-center gap-3 p-3 rounded-lg mb-2 group" style={{ background: 'rgba(60,66,74,0.4)', border: '1px solid rgba(74,122,255,0.1)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background: 'rgba(74,122,255,0.1)' }}>🤖</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-fenr-text text-sm font-semibold">{bot.name}</p>
                        <p className="text-fenr-muted text-xs font-mono">{bot.token}</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => revealToken(bot.id)} className="text-fenr-brand text-xs hover:underline">Token</button>
                        <button onClick={() => deleteBot(bot.id)} className="text-fenr-red text-xs hover:underline">Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bot SDK guide */}
              <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(74,122,255,0.06)', border: '1px solid rgba(74,122,255,0.15)' }}>
                <p className="text-fenr-brand font-semibold mb-2">🤖 Connect a Custom Bot</p>
                <pre className="text-fenr-muted overflow-x-auto whitespace-pre-wrap leading-relaxed">{`// bot.js — connect with your token
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { bot_token: 'YOUR_BOT_TOKEN' }
});

socket.on('connect', () => {
  socket.emit('join_channel', 'CHANNEL_ID');
});

socket.on('new_message', (msg) => {
  if (msg.content.startsWith('!ping')) {
    socket.emit('send_message', {
      channelId: msg.channel_id,
      content: 'Pong! 🐺'
    });
  }
});`}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
