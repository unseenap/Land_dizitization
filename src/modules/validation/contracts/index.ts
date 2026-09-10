export type ExtractionFieldView = {
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean";
  required: boolean;
  critical: boolean;
  sourceValue: unknown;
  normalizedValue: unknown;
  confidence: number | null;
  missingReason: string | null;
  evidence: Array<{
    page: number;
    blockIds: string[];
    bbox: number[];
    sourceText: string;
  }>;
};

export type ValidationFindingView = {
  fieldKey: string | null;
  code: string;
  status: "PASS" | "WARNING" | "FAIL" | "NOT_CHECKED";
  severity: "INFO" | "WARNING" | "BLOCKING";
  message: string;
  details: Record<string, unknown>;
  source: string;
};

export type ValidationView = {
  run: {
    id: string;
    documentId: string;
    documentRevision: number;
    status: "VALIDATED" | "BLOCKED";
    blockerCount: number;
    duplicateCount: number;
    createdAt: string;
    completedAt: string;
  } | null;
  fields: ExtractionFieldView[];
  findings: ValidationFindingView[];
};
