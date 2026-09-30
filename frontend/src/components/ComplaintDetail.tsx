import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sparkles, 
  AlertCircle, 
  ArrowLeft, 
  ThumbsUp, 
  ThumbsDown, 
  ShieldAlert, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';
import type { Complaint, ComplaintStatus } from '../types';

interface ComplaintDetailProps {
  complaintId: string;
  onBack: () => void;
}

const ORDERED_STEPS: ComplaintStatus[] = [
  'Submitted',
  'Verified',
  'Assigned',
  'In Progress',
  'Resolved',
  'Community Verified',
  'Closed'
];

export const ComplaintDetail: React.FC<ComplaintDetailProps> = ({ complaintId, onBack }) => {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Community Re-verification state
  const [comment, setComment] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/complaints/${complaintId}`);
      if (!res.ok) throw new Error('Complaint not found');
      const data = await res.json();
      setComplaint(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [complaintId]);

  const handleCommunityVerification = async (isFixed: boolean) => {
    try {
      setIsVerifying(true);
      setVerifyMessage(null);
      const res = await fetch(`/api/complaints/${complaintId}/community-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_fixed: isFixed,
          comment: comment.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to submit verification');

      setVerifyMessage(
        isFixed 
          ? 'Thank you! Issue marked as Community Verified & Closed.' 
          : 'Issue has been marked as Reopened for municipal attention.'
      );
      setComment('');
      // Reload updated complaint
      await fetchComplaint();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading complaint {complaintId}...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 text-center bg-white rounded-2xl border border-rose-200 shadow-sm">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-rose-600">{error || 'Complaint not found'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
        >
          Back to list
        </button>
      </div>
    );
  }

  const currentStatusIndex = ORDERED_STEPS.indexOf(complaint.status);
  const isReopened = complaint.status === 'Reopened';
  const isRejected = complaint.status === 'Rejected';

  return (
    <div className="max-w-2xl mx-auto my-6 px-4 space-y-6 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          onClick={fetchComplaint}
          className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                {complaint.complaint_id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                {complaint.status}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-800 mt-1">{complaint.category}</h3>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date(complaint.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="p-5 bg-slate-50/70 border-b border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Complaint Status Timeline
          </h4>

          {isReopened ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800 font-semibold mb-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <span>Complaint was REOPENED following community inspection. Pending civic crew dispatch.</span>
            </div>
          ) : isRejected ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800 font-semibold mb-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>Complaint was Rejected by authority review.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 overflow-x-auto pb-2">
                {ORDERED_STEPS.map((step, idx) => {
                  const isDone = currentStatusIndex >= idx;
                  const isCurrent = complaint.status === step;

                  return (
                    <div key={step} className="flex sm:flex-col items-center gap-2 min-w-[70px]">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-500'
                        } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
                      >
                        {isDone ? '✓' : '○'}
                      </div>
                      <span
                        className={`text-[11px] text-center whitespace-nowrap ${
                          isCurrent
                            ? 'font-bold text-blue-700'
                            : isDone
                            ? 'font-medium text-slate-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 8. COMMUNITY RE-VERIFICATION ACTION (when status is Resolved) */}
        {complaint.status === 'Resolved' && (
          <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
            <div className="max-w-xl mx-auto text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Was this issue fixed?</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  The municipal authority marked this complaint as resolved. As a citizen, please confirm on-ground status.
                </p>
              </div>

              <div className="pt-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional verification note or comment..."
                  className="w-full text-xs p-2.5 bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-3"
                />

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => handleCommunityVerification(true)}
                    disabled={isVerifying}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>YES, ISSUE FIXED</span>
                  </button>

                  <button
                    onClick={() => handleCommunityVerification(false)}
                    disabled={isVerifying}
                    className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>NO, ISSUE NOT FIXED</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {verifyMessage && (
          <div className="p-3 bg-blue-50 border-b border-blue-200 text-xs font-semibold text-blue-800 text-center">
            {verifyMessage}
          </div>
        )}

        {/* Complaint Details */}
        <div className="p-5 space-y-4 text-xs">
          {/* Description */}
          <div>
            <span className="font-bold text-slate-700">Description:</span>
            <p className="text-slate-600 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
              {complaint.description || 'No additional details provided.'}
            </p>
          </div>

          {/* Photo */}
          {complaint.photo_data && (
            <div>
              <span className="font-bold text-slate-700">Uploaded Evidence:</span>
              <div className="mt-1.5 w-48 h-48 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <img src={complaint.photo_data} alt="Complaint Evidence" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          {/* AI Vision Card */}
          {complaint.ai_analysis && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>AI Image Verification Report</span>
                </div>
                {complaint.ai_analysis.is_demo && (
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                    DEMO MODE
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500">Detected Issue: </span>
                <span className="font-semibold text-slate-800">{complaint.ai_analysis.detected_issue}</span>
                <span className="text-slate-400 ml-2">({complaint.ai_analysis.confidence}% confidence)</span>
              </div>
              <p className="text-slate-600 italic">"{complaint.ai_analysis.explanation}"</p>
            </div>
          )}

          {/* Location */}
          <div>
            <span className="font-bold text-slate-700">Location:</span>
            <div className="mt-1 flex items-center gap-1.5 text-slate-600 font-medium">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>{complaint.address || `Coordinates: ${complaint.latitude}, ${complaint.longitude}`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
