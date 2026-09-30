import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Loader2, 
  Send, 
  RefreshCw
} from 'lucide-react';
import type { AIAnalysis, DuplicateComplaint } from '../types';

interface CitizenReportProps {
  onSuccess: (complaintId: string) => void;
}

const DEFAULT_CATEGORIES = [
  'Potholes / Road Damage',
  'Garbage Overflow',
  'Broken Streetlights',
  'Water Leakage',
  'Water Supply Problems',
  'Sewage Problems',
  'Drainage Problems',
  'Illegal Waste Dumping',
  'Mosquito Breeding',
  'Fallen Trees',
  'Flooded Roads',
  'Waterlogging',
  'Damaged Footpaths',
  'Damaged Traffic Signals',
  'Damaged Road Signs',
  'Damaged Bus Stops',
  'Public Toilet Issues',
  'Public Park Issues',
  'Pollution',
  'Other'
];

export const CitizenReport: React.FC<CitizenReportProps> = ({ onSuccess }) => {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  
  // Custom Category Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');

  // Form states
  const [description, setDescription] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');

  // AI Verification states
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  // Location states
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [address, setAddress] = useState<string>('MG Road / Central Junction');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Duplicate states
  const [duplicatesFound, setDuplicatesFound] = useState<DuplicateComplaint[]>([]);
  const [dismissDuplicate, setDismissDuplicate] = useState<boolean>(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Auto get location on load
  useEffect(() => {
    fetchBrowserLocation();
  }, []);

  const fetchBrowserLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setAddress(`Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)} (GPS)`);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error / permission denied:', err.message);
        // Fallback to sample coordinates
        setLatitude(12.9716);
        setLongitude(77.5946);
        setAddress('Central Hub Area');
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Check duplicate when category or location changes
  useEffect(() => {
    if (selectedCategory && latitude && longitude) {
      checkDuplicates();
    }
  }, [selectedCategory, latitude, longitude]);

  const checkDuplicates = async () => {
    try {
      const res = await fetch('/api/complaints/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          latitude,
          longitude,
          radius_meters: 500.0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDuplicatesFound(data.duplicates || []);
      }
    } catch (e) {
      console.error('Duplicate check error:', e);
    }
  };

  // Handle Image Upload & Trigger Gemini Vision
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();

    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoPreview(dataUrl);
      setPhotoBase64(dataUrl);

      // Trigger Gemini AI Image Verification
      await runAiImageVerification(dataUrl, file.type || 'image/jpeg', selectedCategory);
    };

    reader.readAsDataURL(file);
  };

  const runAiImageVerification = async (base64Img: string, mime: string, category: string) => {
    setIsAnalyzingImage(true);
    try {
      const res = await fetch('/api/ai/verify-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64Img,
          mime_type: mime,
          selected_category: category,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI service returned ${res.status}`);
      }

      const result = await res.json();
      setAiAnalysis(result);
    } catch (err: any) {
      console.error('AI verification failed:', err);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Handle Add Category Modal
  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    if (!categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }
    setSelectedCategory(trimmed);
    setNewCategoryInput('');
    setShowAddModal(false);
  };

  // Submit Complaint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          description: description || `Reported ${selectedCategory}`,
          photo_data: photoBase64,
          latitude,
          longitude,
          address,
          ai_analysis: aiAnalysis,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create complaint');
      }

      const data = await res.json();
      setSubmittedId(data.complaint_id);
    } catch (err: any) {
      alert(`Error submitting complaint: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (submittedId) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-2xl shadow-xl border border-slate-100 text-center animate-fade-in">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-1">Complaint Submitted Successfully</h2>
        <p className="text-sm text-slate-500 mb-6">Your civic issue has been logged into the municipal workflow.</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Complaint ID</span>
          <div className="text-3xl font-black text-blue-600 mt-1 tracking-tight">{submittedId}</div>
          <div className="text-xs text-slate-500 mt-1">Status: <span className="font-semibold text-blue-700">Submitted</span></div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onSuccess(submittedId)}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>Track this Complaint</span>
          </button>

          <button
            onClick={() => {
              setSubmittedId(null);
              setDescription('');
              setPhotoBase64('');
              setPhotoPreview('');
              setAiAnalysis(null);
              setDismissDuplicate(false);
            }}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all text-sm"
          >
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-6 px-4">
      {/* Header */}
      <div className="mb-6 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Citizen Issue Reporting</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Report a Civic Problem</h2>
        <p className="text-sm text-slate-500">Capture photos and geo-location for instant AI verification and authority dispatch.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-6">
        
        {/* 1. Civic Issue Category */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            1. Civic Issue Category <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  if (photoBase64) {
                    runAiImageVerification(photoBase64, mimeType, cat);
                  }
                }}
                className={`text-left text-xs px-3 py-2.5 rounded-lg border transition-all flex items-center justify-between ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                }`}
              >
                <span className="truncate">{cat}</span>
                {selectedCategory === cat && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
              </button>
            ))}
          </div>

          {/* + Add More Civic Issues Button */}
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add More Civic Issues</span>
            </button>
          </div>
        </div>

        {/* 2. Upload Photo & AI Verification */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            2. Upload Photo (AI Verification)
          </label>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="w-full sm:w-auto flex-1 cursor-pointer">
                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50/50 hover:bg-blue-50/30 transition-all">
                  <Camera className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-medium text-slate-600">
                    {photoPreview ? 'Change Photo' : 'Click to Upload or Take Photo'}
                  </span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WebP supported</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {photoPreview && (
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* AI Image Verification Results Banner */}
            {isAnalyzingImage && (
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-3 text-xs text-indigo-700 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                <div>
                  <span className="font-semibold">Analyzing image with Gemini Vision...</span>
                  <p className="text-[11px] text-indigo-600/80">Checking visual category match & confidence</p>
                </div>
              </div>
            )}

            {aiAnalysis && !isAnalyzingImage && (
              <div className={`p-4 rounded-xl border transition-all ${
                aiAnalysis.category_match 
                  ? 'bg-emerald-50/80 border-emerald-200 text-slate-800'
                  : 'bg-amber-50/90 border-amber-300 text-slate-900'
              }`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      AI Vision Verification
                    </span>
                    {aiAnalysis.is_demo && (
                      <span className="bg-amber-200/80 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        DEMO MODE
                      </span>
                    )}
                  </div>
                  
                  {/* Category Match Badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">Match:</span>
                    {aiAnalysis.category_match ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> YES ({aiAnalysis.confidence}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> NO ({aiAnalysis.confidence}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="font-semibold text-slate-600">Detected Issue: </span>
                    <span className="font-bold text-slate-900">{aiAnalysis.detected_issue}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Explanation: </span>
                    <span className="text-slate-700">{aiAnalysis.explanation}</span>
                  </div>
                </div>

                {/* Warning if Category Mismatch */}
                {!aiAnalysis.category_match && (
                  <div className="mt-3 p-2.5 bg-amber-100/90 border border-amber-300 rounded-lg flex items-center gap-2 text-xs font-medium text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Selected category does not match the uploaded image. Authority verification required.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">
            3. Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue, landmarks, hazard level, or relevant details..."
            className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* 4. Location */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              4. Location (Browser Geolocation) <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={fetchBrowserLocation}
              disabled={isLocating}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
              <span>Update GPS</span>
            </button>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address or landmark"
                className="w-full bg-transparent border-none text-xs font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <div className="flex gap-4 text-[11px] text-slate-500 font-mono">
              <span>Lat: {latitude.toFixed(5)}</span>
              <span>Lon: {longitude.toFixed(5)}</span>
            </div>
          </div>
        </div>

        {/* 5. Duplicate Detection Warning Banner */}
        {duplicatesFound.length > 0 && !dismissDuplicate && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <span className="font-bold text-amber-900">Possible duplicate complaint found.</span>
                <p className="text-amber-800 mt-0.5">
                  Another active complaint for <strong>"{selectedCategory}"</strong> was recently reported nearby:
                </p>
                <div className="mt-2 space-y-1">
                  {duplicatesFound.slice(0, 2).map((d) => (
                    <div key={d.complaint_id} className="p-2 bg-white/80 rounded border border-amber-200 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-mono font-bold text-slate-900">{d.complaint_id}</span>
                        <span className="text-slate-500 ml-2">({d.distance_meters}m away • {d.status})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDismissDuplicate(true)}
                className="text-[11px] font-semibold text-amber-900 hover:text-black underline"
              >
                Continue Submitting Anyway
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !selectedCategory}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting Complaint...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Civic Complaint</span>
            </>
          )}
        </button>
      </form>

      {/* ADD CATEGORY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-slate-100 animate-scale-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Civic Issue</h3>
            <p className="text-xs text-slate-500 mb-4">Enter the new civic issue name to add to the category list.</p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Civic Issue:
              </label>
              <input
                type="text"
                autoFocus
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="e.g. Broken Park Bench / Street Flooding"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewCategory();
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewCategoryInput('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewCategory}
                disabled={!newCategoryInput.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg shadow-sm transition-all"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
