import React, { useState, useEffect } from 'react';
import { 
    FaGitAlt, FaCodeBranch, FaHistory, FaCloudUploadAlt, FaCloudDownloadAlt, 
    FaCheck, FaTimes, FaPlus, FaTrash, FaUndo, FaSync, FaArrowRight, FaFileCode
} from 'react-icons/fa';

export default function GitManager() {
    const [repos, setRepos] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [status, setStatus] = useState(null);
    const [branches, setBranches] = useState(null);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [isLoading, setIsLoading] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [diffContent, setDiffContent] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadRepos();
    }, []);

    useEffect(() => {
        if (selectedRepo) {
            refreshRepoData();
        }
    }, [selectedRepo]);

    async function loadRepos() {
        setIsLoading(true);
        try {
            const list = await window.electron.git.listRepos();
            setRepos(list);
            if (list.length > 0 && !selectedRepo) {
                setSelectedRepo(list[0]);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function refreshRepoData() {
        if (!selectedRepo) return;
        setIsLoading(true);
        setError(null);
        try {
            const [st, br, log] = await Promise.all([
                window.electron.git.status(selectedRepo.path),
                window.electron.git.branches(selectedRepo.path),
                window.electron.git.log(selectedRepo.path)
            ]);
            setStatus(st);
            setBranches(br);
            setHistory(log.all);
            // Clear selection
            setSelectedFile(null);
            setDiffContent('');
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function handlePull() {
        if (!selectedRepo) return;
        setIsLoading(true);
        try {
            await window.electron.git.pull(selectedRepo.path);
            refreshRepoData();
        } catch (e) {
            setError(e.message);
            setIsLoading(false);
        }
    }

    async function handlePush() {
        if (!selectedRepo) return;
        setIsLoading(true);
        try {
            await window.electron.git.push(selectedRepo.path);
            refreshRepoData();
        } catch (e) {
            setError(e.message);
            setIsLoading(false);
        }
    }

    async function handleStage(file) {
        try {
            await window.electron.git.stage(selectedRepo.path, file);
            const st = await window.electron.git.status(selectedRepo.path);
            setStatus(st);
        } catch (e) { setError(e.message); }
    }

    async function handleUnstage(file) {
        try {
            await window.electron.git.unstage(selectedRepo.path, file);
            const st = await window.electron.git.status(selectedRepo.path);
            setStatus(st);
        } catch (e) { setError(e.message); }
    }

    async function handleCommit() {
        if (!commitMessage) return;
        setIsLoading(true);
        try {
            await window.electron.git.commit(selectedRepo.path, commitMessage);
            setCommitMessage('');
            refreshRepoData();
        } catch (e) {
            setError(e.message);
            setIsLoading(false);
        }
    }

    async function handleCreateBranch() {
        if (!newBranchName) return;
        try {
            await window.electron.git.createBranch(selectedRepo.path, newBranchName);
            setNewBranchName('');
            refreshRepoData();
        } catch (e) { setError(e.message); }
    }

    async function handleCheckout(branch) {
        try {
            await window.electron.git.checkout(selectedRepo.path, branch);
            refreshRepoData();
        } catch (e) { setError(e.message); }
    }

    async function handleDeleteBranch(branch) {
        if (!confirm(`Are you sure you want to delete branch ${branch}?`)) return;
        try {
            await window.electron.git.deleteBranch(selectedRepo.path, branch);
            refreshRepoData();
        } catch (e) { setError(e.message); }
    }

    async function showDiff(file) {
        setSelectedFile(file);
        try {
            const diff = await window.electron.git.diff(selectedRepo.path, file);
            setDiffContent(diff);
        } catch (e) { setError(e.message); }
    }

    async function handleReset(commit) {
        if(!confirm('Are you sure you want to hard reset to this commit? ALL CHANGES WILL BE LOST.')) return;
         try {
            await window.electron.git.reset(selectedRepo.path, 'hard', commit);
            refreshRepoData();
        } catch (e) { setError(e.message); }
    }

    return (
        <div className="h-full flex flex-col bg-surface-primary text-text-primary p-2">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 bg-surface-secondary p-4 rounded-lg shadow-lg border border-border-primary">
                <div className="flex items-center gap-4">
                    <FaGitAlt className="text-3xl text-orange-500" />
                    <div>
                        <h1 className="text-xl font-bold">Git Version Control</h1>
                        <div className="text-xs text-text-secondary">{selectedRepo?.path}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select 
                        className="bg-surface-primary border border-border-primary rounded px-3 py-1.5 focus:border-accent outline-none"
                        value={selectedRepo?.path || ''}
                        onChange={(e) => setSelectedRepo(repos.find(r => r.path === e.target.value))}
                    >
                        {repos.map(r => (
                            <option key={r.path} value={r.path}>{r.name}</option>
                        ))}
                    </select>
                    <button onClick={refreshRepoData} className="p-2 hover:bg-surface-tertiary rounded tooltip" title="Refresh">
                        <FaSync className={isLoading ? "animate-spin" : ""} />
                    </button>
                    <div className="h-6 w-px bg-border-primary mx-2"></div>
                    <button onClick={handlePull} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded border border-blue-600/50 transition-colors">
                        <FaCloudDownloadAlt /> Pull
                    </button>
                    <button onClick={handlePush} className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded border border-green-600/50 transition-colors">
                        <FaCloudUploadAlt /> Push
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><FaTimes /></button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-border-primary">
                {['overview', 'branches', 'history'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 capitalize font-medium transition-colors border-b-2 ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex gap-4">
                {activeTab === 'overview' && status && (
                    <>
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            {/* Staged Files */}
                            <div className="flex-1 bg-surface-secondary rounded-lg border border-border-primary flex flex-col">
                                <div className="p-3 border-b border-border-primary font-bold flex justify-between">
                                    <span>Staged Changes ({status.staged.length})</span>
                                    <button onClick={() => handleUnstage('.')} className="text-xs text-red-400 hover:underline">Unstage All</button>
                                </div>
                                <div className="flex-1 overflow-auto p-2">
                                    {status.staged.map(file => (
                                        <div key={file} onClick={() => showDiff(file)} className={`flex justify-between items-center p-2 rounded hover:bg-surface-tertiary cursor-pointer ${selectedFile === file ? 'bg-surface-tertiary border border-accent/50' : ''}`}>
                                            <span className="flex items-center gap-2"><FaFileCode className="text-green-400" /> {file}</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleUnstage(file); }} className="text-red-400 hover:text-red-300"><FaTimes /></button>
                                        </div>
                                    ))}
                                    {status.staged.length === 0 && <div className="text-text-secondary text-center p-4">No staged changes</div>}
                                </div>
                            </div>

                            {/* Unstaged Files */}
                            <div className="flex-1 bg-surface-secondary rounded-lg border border-border-primary flex flex-col">
                                <div className="p-3 border-b border-border-primary font-bold flex justify-between">
                                    <span>Changes ({status.files.filter(f => !status.staged.includes(f.path)).length})</span>
                                    <button onClick={() => handleStage('.')} className="text-xs text-green-400 hover:underline">Stage All</button>
                                </div>
                                <div className="flex-1 overflow-auto p-2">
                                    {status.files.filter(f => !status.staged.includes(f.path)).map(file => (
                                        <div key={file.path} onClick={() => showDiff(file.path)} className={`flex justify-between items-center p-2 rounded hover:bg-surface-tertiary cursor-pointer ${selectedFile === file.path ? 'bg-surface-tertiary border border-accent/50' : ''}`}>
                                            <span className="flex items-center gap-2">
                                                <span className={`text-xs px-1 rounded ${file.index === '?' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>{file.index === '?' ? 'U' : 'M'}</span>
                                                {file.path}
                                            </span>
                                            <button onClick={(e) => { e.stopPropagation(); handleStage(file.path); }} className="text-green-400 hover:text-green-300"><FaPlus /></button>
                                        </div>
                                    ))}
                                    {status.files.length === 0 && <div className="text-text-secondary text-center p-4">Working tree clean</div>}
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Diff & Commit */}
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            {/* Commit Box */}
                            <div className="bg-surface-secondary rounded-lg border border-border-primary p-4">
                                <textarea
                                    className="w-full bg-surface-primary border border-border-primary rounded p-2 text-sm focus:border-accent outline-none min-h-[80px]"
                                    placeholder="Commit message..."
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                ></textarea>
                                <div className="flex justify-end mt-2">
                                    <button 
                                        onClick={handleCommit}
                                        disabled={status.staged.length === 0 || !commitMessage}
                                        className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                    >
                                        Commit
                                    </button>
                                </div>
                            </div>

                            {/* Diff Viewer */}
                            <div className="flex-1 bg-surface-secondary rounded-lg border border-border-primary flex flex-col overflow-hidden">
                                <div className="p-3 border-b border-border-primary font-bold">
                                    Diff: {selectedFile || 'Select a file'}
                                </div>
                                <div className="flex-1 overflow-auto p-4 bg-surface-primary font-mono text-sm whitespace-pre">
                                    {diffContent || <span className="text-text-secondary italic">No file selected</span>}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'branches' && branches && (
                    <div className="flex-1 flex flex-col gap-4">
                         <div className="bg-surface-secondary p-4 rounded-lg border border-border-primary flex gap-2">
                            <input 
                                type="text" 
                                placeholder="New branch name..." 
                                className="flex-1 bg-surface-primary border border-border-primary rounded px-3 outline-none focus:border-accent"
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                            />
                            <button onClick={handleCreateBranch} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Create Branch</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
                            {branches.all.map(branch => (
                                <div key={branch} className={`bg-surface-secondary p-4 rounded-lg border ${branches.current === branch ? 'border-accent' : 'border-border-primary'} flex justify-between items-center group`}>
                                    <div className="flex items-center gap-2">
                                        <FaCodeBranch className={branches.current === branch ? 'text-accent' : 'text-text-secondary'} />
                                        <span className={branches.current === branch ? 'font-bold text-accent' : ''}>{branch}</span>
                                        {branches.current === branch && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">Current</span>}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {branches.current !== branch && (
                                            <>
                                                <button onClick={() => handleCheckout(branch)} className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 rounded tooltip" title="Checkout">
                                                    <FaArrowRight />
                                                </button>
                                                <button onClick={() => handleDeleteBranch(branch)} className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600 rounded tooltip" title="Delete">
                                                    <FaTrash />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="flex-1 bg-surface-secondary rounded-lg border border-border-primary flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-surface-tertiary sticky top-0">
                                    <tr>
                                        <th className="p-3 border-b border-border-primary">Commit</th>
                                        <th className="p-3 border-b border-border-primary">Message</th>
                                        <th className="p-3 border-b border-border-primary">Author</th>
                                        <th className="p-3 border-b border-border-primary">Date</th>
                                        <th className="p-3 border-b border-border-primary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(commit => (
                                        <tr key={commit.hash} className="hover:bg-surface-tertiary border-b border-border-primary/50">
                                            <td className="p-3 font-mono text-xs text-accent">{commit.hash.substring(0, 7)}</td>
                                            <td className="p-3">{commit.message}</td>
                                            <td className="p-3 text-sm text-text-secondary">{commit.author_name}</td>
                                            <td className="p-3 text-sm text-text-secondary">{new Date(commit.date).toLocaleString()}</td>
                                            <td className="p-3">
                                                <button 
                                                    onClick={() => handleReset(commit.hash)} 
                                                    className="p-1.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors text-xs flex items-center gap-1"
                                                    title="Hard Reset to this commit"
                                                >
                                                    <FaUndo /> Reset
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}