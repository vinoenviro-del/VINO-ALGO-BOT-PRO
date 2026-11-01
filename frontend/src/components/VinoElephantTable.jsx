import React, { useState } from 'react';
import { Download, Filter, ArrowUpDown, Info, HelpCircle } from 'lucide-react';

export default function VinoElephantTable({ rows = [] }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortField, setSortField] = useState('time');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter rows
  const filteredRows = rows.filter((r) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'OPEN') return r.close_status === 'OPEN';
    if (filterStatus === 'CLOSED') return r.close_status !== 'OPEN';
    return true;
  });

  // Sort rows
  const sortedRows = [...filteredRows].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal - bVal) : (bVal - aVal);
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Export to CSV
  const exportCSV = () => {
    if (sortedRows.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = ['Ticker', 'Company Name', 'Spot', 'ATM', 'SF Level', 'Buy Type', 'Entry', 'LTP', 'SL', 'Target', 'P&L (Rs)', 'P&L (Pts)', 'Close Status', 'Time'];
    const csvContent = [
      headers.join(','),
      ...sortedRows.map((r) => [
        `"${r.ticker}"`,
        `"${r.company_name}"`,
        r.spot,
        r.atm,
        r.sf_level,
        `"${r.buy_type}"`,
        r.entry,
        r.ltp,
        r.sl,
        r.target,
        r.pnl,
        r.pnl_points || 0,
        `"${r.close_status}"`,
        `"${r.time}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vino_elephant_trades_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBuyTypeBadge = (buyType) => {
    const colors = {
      'SF CROSS': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'PREV HIGH BREAK': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      'BREAKOUT': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      'REJECTION': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'REVERSAL': 'bg-rose-500/10 text-rose-400 border-rose-500/30'
    };
    const cls = colors[buyType] || 'bg-slate-800 text-slate-300 border-slate-700';
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${cls}`}>
        {buyType}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    if (status === 'OPEN') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          OPEN
        </span>
      );
    }
    if (status === 'TARGET HIT') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          TARGET HIT 🎯
        </span>
      );
    }
    if (status === 'SL HIT' || status === 'TRAILING SL HIT') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          {status} 🛑
        </span>
      );
    }
    if (status === '3:15 CLOSE') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          3:15 CLOSE ⏱️
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
        {status}
      </span>
    );
  };

  return (
    <div className="glass-panel overflow-hidden">
      
      {/* Top Header & Actions Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/40">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>🐘 Vino Elephant Strategy Audit Ledger</span>
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {sortedRows.length} Trades
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1">
            <span className="flex items-center gap-1" title="Break Even Point: Spot + Option Premium">
              <HelpCircle className="w-3 h-3 text-amber-400" />
              <strong>BEP</strong> = Break Even Price
            </span>
            <span className="flex items-center gap-1" title="Safe Entry Level: ((BEP + R1) / 2)">
              <HelpCircle className="w-3 h-3 text-blue-400" />
              <strong>SF Level</strong> = Safe Breakout ((BEP+R1)/2)
            </span>
          </div>
        </div>

        {/* Filters and CSV Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterStatus === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('OPEN')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterStatus === 'OPEN' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Open
            </button>
            <button
              onClick={() => setFilterStatus('CLOSED')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterStatus === 'CLOSED' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Closed
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
            title="Download CSV table"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="bg-slate-900/80 text-slate-400 text-[11px] uppercase font-semibold border-b border-slate-800">
              <th onClick={() => handleSort('ticker')} className="py-3 px-4 cursor-pointer hover:text-white">
                <div className="flex items-center gap-1">Ticker <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-4">Company Name</th>
              <th onClick={() => handleSort('spot')} className="py-3 px-3 text-right cursor-pointer hover:text-white">
                <div className="flex items-center justify-end gap-1">Spot <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-3 text-right">ATM</th>
              <th className="py-3 px-3 text-right">SF Level</th>
              <th className="py-3 px-3 text-center">Buy Type</th>
              <th className="py-3 px-3 text-right">Entry</th>
              <th className="py-3 px-3 text-right">LTP</th>
              <th className="py-3 px-3 text-right">SL (10p)</th>
              <th className="py-3 px-3 text-right">Target</th>
              <th onClick={() => handleSort('pnl')} className="py-3 px-4 text-right cursor-pointer hover:text-white">
                <div className="flex items-center justify-end gap-1">P&L (₹) <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-center">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-10 text-center text-slate-500 font-sans text-xs">
                  No trades recorded yet. Start the Vino Algo Pro strategy to stream real-time trade signals!
                </td>
              </tr>
            ) : (
              sortedRows.map((r, i) => {
                const isOpen = r.close_status === 'OPEN';
                const isProf = r.pnl > 0;
                const isLoss = r.pnl < 0;

                // Row tint
                let rowBg = 'hover:bg-slate-800/30';
                if (isOpen) rowBg = 'bg-amber-500/5 hover:bg-amber-500/10';
                else if (isProf) rowBg = 'bg-emerald-500/5 hover:bg-emerald-500/10';
                else if (isLoss) rowBg = 'bg-rose-500/5 hover:bg-rose-500/10';

                return (
                  <tr key={r.id || i} className={`transition ${rowBg}`}>
                    {/* Ticker */}
                    <td className="py-3 px-4 font-bold text-white font-sans text-sm">
                      {r.ticker}
                    </td>

                    {/* Company Name */}
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      {r.company_name}
                    </td>

                    {/* Spot */}
                    <td className="py-3 px-3 text-right text-slate-200">
                      {Number(r.spot).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* ATM */}
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      {r.atm}
                    </td>

                    {/* SF Level */}
                    <td className="py-3 px-3 text-right text-blue-400 font-bold">
                      {Number(r.sf_level).toFixed(2)}
                    </td>

                    {/* Buy Type */}
                    <td className="py-3 px-3 text-center">
                      {getBuyTypeBadge(r.buy_type)}
                    </td>

                    {/* Entry */}
                    <td className="py-3 px-3 text-right text-white font-semibold">
                      ₹ {Number(r.entry).toFixed(2)}
                    </td>

                    {/* LTP */}
                    <td className="py-3 px-3 text-right font-bold text-white">
                      ₹ {Number(r.ltp).toFixed(2)}
                    </td>

                    {/* SL */}
                    <td className="py-3 px-3 text-right text-rose-400">
                      ₹ {Number(r.sl).toFixed(2)}
                    </td>

                    {/* Target */}
                    <td className="py-3 px-3 text-right text-emerald-400">
                      ₹ {Number(r.target).toFixed(2)}
                    </td>

                    {/* P&L */}
                    <td className={`py-3 px-4 text-right font-extrabold ${isProf ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'}`}>
                      {r.pnl >= 0 ? '+' : ''}₹ {Number(r.pnl).toFixed(2)}
                    </td>

                    {/* Close Status */}
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(r.close_status)}
                    </td>

                    {/* Time */}
                    <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                      {r.time}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
