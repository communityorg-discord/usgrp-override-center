import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useSearchParams } from 'react-router-dom';

// Permission flags mapping
const PERMISSION_FLAGS = {
    ADMINISTRATOR: 0x8n,
    MANAGE_GUILD: 0x20n,
    MANAGE_ROLES: 0x10000000n,
    MANAGE_CHANNELS: 0x10n,
    KICK_MEMBERS: 0x2n,
    BAN_MEMBERS: 0x4n,
    MANAGE_MESSAGES: 0x2000n,
    MENTION_EVERYONE: 0x20000n,
    MANAGE_NICKNAMES: 0x8000000n,
    VIEW_AUDIT_LOG: 0x80n,
    MODERATE_MEMBERS: 0x10000000000n,
    SEND_MESSAGES: 0x800n,
    EMBED_LINKS: 0x4000n,
    ATTACH_FILES: 0x8000n,
    ADD_REACTIONS: 0x40n,
    USE_EXTERNAL_EMOJIS: 0x40000n,
    CONNECT: 0x100000n,
    SPEAK: 0x200000n,
    MUTE_MEMBERS: 0x400000n,
    DEAFEN_MEMBERS: 0x800000n,
    MOVE_MEMBERS: 0x1000000n,
};

const PERMISSION_LABELS = {
    ADMINISTRATOR: { label: 'Administrator', color: 'red', icon: '👑' },
    MANAGE_GUILD: { label: 'Manage Server', color: 'amber', icon: '⚙️' },
    MANAGE_ROLES: { label: 'Manage Roles', color: 'purple', icon: '🎭' },
    MANAGE_CHANNELS: { label: 'Manage Channels', color: 'blue', icon: '📂' },
    KICK_MEMBERS: { label: 'Kick Members', color: 'orange', icon: '👢' },
    BAN_MEMBERS: { label: 'Ban Members', color: 'red', icon: '🔨' },
    MANAGE_MESSAGES: { label: 'Manage Messages', color: 'blue', icon: '📝' },
    MENTION_EVERYONE: { label: 'Mention Everyone', color: 'amber', icon: '📢' },
    MANAGE_NICKNAMES: { label: 'Manage Nicknames', color: 'green', icon: '✏️' },
    VIEW_AUDIT_LOG: { label: 'View Audit Log', color: 'gray', icon: '📋' },
    MODERATE_MEMBERS: { label: 'Timeout Members', color: 'orange', icon: '⏰' },
    SEND_MESSAGES: { label: 'Send Messages', color: 'green', icon: '💬' },
    CONNECT: { label: 'Connect (Voice)', color: 'blue', icon: '🎤' },
    SPEAK: { label: 'Speak (Voice)', color: 'blue', icon: '🔊' },
};

