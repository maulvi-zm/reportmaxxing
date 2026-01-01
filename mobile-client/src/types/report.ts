export type ReportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type ReportVisibility = 'PUBLIC' | 'PRIVATE' | 'ANONYMOUS';
export type ReportCategory = 'CRIME' | 'SANITATION' | 'HEALTH';

export interface ReportUpdate {
  date: string;
  title: string;
  active: boolean;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  createdAt: string;
  visibility: ReportVisibility;
  imageUri?: string;
  isMine: boolean;
  updates: ReportUpdate[];
}

export interface CreateReportInput {
  title: string;
  description: string;
  category: ReportCategory;
  visibility: ReportVisibility;
  imageUri?: string;
}
