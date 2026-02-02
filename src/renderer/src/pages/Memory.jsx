import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

export default function Memory() {
    const { fetchApi, post, loading } = useApi();
    const [files, setFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadFiles();
    }, []);

    // Handle Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (selectedFile) {
                    saveFile();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedFile, content]); // Dependencies for closure access

    async function loadFiles() {
        try {
            const data = await fetchApi('/override/memory/list');
            if (data?.files) {
                setFiles(data.files);
            }
        } catch (error) {
            console.error('Failed to load files:', error);
        }
    }

    async function loadFile(filename) {
        try {
            // Check for unsaved changes?
            if (selectedFile && content !== originalContent) {
                if (!confirm('You have unsaved changes. Discard them?')) {
                    return;
                }
            }

            const data = await fetchApi(`/override/memory/file?path=${filename}`);
            if (data?.success) {
                setSelectedFile(filename);
                setContent(data.content || '');
                setOriginalContent(data.content || '');
            }
        } catch (error) {
            console.error('Failed to load file:', error);
            alert(`Failed to load ${filename}: ${error.message}`);
        }
    }

    async function saveFile() {
        if (!selectedFile) return;
        setSaving(true);
        
        try {
            await post('/override/memory/file', { 
                path: selectedFile, 
                content 
            });
            setOriginalContent(content);
            // Optional: visual feedback toast
        } catch (error) {
            alert(`Failed to save: ${error.message}`);
        } finally {
            setSaving(false);
        }
    }

    async function handleCreate() {
        const name = prompt("Enter filename (must end in .md):");
        if (!name) return;

        if (!name.endsWith('.md')) {
            alert("Filename must end with .md");
            return;
        }

        if (name.includes('/') || name.includes('\\')) {
            alert("Invalid filename (slashes not allowed)");
            return;
        }

        try {
            // Check if exists
            if (files.includes(name)) {
                alert("File already exists");
                return;
            }

            // Create empty file
            await post('/override/memory/file', { path: name, content: '' });
            await loadFiles();
            loadFile(name);
        } catch (error) {
            alert(`Failed to create file: ${error.message}`);
        }
    }

    async function handleDelete() {
        if (!selectedFile) return;
        if (!confirm(`Are you sure you want to delete ${selectedFile}? This cannot be undone.`)) return;

        try {
            await fetchApi(`/override/memory/file?path=${selectedFile}`, {
                method: 'DELETE'
            });
            setSelectedFile(null);
            setContent('');
            setOriginalContent('');
            loadFiles();
        } catch (error) {
            alert(`Failed to delete: ${error.message}`);
        }
    }

    const filteredFiles = files.filter(f => 
        f.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hasChanges = content !== originalContent;

    return (
        <div className="h-full flex gap-4 text-gray-200">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white mb-2">Memory Bank</h1>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm focus:border-amber-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex-1 bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredFiles.map(file => (
                            <button
                                key={file}
                                onClick={() => loadFile(file)}
                                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors truncate ${
                                    selectedFile === file 
                                        ? 'bg-amber-600 text-white font-medium' 
                                        : 'hover:bg-gray-800 text-gray-300'
                                }`}
                            >
                                {file}
                            </button>
                        ))}
                        {filteredFiles.length === 0 && (
                            <div className="text-gray-500 text-xs text-center py-4">
                                No files found
                            </div>
                        )}
                    </div>
                    
                    <div className="p-2 border-t border-gray-700 bg-gray-800">
                        <button 
                            onClick={handleCreate}
                            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded text-sm transition-colors"
                        >
                            <span>+</span> New File
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                {selectedFile ? (
                    <>
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-sm text-gray-400">memory/</span>
                                <h2 className="font-semibold text-white">{selectedFile}</h2>
                                {hasChanges && (
                                    <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/30">
                                        Unsaved
                                    </span>
                                )}
                                {saving && <span className="text-xs text-gray-400 animate-pulse">Saving...</span>}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={saveFile}
                                    disabled={!hasChanges || saving}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                        hasChanges 
                                            ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    }`}
                                    title="Ctrl+S"
                                >
                                    Save
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    className="px-3 py-1.5 rounded text-sm font-medium bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>

                        {/* Textarea */}
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="flex-1 w-full p-4 bg-gray-900 text-gray-200 font-mono text-sm resize-none focus:outline-none leading-relaxed"
                            spellCheck={false}
                            placeholder="Start writing..."
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <p>Select a file to edit or create a new one</p>
                    </div>
                )}
            </div>
        </div>
    );
}
