import React, { useState, useEffect, useRef } from 'react';

export default function ConfigEditor() {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadFiles();
    }, []);

    async function loadFiles() {
        try {
            const list = await window.electron.config.list();
            setFiles(list.sort());
        } catch (e) {
            setError('Failed to list files: ' + e.message);
        }
    }

    async function selectFile(file) {
        setSelectedFile(file);
        try {
            const text = await window.electron.config.read(file);
            setContent(text);
            setError(null);
        } catch (e) {
            setError('Failed to read file: ' + e.message);
        }
    }

    async function save() {
        // Validate: basic check for lines without =
        const invalidLines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#') && !l.includes('='));
        if (invalidLines.length > 0) {
            if (!confirm(`Warning: ${invalidLines.length} lines usually invalid for .env. Save anyway?`)) return;
        }
        
        if (!confirm(`Save changes to ${selectedFile}? A backup will be created.`)) return;
        
        setIsSaving(true);
        try {
            await window.electron.config.save(selectedFile, content);
            alert('Saved successfully.');
        } catch (e) {
            alert('Failed to save: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="h-full flex gap-4 p-6">
            <div className="w-1/4 bg-[#1a1a24] rounded-xl border border-white/5 flex flex-col overflow-hidden shadow-lg">
                <div className="p-4 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white">Config Files</h2>
                    <p className="text-xs text-gray-500 mt-1">{files.length} found</p>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1">
                    {files.map(f => {
                        const name = f.split('/').slice(-2).join('/');
                        return (
                            <button
                                key={f}
                                onClick={() => selectFile(f)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                                    selectedFile === f 
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                                title={f}
                            >
                                {name}
                            </button>
                        );
                    })}
                    {files.length === 0 && !error && (
                        <p className="text-center text-gray-600 text-sm py-4">No config files found</p>
                    )}
                </div>
            </div>
            
            <div className="flex-1 bg-[#1a1a24] rounded-xl border border-white/5 flex flex-col overflow-hidden shadow-lg relative">
                {selectedFile ? (
                    <>
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0a0a0f]/30">
                            <div className="truncate pr-4">
                                <h2 className="text-md font-bold text-white truncate">{selectedFile}</h2>
                                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                            </div>
                            <button
                                onClick={save}
                                disabled={isSaving}
                                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded text-sm transition-colors disabled:opacity-50 flex-shrink-0"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                        <div className="flex-1 relative overflow-hidden group">
                            <Editor content={content} onChange={setContent} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg">Select a file to edit</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function Editor({ content, onChange }) {
    const textareaRef = useRef(null);
    const preRef = useRef(null);

    const handleScroll = () => {
        if (preRef.current && textareaRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    // Syntax highlighting logic
    const highlightedCode = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/#.*$/gm, '<span class="text-gray-500 italic">$&</span>')
        .replace(/^([^=#\n]+)=/gm, '<span class="text-amber-400">$1</span>=')
        .replace(/=(["'].*?["'])/gm, '=<span class="text-green-300">$1</span>')
        .replace(/=(true|false|yes|no)$/gmi, '=<span class="text-purple-400">$1</span>');

    return (
        <div className="relative w-full h-full bg-[#0a0a0f]">
            {/* Syntax Highlight Layer */}
            <pre
                ref={preRef}
                className="absolute inset-0 p-4 font-mono text-sm leading-relaxed pointer-events-none whitespace-pre overflow-hidden"
                style={{ color: 'transparent' }} // Text is transparent to show colors
                dangerouslySetInnerHTML={{ __html: highlightedCode.replace(/color: transparent/g, '') /* Hack to ensure colors show */ }}
            />
            {/* Actual Overlay with colors */}
             <pre
                ref={preRef}
                className="absolute inset-0 p-4 font-mono text-sm leading-relaxed pointer-events-none whitespace-pre overflow-hidden text-blue-200"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />

            {/* Editable Layer */}
            <textarea
                ref={textareaRef}
                value={content}
                onChange={e => onChange(e.target.value)}
                onScroll={handleScroll}
                className="absolute inset-0 w-full h-full p-4 font-mono text-sm leading-relaxed bg-transparent text-transparent caret-white focus:outline-none resize-none whitespace-pre overflow-auto"
                spellCheck="false"
                style={{ caretColor: '#fff' }}
            />
        </div>
    );
}
