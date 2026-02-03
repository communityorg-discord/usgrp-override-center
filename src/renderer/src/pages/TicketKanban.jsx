import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const COLUMNS = [
    { id: 'open', title: 'Open', color: 'bg-blue-500', icon: '📬' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-amber-500', icon: '🔄' },
    { id: 'waiting', title: 'Waiting', color: 'bg-purple-500', icon: '⏳' },
    { id: 'resolved', title: 'Resolved', color: 'bg-green-500', icon: '✅' },
];

const PRIORITY_COLORS = {
    low: 'border-gray-500',
    medium: 'border-amber-500',
    high: 'border-red-500',
    urgent: 'border-red-600 bg-red-500/10',
};

export default function TicketKanban() {
    const { fetchApi, post, loading } = useApi();
    const [tickets, setTickets] = useState([]);
    const [draggedTicket, setDraggedTicket] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => {
        loadTickets();
    }, []);

    async function loadTickets() {
        try {
            const data = await fetchApi('/override/tickets');
            setTickets(data.tickets || []);
        } catch (err) {
            console.error('Failed to load tickets:', err);
        }
    }

    async function updateTicketStatus(ticketId, newStatus) {
        try {
            await post(`/override/tickets/${ticketId}/status`, { status: newStatus });
            setTickets(prev => prev.map(t => 
                t.id === ticketId ? { ...t, status: newStatus } : t
            ));
        } catch (err) {
            console.error('Failed to update ticket:', err);
        }
    }

    function handleDragStart(e, ticket) {
        setDraggedTicket(ticket);
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(e, status) {
        e.preventDefault();
        if (draggedTicket && draggedTicket.status !== status) {
            updateTicketStatus(draggedTicket.id, status);
        }
        setDraggedTicket(null);
    }

    function getTicketsByStatus(status) {
        return tickets.filter(t => t.status === status);
    }

    function formatTime(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString();
    }

    return (
        <div className="h-full flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        Ticket Kanban
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Drag tickets between columns to update status
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{tickets.length} tickets</span>
                    <button onClick={loadTickets} className="btn btn-secondary" disabled={loading}>
                        {loading ? 'Loading...' : '🔄 Refresh'}
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map(column => (
                    <div
                        key={column.id}
                        className="flex-1 min-w-[280px] max-w-[350px] flex flex-col"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Column Header */}
                        <div className={`${column.color} rounded-t-xl px-4 py-3 flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                <span>{column.icon}</span>
                                <span className="font-semibold text-white">{column.title}</span>
                            </div>
                            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                                {getTicketsByStatus(column.id).length}
                            </span>
                        </div>

                        {/* Column Body */}
                        <div className="flex-1 bg-white/5 rounded-b-xl p-3 space-y-3 min-h-[200px] overflow-y-auto">
                            {getTicketsByStatus(column.id).map(ticket => (
                                <div
                                    key={ticket.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, ticket)}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`bg-gray-800/80 rounded-lg p-3 cursor-grab active:cursor-grabbing border-l-4 ${PRIORITY_COLORS[ticket.priority] || 'border-gray-500'} hover:bg-gray-700/80 transition-all hover:scale-[1.02] shadow-lg`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-medium text-white text-sm line-clamp-2">
                                            {ticket.subject || 'No Subject'}
                                        </h3>
                                        <span className="text-xs text-gray-500 shrink-0">#{ticket.id}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-gray-400">{ticket.user_name || 'Unknown'}</span>
                                        <span className="text-xs text-gray-500">{formatTime(ticket.created_at)}</span>
                                    </div>
                                </div>
                            ))}

                            {getTicketsByStatus(column.id).length === 0 && (
                                <div className="text-center py-8 text-gray-600 text-sm">
                                    No tickets
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTicket(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div 
                        className="relative bg-gray-900 border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <span className="text-xs text-gray-500">Ticket #{selectedTicket.id}</span>
                                <h2 className="text-xl font-bold text-white">{selectedTicket.subject || 'No Subject'}</h2>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="text-gray-500 hover:text-white text-2xl">×</button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">User</span>
                                <span className="text-white">{selectedTicket.user_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Priority</span>
                                <span className={`capitalize ${selectedTicket.priority === 'high' || selectedTicket.priority === 'urgent' ? 'text-red-400' : 'text-white'}`}>
                                    {selectedTicket.priority}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <span className="text-white capitalize">{selectedTicket.status?.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Created</span>
                                <span className="text-white">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-2">
                            <button 
                                onClick={() => window.location.hash = `/tickets?id=${selectedTicket.id}`}
                                className="flex-1 btn btn-primary"
                            >
                                Open Full View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
