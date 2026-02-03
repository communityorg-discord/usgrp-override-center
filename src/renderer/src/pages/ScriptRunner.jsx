import React, { useState, useEffect, useRef } from 'react';
import { 
  FaPlay, FaStop, FaUpload, FaEdit, FaSave, FaTrash, FaTerminal, 
  FaExclamationTriangle, FaCode, FaFileAlt, FaHistory 
} from 'react-icons/fa';

export default function ScriptRunner() {
  const [scripts, setScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState(null);
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'edit', 'upload'
  const [editorContent, setEditorContent] = useState('');
  const [newScriptName, setNewScriptName] = useState('');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    loadScripts();
    
    // Listen for output
    const unsubscribe = window.electron.scripts.onOutput((data) => {
        setOutput(prev => [...prev, data]);
    });
    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (consoleEndRef.current) {
        consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  async function loadScripts() {
    try {
        const list = await window.electron.scripts.list();
        setScripts(list);
    } catch (error) {
        console.error('Failed to load scripts:', error);
    }
  }

  async function handleRun() {
    if (!selectedScript) return;
    
    setIsRunning(true);
    setConsoleOpen(true);
    setOutput([{ type: 'info', text: `Starting ${selectedScript.name}...` }]);
    
    try {
        const result = await window.electron.scripts.run(selectedScript.path, dryRun);
        setOutput(prev => [...prev, { type: 'info', text: `Process exited with code ${result.code}` }]);
        loadScripts(); // Refresh stats
    } catch (error) {
        setOutput(prev => [...prev, { type: 'error', text: `Error: ${error.message}` }]);
    } finally {
        setIsRunning(false);
    }
  }

  async function handleSave() {
    try {
        let name = newScriptName;
        if (viewMode === 'edit') {
            name = selectedScript.name;
        }
        
        if (!name) return alert('Name is required');
        if (!name.endsWith('.js')) name += '.js';
        
        await window.electron.scripts.save(name, editorContent);
        setViewMode('list');
        loadScripts();
        setNewScriptName('');
        setEditorContent('');
        alert('Script saved successfully');
    } catch (error) {
        alert('Save failed: ' + error.message);
    }
  }

  function startEdit(script) {
    setSelectedScript(script);
    setEditorContent(script.content || '');
    setViewMode('edit');
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FaCode className="text-yellow-500" />
                Script Runner
            </h1>
            <p className="text-gray-400">Manage and execute automation scripts</p>
        </div>
        <div className="flex gap-2">
             <button 
                onClick={() => { setViewMode('upload'); setEditorContent(''); setSelectedScript(null); }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
                <FaUpload /> New Script
            </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Panel: Script List */}
        <div className="w-1/3 bg-gray-900 rounded-lg p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            <h3 className="text-gray-400 font-bold mb-2 uppercase text-xs">Available Scripts</h3>
            <div className="space-y-2">
                {scripts.map(script => (
                    <div 
                        key={script.path}
                        onClick={() => { setSelectedScript(script); setViewMode('list'); }}
                        className={`p-3 rounded cursor-pointer border transition-colors ${selectedScript?.path === script.path ? 'bg-gray-800 border-yellow-500' : 'bg-gray-800/50 border-transparent hover:bg-gray-800'}`}
                    >
                        <div className="flex justify-between items-start">
                            <span className="font-mono text-sm font-bold text-blue-400 break-all">{script.name}</span>
                            {script.type === 'custom' && <span className="bg-purple-900 text-purple-200 text-xs px-1 rounded h-fit">Custom</span>}
                        </div>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">{script.description}</p>
                        {script.lastRun && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                <FaHistory /> Last run: {new Date(script.lastRun).toLocaleString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Right Panel: Content */}
        <div className="flex-1 flex flex-col bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
            {viewMode === 'list' && selectedScript ? (
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-800 bg-gray-900/50">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white font-mono">{selectedScript.name}</h2>
                                <p className="text-gray-400 text-sm mt-1">{selectedScript.path}</p>
                            </div>
                            <button 
                                onClick={() => startEdit(selectedScript)}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 border border-gray-700"
                            >
                                <FaEdit /> Edit Source
                            </button>
                        </div>
                        
                        <div className="bg-gray-800/50 p-4 rounded-lg mb-4 border border-gray-700/50">
                            <p className="text-gray-300 text-sm italic">{selectedScript.description || "No description available."}</p>
                        </div>

                        <div className="flex items-center gap-4 bg-black/20 p-4 rounded-lg border border-gray-800">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-400 text-sm font-bold">EXECUTION MODE:</span>
                                <button 
                                    onClick={() => setDryRun(!dryRun)}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all border ${dryRun ? 'bg-green-500/10 text-green-400 border-green-500/50' : 'bg-red-500/10 text-red-400 border-red-500/50'}`}
                                >
                                    {dryRun ? 'SAFE MODE (DRY RUN)' : 'LIVE MODE (DESTRUCTIVE)'}
                                </button>
                            </div>
                            <div className="flex-1"></div>
                            <button 
                                onClick={handleRun}
                                disabled={isRunning}
                                className={`px-6 py-2 rounded font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 ${isRunning ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:brightness-110'}`}
                            >
                                {isRunning ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-black"></div> : <FaPlay />}
                                Run Script
                            </button>
                        </div>
                    </div>
                    
                    {/* Console Output */}
                    <div className="flex-1 bg-black p-4 font-mono text-sm overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                        <div className="flex justify-between items-center mb-2 text-gray-500 border-b border-gray-800 pb-2 sticky top-0 bg-black">
                            <span className="flex items-center gap-2"><FaTerminal className="text-gray-400"/> Console Output</span>
                            <button onClick={() => setOutput([])} className="text-xs hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors">Clear Console</button>
                        </div>
                        <div className="font-mono text-xs">
                            {output.length === 0 && <span className="text-gray-700 italic">Ready to execute.</span>}
                            {output.map((line, i) => (
                                <div key={i} className={`${line.type === 'stderr' || line.type === 'error' ? 'text-red-400' : line.type === 'info' ? 'text-blue-400' : 'text-gray-300'} whitespace-pre-wrap py-0.5 border-b border-gray-900/30`}>
                                    {line.text}
                                </div>
                            ))}
                            <div ref={consoleEndRef} />
                        </div>
                    </div>
                </div>
            ) : (viewMode === 'edit' || viewMode === 'upload') ? (
                <div className="h-full flex flex-col">
                    <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center gap-4">
                         <h2 className="text-lg font-bold text-white flex-1">{viewMode === 'upload' ? 'New Script' : 'Edit Script'}</h2>
                         {viewMode === 'upload' && (
                             <input 
                                type="text" 
                                placeholder="script-name.js"
                                value={newScriptName}
                                onChange={e => setNewScriptName(e.target.value)}
                                className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-1.5 w-64 text-sm font-mono focus:border-blue-500 focus:outline-none"
                             />
                         )}
                         <button onClick={() => setViewMode('list')} className="text-gray-400 hover:text-white px-4 text-sm">Cancel</button>
                         <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded flex items-center gap-2 text-sm font-bold shadow-lg">
                             <FaSave /> Save Script
                         </button>
                    </div>
                    <textarea 
                        value={editorContent}
                        onChange={e => setEditorContent(e.target.value)}
                        className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono p-4 resize-none focus:outline-none text-sm leading-relaxed"
                        spellCheck="false"
                        placeholder="// Type your javascript code here..."
                    />
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 bg-gray-900/50">
                    <FaCode className="text-6xl mb-4 opacity-20" />
                    <p className="font-medium">Select a script from the list to view details</p>
                    <p className="text-sm mt-2 opacity-60">or create a new one</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
