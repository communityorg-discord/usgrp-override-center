import React, { useState, useEffect } from 'react';

const AtlasBrainConfig = () => {
  const [config, setConfig] = useState({
    systemPrompt: '',
    personality: {
      bluntness: 50,
      loyalty: 50,
      sarcasm: 50
    },
    model: 'flash',
    thinkingMode: false
  });
  const [memoryFiles, setMemoryFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('persona');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const configData = await window.electron.ipcRenderer.invoke('override:atlas:config');
      if (configData) setConfig(configData);

      const memoryData = await window.electron.ipcRenderer.invoke('override:atlas:memory', { action: 'list' });
      if (memoryData) setMemoryFiles(memoryData);
    } catch (error) {
      console.error('Failed to fetch Atlas brain data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await window.electron.ipcRenderer.invoke('override:atlas:config', config);
      if (res && res.success) {
        alert('Atlas brain configuration updated successfully.');
      }
    } catch (error) {
      alert('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMemory = async (filename) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
    
    try {
      const res = await window.electron.ipcRenderer.invoke('override:atlas:memory', { action: 'delete', filename });
      if (res && res.success) {
        setMemoryFiles(memoryFiles.filter(f => f.name !== filename));
      }
    } catch (error) {
      alert('Failed to delete memory file.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Accessing Atlas Neural Interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Atlas Brain Config</h1>
          <p className="text-gray-400 mt-1">Configure persona, knowledge base, and processing models.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={fetchData}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors border border-white/10"
            >
                Refresh Data
            </button>
            <button 
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
                {saving ? 'Synchronizing...' : 'Save Configuration'}
            </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button 
          onClick={() => setActiveTab('persona')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'persona' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Persona Editor
        </button>
        <button 
          onClick={() => setActiveTab('memory')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'memory' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Knowledge Base
        </button>
        <button 
          onClick={() => setActiveTab('model')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'model' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Model & Logic
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'persona' && (
          <div className="space-y-6">
            <section className="bg-surface-secondary rounded-2xl border border-white/5 p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">System Prompt (SOUL)</h2>
                    <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded">Primary Identity</span>
                </div>
              <textarea 
                value={config.systemPrompt}
                onChange={(e) => setConfig({...config, systemPrompt: e.target.value})}
                className="w-full h-96 bg-black/40 border border-white/10 rounded-xl p-4 text-gray-300 font-mono text-sm focus:border-amber-500/50 outline-none transition-all resize-none"
                placeholder="Atlas Identity and Soul context..."
              />
            </section>

            <section className="bg-surface-secondary rounded-2xl border border-white/5 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Personality Traits</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { label: 'Bluntness', key: 'bluntness', color: 'from-red-500 to-orange-500' },
                  { label: 'Loyalty', key: 'loyalty', color: 'from-blue-500 to-indigo-500' },
                  { label: 'Sarcasm Level', key: 'sarcasm', color: 'from-purple-500 to-pink-500' }
                ].map((trait) => (
                  <div key={trait.key} className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-medium">{trait.label}</span>
                      <span className="text-white font-mono font-bold bg-white/5 px-2 py-0.5 rounded">{config.personality[trait.key]}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={config.personality[trait.key]}
                      onChange={(e) => setConfig({
                        ...config, 
                        personality: { ...config.personality, [trait.key]: parseInt(e.target.value) }
                      })}
                      className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold tracking-tighter">
                      <span>Low</span>
                      <span>Neutral</span>
                      <span>High</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="space-y-6">
            <section className="bg-surface-secondary rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-white">Memory Files (.md)</h2>
                    <button className="px-4 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg text-sm font-bold transition-all border border-amber-500/20">
                        + Upload File
                    </button>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {memoryFiles.map((file) => (
                  <div key={file.name} className="bg-black/20 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{(file.size / 1024).toFixed(1)} KB • {new Date(file.mtime).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteMemory(file.name)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'model' && (
          <div className="space-y-6">
            <section className="bg-surface-secondary rounded-2xl border border-white/5 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Active Model Selection</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'flash', name: 'Gemini Flash', desc: 'High speed, low latency processing. Ideal for routine tasks.', icon: '⚡' },
                  { id: 'pro', name: 'Gemini Pro', desc: 'Balanced intelligence and performance. Default mode.', icon: '💎' },
                  { id: 'thinking', name: 'Thinking Model', desc: 'Deep reasoning and complex problem solving. High cost.', icon: '🧠' }
                ].map((model) => (
                  <button 
                    key={model.id}
                    onClick={() => setConfig({...config, model: model.id})}
                    className={`p-6 rounded-2xl border text-left transition-all ${config.model === model.id ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                  >
                    <div className="text-3xl mb-4">{model.icon}</div>
                    <h3 className={`text-lg font-bold ${config.model === model.id ? 'text-amber-500' : 'text-white'}`}>{model.name}</h3>
                    <p className="text-sm text-gray-500 mt-2">{model.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-surface-secondary rounded-2xl border border-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Neural Thinking Mode</h2>
                  <p className="text-sm text-gray-500 mt-1">When enabled, Atlas will use extended chain-of-thought for every interaction.</p>
                </div>
                <button 
                  onClick={() => setConfig({...config, thinkingMode: !config.thinkingMode})}
                  className={`w-14 h-7 rounded-full transition-all relative ${config.thinkingMode ? 'bg-amber-500' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${config.thinkingMode ? 'left-8' : 'left-1'}`}></div>
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
      
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-4 items-center">
        <div className="p-2 bg-blue-500/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        <p className="text-sm text-blue-400/80">Changes to the Atlas Brain configuration take effect immediately across all active sessions. Handle with care to prevent personality fragmentation.</p>
      </div>
    </div>
  );
};

export default AtlasBrainConfig;
