/**
 * Trial entitlement helpers — single source of truth for "can the user X?"
 * Templates are ALWAYS allowed (no count, no expiration).
 * Custom agents are limited to 14 days OR 2 agents, whichever comes first.
 */

export interface Entitlement {
  plan: "trial" | "pro" | "admin" | "expired";
  trialStartedAt: Date;
  customAgentsCount: number;
  daysLeft: number;
  agentsLeft: number;
  canCreateCustomAgent: boolean;
  canCloneTemplate: boolean; // always true
}

const TRIAL_DAYS = 14;
const TRIAL_AGENTS_LIMIT = 2;

export function computeEntitlement(profile: {
  plan: string;
  trial_started_at: string;
  custom_agents_count: number;
}): Entitlement {
  const startedAt = new Date(profile.trial_started_at);
  const ageMs = Date.now() - startedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - ageDays));
  const agentsLeft = Math.max(0, TRIAL_AGENTS_LIMIT - profile.custom_agents_count);

  const isPaid = profile.plan === "pro" || profile.plan === "admin";
  const trialActive = ageDays < TRIAL_DAYS && profile.custom_agents_count < TRIAL_AGENTS_LIMIT;

  return {
    plan: (profile.plan as Entitlement["plan"]) ?? "trial",
    trialStartedAt: startedAt,
    customAgentsCount: profile.custom_agents_count,
    daysLeft,
    agentsLeft,
    canCreateCustomAgent: isPaid || trialActive,
    canCloneTemplate: true, // never restricted
  };
}
