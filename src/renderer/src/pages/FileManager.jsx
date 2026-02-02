import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../hooks/useApi';

// Simple Modal Component (Internal)
const Modal = ({ isOpen, onClose, title, children, actions }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-secondary border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <h3 className="font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-0 relative">
                    {children}
                </div>
                {actions && (
                    <div className="p-4 border-t border-gray-700 flex justify-end gap-2 bg-gray-800/50">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function FileManager() {
    const { fetchApi, post, loading: apiLoading } = useApi();
    const [currentPath, setCurrentPath] = useState('/home/vpcommunityorganisation');
    const [files, setFiles] = useState([]);
    const [history, setHistory] = useState(['/home/vpcommunityorganisation']);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    
    // Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorFile, setEditorFile] = useState(null); // { name, path }
    const [editorContent, setEditorContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null); // { x, y, file }

    const containerRef = useRef(null);

    const loadFiles = useCallback(async (pathStr) => {
        setIsLoading(true);
        try {
            const data = await fetchApi(`/override/files/manager/list?path=${encodeURIComponent(pathStr)}`);
            if (data?.success) {
                setFiles(data.files);
                setCurrentPath(data.path);
            } else {
                console.error('Failed to load files:', data?.error);
                // If permission denied or not found, maybe don't update path
            }
        } catch (error) {
            console.error('Error loading files:', error);
        } finally {
            setIsLoading(false);
        }
    }, [fetchApi]);

    useEffect(() => {
        loadFiles(currentPath);
    }, [loadFiles]); // Don't depend on currentPath here to avoid loops, explicit calls handle nav

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const navigate = (pathStr) => {
        // Prevent dupes in history if just refreshing
        if (pathStr === currentPath) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(pathStr);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setCurrentPath(pathStr);
        loadFiles(pathStr);
    };

    const goBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const pathStr = history[newIndex];
            setCurrentPath(pathStr);
            loadFiles(pathStr);
        }
    };

    const goForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const pathStr = history[newIndex];
            setCurrentPath(pathStr);
            loadFiles(pathStr);
        }
    };

    const handleFileClick = (file) => {
        if (file.isDirectory) {
            navigate(file.path);
        } else {
            openFile(file);
        }
    };

    const handleContextMenu = (e, file) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            file
        });
    };

    const openFile = async (file) => {
        // Only open text-ish files for now
        const textExtensions = ['.txt', '.md', '.json', '.js', '.jsx', '.css', '.html', '.env', '.log', '.yml', '.yaml', '.sh'];
        const isText = textExtensions.some(ext => file.name.endsWith(ext)) || !file.name.includes('.');
        
        if (!isText) {
            alert(`Cannot edit ${file.name} (unsupported format)`);
            return;
        }

        try {
            const data = await fetchApi(`/override/files/manager/read?path=${encodeURIComponent(file.path)}`);
            if (data?.success) {
                setEditorFile(file);
                setEditorContent(data.content);
                setEditorOpen(true);
            }
        } catch (error) {
            alert(`Failed to open file: ${error.message}`);
        }
    };

    const saveFile = async () => {
        if (!editorFile) return;
        setIsSaving(true);
        try {
            await post('/override/files/manager/write', {
                path: editorFile.path,
                content: editorContent
            });
            // Show toast/success?
            setEditorOpen(false); // Close on save for now, or just notify
            loadFiles(currentPath); // Refresh list stats
        } catch (error) {
            alert(`Failed to save: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteFile = async (file) => {
        if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;
        
        try {
            await fetchApi(`/override/files/manager/delete?path=${encodeURIComponent(file.path)}`, {
                method: 'DELETE'
            });
            loadFiles(currentPath);
        } catch (error) {
            alert(`Failed to delete: ${error.message}`);
        }
    };

    const handleCreateFolder = async () => {
        const name = prompt("Folder Name:");
        if (!name) return;
        
        try {
            await post('/override/files/manager/mkdir', {
                path: `${currentPath}/${name}`.replace('//', '/')
            });
            loadFiles(currentPath);
        } catch (error) {
            alert(`Failed to create folder: ${error.message}`);
        }
    };
    
    const handleCreateFile = async () => {
        const name = prompt("File Name:");
        if (!name) return;
        
        try {
            await post('/override/files/manager/write', {
                path: `${currentPath}/${name}`.replace('//', '/'),
                content: ''
            });
            loadFiles(currentPath);
        } catch (error) {
            alert(`Failed to create file: ${error.message}`);
        }
    };

    // Breadcrumbs
    const pathParts = currentPath.split('/').filter(Boolean);
    
    return (
        <div className="h-full flex flex-col bg-surface-primary text-gray-200" ref={containerRef}>
            {/* Toolbar */}
            <div className="bg-surface-secondary border-b border-gray-700 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={goBack} 
                        disabled={historyIndex === 0}
                        className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button 
                        onClick={goForward} 
                        disabled={historyIndex === history.length - 1}
                        className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button 
                        onClick={() => loadFiles(currentPath)}
                        className="p-1.5 rounded hover:bg-gray-700"
                    >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1 text-sm bg-gray-900/50 px-3 py-1 rounded border border-gray-700 ml-2">
                        <span 
                            className="cursor-pointer hover:text-white"
                            onClick={() => navigate('/')}
                        >/</span>
                        {pathParts.map((part, i) => {
                            const fullPath = '/' + pathParts.slice(0, i + 1).join('/');
                            return (
                                <React.Fragment key={i}>
                                    <span className="text-gray-600">/</span>
                                    <span 
                                        className="cursor-pointer hover:text-white"
                                        onClick={() => navigate(fullPath)}
                                    >{part}</span>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleCreateFile} className="btn-secondary text-xs">+ File</button>
                    <button onClick={handleCreateFolder} className="btn-secondary text-xs">+ Folder</button>
                </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-auto p-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-gray-500">
                        Loading...
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {files.map((file) => (
                            <div 
                                key={file.path}
                                className={`
                                    group flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors border border-transparent
                                    hover:bg-gray-800 hover:border-gray-700
                                    ${contextMenu?.file?.path === file.path ? 'bg-gray-800 border-amber-500/50' : ''}
                                `}
                                onDoubleClick={() => handleFileClick(file)}
                                onContextMenu={(e) => handleContextMenu(e, file)}
                            >
                                <div className="text-4xl text-gray-500 group-hover:text-amber-500 transition-colors">
                                    {file.isDirectory ? (
                                        <svg className="w-12 h-12 fill-current" viewBox="0 0 24 24">
                                            <path d="M19.479 10.092l-.12-.008a4.918 4.918 0 00-3.324-1.393H11.5L9.608 5.92A2.784 2.784 0 007.245 4.5H4.28C2.33 4.5 1 5.952 1 8.082v10.158c0 1.94 1.258 2.872 2.946 2.872h15.932c1.782 0 3.122-1.252 3.122-3.32V13.3c0-1.898-1.503-3.116-3.52-3.208z"/>
                                        </svg>
                                    ) : (
                                        <svg className="w-12 h-12 fill-current" viewBox="0 0 24 24">
                                            <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" className="text-gray-600"/>
                                            <path d="M14 2v6h6" className="text-gray-400"/>
                                        </svg>
                                    )}
                                </div>
                                <span className="text-xs text-center break-words w-full truncate px-1">
                                    {file.name}
                                </span>
                            </div>
                        ))}
                        {files.length === 0 && (
                            <div className="col-span-full text-center text-gray-500 py-12">
                                Directory is empty
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed z-50 bg-gray-800 border border-gray-700 shadow-xl rounded py-1 min-w-[150px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="px-3 py-1.5 border-b border-gray-700 mb-1 text-xs font-semibold text-gray-400 truncate max-w-[200px]">
                        {contextMenu.file.name}
                    </div>
                    <button 
                        className="w-full text-left px-4 py-2 hover:bg-amber-600 text-sm flex items-center gap-2"
                        onClick={() => {
                            handleFileClick(contextMenu.file);
                            setContextMenu(null);
                        }}
                    >
                        {contextMenu.file.isDirectory ? 'Open' : 'Edit'}
                    </button>
                    {/* Rename (TODO) */}
                    <button 
                        className="w-full text-left px-4 py-2 hover:bg-red-600 text-sm flex items-center gap-2 text-red-400 hover:text-white"
                        onClick={() => {
                            deleteFile(contextMenu.file);
                            setContextMenu(null);
                        }}
                    >
                        Delete
                    </button>
                </div>
            )}

            {/* Editor Modal */}
            <Modal 
                isOpen={editorOpen} 
                onClose={() => setEditorOpen(false)}
                title={`Editing: ${editorFile?.name}`}
                actions={
                    <>
                        <button 
                            onClick={() => setEditorOpen(false)}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={saveFile}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded font-medium disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </>
                }
            >
                <textarea 
                    className="w-full h-[60vh] bg-gray-900 text-gray-200 font-mono text-sm p-4 outline-none resize-none"
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    spellCheck={false}
                />
            </Modal>
        </div>
    );
}