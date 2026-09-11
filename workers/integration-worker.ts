import "../scripts/env";
import { runIntegrationOnce } from "../src/modules/integrations/server/worker";

const intervalMs = Number(process.env.INTEGRATION_WORKER_INTERVAL_MS ?? 1000);
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

while (!stopping) {
  const worked = await runIntegrationOnce();
  if (!worked)
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
