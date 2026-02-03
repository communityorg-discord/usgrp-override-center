import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function JudicialPanel() {
    const [activeTab, setActiveTab] = useState('warrants');
    const [loading, setLoading] = useState(false);
    const [warrants, setWarrants] = useState([]);
    const [courtCases, setCourtCases] = useState([]);
    const [records, setRecords] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(null); // 'warrant', 'case', 'record'
    const [formData, setFormData] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    async function fetchData() {
        setLoading(true);
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            const headers = { 
                'X-Override-Token': token,
                'Content-Type': 'application/json'
            };

            if (activeTab === 'warrants') {
                const res = await fetch(`${apiBase}/override/warrants`, { headers });
                const data = await res.json();
                if (data.success) setWarrants(data.warrants);
            } else if (activeTab === 'dockets') {
                const res = await fetch(`${apiBase}/override/court-cases`, { headers });
                const data = await res.json();
                if (data.success) setCourtCases(data.cases);
            } else if (activeTab === 'records') {
                const url = searchQuery 
                    ? `${apiBase}/override/criminal-records?q=${encodeURIComponent(searchQuery)}` 
                    : `${apiBase}/override/criminal-records`;
                const res = await fetch(url, { headers });
                const data = await res.json();
                if (data.success) setRecords(data.records);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            const headers = { 
                'X-Override-Token': token,
                'Content-Type': 'application/json'
            };

            let endpoint = '';
            if (modalType === 'warrant') endpoint = '/override/warrants';
            if (modalType === 'case') endpoint = '/override/court-cases';
            if (modalType === 'record') endpoint = '/override/criminal-records';

            const res = await fetch(`${apiBase}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
                setShowModal(false);
                setFormData({});
                fetchData();
            }
        } catch (error) {
            console.error('Submit failed:', error);
        }
    }

    async function handleAction(type, id, actionData) {
        try {
            const apiBase = await window.electron.api.getBase();
            const token = await window.electron.api.getToken();
            const headers = { 
                'X-Override-Token': token,
                'Content-Type': 'application/json'
            };

            let endpoint = '';
            let method = 'PATCH';
            let body = actionData;

            if (type === 'warrant') {
                endpoint = `/override/warrants/${id}`;
            } else if (type === 'case') {
                endpoint = `/override/court-cases/${id}`;
            } else if (type === 'record') {
                endpoint = `/override/criminal-records/${id}`;
                method = 'DELETE'; // For expunge
            }

            await fetch(`${apiBase}${endpoint}`, {
                method,
                headers,
                body: JSON.stringify(body)
            });
            
            fetchData();
        } catch (error) {
            console.error('Action failed:', error);
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                        Judicial Panel
                    </h1>
                    <p className="text-gray-400 mt-1">Manage warrants, court dockets, and criminal records</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setModalType('warrant'); setShowModal(true); }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        Issue Warrant
                    </button>
                    <button 
                        onClick={() => { setModalType('case'); setShowModal(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        New Case
                    </button>
                    <button 
                        onClick={() => { setModalType('record'); setShowModal(true); }}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        Add Record
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('warrants')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'warrants' 
                            ? 'border-amber-500 text-amber-500' 
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Warrant Manager
                </button>
                <button
                    onClick={() => setActiveTab('dockets')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'dockets' 
                            ? 'border-amber-500 text-amber-500' 
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Court Dockets
                </button>
                <button
                    onClick={() => setActiveTab('records')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                        activeTab === 'records' 
                            ? 'border-amber-500 text-amber-500' 
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                >
                    Criminal Records
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                </div>
            ) : (
                <div className="bg-surface-secondary rounded-xl border border-white/5 overflow-hidden">
                    {activeTab === 'warrants' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/20 text-gray-400 text-sm uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Target</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Reason</th>
                                        <th className="px-6 py-4">Issued By</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {warrants.map(w => (
                                        <tr key={w.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium">{w.target_name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                    w.type === 'arrest' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                    {w.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">{w.reason}</td>
                                            <td className="px-6 py-4 text-gray-400">{w.issuing_judge}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                    w.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                                                    w.status === 'executed' ? 'bg-gray-500/20 text-gray-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {w.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {w.status === 'active' && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleAction('warrant', w.id, { status: 'executed' })}
                                                            className="text-green-400 hover:text-green-300 text-sm font-medium"
                                                        >
                                                            Execute
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction('warrant', w.id, { status: 'cancelled' })}
                                                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {warrants.length === 0 && (
                                        <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No warrants found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'dockets' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/20 text-gray-400 text-sm uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Case</th>
                                        <th className="px-6 py-4">Judge</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {courtCases.map(c => (
                                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{c.plaintiff} v. {c.defendant}</div>
                                                <div className="text-sm text-gray-400">{c.charges}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">{c.assigned_judge}</td>
                                            <td className="px-6 py-4 text-gray-300">{c.scheduled_date}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                    c.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 
                                                    c.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                                }`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select 
                                                    className="bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-gray-300"
                                                    value={c.status}
                                                    onChange={(e) => handleAction('case', c.id, { status: e.target.value })}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="in-progress">In Progress</option>
                                                    <option value="closed">Closed</option>
                                                    <option value="dismissed">Dismissed</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    {courtCases.length === 0 && (
                                        <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No active cases</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'records' && (
                        <div>
                            <div className="p-4 border-b border-white/5 flex gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Search by name or ID..." 
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                                />
                                <button 
                                    onClick={fetchData}
                                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors"
                                >
                                    Search
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/20 text-gray-400 text-sm uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Citizen</th>
                                            <th className="px-6 py-4">Charge</th>
                                            <th className="px-6 py-4">Sentence</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {records.map(r => (
                                            <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-medium">{r.user_name}</td>
                                                <td className="px-6 py-4 text-gray-300">{r.charge}</td>
                                                <td className="px-6 py-4 text-gray-300">{r.sentence}</td>
                                                <td className="px-6 py-4 text-gray-400">{r.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                        r.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button 
                                                        onClick={() => handleAction('record', r.id, { type: 'expunged' })}
                                                        className="text-amber-400 hover:text-amber-300 text-sm font-medium"
                                                    >
                                                        Expunge
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {records.length === 0 && (
                                            <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-secondary border border-white/10 rounded-xl w-full max-w-lg shadow-2xl animate-fade-in-up">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">
                                {modalType === 'warrant' ? 'Issue New Warrant' : 
                                 modalType === 'case' ? 'Create Court Case' : 'Add Criminal Record'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {modalType === 'warrant' && (
                                <>
                                    <input type="text" placeholder="Target Name" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, targetName: e.target.value})} />
                                    <input type="text" placeholder="Target User ID (Optional)" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white"
                                        onChange={e => setFormData({...formData, targetUserId: e.target.value})} />
                                    <select className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, type: e.target.value})}>
                                        <option value="">Select Type</option>
                                        <option value="arrest">Arrest Warrant</option>
                                        <option value="search">Search Warrant</option>
                                    </select>
                                    <textarea placeholder="Reason" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white h-24" required
                                        onChange={e => setFormData({...formData, reason: e.target.value})}></textarea>
                                    <input type="date" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white"
                                        onChange={e => setFormData({...formData, expiry: e.target.value})} />
                                </>
                            )}
                            
                            {modalType === 'case' && (
                                <>
                                    <input type="text" placeholder="Plaintiff" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, plaintiff: e.target.value})} />
                                    <input type="text" placeholder="Defendant" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, defendant: e.target.value})} />
                                    <input type="text" placeholder="Charges/Subject" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, charges: e.target.value})} />
                                    <input type="text" placeholder="Assigned Judge" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, assignedJudge: e.target.value})} />
                                    <input type="date" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, scheduledDate: e.target.value})} />
                                </>
                            )}

                            {modalType === 'record' && (
                                <>
                                    <input type="text" placeholder="Citizen Name" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, userName: e.target.value})} />
                                    <input type="text" placeholder="Citizen ID (Optional)" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white"
                                        onChange={e => setFormData({...formData, userId: e.target.value})} />
                                    <input type="text" placeholder="Charge" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, charge: e.target.value})} />
                                    <select className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, conviction: e.target.value})}>
                                        <option value="">Select Verdict</option>
                                        <option value="guilty">Guilty</option>
                                        <option value="not-guilty">Not Guilty</option>
                                        <option value="nolo-contendere">Nolo Contendere</option>
                                    </select>
                                    <input type="text" placeholder="Sentence" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white" required
                                        onChange={e => setFormData({...formData, sentence: e.target.value})} />
                                    <input type="date" className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white"
                                        onChange={e => setFormData({...formData, date: e.target.value})} />
                                </>
                            )}

                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/10">Cancel</button>
                                <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-bold">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}