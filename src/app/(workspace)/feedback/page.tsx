import { pageAuth } from "@/server/page-auth";
import { csrfToken } from "@/modules/identity/server/service";
import {
  listFeedbackDatasets,
  listFeedbackEvaluations,
} from "@/modules/feedback/server/service";
import { FeedbackWorkbench } from "@/modules/feedback/ui/feedback-workbench";
import type {
  FeedbackDatasetsResult,
  FeedbackEvaluationsResult,
} from "@/modules/feedback/contracts";

export default async function FeedbackPage() {
  const { actor, token } = await pageAuth();
  const canRead = actor.permissions.includes("feedback.read");
  const [datasets, evaluations] = await Promise.all([
    canRead
      ? listFeedbackDatasets(token)
      : Promise.resolve({ items: [] } satisfies FeedbackDatasetsResult),
    canRead
      ? listFeedbackEvaluations(token)
      : Promise.resolve({ items: [] } satisfies FeedbackEvaluationsResult),
  ]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Model feedback</p>
          <h1>Verified truth datasets</h1>
          <p className="muted">
            Reproducible evaluation from approved field decisions, with audited
            model-team exports and no automatic retraining.
          </p>
        </div>
        <span className="tag">Phase 10 · Feedback</span>
      </div>
      <FeedbackWorkbench
        datasets={datasets.items}
        evaluations={evaluations.items}
        csrfToken={csrfToken(token!)}
        canManage={actor.permissions.includes("feedback.manage")}
        canExport={actor.permissions.includes("feedback.export")}
      />
    </>
  );
}
