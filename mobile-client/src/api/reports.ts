import { apiClient } from './client';
import { CreateReportInput, Report } from '../types/report';
import { fetchProfile, UserProfile } from './profile';

interface ApiReport {
	id: string;
	title: string;
	description: string;
	category: string;
	status: string;
	visibility: string;
	image_url?: string;
	created_at: string;
	user_id: string;
	updates: ApiReportUpdate[];
}

interface ApiReportUpdate {
	id: string;
	report_id: string;
	title: string;
	date: string;
	is_active: boolean;
	created_at: string;
}

interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data: T;
	error?: {
		code: string;
		message: string;
	};
}

interface UploadUrlResponse {
	upload_url: string;
	image_url: string;
	object_key: string;
}

let cachedProfile: UserProfile | null = null;

async function getProfile(): Promise<UserProfile> {
	if (cachedProfile) return cachedProfile;
	cachedProfile = await fetchProfile();
	return cachedProfile;
}

function transformReport(apiReport: ApiReport, isMine: boolean): Report {
	return {
		id: apiReport.id,
		title: apiReport.title,
		description: apiReport.description,
		category: apiReport.category as Report['category'],
		status: apiReport.status as Report['status'],
		createdAt: apiReport.created_at,
		visibility: apiReport.visibility as Report['visibility'],
		imageUri: apiReport.image_url,
		isMine,
		updates: apiReport.updates.map((u) => ({
			date: u.date,
			title: u.title,
			active: u.is_active,
		})),
	};
}

export const reportsApi = {
	async getAllReports(): Promise<Report[]> {
		const profile = await getProfile();
		const response = await apiClient.request<ApiResponse<ApiReport[]>>('/api/reports');
		return response.data.map((r) => transformReport(r, r.user_id === profile.id));
	},

	async getReportById(id: string): Promise<Report | null> {
		const profile = await getProfile();
		const response = await apiClient.request<ApiResponse<ApiReport>>(`/api/reports/${id}`);
		return transformReport(response.data, response.data.user_id === profile.id);
	},

	async createReport(input: CreateReportInput): Promise<Report> {
		try {
			const response = await apiClient.request<ApiResponse<ApiReport>>('/api/reports', {
				method: 'POST',
				body: JSON.stringify({
					title: input.title,
					description: input.description,
					category: input.category,
					visibility: input.visibility,
					image_url: input.imageUrl,
				}),
			});
			return transformReport(response.data, true);
		} catch (error) {
			console.error('createReport failed', error);
			throw error;
		}
	},

	async requestUploadUrl(fileName: string, contentType: string): Promise<UploadUrlResponse> {
		try {
			const response = await apiClient.request<ApiResponse<UploadUrlResponse>>('/api/reports/upload-url', {
				method: 'POST',
				body: JSON.stringify({
					file_name: fileName,
					content_type: contentType,
				}),
			});
			try {
				const parsed = new URL(response.data.upload_url);
				console.log('upload-url: location', {
					protocol: parsed.protocol,
					host: parsed.host,
					pathname: parsed.pathname,
				});
			} catch (error) {
				console.warn('upload-url: failed to parse URL for logging', error);
			}
			return response.data;
		} catch (error) {
			console.error('requestUploadUrl failed', { fileName, contentType, error });
			throw error;
		}
	},

	async uploadReportImage(fileUri: string, fileName: string, contentType: string): Promise<string> {
		try {
			const uploadInfo = await this.requestUploadUrl(fileName, contentType);
			const fileResponse = await fetch(fileUri);
			const blob = await fileResponse.blob();
			const uploadResponse = await fetch(uploadInfo.upload_url, {
				method: 'PUT',
				headers: {
					'Content-Type': contentType,
				},
				body: blob,
			});

			if (!uploadResponse.ok) {
				const responseText = await uploadResponse.text();
				console.error('uploadReportImage failed', {
					status: uploadResponse.status,
					responseText,
				});
				throw new Error(`Upload failed (${uploadResponse.status})`);
			}

			console.log('uploadReportImage success', { imageUrl: uploadInfo.image_url });
			return uploadInfo.image_url;
		} catch (error) {
			console.error('uploadReportImage error', error);
			throw error;
		}
	},
};
