import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function RelationshipMapper() {
    const graphRef = useRef();
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [rawData, setRawData] = useState({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        types: { trade: true, shared_ip: true, gang: true, family: true },
        minWealth: 0,
        showSuspiciousOnly: false,
        search: ''
    });
    const [selectedNode, setSelectedNode] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef();

    useEffect(() => {
        loadData();
        
        // Resize observer
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
            }
        });
        
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [rawData, filters]);

    async function loadData() {
        setLoading(true);
        try {
            const data = await window.electron.relationships.get();
            setRawData(data);
        } catch (error) {
            console.error('Failed to load relationship data:', error);
        } finally {
            setLoading(false);
        }
    }

    function applyFilters() {
        let { nodes, edges } = rawData;
        if (!nodes) return;

        // 1. Search Filter
        if (filters.search) {
            const search = filters.search.toLowerCase();
            const matchingNodes = new Set(nodes.filter(n => 
                n.label.toLowerCase().includes(search) || 
                n.id.toLowerCase().includes(search)
            ).map(n => n.id));
            
            // Include 1-hop neighbors
            const neighbors = new Set();
            edges.forEach(e => {
                if (matchingNodes.has(e.from)) neighbors.add(e.to);
                if (matchingNodes.has(e.to)) neighbors.add(e.from);
            });
            
            nodes = nodes.filter(n => matchingNodes.has(n.id) || neighbors.has(n.id));
        }

        // 2. Suspicious Filter
        if (filters.showSuspiciousOnly) {
            nodes = nodes.filter(n => n.suspicious);
        }

        // 3. Min Wealth
        if (filters.minWealth > 0) {
            nodes = nodes.filter(n => n.value >= filters.minWealth);
        }

        const activeNodeIds = new Set(nodes.map(n => n.id));

        // 4. Link Types
        let filteredEdges = edges.filter(e => {
            if (!activeNodeIds.has(e.from) || !activeNodeIds.has(e.to)) return false;
            return filters.types[e.type];
        });

        setGraphData({ nodes, links: filteredEdges.map(e => ({ source: e.from, target: e.to, ...e })) });
    }

    const handleNodeClick = useCallback(node => {
        setSelectedNode(node);
        if (graphRef.current) {
            graphRef.current.centerAt(node.x, node.y, 1000);
            graphRef.current.zoom(3, 2000);
        }
    }, [graphRef]);

    const nodeCanvasObject = (node, ctx, globalScale) => {
        const label = node.label;
        const fontSize = 12/globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        
        // Node circle
        ctx.beginPath();
        const r = Math.sqrt(Math.max(0, node.value || 1)) / 100 + 2; // Scale size by wealth
        const radius = Math.max(r, 2); 
        
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.color || (node.group === 'staff' ? '#10b981' : node.group === 'banned' ? '#ef4444' : '#3b82f6');
        ctx.fill();
        
        // Border if suspicious
        if (node.suspicious) {
            ctx.lineWidth = 2 / globalScale;
            ctx.strokeStyle = '#ef4444';
            ctx.stroke();
            
            // Exclamation mark
            ctx.fillStyle = '#ef4444';
            ctx.fillText('!', node.x + radius, node.y - radius);
        }

        // Label on hover or selected
        if (selectedNode === node || globalScale > 2) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(label, node.x, node.y + radius + fontSize);
        }
    };

    return (
        <div className="h-full flex flex-col bg-surface-primary">
            {/* Header / Controls */}
            <div className="p-4 border-b border-white/5 flex gap-4 items-center flex-wrap bg-surface-secondary">
                <h2 className="text-xl font-bold text-white mr-4">Relationship Mapper</h2>
                
                {/* Search */}
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search user..." 
                        className="bg-surface-primary border border-white/10 rounded px-3 py-1 text-sm text-white w-48 focus:border-gold outline-none"
                        value={filters.search}
                        onChange={e => setFilters({...filters, search: e.target.value})}
                    />
                </div>

                {/* Toggles */}
                <div className="flex gap-4 text-sm text-gray-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={filters.types.trade} 
                            onChange={e => setFilters({...filters, types: {...filters.types, trade: e.target.checked}})}
                            className="accent-gold"
                        />
                        <span className="text-green-400">Trades</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={filters.types.shared_ip} 
                            onChange={e => setFilters({...filters, types: {...filters.types, shared_ip: e.target.checked}})}
                            className="accent-gold"
                        />
                        <span className="text-red-400">Shared IP</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={filters.types.gang} 
                            onChange={e => setFilters({...filters, types: {...filters.types, gang: e.target.checked}})}
                            className="accent-gold"
                        />
                        <span className="text-purple-400">Gang</span>
                    </label>
                </div>

                <div className="flex-1" />

                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/20">
                    <input 
                        type="checkbox" 
                        checked={filters.showSuspiciousOnly} 
                        onChange={e => setFilters({...filters, showSuspiciousOnly: e.target.checked})}
                        className="accent-red-500"
                    />
                    Only Suspicious
                </label>
                
                <button 
                    onClick={loadData} 
                    className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                    title="Refresh Data"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.051M20 20v-5h-.051M9 17H4v-2.357a1.978 1.978 0 01.442-1.299l6.02-7.828A1.978 1.978 0 0111.97 4H16m4 0l-3.268 5.766A2 2 0 0114.996 11H12m0 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Graph */}
                <div className="flex-1 relative" ref={containerRef}>
                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-primary/80 backdrop-blur-sm">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
                        </div>
                    )}
                    
                    <ForceGraph2D
                        ref={graphRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={graphData}
                        nodeLabel="label"
                        nodeColor={node => node.color || '#3b82f6'}
                        linkColor={link => link.color || '#9ca3af'}
                        linkWidth={link => Math.sqrt(link.value || 1)}
                        linkDirectionalParticles={2}
                        linkDirectionalParticleSpeed={d => d.value * 0.001}
                        onNodeClick={handleNodeClick}
                        backgroundColor="#0f172a"
                        nodeCanvasObject={nodeCanvasObject}
                        cooldownTicks={100}
                    />
                </div>

                {/* Inspector Panel */}
                {selectedNode && (
                    <div className="w-80 border-l border-white/10 bg-surface-secondary p-4 overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-white break-all">{selectedNode.label}</h3>
                            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white">×</button>
                        </div>

                        {selectedNode.suspicious && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded p-3 mb-4 text-red-200 text-sm">
                                ⚠️ Suspicious activity detected (Possible Alt/Ring)
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Status</label>
                                <div className={`font-mono ${
                                    selectedNode.group === 'banned' ? 'text-red-400' : 
                                    selectedNode.group === 'staff' ? 'text-green-400' : 'text-blue-400'
                                }`}>
                                    {selectedNode.group}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase">Net Worth</label>
                                <div className="text-gold font-mono text-lg">
                                    ${(selectedNode.value || 0).toLocaleString()}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase">Gang</label>
                                <div className="text-white">
                                    {selectedNode.details?.gang || 'None'}
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Last IP</label>
                                <div className="text-gray-400 font-mono text-xs">
                                    {selectedNode.details?.last_ip}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <label className="text-xs text-gray-500 uppercase mb-2 block">Connections</label>
                                <div className="space-y-2">
                                    {graphData.links.filter(l => l.source.id === selectedNode.id || l.target.id === selectedNode.id).map((link, i) => {
                                        const other = link.source.id === selectedNode.id ? link.target : link.source;
                                        return (
                                            <div key={i} className="flex items-center justify-between text-xs bg-black/20 p-2 rounded">
                                                <span className="text-gray-300 truncate w-24" title={other.label}>{other.label}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                    link.type === 'trade' ? 'bg-green-500/20 text-green-400' :
                                                    link.type === 'shared_ip' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-purple-500/20 text-purple-400'
                                                }`}>
                                                    {link.type}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
