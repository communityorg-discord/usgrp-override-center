import React, { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';

const SNIPPETS = [
    { id: 'refund', title: 'Refund Policy', content: 'Our refund policy allows for returns within 14 days of purchase. Please ensure the item is in its original condition.' },
    { id: 'ban_appeal', title: 'Ban Appeal Process', content: 'To appeal a ban, please provide your User ID and a detailed explanation of why the ban should be reconsidered.' },
    { id: 'tech_support', title: 'Technical Support', content: 'For technical issues, please provide your system specs and a detailed description of the problem.' },
    { id: 'general_welcome', title: 'Welcome', content: 'Hello! Thank you for contacting USGRP Support. How can we assist you today?' },
    { id: 'escalation', title: 'Escalation Notice', content: 'I am escalating this ticket to the Senior Administration for further review. You will receive an update shortly.' }
];

export default function TicketManager() {
    const { fetchApi, post, loading: apiLoading } = useApi();
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState('');
    const [view, setView] = useState('list'); // 'list' or 'kanban'
    const [filter, setFilter] = useState('all');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadTickets();
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            loadMessages(selectedTicket.id);
        }
    }, [selectedTicket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadTickets = async () => {
        try {
            const data = await fetchApi('/override/tickets');
            setTickets(data.tickets || []);
        } catch (err) {
            console.error('Failed to load tickets:', err);
        }
    };

    const loadMessages = async (ticketId) => {
        try {
            const data = await fetchApi(`/override/tickets/${ticketId}`);
            setMessages(data.messages || []);
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!reply.trim() || !selectedTicket) return;

        try {
            await post(`/override/tickets/${selectedTicket.id}/reply`, {
                message: reply,
                as_admin: true
            });
            setReply('');
            loadMessages(selectedTicket.id);
            loadTickets(); // Refresh list to update last update time
        } catch (err) {
            console.error('Failed to send reply:', err);
        }
    };

    const updateTicketStatus = async (id, updates) => {
        try {
            const response = await fetch(`${await window.electron.api.getBase()}/override/tickets/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Override-Token': await window.electron.api.getToken()
                },
                body: JSON.stringify(updates)
            });
            if (response.ok) {
                loadTickets();
                if (selectedTicket && selectedTicket.id === id) {
                    setSelectedTicket({ ...selectedTicket, ...updates });
                }
            }
        } catch (err) {
            console.error('Failed to update ticket:', err);
        }
    };

    const insertSnippet = (content) => {
        setReply(prev => prev + (prev ? '\n' : '') + content);
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'open': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            case 'locked': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'text-red-400';
            case 'medium': return 'text-amber-400';
            case 'low': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    const filteredTickets = tickets.filter(t => {
        if (filter === 'all') return true;
        return t.status.toLowerCase() === filter.toLowerCase();
    });

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Atlas Support Ticket Manager</h1>
                    <p className="text-gray-400 text-sm">Manage and resolve user support inquiries</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-surface-secondary rounded-lg p-1 border border-white/5">
                        <button 
                            onClick={() => setView('list')}
                            className={`px-3 py-1 rounded text-xs transition-colors ${view === 'list' ? 'bg-gold text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                            List
                        </button>
                        <button 
                            onClick={() => setView('kanban')}
                            className={`px-3 py-1 rounded text-xs transition-colors ${view === 'kanban' ? 'bg-gold text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                        >
                            Kanban
                        </button>
                    </div>
                    <select 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-surface-secondary border border-white/10 rounded-lg px-3 py-1 text-sm text-white outline-none focus:border-gold/50"
                    >
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                    </select>
                    <button 
                        onClick={loadTickets}
                        className="bg-surface-secondary p-2 rounded-lg border border-white/10 hover:border-gold/50 transition-colors text-gray-400 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Sidebar - Ticket List */}
                <div className="w-1/3 flex flex-col gap-4 overflow-hidden">
                    <div className="flex-1 bg-surface-secondary rounded-xl border border-white/5 overflow-auto scrollbar-dark">
                        {filteredTickets.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500 italic">
                                No tickets found
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {filteredTickets.map(ticket => (
                                    <button
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={`p-4 border-b border-white/5 text-left transition-colors hover:bg-white/5 ${selectedTicket?.id === ticket.id ? 'bg-white/5 border-l-2 border-l-gold' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-mono text-gray-500">#{ticket.id.toString().padStart(4, '0')}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(ticket.status)} font-bold uppercase`}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                        <div className="text-white font-medium truncate mb-1">{ticket.subject}</div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-400">{ticket.user_name}</span>
                                            <span className={getPriorityColor(ticket.priority)}>{ticket.priority.toUpperCase()}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-2">
                                            Last update: {new Date(ticket.updated_at).toLocaleString()}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main View - Conversation & Actions */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {selectedTicket ? (
                        <>
                            <div className="bg-surface-secondary rounded-xl border border-white/5 p-4 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{selectedTicket.subject}</h2>
                                        <p className="text-xs text-gray-400">User: {selectedTicket.user_name} ({selectedTicket.user_id})</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => updateTicketStatus(selectedTicket.id, { status: 'closed' })}
                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button 
                                        onClick={() => updateTicketStatus(selectedTicket.id, { status: 'locked' })}
                                        className="px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-400 border border-gray-500/20 text-xs font-bold hover:bg-gray-500/20 transition-colors"
                                    >
                                        Lock
                                    </button>
                                    <div className="h-8 w-px bg-white/10 mx-1"></div>
                                    <button 
                                        onClick={() => updateTicketStatus(selectedTicket.id, { priority: 'high' })}
                                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20 transition-colors"
                                    >
                                        Escalate
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 bg-surface-secondary rounded-xl border border-white/5 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-auto p-4 space-y-4 scrollbar-dark">
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.is_admin ? 'bg-gold/10 border border-gold/20' : 'bg-white/5 border border-white/10'}`}>
                                                <div className="flex justify-between items-center mb-1 gap-4">
                                                    <span className={`text-xs font-bold ${msg.is_admin ? 'text-gold' : 'text-blue-400'}`}>
                                                        {msg.is_admin ? 'System / Admin' : msg.user_name}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">
                                                        {new Date(msg.created_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                                                    {msg.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-4 border-t border-white/5 bg-white/2">
                                    <form onSubmit={handleSendReply} className="flex flex-col gap-3">
                                        <textarea
                                            value={reply}
                                            onChange={(e) => setReply(e.target.value)}
                                            placeholder="Type your response here..."
                                            className="w-full bg-surface-primary border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-gold/50 min-h-[100px] resize-none scrollbar-dark"
                                        />
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Replying as Admin</p>
                                            <button
                                                type="submit"
                                                disabled={!reply.trim() || apiLoading}
                                                className="bg-gold text-black px-6 py-2 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                            >
                                                Send Message
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 bg-surface-secondary rounded-xl border border-white/5 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No Ticket Selected</h3>
                            <p className="text-gray-400 max-w-xs">Select a ticket from the list on the left to view the conversation and take action.</p>
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Snippets */}
                <div className="w-64 flex flex-col gap-4">
                    <div className="bg-surface-secondary rounded-xl border border-white/5 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-white/5 bg-white/5">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                                </svg>
                                Snippet Library
                            </h3>
                        </div>
                        <div className="p-2 space-y-2 overflow-auto scrollbar-dark max-h-[400px]">
                            {SNIPPETS.map(snippet => (
                                <button
                                    key={snippet.id}
                                    onClick={() => insertSnippet(snippet.content)}
                                    className="w-full p-3 rounded-lg bg-white/2 border border-white/5 text-left hover:bg-white/5 hover:border-gold/30 transition-all group"
                                >
                                    <div className="text-xs font-bold text-gray-300 group-hover:text-gold mb-1">{snippet.title}</div>
                                    <div className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                                        {snippet.content}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedTicket && (
                        <div className="bg-surface-secondary rounded-xl border border-white/5 p-4">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Ticket Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase mb-1">Status</div>
                                    <div className={`text-xs font-bold ${getStatusColor(selectedTicket.status).split(' ')[1]}`}>
                                        {selectedTicket.status.toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase mb-1">Priority</div>
                                    <div className={`text-xs font-bold ${getPriorityColor(selectedTicket.priority)}`}>
                                        {selectedTicket.priority.toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase mb-1">Created</div>
                                    <div className="text-xs text-gray-300">
                                        {new Date(selectedTicket.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase mb-1">Last Activity</div>
                                    <div className="text-xs text-gray-300">
                                        {new Date(selectedTicket.updated_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
