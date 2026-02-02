import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function DiscordManager() {
    const { fetchApi, post, loading, error } = useApi();
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [guildId, setGuildId] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        try {
            const data = await fetchApi('/override/discord/roles');
            setRoles(data.roles || []);
            setGuildId(data.guildId);
        } catch (e) {
            console.error('Failed to load roles', e);
        }
    };

    const searchUser = async (e) => {
        e.preventDefault();
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

    const getAvailableRoles = () => {
        if (!user || !roles.length) return [];
        return roles.filter(r => !user.roles.includes(r.id) && !r.managed && r.name !== '@everyone');
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-[#5865F2] text-3xl">
                    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.2 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09 0 .11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.67-.53 3.4-1.33 5.2-2.65c.02-.01.03-.03.03-.05c.44-4.52-.29-8.12-3.1-11.95c-.01-.01-.02-.02-.03-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.85 2.12-1.89 2.12z"/>
                    </svg>
                </span>
                Discord Role Manager
            </h1>

            {/* Search */}
            <form onSubmit={searchUser} className="flex gap-2 max-w-xl">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="User ID (e.g., 723199054514749450)"
                    className="flex-1 bg-surface-dark border border-white/10 rounded-lg px-4 py-2 text-white focus:border-gold focus:outline-none"
                />
                <button
                    type="submit"
                    className="bg-gold text-surface-primary font-bold px-6 py-2 rounded-lg hover:bg-gold/90 transition-colors"
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
                <div className="bg-surface-dark rounded-xl border border-white/10 p-6 animate-fade-in-up">
                    <div className="flex items-start gap-6">
                        <img 
                            src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                            alt="Avatar" 
                            className="w-24 h-24 rounded-full border-2 border-gold"
                        />
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-1">
                                {user.nick ? `${user.nick} (${user.username})` : user.username}
                            </h2>
                            <div className="flex gap-2 text-sm text-gray-400 mb-4">
                                <span className="bg-white/5 px-2 py-0.5 rounded">ID: {user.id}</span>
                                <span className="bg-white/5 px-2 py-0.5 rounded">Guild: {guildId || 'Loading...'}</span>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Roles</h3>
                                <div className="flex flex-wrap gap-2">
                                    {user.roles.map(roleId => {
                                        const role = roles.find(r => r.id === roleId);
                                        return role ? (
                                            <span 
                                                key={roleId} 
                                                className="group flex items-center gap-2 pl-3 pr-1 py-1 rounded-full text-sm font-medium transition-all hover:pr-3"
                                                style={{ 
                                                    backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}20` : 'rgba(255,255,255,0.1)',
                                                    color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : 'white',
                                                    border: `1px solid ${role.color ? `#${role.color.toString(16).padStart(6, '0')}40` : 'rgba(255,255,255,0.1)'}`
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
                                        className="flex-1 bg-surface-primary border border-white/10 rounded px-3 py-2 text-white focus:border-gold outline-none"
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
        </div>
    );
}
