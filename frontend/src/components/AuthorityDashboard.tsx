import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  MapPin, 
  Filter, 
  CheckCheck, 
  XCircle, 
  UserCheck, 
  PlayCircle 
} from 'lucide-react';
import type { Complaint, ComplaintStatus } from '../types';
import { CivicMap } from './CivicMap';

interface AuthorityDashboardProps {
  onOpenComplaint: (id: string) => void;
}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ onOpenComplaint }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [kpi, setKpi] = useState<{
    total: number;
    pending: number;
    in_progress: number;
    resolved: number;
    reopened: number;
  }>({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
    reopened: 0,
  });

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [activeComplaintForAction, setActiveComplaintForAction] = useState<Complaint | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      const [kpiRes, complaintsRes] = await Promise.all([
        fetch('/api/kpi'),
        fetch('/api/complaints'),
      ]);

      if (kpiRes.ok) {
        const kpiData = await kpiRes.json();
        setKpi(kpiData);
      }

      if (complaintsRes.ok) {
        const complaintsData = await complaintsRes.json();
        setComplaints(complaintsData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpdateStatus = async (complaintId: string, newStatus: ComplaintStatus, notes: string = '') => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: notes || `Authority updated status to ${newStatus}`,
          updated_by: 'Municipal Authority Officer',
        }),
      });

      if (!res.ok) throw new Error('Status update failed');

      // Refresh data
      await fetchDashboardData();
      setActiveComplaintForAction(null);
    } catch (e: any) {
      alert(`Error updating status: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (selectedStatusFilter === 'ALL') return true;
    if (selectedStatusFilter === 'PENDING') return ['Submitted', 'Verified'].includes(c.status);
    if (selectedStatusFilter === 'IN_PROGRESS') return ['Assigned', 'In Progress'].includes(c.status);
    if (selectedStatusFilter === 'RESOLVED') return ['Resolved', 'Community Verified', 'Closed'].includes(c.status);
    if (selectedStatusFilter === 'REOPENED') return c.status === 'Reopened';
    return c.status === selectedStatusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto my-6 px-4 space-y-6">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Authority Operations Dashboard</h2>
          <p className="text-xs text-slate-500">Monitor live civic reports, review AI vision match, and dispatch municipal departments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Refresh Feed
          </button>
        </div>
      </div>

      {/* 7. KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total */}
        <div 
          onClick={() => setSelectedStatusFilter('ALL')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatusFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold opacity-80">
            <span>Total</span>
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2">{kpi.total}</div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setSelectedStatusFilter('PENDING')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatusFilter === 'PENDING' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-800 border-slate-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold opacity-80">
            <span>Pending</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2">{kpi.pending}</div>
        </div>

        {/* In Progress */}
        <div 
          onClick={() => setSelectedStatusFilter('IN_PROGRESS')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatusFilter === 'IN_PROGRESS' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-slate-800 border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold opacity-80">
            <span>In Progress</span>
            <PlayCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2">{kpi.in_progress}</div>
        </div>

        {/* Resolved */}
        <div 
          onClick={() => setSelectedStatusFilter('RESOLVED')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatusFilter === 'RESOLVED' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold opacity-80">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2">{kpi.resolved}</div>
        </div>

        {/* Reopened */}
        <div 
          onClick={() => setSelectedStatusFilter('REOPENED')}
          className={`p-4 rounded-xl border cursor-pointer transition-all col-span-2 sm:col-span-1 ${
            selectedStatusFilter === 'REOPENED' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-slate-800 border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold opacity-80">
            <span>Reopened</span>
            <RotateCcw className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2">{kpi.reopened}</div>
        </div>
      </div>

      {/* 9. Interactive Map View */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Geographic Complaint Heatmap</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Showing {filteredComplaints.length} active geocoded markers
          </span>
        </div>

        <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden">
          <CivicMap 
            complaints={filteredComplaints} 
            onSelectComplaint={(c) => onOpenComplaint(c.complaint_id)}
          />
        </div>
      </div>

      {/* 7. COMPLAINTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Complaints Management ({filteredComplaints.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Reopened'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedStatusFilter === st
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Complaint ID</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Location</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">AI Verification</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5 text-right">Authority Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No complaints found matching filter.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr key={c.complaint_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-bold font-mono text-blue-700">
                      {c.complaint_id}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-900 max-w-[150px] truncate">
                      {c.category}
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 max-w-[160px] truncate">
                      {c.address || `${c.latitude.toFixed(3)}, ${c.longitude.toFixed(3)}`}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        c.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'Verified' ? 'bg-indigo-100 text-indigo-800' :
                        c.status === 'Assigned' ? 'bg-purple-100 text-purple-800' :
                        c.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                        c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'Community Verified' ? 'bg-teal-100 text-teal-800' :
                        c.status === 'Closed' ? 'bg-slate-200 text-slate-700' :
                        c.status === 'Reopened' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      {c.ai_analysis ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            c.ai_analysis.category_match ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {c.ai_analysis.category_match ? 'MATCH' : 'MISMATCH'} ({c.ai_analysis.confidence}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-400 text-[11px]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => onOpenComplaint(c.complaint_id)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition-colors"
                      >
                        Open
                      </button>

                      <button
                        onClick={() => setActiveComplaintForAction(c)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-[11px] transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUTHORITY ACTION MODAL */}
      {activeComplaintForAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4 animate-scale-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {activeComplaintForAction.complaint_id}
                </span>
                <h3 className="text-base font-bold text-slate-900">{activeComplaintForAction.category}</h3>
                <p className="text-xs text-slate-500">Current Status: <strong>{activeComplaintForAction.status}</strong></p>
              </div>
              <button
                onClick={() => setActiveComplaintForAction(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Authority Actions */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Authority Actions:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleUpdateStatus(activeComplaintForAction.complaint_id, 'Verified', 'Officer verified ground report')}
                  disabled={actionLoading}
                  className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex flex-col items-center gap-1 border border-indigo-200 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Verify</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus(activeComplaintForAction.complaint_id, 'Assigned', 'Dispatched to field engineering crew')}
                  disabled={actionLoading}
                  className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs flex flex-col items-center gap-1 border border-purple-200 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Assign Crew</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus(activeComplaintForAction.complaint_id, 'In Progress', 'Repair work started on site')}
                  disabled={actionLoading}
                  className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs flex flex-col items-center gap-1 border border-amber-200 transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>In Progress</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus(activeComplaintForAction.complaint_id, 'Resolved', 'Field crew completed repair and marked resolved')}
                  disabled={actionLoading}
                  className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex flex-col items-center gap-1 border border-emerald-200 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Resolved</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus(activeComplaintForAction.complaint_id, 'Rejected', 'Duplicate or invalid report')}
                  disabled={actionLoading}
                  className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex flex-col items-center gap-1 border border-rose-200 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus(activeComplaintForAction.complaint_id, 'Closed', 'Authority directly closed complaint')}
                  disabled={actionLoading}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex flex-col items-center gap-1 border border-slate-300 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveComplaintForAction(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
