import React, { useState, useEffect } from 'react';
import { FaDiscord, FaPaperPlane, FaSave, FaClock, FaPlus, FaTrash, FaEye } from 'react-icons/fa';

export default function AnnouncementBuilder() {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [targetType, setTargetType] = useState('predefined'); // 'predefined' or 'custom'
    const [selectedChannel, setSelectedChannel] = useState('');
    
    // Embed State
    const [embed, setEmbed] = useState({
        title: '',
        description: '',
        color: '#D4AF37', // Default Gold
        url: '',
        timestamp: false,
        footer: { text: '', icon_url: '' },
        thumbnail: { url: '' },
        image: { url: '' },
        author: { name: '', url: '', icon_url: '' },
        fields: []
    });

    const [jsonPreview, setJsonPreview] = useState(false);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

    // Predefined channels (Mock data - ideally fetched from API)
    const channels = [
        { name: '📢 Announcements', url: 'https://discord.com/api/webhooks/...' },
        { name: 'changelogs', url: 'https://discord.com/api/webhooks/...' },
        { name: 'status', url: 'https://discord.com/api/webhooks/...' },
        { name: 'dev-updates', url: 'https://discord.com/api/webhooks/...' }
    ];

    const handleFieldChange = (index, key, value) => {
        const newFields = [...embed.fields];
        newFields[index][key] = value;
        setEmbed({ ...embed, fields: newFields });
    };

    const addField = () => {
        setEmbed({
            ...embed,
            fields: [...embed.fields, { name: '', value: '', inline: false }]
        });
    };

    const removeField = (index) => {
        const newFields = embed.fields.filter((_, i) => i !== index);
        setEmbed({ ...embed, fields: newFields });
    };

    const handleSend = async () => {
        setSending(true);
        setStatus(null);
        
        const targetUrl = targetType === 'predefined' ? selectedChannel : webhookUrl;
        
        if (!targetUrl) {
            setStatus({ type: 'error', message: 'Please select a target channel or enter a webhook URL.' });
            setSending(false);
            return;
        }

        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            
            const payload = {
                webhookUrl: targetUrl,
                embed: {
                    ...embed,
                    color: parseInt(embed.color.replace('#', ''), 16),
                    timestamp: embed.timestamp ? new Date().toISOString() : undefined
                }
            };

            const response = await fetch(`${apiBase}/override/announcement/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Override-Token': token
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (data.success) {
                setStatus({ type: 'success', message: 'Announcement sent successfully!' });
            } else {
                throw new Error(data.error || 'Failed to send');
            }
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setSending(false);
        }
    };
    
    const saveTemplate = () => {
        const name = prompt("Template Name:");
        if(!name) return;
        
        const templates = JSON.parse(localStorage.getItem('announcement_templates') || '{}');
        templates[name] = embed;
        localStorage.setItem('announcement_templates', JSON.stringify(templates));
        alert('Template saved!');
    };

    const loadTemplate = () => {
        const templates = JSON.parse(localStorage.getItem('announcement_templates') || '{}');
        const names = Object.keys(templates);
        if(names.length === 0) return alert("No templates found.");
        
        // Simple prompt for now
        const name = prompt(`Available templates:\n${names.join('\n')}\n\nEnter name to load:`);
        if(templates[name]) {
            setEmbed(templates[name]);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 p-2">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Announcement Center</h1>
                    <p className="text-gray-400 text-sm">Create and broadcast rich Discord embeds</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={loadTemplate} className="px-4 py-2 bg-surface-card hover:bg-surface-tertiary text-gray-300 rounded border border-gray-700 transition-colors flex items-center gap-2">
                        <FaSave className="w-4 h-4" /> Load Template
                    </button>
                    <button onClick={saveTemplate} className="px-4 py-2 bg-surface-card hover:bg-surface-tertiary text-gray-300 rounded border border-gray-700 transition-colors flex items-center gap-2">
                        <FaSave className="w-4 h-4" /> Save as Template
                    </button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                {/* Editor Column */}
                <div className="overflow-y-auto pr-2 scrollbar-thin">
                    <div className="space-y-6">
                        {/* Target Selection */}
                        <div className="bg-surface-card p-5 rounded-lg border border-gray-800">
                            <h3 className="text-gold font-medium mb-4 flex items-center gap-2">
                                <FaPaperPlane /> Target Selection
                            </h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <button 
                                    onClick={() => setTargetType('predefined')}
                                    className={`p-3 rounded border text-sm font-medium transition-all ${targetType === 'predefined' ? 'bg-gold/10 border-gold text-gold' : 'bg-surface-secondary border-gray-700 text-gray-400'}`}
                                >
                                    Predefined Channel
                                </button>
                                <button 
                                    onClick={() => setTargetType('custom')}
                                    className={`p-3 rounded border text-sm font-medium transition-all ${targetType === 'custom' ? 'bg-gold/10 border-gold text-gold' : 'bg-surface-secondary border-gray-700 text-gray-400'}`}
                                >
                                    Custom Webhook
                                </button>
                            </div>
                            
                            {targetType === 'predefined' ? (
                                <select 
                                    value={selectedChannel} 
                                    onChange={(e) => setSelectedChannel(e.target.value)}
                                    className="w-full bg-surface-secondary border border-gray-700 rounded p-2.5 text-gray-200 focus:border-gold focus:outline-none"
                                >
                                    <option value="">Select a channel...</option>
                                    {channels.map((c, i) => <option key={i} value={c.url}>{c.name}</option>)}
                                </select>
                            ) : (
                                <input 
                                    type="text" 
                                    placeholder="https://discord.com/api/webhooks/..." 
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    className="w-full bg-surface-secondary border border-gray-700 rounded p-2.5 text-gray-200 focus:border-gold focus:outline-none"
                                />
                            )}
                        </div>

                        {/* Basic Info */}
                        <div className="bg-surface-card p-5 rounded-lg border border-gray-800 space-y-4">
                            <h3 className="text-white font-medium mb-2">Basic Info</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3">
                                    <label className="block text-xs text-gray-500 mb-1">Author Name</label>
                                    <input 
                                        type="text" 
                                        value={embed.author.name}
                                        onChange={(e) => setEmbed({...embed, author: {...embed.author, name: e.target.value}})}
                                        className="w-full bg-surface-secondary border border-gray-700 rounded p-2 text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Color</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="color" 
                                            value={embed.color}
                                            onChange={(e) => setEmbed({...embed, color: e.target.value})}
                                            className="h-9 w-full bg-transparent cursor-pointer rounded"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Title</label>
                                <input 
                                    type="text" 
                                    value={embed.title}
                                    onChange={(e) => setEmbed({...embed, title: e.target.value})}
                                    className="w-full bg-surface-secondary border border-gray-700 rounded p-2 text-sm text-white font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Description</label>
                                <textarea 
                                    value={embed.description}
                                    onChange={(e) => setEmbed({...embed, description: e.target.value})}
                                    rows={4}
                                    className="w-full bg-surface-secondary border border-gray-700 rounded p-2 text-sm text-gray-300"
                                />
                            </div>
                        </div>

                        {/* Images */}
                        <div className="bg-surface-card p-5 rounded-lg border border-gray-800 space-y-4">
                            <h3 className="text-white font-medium mb-2">Images</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Thumbnail URL</label>
                                    <input 
                                        type="text" 
                                        value={embed.thumbnail.url}
                                        onChange={(e) => setEmbed({...embed, thumbnail: {...embed.thumbnail, url: e.target.value}})}
                                        className="w-full bg-surface-secondary border border-gray-700 rounded p-2 text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Main Image URL</label>
                                    <input 
                                        type="text" 
                                        value={embed.image.url}
                                        onChange={(e) => setEmbed({...embed, image: {...embed.image, url: e.target.value}})}
                                        className="w-full bg-surface-secondary border border-gray-700 rounded p-2 text-sm text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Fields */}
                        <div className="bg-surface-card p-5 rounded-lg border border-gray-800">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-medium">Fields</h3>
                                <button onClick={addField} className="text-xs flex items-center gap-1 text-gold hover:text-gold-light">
                                    <FaPlus /> Add Field
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {embed.fields.map((field, idx) => (
                                    <div key={idx} className="bg-surface-secondary p-3 rounded border border-gray-700 group">
                                        <div className="flex gap-3 mb-2">
                                            <input 
                                                type="text" 
                                                placeholder="Field Name"
                                                value={field.name}
                                                onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                                                className="flex-1 bg-surface-primary border border-gray-600 rounded p-1.5 text-xs text-white"
                                            />
                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input 
                                                        type="checkbox"
                                                        checked={field.inline}
                                                        onChange={(e) => handleFieldChange(idx, 'inline', e.target.checked)}
                                                        className="rounded border-gray-600 bg-surface-primary"
                                                    />
                                                    <span className="text-xs text-gray-400">Inline</span>
                                                </label>
                                                <button onClick={() => removeField(idx)} className="text-red-500 hover:text-red-400 p-1">
                                                    <FaTrash className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <textarea 
                                            placeholder="Field Value"
                                            value={field.value}
                                            onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                                            rows={2}
                                            className="w-full bg-surface-primary border border-gray-600 rounded p-1.5 text-xs text-gray-300"
                                        />
                                    </div>
                                ))}
                                {embed.fields.length === 0 && (
                                    <div className="text-center text-gray-500 text-sm py-2">No fields added</div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-surface-card p-5 rounded-lg border border-gray-800 space-y-4">
                            <h3 className="text-white font-medium mb-2">Footer</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Footer Text"
                                    value={embed.footer.text}
                                    onChange={(e) => setEmbed({...embed, footer: {...embed.footer, text: e.target.value}})}
                                    className="w-full bg-surface-secondary border border-gray-700 rounded p-2 text-sm text-white"
                                />
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox"
                                            checked={embed.timestamp}
                                            onChange={(e) => setEmbed({...embed, timestamp: e.target.checked})}
                                            className="rounded border-gray-600 bg-surface-secondary"
                                        />
                                        <span className="text-sm text-gray-400">Add Timestamp</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Column */}
                <div className="bg-[#313338] rounded-lg border border-[#1e1f22] flex flex-col h-full shadow-xl overflow-hidden">
                    <div className="bg-[#2b2d31] p-3 border-b border-[#1e1f22] flex justify-between items-center">
                        <span className="text-[#949BA4] font-bold text-xs uppercase tracking-wide">Preview</span>
                        <div className="flex gap-2">
                             <button onClick={() => setJsonPreview(!jsonPreview)} className="text-xs text-[#949BA4] hover:text-white">
                                 {jsonPreview ? 'Visual' : 'JSON'}
                             </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto bg-[#313338]">
                        {jsonPreview ? (
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                                {JSON.stringify(embed, null, 2)}
                            </pre>
                        ) : (
                            /* Discord Message Mockup */
                            <div className="flex gap-4 max-w-full">
                                <div className="w-10 h-10 rounded-full bg-gray-600 flex-shrink-0 bg-cover bg-center" style={{backgroundImage: `url(${embed.author.icon_url || 'https://cdn.discordapp.com/embed/avatars/0.png'})`}}></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-white font-medium hover:underline cursor-pointer">System Bot</span>
                                        <span className="text-[#949BA4] text-xs bg-[#5865F2] text-white px-1 rounded-[3px]">BOT</span>
                                        <span className="text-[#949BA4] text-xs ml-1">Today at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    
                                    {/* Embed */}
                                    <div className="mt-1 bg-[#2b2d31] rounded border-l-4 grid max-w-[520px]" style={{borderLeftColor: embed.color}}>
                                        <div className="p-4 grid gap-2">
                                            <div className="flex gap-4">
                                                <div className="flex-1 min-w-0 grid gap-2">
                                                    {embed.author.name && (
                                                        <div className="flex items-center gap-2">
                                                            {embed.author.icon_url && <img src={embed.author.icon_url} className="w-6 h-6 rounded-full" />}
                                                            <span className="text-white font-medium text-sm">{embed.author.name}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {embed.title && <div className="text-white font-bold text-base hover:underline cursor-pointer">{embed.title}</div>}
                                                    
                                                    {embed.description && <div className="text-[#DBDEE1] text-sm whitespace-pre-wrap">{embed.description}</div>}
                                                    
                                                    {embed.fields.length > 0 && (
                                                        <div className="grid gap-2 mt-1">
                                                            <div className="flex flex-wrap gap-2">
                                                                {embed.fields.map((field, i) => (
                                                                    <div key={i} className={field.inline ? "min-w-[120px] max-w-[45%] flex-grow" : "w-full"}>
                                                                        <div className="text-white font-bold text-sm mb-1">{field.name || "\u200b"}</div>
                                                                        <div className="text-[#DBDEE1] text-sm whitespace-pre-wrap">{field.value || "\u200b"}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {embed.thumbnail.url && (
                                                    <img src={embed.thumbnail.url} className="w-20 h-20 rounded object-cover" alt="" />
                                                )}
                                            </div>
                                            
                                            {embed.image.url && (
                                                <img src={embed.image.url} className="w-full rounded mt-2 max-h-[300px] object-cover" alt="" />
                                            )}
                                            
                                            {(embed.footer.text || embed.timestamp) && (
                                                <div className="text-[#949BA4] text-xs flex items-center gap-2 mt-1">
                                                    {embed.footer.icon_url && <img src={embed.footer.icon_url} className="w-5 h-5 rounded-full" />}
                                                    <span>
                                                        {embed.footer.text}
                                                        {embed.footer.text && embed.timestamp && " • "}
                                                        {embed.timestamp && "Today at " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-[#1e1f22] bg-[#2b2d31]">
                        {status && (
                            <div className={`mb-3 p-2 rounded text-sm text-center ${status.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {status.message}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                             <button 
                                onClick={() => setStatus({type: 'error', message: 'Scheduling not yet implemented'})}
                                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors flex justify-center items-center gap-2"
                             >
                                <FaClock /> Schedule for Later
                            </button>
                            <button 
                                onClick={handleSend}
                                disabled={sending}
                                className="px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaPaperPlane />}
                                Send Announcement
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
