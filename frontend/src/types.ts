export type ComplaintStatus =
  | 'Submitted'
  | 'Verified'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Community Verified'
  | 'Closed'
  | 'Reopened'
  | 'Rejected';

export interface AIAnalysis {
  detected_issue: string;
  category_match: boolean;
  confidence: number;
  explanation: string;
  is_demo?: boolean;
}

export interface StatusHistoryItem {
  id?: number;
  complaint_id: string;
  status: ComplaintStatus;
  notes?: string;
  updated_by?: string;
  timestamp: string;
}

export interface CommunityVerification {
  id?: number;
  complaint_id: string;
  is_fixed: boolean;
  comment?: string;
  verified_at: string;
}

export interface Complaint {
  complaint_id: string;
  category: string;
  description: string;
  photo_data?: string;
  latitude: number;
  longitude: number;
  address?: string;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  ai_analysis?: AIAnalysis | null;
  timeline?: StatusHistoryItem[];
  community_verification?: CommunityVerification | null;
}

export interface DuplicateComplaint {
  complaint_id: string;
  category: string;
  description: string;
  status: string;
  distance_meters: number;
  created_at: string;
}
