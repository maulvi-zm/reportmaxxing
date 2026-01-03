import { apiClient } from './client';

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
  open_reports: number;
  resolved_reports: number;
};

type ProfileResponse = {
  data: UserProfile;
  success: boolean;
};

export async function fetchProfile(): Promise<UserProfile> {
  const response = await apiClient.request<ProfileResponse>('/api/profile');
  return response.data;
}
