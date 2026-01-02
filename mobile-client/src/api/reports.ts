import { apiClient } from './client';
import { CreateReportInput, Report } from '../types/report';

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

const MOCK_USER_ID = 'mock-user-1';

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
		const response = await apiClient.request<ApiResponse<ApiReport[]>>('/api/reports');
		return response.data.map((r) => transformReport(r, r.user_id === MOCK_USER_ID));
	},

	async getReportById(id: string): Promise<Report | null> {
		const response = await apiClient.request<ApiResponse<ApiReport>>(`/api/reports/${id}`);
		return transformReport(response.data, response.data.user_id === MOCK_USER_ID);
	},

	async createReport(input: CreateReportInput): Promise<Report> {
		const response = await apiClient.request<ApiResponse<ApiReport>>('/api/reports', {
			method: 'POST',
			body: JSON.stringify({
				title: input.title,
				description: input.description,
				category: input.category,
				visibility: input.visibility,
			}),
		});
		return transformReport(response.data, true);
	},
};
