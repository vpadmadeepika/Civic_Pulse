import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Complaint } from '../types';

interface CivicMapProps {
  complaints: Complaint[];
  selectedComplaintId?: string | null;
  onSelectComplaint?: (complaint: Complaint) => void;
  center?: [number, number];
  zoom?: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Submitted':
      return '#3b82f6'; // blue
    case 'Verified':
    case 'Assigned':
      return '#8b5cf6'; // purple
    case 'In Progress':
      return '#f59e0b'; // amber
    case 'Resolved':
    case 'Community Verified':
      return '#10b981'; // green
    case 'Closed':
      return '#6b7280'; // gray
    case 'Reopened':
      return '#ef4444'; // red
    case 'Rejected':
      return '#dc2626'; // dark red
    default:
      return '#3b82f6';
  }
};

export const CivicMap: React.FC<CivicMapProps> = ({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  center = [12.9716, 77.5946],
  zoom = 14,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    complaints.forEach((c) => {
      if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return;

      const color = getStatusColor(c.status);
      const isSelected = selectedComplaintId === c.complaint_id;

      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `
          <div style="
            background-color: ${color};
            width: ${isSelected ? '28px' : '20px'};
            height: ${isSelected ? '28px' : '20px'};
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          ">
            <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [isSelected ? 28 : 20, isSelected ? 28 : 20],
        iconAnchor: [isSelected ? 14 : 10, isSelected ? 14 : 10],
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div style="font-family: inherit; min-width: 170px;">
          <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 2px;">
            ${c.complaint_id}
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">
            ${c.category}
          </div>
          <div style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background-color: ${color}20; color: ${color};">
            ${c.status}
          </div>
          ${c.address ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">📍 ${c.address}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectComplaint) {
          onSelectComplaint(c);
        }
      });

      markersRef.current[c.complaint_id] = marker;
      bounds.extend([c.latitude, c.longitude]);
    });

    if (complaints.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
  }, [complaints, selectedComplaintId]);

  return (
    <div className="w-full h-full min-h-[320px] rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full min-h-[320px]" />
    </div>
  );
};
