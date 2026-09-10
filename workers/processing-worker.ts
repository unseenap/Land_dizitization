import "../scripts/env";
import { runProcessingOnce } from "../src/modules/processing/server/worker";

const intervalMs = Number(process.env.PROCESSING_WORKER_INTERVAL_MS ?? 1000);
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

while (!stopping) {
  const worked = await runProcessingOnce();
  if (!worked) await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
