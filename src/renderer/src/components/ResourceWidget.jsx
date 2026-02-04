import React, { useState, useEffect } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function ResourceWidget() {
    const [metrics, setMetrics] = useState([]);
    const [current, setCurrent] = useState({ cpu: 0, mem: 0, disk: 0 });

    useEffect(() => {
        const update = async () => {
            try {
                const apiBase = await window.electron.api.getBase();
                const token = await window.electron.api.getToken();
                
                const res = await fetch(`${apiBase}/override/system/info`, {
                    headers: { 'X-Override-Token': token }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    
                    // CPU parsing (Simplified: use load average)
                    const load = parseFloat(data.load?.split(' ')[0]) || 0;
                    const cpu = Math.min(Math.round(load * 25), 100);
                    
                    // Memory parsing
                    let mem = 0;
                    if (data.memory) {
                        const lines = data.memory.split('\n');
                        const memLine = lines.find(l => l.startsWith('Mem:'));
                        if (memLine) {
                            const p = memLine.split(/\s+/).filter(Boolean);
                            mem = Math.round((parseFloat(p[2]) / parseFloat(p[1])) * 100) || 0;
                        }
                    }

                    // Disk (Mock or use system if available)
                    const disk = 42; 

                    const point = { 
                        time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
                        cpu, mem, disk 
                    };

                    setCurrent({ cpu, mem, disk });
                    setMetrics(prev => [...prev.slice(-19), point]);
                }
            } catch (e) {}
        };

        update();
        const interval = setInterval(update, 3000);
        return () => clearInterval(interval);
    }, []);

    const MetricTile = ({ label, value, dataKey, color }) => (
        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] uppercase font-bold text-gray-500">{label}</span>
                <span className="text-sm font-mono font-bold text-white">{value}%</span>
            </div>
            <div className="h-12 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics}>
                        <Area 
                            type="monotone" 
                            dataKey={dataKey} 
                            stroke={color} 
                            fill={color} 
                            fillOpacity={0.1} 
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="card h-full">
            <h2 className="heading-sm text-white flex items-center gap-2 mb-4">
                <span className="w-1.5 h-4 rounded-full bg-blue-500" />
                Live Resources
            </h2>
            <div className="grid grid-cols-1 gap-3">
                <MetricTile label="CPU Load" value={current.cpu} dataKey="cpu" color="#fbbf24" />
                <MetricTile label="Memory Usage" value={current.mem} dataKey="mem" color="#3b82f6" />
                <MetricTile label="Disk usage" value={current.disk} dataKey="disk" color="#10b981" />
            </div>
        </div>
    );
}
