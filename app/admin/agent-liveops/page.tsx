import type { Metadata } from "next";

import { AgentLiveOpsDashboard } from "@/components/admin/agent-liveops/AgentLiveOpsDashboard";
import { buildAgentLiveOpsGraph } from "@/lib/agent-liveops/build-graph";
import { buildAgentLiveOpsTimeline } from "@/lib/agent-liveops/build-timeline";
import {
  readAgentLiveOpsMockEvents,
  readAgentLiveOpsMockSummary,
} from "@/lib/agent-liveops/mock-events";

export const metadata: Metadata = {
  title: "Agent LiveOps - PILAR admin",
  description: "Read-only admin prototype for sanitized PILAR agent events.",
};

export default function AgentLiveOpsPage() {
  const events = readAgentLiveOpsMockEvents();
  const summary = readAgentLiveOpsMockSummary();
  const graph = buildAgentLiveOpsGraph(events);
  const timeline = buildAgentLiveOpsTimeline(events);

  return (
    <AgentLiveOpsDashboard
      events={events}
      graph={graph}
      summary={summary}
      timeline={timeline}
    />
  );
}
