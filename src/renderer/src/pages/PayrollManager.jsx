import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function PayrollManager() {
    const { fetchApi, post, loading, error } = useApi();
    const [employees, setEmployees] = useState([]);
    const [recentPayslips, setRecentPayslips] = useState([]);
    const [totalPayroll, setTotalPayroll] = useState(0);
    const [preview, setPreview] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [newSalary, setNewSalary] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const data = await fetchApi('/override/economy/payroll/positions');
            if (data) {
                setEmployees(data.employees || []);
                setRecentPayslips(data.recentPayslips || []);
                setTotalPayroll(data.totalPayroll || 0);
            }
        } catch (err) {
            console.error('Failed to load payroll:', err);
        }
    }

    async function runPayrollPreview() {
        setActionLoading(true);
        setResult(null);
        try {
            const data = await post('/override/economy/payroll/run', { preview: true });
            setPreview(data);
        } catch (err) {
            setResult({ error: err.message });
        } finally {
            setActionLoading(false);
        }
    }

    async function runPayroll() {
        if (!confirm('Are you sure you want to run payroll? This will transfer funds from treasury to all employees.')) {
            return;
        }
        
        setActionLoading(true);
        setResult(null);
        try {
            const data = await post('/override/economy/payroll/run', { preview: false });
            setResult(data);
            setPreview(null);
            await loadData();
        } catch (err) {
            setResult({ error: err.message });
        } finally {
            setActionLoading(false);
        }
    }

    async function adjustSalary() {
        if (!editingEmployee || !newSalary) return;
        
        setActionLoading(true);
        try {
            await post('/override/economy/payroll/adjust', {
                userId: editingEmployee.user_id,
                newSalary: parseFloat(newSalary),
                reason: adjustReason
            });
            setEditingEmployee(null);
            setNewSalary('');
            setAdjustReason('');
            await loadData();
        } catch (err) {
            alert('Failed to adjust salary: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    }

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0 
        }).format(amount || 0);
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-xl text-white flex items-center gap-3">
                        <span className="text-2xl">💼</span>
                        Payroll Manager
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Manage government payroll and employee salaries
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={runPayrollPreview}
                        disabled={actionLoading}
                        className="btn btn-secondary"
                    >
                        Preview Payroll
                    </button>
                    <button 
                        onClick={runPayroll}
                        disabled={actionLoading}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        {actionLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        Run Payroll
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {result && (
                <div className={`p-4 rounded-xl ${result.error ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                    {result.error ? (
                        <p className="text-red-400">❌ {result.error}</p>
                    ) : (
                        <p className="text-emerald-400">✅ {result.message}</p>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card-stat" style={{ background: 'rgba(212, 175, 55, 0.08)' }}>
                    <p className="text-sm text-amber-400/70 mb-1">Total Employees</p>
                    <p className="text-3xl font-mono font-bold text-amber-400">{employees.length}</p>
                </div>
                <div className="card-stat" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
                    <p className="text-sm text-blue-400/70 mb-1">Monthly Payroll</p>
                    <p className="text-3xl font-mono font-bold text-blue-400">{formatMoney(totalPayroll)}</p>
                </div>
                <div className="card-stat" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                    <p className="text-sm text-emerald-400/70 mb-1">Avg. Salary</p>
                    <p className="text-3xl font-mono font-bold text-emerald-400">
                        {formatMoney(employees.length > 0 ? totalPayroll / employees.length : 0)}
                    </p>
                </div>
            </div>

            {/* Payroll Preview */}
            {preview && (
                <div className="card border-2 border-amber-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="heading-md text-amber-400">Payroll Preview</h2>
                        <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-white">
                            ✕
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-white/[0.02]">
                            <p className="text-xs text-gray-500">Total Gross</p>
                            <p className="text-lg font-mono font-bold text-white">{formatMoney(preview.summary?.totalGross)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.02]">
                            <p className="text-xs text-gray-500">Total Tax</p>
                            <p className="text-lg font-mono font-bold text-red-400">-{formatMoney(preview.summary?.totalTax)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.02]">
                            <p className="text-xs text-gray-500">Total Net</p>
                            <p className="text-lg font-mono font-bold text-emerald-400">{formatMoney(preview.summary?.totalNet)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.02]">
                            <p className="text-xs text-gray-500">Treasury Status</p>
                            <p className={`text-lg font-bold ${preview.summary?.canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                                {preview.summary?.canAfford ? '✓ Sufficient' : '✗ Insufficient'}
                            </p>
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto scrollbar-dark">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.06]">
                                    <th className="text-left py-2 px-3 text-xs text-gray-500">Employee</th>
                                    <th className="text-left py-2 px-3 text-xs text-gray-500">Position</th>
                                    <th className="text-right py-2 px-3 text-xs text-gray-500">Gross</th>
                                    <th className="text-right py-2 px-3 text-xs text-gray-500">Tax</th>
                                    <th className="text-right py-2 px-3 text-xs text-gray-500">Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.payrollItems?.map((item, i) => (
                                    <tr key={i} className="border-b border-white/[0.04]">
                                        <td className="py-2 px-3 text-sm text-white">{item.username || item.userId}</td>
                                        <td className="py-2 px-3 text-sm text-gray-400">{item.position}</td>
                                        <td className="py-2 px-3 text-sm text-white font-mono text-right">{formatMoney(item.salary)}</td>
                                        <td className="py-2 px-3 text-sm text-red-400 font-mono text-right">-{formatMoney(item.taxAmount)}</td>
                                        <td className="py-2 px-3 text-sm text-emerald-400 font-mono text-right">{formatMoney(item.netPay)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                {/* Employee List */}
                <div className="card">
                    <h2 className="heading-md text-white mb-4">Payroll Employees</h2>
                    
                    <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-dark">
                        {employees.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No employees on payroll</p>
                        ) : (
                            employees.map((emp, i) => (
                                <div 
                                    key={i}
                                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-medium">{emp.username || 'Unknown'}</p>
                                            <p className="text-sm text-gray-400">{emp.position || 'N/A'}</p>
                                            <p className="text-xs text-gray-500 font-mono mt-1">{emp.user_id}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-mono font-bold text-emerald-400">{formatMoney(emp.salary)}</p>
                                            <button
                                                onClick={() => {
                                                    setEditingEmployee(emp);
                                                    setNewSalary(emp.salary?.toString() || '');
                                                }}
                                                className="text-xs text-amber-400 hover:text-amber-300 mt-1"
                                            >
                                                Edit Salary
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Edit Panel / Recent Payslips */}
                <div className="space-y-6">
                    {/* Edit Salary Modal */}
                    {editingEmployee && (
                        <div className="card border-2 border-amber-500/30">
                            <h2 className="heading-md text-amber-400 mb-4">Edit Salary</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-400 mb-1">Employee</p>
                                    <p className="text-white font-medium">{editingEmployee.username || editingEmployee.user_id}</p>
                                    <p className="text-sm text-gray-500">{editingEmployee.position}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400 mb-1">Current Salary</p>
                                    <p className="text-xl font-mono text-white">{formatMoney(editingEmployee.salary)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">New Salary</label>
                                    <input
                                        type="number"
                                        value={newSalary}
                                        onChange={(e) => setNewSalary(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white font-mono focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Reason</label>
                                    <input
                                        type="text"
                                        value={adjustReason}
                                        onChange={(e) => setAdjustReason(e.target.value)}
                                        placeholder="Reason for adjustment..."
                                        className="w-full px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={adjustSalary}
                                        disabled={actionLoading}
                                        className="flex-1 btn btn-primary"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        onClick={() => setEditingEmployee(null)}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Payslips */}
                    <div className="card">
                        <h2 className="heading-md text-white mb-4">Recent Payslips</h2>
                        
                        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-dark">
                            {recentPayslips.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No recent payslips</p>
                            ) : (
                                recentPayslips.map((slip, i) => (
                                    <div 
                                        key={i}
                                        className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white text-sm">{slip.employee_name || slip.user_id}</p>
                                                <p className="text-xs text-gray-500">{slip.position} • {slip.pay_period}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-emerald-400 font-mono">{formatMoney(slip.net_pay)}</p>
                                                <p className="text-xs text-gray-500">{formatDate(slip.issued_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
