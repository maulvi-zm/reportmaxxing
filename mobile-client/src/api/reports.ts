import { CreateReportInput, Report } from '../types/report';

const mockDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockReports: Report[] = [
  {
    id: 'R-2025-001',
    title: 'Overflowing trash bin near park entrance',
    description:
      'Trash bin at the main entrance is overflowing. Litter is spreading across the sidewalk.',
    category: 'SANITATION',
    status: 'IN_PROGRESS',
    createdAt: '2025-12-30T14:30:00.000Z',
    visibility: 'PUBLIC',
    isMine: true,
    updates: [
      { date: 'Dec 30, 09:00', title: 'Report Received', active: true },
      { date: 'Dec 30, 13:00', title: 'Crew Assigned', active: true },
      { date: 'Pending', title: 'Issue Resolved', active: false },
    ],
  },
  {
    id: 'R-2025-002',
    title: 'Suspicious activity near bus stop',
    description:
      'There has been repeated suspicious activity near the bus stop at night. Please increase patrols.',
    category: 'CRIME',
    status: 'OPEN',
    createdAt: '2025-12-30T09:05:00.000Z',
    visibility: 'ANONYMOUS',
    isMine: false,
    updates: [
      { date: 'Dec 30, 09:05', title: 'Report Received', active: true },
      { date: 'Pending', title: 'Investigation Started', active: false },
      { date: 'Pending', title: 'Issue Resolved', active: false },
    ],
  },
  {
    id: 'R-2025-003',
    title: 'Broken streetlight outside clinic',
    description:
      'The streetlight in front of the clinic has been out for two nights, making the area unsafe.',
    category: 'HEALTH',
    status: 'RESOLVED',
    createdAt: '2025-12-29T18:00:00.000Z',
    visibility: 'PRIVATE',
    isMine: true,
    updates: [
      { date: 'Dec 29, 18:00', title: 'Report Received', active: true },
      { date: 'Dec 29, 20:30', title: 'Maintenance Dispatched', active: true },
      { date: 'Dec 30, 08:15', title: 'Issue Resolved', active: true },
    ],
  },
  {
    id: 'R-2025-004',
    title: 'Loose dogs near playground',
    description:
      'Two large dogs are roaming near the playground without owners.',
    category: 'HEALTH',
    status: 'IN_PROGRESS',
    createdAt: '2025-12-30T16:10:00.000Z',
    visibility: 'PUBLIC',
    isMine: false,
    updates: [
      { date: 'Dec 30, 16:10', title: 'Report Received', active: true },
      { date: 'Dec 30, 17:00', title: 'Animal Control Notified', active: true },
      { date: 'Pending', title: 'Issue Resolved', active: false },
    ],
  },
];

const formatDateLabel = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const reportsApi = {
  async getAllReports(): Promise<Report[]> {
    await mockDelay(350);
    return [...mockReports];
  },
  async getMyReports(): Promise<Report[]> {
    await mockDelay(350);
    return mockReports.filter((report) => report.isMine);
  },
  async getReportById(id: string): Promise<Report | null> {
    await mockDelay(250);
    const report = mockReports.find((item) => item.id === id);
    return report ?? null;
  },
  async createReport(input: CreateReportInput): Promise<Report> {
    await mockDelay(400);
    const newReport: Report = {
      id: `R-2025-${String(mockReports.length + 1).padStart(3, '0')}`,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      visibility: input.visibility,
      imageUri: input.imageUri,
      isMine: true,
      updates: [
        { date: formatDateLabel(new Date().toISOString()), title: 'Report Received', active: true },
        { date: 'Pending', title: 'In Review', active: false },
        { date: 'Pending', title: 'Issue Resolved', active: false },
      ],
    };

    mockReports = [newReport, ...mockReports];
    return newReport;
  },
};
