import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CitizenReport } from './components/CitizenReport';
import { ComplaintDetail } from './components/ComplaintDetail';
import { AuthorityDashboard } from './components/AuthorityDashboard';
import { Search, ChevronRight, MapPin } from 'lucide-react';
import type { Complaint } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<'report' | 'authority' | 'track'>('report');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingList, setLoadingList] = useState<boolean>(false);

  // Fetch recent complaints for Track tab
  useEffect(() => {
    if (currentTab === 'track') {
      fetchComplaints();
    }
  }, [currentTab]);

  const fetchComplaints = async () => {
    try {
      setLoadingList(true);
      const res = await fetch('/api/complaints');
      if (res.ok) {
        const data = await res.json();
        setAllComplaints(data);
      }
    } catch (e) {
      console.error('Failed to load complaints:', e);
    } finally {
      setLoadingList(false);
    }
  };

  const handleReportSuccess = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setCurrentTab('track');
  };

  const handleOpenComplaint = (id: string) => {
    setSelectedComplaintId(id);
  };

  const filteredComplaints = allComplaints.filter(
    (c) =>
      c.complaint_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSelectedComplaintId(null);
        }}
      />

      <main className="flex-1 pb-16">
        {selectedComplaintId ? (
          <ComplaintDetail
            complaintId={selectedComplaintId}
            onBack={() => setSelectedComplaintId(null)}
          />
        ) : currentTab === 'report' ? (
          <CitizenReport onSuccess={handleReportSuccess} />
        ) : currentTab === 'authority' ? (
          <AuthorityDashboard onOpenComplaint={handleOpenComplaint} />
        ) : (
          /* Track & Community Verification Tab */
          <div className="max-w-3xl mx-auto my-6 px-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Track & Verify Complaints</h2>
                <p className="text-xs text-slate-500">Search your Complaint ID to view live progress or provide citizen re-verification.</p>
              </div>
              <button
                onClick={fetchComplaints}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg self-start sm:self-auto"
              >
                Refresh
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Complaint ID (e.g. CP-001) or Category..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
              />
            </div>

            {/* Complaints List */}
            <div className="space-y-3">
              {loadingList ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading complaints...</div>
              ) : filteredComplaints.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                  No complaints found.
                </div>
              ) : (
                filteredComplaints.map((c) => (
                  <div
                    key={c.complaint_id}
                    onClick={() => handleOpenComplaint(c.complaint_id)}
                    className="p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 text-sm">
                          {c.complaint_id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 animate-pulse' :
                          c.status === 'Reopened' ? 'bg-rose-100 text-rose-800' :
                          c.status === 'Closed' ? 'bg-slate-200 text-slate-700' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status}
                        </span>
                        {c.status === 'Resolved' && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Action Needed: Citizen Verification
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-xs text-slate-800 truncate">{c.category}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{c.address || `${c.latitude.toFixed(3)}, ${c.longitude.toFixed(3)}`}</span>
                        <span className="text-slate-300">•</span>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center text-slate-400">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p className="font-medium">CIVIC PULSE &copy; 2026 — Report. Track. Resolve.</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Powered by Gemini Vision AI & Municipal Geo-Dispatch</p>
      </footer>
    </div>
  );
}

export default App;
