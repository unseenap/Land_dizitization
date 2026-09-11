export type DashboardWorkflowMetrics = {
  documentsTotal: number;
  documentsProcessed: number;
  documentsInProcessing: number;
  documentsPendingVerification: number;
  documentsApproved: number;
  documentsRejected: number;
  documentsProcessingFailed: number;
  processedRate: number | null;
  approvedRate: number | null;
};

export type DashboardValidationMetrics = {
  currentRuns: number;
  validatedRuns: number;
  blockedRuns: number;
  passFindings: number;
  warningFindings: number;
  failFindings: number;
  notCheckedFindings: number;
};

export type DashboardConfidenceMetrics = {
  fields: number;
  fieldsWithConfidence: number;
  fieldsWithoutConfidence: number;
  lowConfidenceFields: number;
  averageConfidence: number | null;
  lowConfidenceThreshold: number;
};

export type DashboardAccuracyMetrics = {
  status: "NOT_MEASURED";
  value: null;
  evaluatedFields: 0;
  note: string;
};

export type DashboardRegionalProgress = {
  id: string;
  name: string;
  stateName: string | null;
  documents: number;
  processed: number;
  pendingVerification: number;
  approved: number;
  processingFailed: number;
  processedRate: number | null;
  approvedRate: number | null;
};

export type DashboardErrorStat = {
  code: string;
  count: number;
  lastMessage: string | null;
};

export type DashboardSummary = {
  generatedAt: string;
  scope: {
    departmentId: string;
    departmentName: string;
    jurisdictionCount: number;
  };
  workflow: DashboardWorkflowMetrics;
  validation: DashboardValidationMetrics;
  confidence: DashboardConfidenceMetrics;
  accuracy: DashboardAccuracyMetrics;
  states: DashboardRegionalProgress[];
  districts: DashboardRegionalProgress[];
  errors: DashboardErrorStat[];
};
