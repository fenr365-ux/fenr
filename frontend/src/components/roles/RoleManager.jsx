import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_PERMISSIONS = {
  manage_channels: false,
  manage_roles: false,
  kick_members: false,
  ban_members: false,
  manage_messages: false,
};

const PERM_LABELS = {
  manage_channels: 'Manage Halls',
  manage_roles: 'Manage Roles',
  kick_members: 'Kick Members',
  ban_members: 'Ban Members',
  manage_messages: 'Manage Messages',
};

const ROLE_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a', '#3ba55d', '#eb459e'];

export default function RoleManager({ realm, onClose }) {
  const { session } = useAuth();
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(ROLE_COLORS[0]);
  const [editPerms, setEditPerms] = useState(DEFAULT_PERMISSIONS);
  const [tab, setTab] = useState('roles'); // 'roles' | 'assign'
  const [assignRoleId, setAssignRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRoles();
    loadMembers();
  }, [realm.id]);

  async function loadRoles() {
    const res = await fetch(`/api/roles/${realm.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) setRoles(await res.json());
  }

  async function loadMembers() {
    const res = await fetch(`/api/servers/${realm.id}/members`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) setMembers(await res.json());
  }

  function selectRole(role) {
    setSelected(role);
    setEditPerms(role.permissions || DEFAULT_PERMISSIONS);
  }

  async function createRole(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch(`/api/roles/${realm.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ name: newName.trim(), color: newColor, permissions: DEFAULT_PERMISSIONS })
    });
    if (res.ok) {
      const role = await res.json();
      setRoles(prev => [...prev, role]);
      setNewName('');
    }
  }

  async function saveRole() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/roles/${realm.id}/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ permissions: editPerms })
    });
    if (res.ok) {
      const updated = await res.json();
      setRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelected(updated);
    }
    setSaving(false);
  }

  async function deleteRole(roleId) {
    if (!confirm('Delete this role?')) return;
    const res = await fetch(`/api/roles/${realm.id}/${roleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      setRoles(prev => prev.filter(r => r.id !== roleId));
      if (selected?.id === roleId) setSelected(null);
    }
  }

  async function assignRole(userId) {
    if (!assignRoleId) return;
    await fetch(`/api/roles/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ server_id: realm.id, user_id: userId, role_id: assignRoleId })
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(74,122,255,0.15)' }}>
          <h3 className="font-display text-fenr-text text-lg">Role Manager</h3>
          <button onClick={onClose} className="text-fenr-muted hover:text-fenr-text text-xl leading-none transition-colors">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
          {['roles', 'assign'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-semibold capitalize transition-colors ${tab === t ? 'text-fenr-brand border-b-2 border-fenr-brand' : 'text-fenr-muted hover:text-fenr-text'}`}
            >
              {t === 'assign' ? 'Assign Roles' : 'Manage Roles'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'roles' && (
            <div className="flex gap-4 h-full">
              {/* Role list */}
              <div className="w-44 flex-shrink-0 space-y-1">
                {roles.map(role => (
                  <div
                    key={role.id}
                    onClick={() => selectRole(role)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group ${selected?.id === role.id ? 'bg-fenr-brand/20' : 'hover:bg-fenr-hover'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: role.color || '#4A7AFF' }} />
                      <span className="text-fenr-text text-sm truncate">{role.name}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteRole(role.id); }}
                      className="text-fenr-muted hover:text-fenr-red text-xs opacity-0 group-hover:opacity-100 transition-all ml-1"
                    >✕</button>
                  </div>
                ))}

                {/* Create role */}
                <form onSubmit={createRole} className="mt-3 space-y-2">
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="New role name..."
                    className="fenr-input w-full text-xs py-1.5"
                  />
                  <div className="flex flex-wrap gap-1">
                    {ROLE_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                        style={{ background: c, outline: newColor === c ? `2px solid white` : 'none', outlineOffset: '1px' }}
                      />
                    ))}
                  </div>
                  <button type="submit" className="fenr-btn w-full text-xs py-1.5">Create Role</button>
                </form>
              </div>

              {/* Permissions editor */}
              {selected ? (
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded-full" style={{ background: selected.color || '#4A7AFF' }} />
                    <h4 className="text-fenr-text font-semibold">{selected.name}</h4>
                  </div>
                  <p className="text-fenr-muted text-xs mb-3">Permissions</p>
                  {Object.entries(PERM_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-fenr-hover transition-colors">
                      <span className="text-fenr-text text-sm">{label}</span>
                      <div
                        onClick={() => setEditPerms(p => ({ ...p, [key]: !p[key] }))}
                        className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${editPerms[key] ? 'bg-fenr-brand' : 'bg-fenr-muted/30'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editPerms[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                  ))}
                  <button
                    onClick={saveRole}
                    disabled={saving}
                    className="fenr-btn w-full mt-4"
                  >
                    {saving ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-fenr-muted text-sm">
                  Select a role to edit permissions
                </div>
              )}
            </div>
          )}

          {tab === 'assign' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <label className="text-fenr-muted text-sm">Assign role:</label>
                <select
                  value={assignRoleId}
                  onChange={e => setAssignRoleId(e.target.value)}
                  className="fenr-input flex-1 text-sm py-1"
                >
                  <option value="">Select role...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: 'rgba(74,122,255,0.05)', border: '1px solid rgba(74,122,255,0.1)' }}>
                  <span className="text-fenr-text text-sm">{m.username}</span>
                  <button
                    onClick={() => assignRole(m.id)}
                    disabled={!assignRoleId}
                    className="fenr-btn text-xs py-1 px-3 disabled:opacity-40"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