export default function DiscordManager() {
    const { fetchApi, post, loading, error } = useApi();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('userId') || '');
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [guildId, setGuildId] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [status, setStatus] = useState('');
    const [activeTab, setActiveTab] = useState('user'); // user, hierarchy, bulk, permissions
    const [selectedRoleForView, setSelectedRoleForView] = useState(null);
    const [bulkUsers, setBulkUsers] = useState('');
    const [bulkRole, setBulkRole] = useState('');
    const [bulkAction, setBulkAction] = useState('add');
    const [bulkStatus, setBulkStatus] = useState([]);

    useEffect(() => {
        loadRoles();
        // Auto-search if userId provided
        if (searchParams.get('userId')) {
            searchUser();
        }
    }, []);

    const loadRoles = async () => {
        try {
            const data = await fetchApi('/override/discord/roles');
            // Sort roles by position (highest first)
            const sortedRoles = (data.roles || []).sort((a, b) => b.position - a.position);
            setRoles(sortedRoles);
            setGuildId(data.guildId);
        } catch (e) {
            console.error('Failed to load roles', e);
        }
    };

    const searchUser = async (e) => {
        e?.preventDefault();
        if (!searchQuery) return;
        setStatus('Searching...');
        try {
            const data = await fetchApi(`/override/discord/user/${searchQuery}`);
            setUser(data.user);
            setStatus('');
        } catch (e) {
            setUser(null);
            setStatus(e.message || 'User not found');
        }
    };

    const handleRoleAction = async (roleId, action) => {
        if (!user) return;
        setStatus(`${action === 'add' ? 'Adding' : 'Removing'} role...`);
        try {
            await post(`/override/discord/user/${user.id}/roles`, { roleId, action });
            // Refresh user
            const data = await fetchApi(`/override/discord/user/${user.id}`);
            setUser(data.user);
            setStatus(`Role ${action}ed successfully`);
        } catch (e) {
            setStatus(`Error: ${e.message}`);
        }
    };

    const handleBulkRoleAction = async () => {
        if (!bulkUsers.trim() || !bulkRole) return;
        
        const userIds = bulkUsers.split(/[\n,]+/).map(id => id.trim()).filter(id => id);
        setBulkStatus([]);
        
        for (const userId of userIds) {
            setBulkStatus(prev => [...prev, { userId, status: 'processing' }]);
            try {
                await post(`/override/discord/user/${userId}/roles`, { 
                    roleId: bulkRole, 
                    action: bulkAction 
                });
                setBulkStatus(prev => prev.map(s => 
                    s.userId === userId ? { ...s, status: 'success' } : s
                ));
            } catch (e) {
                setBulkStatus(prev => prev.map(s => 
                    s.userId === userId ? { ...s, status: 'error', error: e.message } : s
                ));
            }
        }
    };

    const getAvailableRoles = () => {
        if (!user || !roles.length) return [];
        return roles.filter(r => !user.roles.includes(r.id) && !r.managed && r.name !== '@everyone');
    };

    const getRoleColor = (role) => {
        if (!role.color) return 'rgba(255,255,255,0.1)';
        return `#${role.color.toString(16).padStart(6, '0')}`;
    };

    const getPermissions = (permissionsBigInt) => {
        const perms = [];
        const permissions = BigInt(permissionsBigInt || 0);
        for (const [name, flag] of Object.entries(PERMISSION_FLAGS)) {
            if ((permissions & flag) === flag) {
                perms.push(name);
            }
        }
        return perms;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-[#5865F2] text-3xl">
                        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.2 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09 0 .11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.67-.53 3.4-1.33 5.2-2.65c.02-.01.03-.03.03-.05c.44-4.52-.29-8.12-3.1-11.95c-.01-.01-.02-.02-.03-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.85 2.12-1.89 2.12z"/>
                        </svg>
                    </span>
                    Discord Role Manager
                </h1>

                {/* Tab Navigation */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                    {[
                        { id: 'user', label: 'User Roles', icon: '👤' },
                        { id: 'hierarchy', label: 'Hierarchy', icon: '📊' },
                        { id: 'bulk', label: 'Bulk Assign', icon: '👥' },
                        { id: 'permissions', label: 'Permissions', icon: '🔐' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* User Roles Tab */}
            {activeTab === 'user' && (
                <>
                    {/* Search */}
                    <form onSubmit={searchUser} className="flex gap-2 max-w-xl">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="User ID (e.g., 723199054514749450)"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none font-mono"
                        />
                        <button
                            type="submit"
                            className="bg-amber-500 text-black font-bold px-6 py-2 rounded-lg hover:bg-amber-400 transition-colors"
                        >
                            Search
                        </button>
                    </form>

                    {status && (
                        <div className={`p-3 rounded-lg ${status.includes('Error') || status.includes('not found') ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {status}
                        </div>
                    )}

                    {user && (
                        <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-6 animate-fade-in">
                            <div className="flex items-start gap-6">
                                <img 
                                    src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                                    alt="Avatar" 
                                    className="w-24 h-24 rounded-full border-2 border-amber-500/50"
                                />
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white mb-1">
                                        {user.nick ? `${user.nick} (${user.username})` : user.username}
                                    </h2>
                                    <div className="flex gap-2 text-sm text-gray-400 mb-4">
                                        <span className="bg-white/5 px-2 py-0.5 rounded font-mono">ID: {user.id}</span>
                                        <span className="bg-white/5 px-2 py-0.5 rounded">Guild: {guildId || 'Loading...'}</span>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Roles ({user.roles.length})</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {user.roles.map(roleId => {
                                                const role = roles.find(r => r.id === roleId);
                                                return role ? (
                                                    <span 
                                                        key={roleId} 
                                                        className="group flex items-center gap-2 pl-3 pr-1 py-1 rounded-full text-sm font-medium transition-all hover:pr-3"
                                                        style={{ 
                                                            backgroundColor: role.color ? `${getRoleColor(role)}20` : 'rgba(255,255,255,0.1)',
                                                            color: role.color ? getRoleColor(role) : 'white',
                                                            border: `1px solid ${role.color ? `${getRoleColor(role)}40` : 'rgba(255,255,255,0.1)'}`
                                                        }}
                                                    >
                                                        {role.name}
                                                        <button
                                                            onClick={() => handleRoleAction(roleId, 'remove')}
                                                            className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Remove Role"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ) : null;
                                            })}
                                            {user.roles.length === 0 && <span className="text-gray-500 italic">No roles</span>}
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Add Role</h3>
                                        <div className="flex gap-2">
                                            <select
                                                value={selectedRole}
                                                onChange={e => setSelectedRole(e.target.value)}
                                                className="flex-1 bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white focus:border-amber-500/50 outline-none"
                                            >
                                                <option value="">Select a role...</option>
                                                {getAvailableRoles().map(role => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => {
                                                    if (selectedRole) {
                                                        handleRoleAction(selectedRole, 'add');
                                                        setSelectedRole('');
                                                    }
                                                }}
                                                disabled={!selectedRole || loading}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Add Role
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Role Hierarchy Tab */}
            {activeTab === 'hierarchy' && (
                <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span>📊</span> Role Hierarchy
                        <span className="text-sm font-normal text-gray-500 ml-2">({roles.length} roles)</span>
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">Roles are ordered by position. Higher roles have more authority.</p>
                    
                    <div className="space-y-1">
                        {roles.filter(r => r.name !== '@everyone').map((role, index) => {
                            const perms = getPermissions(role.permissions);
                            const isAdmin = perms.includes('ADMINISTRATOR');
                            const isDangerous = perms.includes('BAN_MEMBERS') || perms.includes('KICK_MEMBERS') || perms.includes('MANAGE_GUILD');
                            
                            return (
                                <div 
                                    key={role.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/5 group"
                                    style={{
                                        marginLeft: `${Math.max(0, (roles.length - index - 1) * 2)}px`
                                    }}
                                >
                                    {/* Position indicator */}
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-mono text-gray-500">
                                        #{role.position}
                                    </div>
                                    
                                    {/* Role color dot */}
                                    <div 
                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: getRoleColor(role) }}
                                    />
                                    
                                    {/* Role name */}
                                    <span className="font-medium text-white flex-1">{role.name}</span>
                                    
                                    {/* Badges */}
                                    <div className="flex items-center gap-2">
                                        {role.managed && (
                                            <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Bot</span>
                                        )}
                                        {isAdmin && (
                                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">👑 Admin</span>
                                        )}
                                        {isDangerous && !isAdmin && (
                                            <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">⚠️ Mod</span>
                                        )}
                                        {role.hoist && (
                                            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">Hoisted</span>
                                        )}
                                    </div>

                                    {/* View permissions button */}
                                    <button
                                        onClick={() => {
                                            setSelectedRoleForView(role);
                                            setActiveTab('permissions');
                                        }}
                                        className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-gray-400 hover:text-white transition-all"
                                    >
                                        View Perms →
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bulk Assignment Tab */}
            {activeTab === 'bulk' && (
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span>👥</span> Bulk Role Assignment
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">Add or remove a role from multiple users at once.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">User IDs (one per line or comma-separated)</label>
                                <textarea
                                    value={bulkUsers}
                                    onChange={e => setBulkUsers(e.target.value)}
                                    placeholder="723199054514749450&#10;123456789012345678&#10;987654321098765432"
                                    rows={6}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-amber-500/50 focus:outline-none font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Select Role</label>
                                <select
                                    value={bulkRole}
                                    onChange={e => setBulkRole(e.target.value)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500/50 outline-none"
                                >
                                    <option value="">Select a role...</option>
                                    {roles.filter(r => !r.managed && r.name !== '@everyone').map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Action</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setBulkAction('add')}
                                        className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                                            bulkAction === 'add'
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        ➕ Add Role
                                    </button>
                                    <button
                                        onClick={() => setBulkAction('remove')}
                                        className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                                            bulkAction === 'remove'
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        ➖ Remove Role
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleBulkRoleAction}
                                disabled={!bulkUsers.trim() || !bulkRole || loading}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : `${bulkAction === 'add' ? 'Add' : 'Remove'} Role for ${bulkUsers.split(/[\n,]+/).filter(s => s.trim()).length} Users`}
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Results</h2>
                        
                        {bulkStatus.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p>Results will appear here after processing.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {bulkStatus.map((item, i) => (
                                    <div 
                                        key={i}
                                        className={`flex items-center gap-3 p-3 rounded-lg ${
                                            item.status === 'success' ? 'bg-emerald-500/10' :
                                            item.status === 'error' ? 'bg-red-500/10' :
                                            'bg-white/5'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                                            item.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                            item.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                            'bg-amber-500/20 text-amber-400'
                                        }`}>
                                            {item.status === 'success' ? '✓' :
                                             item.status === 'error' ? '✗' : '⟳'}
                                        </div>
                                        <span className="font-mono text-sm text-gray-300 flex-1">{item.userId}</span>
                                        {item.status === 'error' && (
                                            <span className="text-xs text-red-400">{item.error}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Permissions Viewer Tab */}
            {activeTab === 'permissions' && (
                <div className="grid grid-cols-3 gap-6">
                    {/* Role List */}
                    <div className="bg-[#0d0d14] rounded-xl border border-white/10 p-4">
                        <h2 className="text-lg font-bold text-white mb-4">Select Role</h2>
                        <div className="space-y-1 max-h-[500px] overflow-y-auto">
                            {roles.filter(r => r.name !== '@everyone').map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRoleForView(role)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                        selectedRoleForView?.id === role.id
                                            ? 'bg-amber-500/10 border border-amber-500/30'
                                            : 'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent'
                                    }`}
                                >
                                    <div 
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: getRoleColor(role) }}
                                    />
                                    <span className={`text-sm ${selectedRoleForView?.id === role.id ? 'text-amber-400' : 'text-white'}`}>
                                        {role.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Permissions Display */}
                    <div className="col-span-2 bg-[#0d0d14] rounded-xl border border-white/10 p-6">
                        {selectedRoleForView ? (
                            <>
                                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
                                    <div 
                                        className="w-8 h-8 rounded-full"
                                        style={{ backgroundColor: getRoleColor(selectedRoleForView) }}
                                    />
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{selectedRoleForView.name}</h2>
                                        <p className="text-sm text-gray-500 font-mono">ID: {selectedRoleForView.id}</p>
                                    </div>
                                    <div className="ml-auto flex gap-2">
                                        {selectedRoleForView.hoist && (
                                            <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">Displayed Separately</span>
                                        )}
                                        {selectedRoleForView.mentionable && (
                                            <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">Mentionable</span>
                                        )}
                                        {selectedRoleForView.managed && (
                                            <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400">Bot Managed</span>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Permissions</h3>
                                
                                {(() => {
                                    const perms = getPermissions(selectedRoleForView.permissions);
                                    
                                    if (perms.includes('ADMINISTRATOR')) {
                                        return (
                                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">👑</span>
                                                    <div>
                                                        <p className="font-bold text-red-400">Administrator</p>
                                                        <p className="text-sm text-red-400/70">This role has all permissions and bypasses all channel permission overwrites.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (perms.length === 0) {
                                        return (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>No special permissions</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-2 gap-2">
                                            {perms.map(perm => {
                                                const info = PERMISSION_LABELS[perm] || { label: perm, color: 'gray', icon: '•' };
                                                return (
                                                    <div 
                                                        key={perm}
                                                        className={`flex items-center gap-3 p-3 rounded-lg bg-${info.color}-500/10 border border-${info.color}-500/20`}
                                                        style={{
                                                            backgroundColor: `var(--tw-bg-${info.color}-500-10, rgba(100,100,100,0.1))`,
                                                        }}
                                                    >
                                                        <span className="text-lg">{info.icon}</span>
                                                        <span className="text-sm text-white">{info.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-4xl mb-4">🔐</p>
                                <p>Select a role to view its permissions</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
