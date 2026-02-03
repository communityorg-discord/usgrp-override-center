import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function DependencyGraph() {
    const { fetchApi } = useApi();
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);

    useEffect(() => {
        loadGraph();
    }, []);

    async function loadGraph() {
        try {
            // Use API to get PM2 list from server
            const data = await fetchApi('/override/pm2/list');
            
            if (data?.processes && data.processes.length > 0) {
                const nodes = [];
                const links = [];
                
                // Add process nodes
                data.processes.forEach(proc => {
                    nodes.push({
                        id: proc.name,
                        name: proc.name,
                        status: proc.status,
                        type: 'service',
                        color: proc.status === 'online' ? '#10b981' : '#ef4444',
                        memory: proc.memoryMB || 0,
                        cpu: proc.cpu || 0
                    });
                });
                
                // Add infrastructure nodes
                nodes.push({ id: 'postgres', name: 'PostgreSQL', type: 'db', color: '#3b82f6' });
                nodes.push({ id: 'sqlite', name: 'SQLite', type: 'db', color: '#60a5fa' });
                
                // Add links based on known dependencies
                const dbServices = ['api-gateway', 'auth-service', 'co-economy-bot', 'co-gov-utils'];
                dbServices.forEach(svc => {
                    if (nodes.find(n => n.id === svc)) {
                        links.push({ source: svc, target: 'sqlite' });
                    }
                });
                
                // Calculate positions (circular layout)
                const centerX = 400;
                const centerY = 300;
                const radius = 200;
                
                nodes.forEach((node, i) => {
                    if (node.type === 'db') {
                        node.x = centerX + (node.id === 'postgres' ? -50 : 50);
                        node.y = centerY;
                        return;
                    }
                    const angle = (i / nodes.filter(n => n.type !== 'db').length) * 2 * Math.PI - Math.PI / 2;
                    node.x = centerX + radius * Math.cos(angle);
                    node.y = centerY + radius * Math.sin(angle);
                });
                
                setGraphData({ nodes, links });
            } else {
                setGraphData({ 
                    nodes: [{ id: 'no-services', name: 'No services detected', type: 'info', color: '#6b7280', x: 400, y: 300 }], 
                    links: [] 
                });
            }
        } catch (error) {
            console.error('Failed to load dependency graph:', error);
            setGraphData({ 
                nodes: [{ id: 'error', name: 'Failed to load', type: 'error', color: '#ef4444', x: 400, y: 300 }], 
                links: [] 
            });
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-400">Analyzing service dependencies...</div>;

    return (
        <div className="h-full flex flex-col">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Service Dependency Graph</h1>
                <p className="text-gray-400">Visualizing relationships between USGRP services</p>
            </header>

            <div className="flex-1 bg-surface-secondary rounded-xl border border-white/5 overflow-hidden relative">
                {/* Simple SVG Graph Visualization */}
                <svg className="w-full h-full">
                    {/* Render Links */}
                    {graphData.links.map((link, i) => {
                        const source = graphData.nodes.find(n => n.id === link.source);
                        const target = graphData.nodes.find(n => n.id === link.target);
                        if (!source || !target) return null;
                        
                        return (
                            <line 
                                key={i}
                                x1={source.x} y1={source.y}
                                x2={target.x} y2={target.y}
                                stroke="#4b5563"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                            />
                        );
                    })}

                    {/* Render Nodes */}
                    {graphData.nodes.map((node) => (
                        <g 
                            key={node.id} 
                            transform={`translate(${node.x},${node.y})`}
                            onClick={() => setSelectedNode(node)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <circle r="20" fill={node.color || '#3b82f6'} stroke="#1f2937" strokeWidth="2" />
                            <text dy="35" textAnchor="middle" fill="#d1d5db" fontSize="12">{node.name}</text>
                        </g>
                    ))}
                    
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
                        </marker>
                    </defs>
                </svg>

                {/* Details Panel */}
                {selectedNode && (
                    <div className="absolute top-4 right-4 w-64 bg-surface-primary border border-white/10 rounded-lg p-4 shadow-xl">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-white">{selectedNode.name}</h3>
                            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white">
                                ×
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">{selectedNode.path}</p>
                        <div className="text-xs">
                            <span className="text-gray-500">Dependencies:</span>
                            <ul className="list-disc pl-4 mt-1 text-gray-300">
                                {graphData.links
                                    .filter(l => l.source === selectedNode.id)
                                    .map(l => (
                                        <li key={l.target}>{l.target}</li>
                                    ))
                                }
                                {graphData.links.filter(l => l.source === selectedNode.id).length === 0 && (
                                    <li className="text-gray-600 italic">None detected</li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
