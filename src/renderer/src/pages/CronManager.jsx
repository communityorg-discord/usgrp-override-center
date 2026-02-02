import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function CronManager() {
    const { fetchApi, post, loading: apiLoading } = useApi();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    
    // Job Form State
    const [formData, setFormData] = useState({
        name: '',
        schedule: '',
        payloadType: 'systemEvent', // systemEvent or message
        payloadText: '',
        enabled: true
    });

    useEffect(() => {
        loadJobs();
    }, []);

    async function loadJobs() {
        setLoading(true);
        try {
            const data = await fetchApi('/override/cron/list');
            if (data.success) {
                setJobs(data.jobs);
            }
        } catch (error) {
            console.error('Failed to load cron jobs:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRun(id) {
        try {
            await post(`/override/cron/run/${id}`);
            alert('Job triggered successfully');
            loadJobs();
        } catch (error) {
            alert(`Failed to run job: ${error.message}`);
        }
    }

    async function handleToggle(id) {
        try {
            await post(`/override/cron/toggle/${id}`);
            loadJobs();
        } catch (error) {
            alert(`Failed to toggle job: ${error.message}`);
        }
    }

    function openCreate() {
        setIsEditing(false);
        setEditId(null);
        setFormData({ name: '', schedule: '', payloadType: 'systemEvent', payloadText: '', enabled: true });
        setShowModal(true);
    }

    function openEdit(job) {
        setIsEditing(true);
        setEditId(job.id);
        
        // Parse payload
        let pType = 'systemEvent';
        let pText = '';
        if (job.payload?.kind === 'agentTurn' || job.payload?.message) {
            pType = 'message';
            pText = job.payload.message || '';
        } else {
            pType = 'systemEvent';
            pText = job.payload?.text || '';
        }

        setFormData({
            name: job.name,
            schedule: job.schedule?.expr || '',
            payloadType: pType,
            payloadText: pText,
            enabled: job.enabled
        });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const payload = {};
            if (formData.payloadType === 'systemEvent') {
                payload.text = formData.payloadText;
            } else {
                payload.message = formData.payloadText;
            }

            if (isEditing) {
                await post(`/override/cron/edit/${editId}`, {
                    name: formData.name,
                    schedule: { expr: formData.schedule },
                    payload
                });
            } else {
                await post('/override/cron/create', {
                    name: formData.name,
                    schedule: { expr: formData.schedule },
                    payload,
                    enabled: formData.enabled
                });
            }
            
            setShowModal(false);
            loadJobs();
        } catch (error) {
            alert(`Failed to ${isEditing ? 'update' : 'create'} job: ${error.message}`);
        }
    }

    function formatTime(ms) {
        if (!ms) return 'Never';
        return new Date(ms).toLocaleString();
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Cron Manager</h1>
                    <p className="text-gray-400">Manage automated tasks and schedules</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={loadJobs}
                        className="btn-secondary"
                        disabled={loading || apiLoading}
                    >
                        <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                    <button 
                        onClick={openCreate}
                        className="btn-primary"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Job
                    </button>
                </div>
            </div>

            {/* Jobs List */}
            <div className="bg-surface-secondary rounded-lg border border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 text-xs uppercase text-gray-500 font-medium border-b border-gray-800">
                        <tr>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Schedule</th>
                            <th className="px-4 py-3">Last Run</th>
                            <th className="px-4 py-3">Next Run</th>
                            <th className="px-4 py-3">Result</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {jobs.map((job) => (
                            <tr key={job.id} className="hover:bg-gray-800/30 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center">
                                        <div className={`w-2.5 h-2.5 rounded-full mr-2 ${job.enabled ? 'bg-green-500 shadow-glow-green' : 'bg-gray-600'}`}></div>
                                        <span className={`text-xs ${job.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                                            {job.enabled ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-white">{job.name}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{job.id}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <code className="text-xs bg-gray-900 px-1.5 py-0.5 rounded text-amber-400 font-mono">
                                        {job.schedule?.expr || 'Manual'}
                                    </code>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-300">
                                    {formatTime(job.state?.lastRunAtMs)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-400">
                                    {formatTime(job.state?.nextRunAtMs)}
                                </td>
                                <td className="px-4 py-3">
                                    {job.state?.lastStatus === 'ok' && <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">Success</span>}
                                    {job.state?.lastStatus === 'error' && <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded">Error</span>}
                                    {job.state?.lastStatus === 'skipped' && <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded">Skipped</span>}
                                    {!job.state?.lastStatus && <span className="text-xs text-gray-600">-</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => openEdit(job)}
                                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
                                            title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => handleToggle(job.id)}
                                            className={`p-1.5 rounded transition-colors ${
                                                job.enabled 
                                                ? 'text-yellow-500 hover:bg-yellow-900/20' 
                                                : 'text-green-500 hover:bg-green-900/20'
                                            }`}
                                            title={job.enabled ? 'Disable' : 'Enable'}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={job.enabled ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"} />
                                                {!job.enabled && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                            </svg>
                                        </button>
                                        <button 
                                            onClick={() => handleRun(job.id)}
                                            className="p-1.5 text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
                                            title="Run Now"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {jobs.length === 0 && !loading && (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                    No cron jobs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-surface-secondary border border-gray-700 rounded-lg shadow-xl w-[500px] p-6 animate-scale-in">
                        <h2 className="text-xl font-bold text-white mb-4">{isEditing ? 'Edit Job' : 'Create New Job'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Job Name</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="input-field w-full"
                                    placeholder="daily-report"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Schedule (Cron Expression)</label>
                                <input 
                                    type="text" 
                                    value={formData.schedule}
                                    onChange={e => setFormData({...formData, schedule: e.target.value})}
                                    className="input-field w-full font-mono"
                                    placeholder="0 9 * * *"
                                    required 
                                />
                                <p className="text-xs text-gray-500 mt-1">Format: min hour day month day-of-week</p>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Payload Type</label>
                                <select 
                                    value={formData.payloadType}
                                    onChange={e => setFormData({...formData, payloadType: e.target.value})}
                                    className="input-field w-full"
                                >
                                    <option value="systemEvent">System Event</option>
                                    <option value="message">Agent Message</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Content</label>
                                <textarea 
                                    value={formData.payloadText}
                                    onChange={e => setFormData({...formData, payloadText: e.target.value})}
                                    className="input-field w-full h-24"
                                    placeholder={formData.payloadType === 'systemEvent' ? "Description of what to do..." : "Message to send..."}
                                    required 
                                />
                            </div>
                            {!isEditing && (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="jobEnabled"
                                        checked={formData.enabled}
                                        onChange={e => setFormData({...formData, enabled: e.target.checked})}
                                    />
                                    <label htmlFor="jobEnabled" className="text-sm text-gray-300">Enable immediately</label>
                                </div>
                            )}
                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary"
                                >
                                    {isEditing ? 'Save Changes' : 'Create Job'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
