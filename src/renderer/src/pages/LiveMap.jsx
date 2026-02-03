import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApi } from '../hooks/useApi';

export default function LiveMap() {
    const { fetchApi, loading } = useApi();
    const [properties, setProperties] = useState([]);
    const [territories, setTerritories] = useState([]);
    const [filterType, setFilterType] = useState('all');
    const [filterGang, setFilterGang] = useState('all');
    const [searchOwner, setSearchOwner] = useState('');
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const mapRef = useRef(null);

    // Initial Load
    useEffect(() => {
        loadMapData();
    }, []);

    async function loadMapData() {
        try {
            const [propsData, terrData] = await Promise.all([
                fetchApi('/override/map/properties'),
                fetchApi('/override/map/territories')
            ]);
            setProperties(propsData);
            setTerritories(terrData);
        } catch (error) {
            console.error('Failed to load map data:', error);
        }
    }

    // Filter Logic
    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            const matchType = filterType === 'all' || p.type.toLowerCase() === filterType.toLowerCase();
            const matchGang = filterGang === 'all' || (p.owner && p.owner.gang === filterGang);
            const matchOwner = !searchOwner || (p.owner && p.owner.name.toLowerCase().includes(searchOwner.toLowerCase()));
            return matchType && matchGang && matchOwner;
        });
    }, [properties, filterType, filterGang, searchOwner]);

    // Unique Gangs for Filter
    const gangs = useMemo(() => {
        const g = new Set();
        territories.forEach(t => g.add(t.name));
        return Array.from(g);
    }, [territories]);

    // Map Interaction Handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleWheel = (e) => {
        const delta = -e.deltaY * 0.001;
        setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
    };

    // Render Helpers
    const getStatusColor = (status) => {
        switch (status) {
            case 'owned': return '#3b82f6'; // Blue
            case 'for_sale': return '#10b981'; // Green
            case 'government': return '#D4AF37'; // Gold
            default: return '#6b7280';
        }
    };

    return (
        <div className="h-full flex flex-col bg-surface-primary animate-fade-in overflow-hidden">
            {/* Header / Toolbar */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface-secondary z-10 shadow-lg">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-6 rounded-full bg-gradient-to-b from-blue-400 to-blue-600"></span>
                        Live Map
                    </h1>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
                        <select 
                            value={filterType} 
                            onChange={e => setFilterType(e.target.value)}
                            className="bg-transparent text-white text-sm border-none focus:ring-0 cursor-pointer hover:bg-white/5 rounded px-2 py-1"
                        >
                            <option value="all">All Types</option>
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                            <option value="government">Government</option>
                        </select>
                        <div className="w-px h-4 bg-white/10"></div>
                        <select 
                            value={filterGang} 
                            onChange={e => setFilterGang(e.target.value)}
                            className="bg-transparent text-white text-sm border-none focus:ring-0 cursor-pointer hover:bg-white/5 rounded px-2 py-1"
                        >
                            <option value="all">All Factions</option>
                            {gangs.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search owner..." 
                            value={searchOwner}
                            onChange={e => setSearchOwner(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none w-48 transition-all focus:w-64"
                        />
                        <svg className="w-4 h-4 text-white/30 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-white/50 bg-black/20 px-3 py-1.5 rounded-lg">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Owned</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> For Sale</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span> Gov</span>
                    </div>
                    <button 
                        onClick={() => setZoom(1)}
                        className="p-2 hover:bg-white/10 rounded-lg text-white/70 transition-colors"
                        title="Reset View"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative overflow-hidden bg-[#0f111a]" ref={mapRef}>
                <div 
                    className="absolute inset-0 cursor-move transition-transform duration-75 ease-out origin-center"
                    style={{ 
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    {/* SVG Map Layer */}
                    <svg width="2000" height="2000" viewBox="0 0 2000 2000" className="opacity-90">
                        {/* Grid Background */}
                        <defs>
                            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
                            </pattern>
                        </defs>
                        <rect width="2000" height="2000" fill="url(#grid)" />

                        {/* City Zones (Territories) */}
                        {territories.map((zone, idx) => (
                            <g key={idx} className="transition-opacity hover:opacity-80">
                                <path 
                                    d={zone.path} 
                                    fill={zone.color} 
                                    fillOpacity="0.15" 
                                    stroke={zone.color} 
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                                <text 
                                    x={zone.labelX} 
                                    y={zone.labelY} 
                                    fill={zone.color} 
                                    textAnchor="middle" 
                                    fontSize="24" 
                                    fontWeight="bold"
                                    className="select-none pointer-events-none drop-shadow-lg"
                                >
                                    {zone.name}
                                </text>
                                <text 
                                    x={zone.labelX} 
                                    y={zone.labelY + 25} 
                                    fill={zone.color} 
                                    textAnchor="middle" 
                                    fontSize="14" 
                                    className="select-none pointer-events-none opacity-70"
                                >
                                    {zone.members} Members
                                </text>
                            </g>
                        ))}

                        {/* Properties */}
                        {filteredProperties.map((prop) => (
                            <g 
                                key={prop.id} 
                                transform={`translate(${prop.x}, ${prop.y})`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProperty(prop);
                                }}
                                className="cursor-pointer group"
                            >
                                {/* Ping animation for selected */}
                                {selectedProperty?.id === prop.id && (
                                    <circle r="20" fill={getStatusColor(prop.status)} fillOpacity="0.2">
                                        <animate attributeName="r" from="10" to="30" dur="1.5s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                                    </circle>
                                )}
                                
                                {/* Pin Marker */}
                                <path 
                                    d="M0 -24 C-8 -24 -12 -16 -12 -8 C-12 4 0 24 0 24 C0 24 12 4 12 -8 C12 -16 8 -24 0 -24 Z" 
                                    fill={getStatusColor(prop.status)}
                                    stroke="#fff"
                                    strokeWidth="2"
                                    className={`transition-transform duration-300 ${selectedProperty?.id === prop.id ? 'scale-125' : 'scale-100'} group-hover:scale-110 drop-shadow-md`}
                                />
                                <circle cy="-8" r="4" fill="rgba(255,255,255,0.9)" />
                            </g>
                        ))}
                    </svg>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-white font-medium">Loading Map Data...</p>
                        </div>
                    </div>
                )}

                {/* Property Detail Panel (Floating) */}
                {selectedProperty && (
                    <div className="absolute right-6 top-6 w-80 bg-surface-secondary/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 animate-slide-in-right z-20">
                        <button 
                            onClick={() => setSelectedProperty(null)}
                            className="absolute right-4 top-4 text-white/30 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                selectedProperty.status === 'owned' ? 'bg-blue-500/20 text-blue-400' :
                                selectedProperty.status === 'for_sale' ? 'bg-emerald-500/20 text-emerald-400' :
                                'bg-amber-500/20 text-amber-400'
                            }`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white leading-tight">{selectedProperty.address}</h3>
                                <p className="text-sm text-white/50 capitalize">{selectedProperty.type}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Owner</p>
                                {selectedProperty.owner ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold text-white">
                                                {selectedProperty.owner.name.charAt(0)}
                                            </div>
                                            <span className="text-white font-medium">{selectedProperty.owner.name}</span>
                                        </div>
                                        <span className="text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/60">
                                            ID: {selectedProperty.owner.id}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-emerald-400 font-medium">For Sale</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Value</p>
                                    <p className="text-lg font-mono text-white font-medium">
                                        ${selectedProperty.value.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Purchased</p>
                                    <p className="text-sm text-white font-medium mt-1">
                                        {selectedProperty.purchaseDate || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            {selectedProperty.owner && (
                                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    View Owner Profile
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
