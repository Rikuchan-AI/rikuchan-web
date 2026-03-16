export type HeroContent = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  proofItems: string[];
};

export type ValuePillar = {
  title: string;
  body: string;
  tag: string;
};

export type UseCase = {
  id: string;
  label: string;
  title: string;
  body: string;
  bullets: string[];
  cta: { label: string; href: string };
};

export type FlowStep = {
  step: string;
  title: string;
  body: string;
};

export type ComparisonSide = {
  eyebrow: string;
  title: string;
  body: string;
  meta: string[];
};

export type Metric = {
  label: string;
  value: string;
  helper: string;
};

export type TrustItem = {
  title: string;
  body: string;
};

export const homePageContent = {
  hero: {
    eyebrow: "Trusted context and smarter routing for modern AI work",
    title: "Better AI answers. Less wasted spend.",
    description:
      "Rikuchan adds trusted business context, smarter routing, and usage visibility so people and agents get more useful results without bloated prompts.",
    primaryCta: {
      label: "Create free account",
      href: "/signup",
    },
    secondaryCta: {
      label: "See how it works",
      href: "/how-it-works",
    },
    proofItems: ["Grounded answers", "Lean prompts", "Human and agent ready"],
  } satisfies HeroContent,
  valuePillars: {
    title: "A smarter layer between your work and the model",
    description:
      "Improve answer quality, control token waste, and use information your business already trusts.",
    items: [
      {
        tag: "Better answers",
        title: "Ground responses in the context that actually matters",
        body: "Bring in trusted business knowledge when it improves the answer, so outputs feel informed instead of generic.",
      },
      {
        tag: "Lower waste",
        title: "Keep prompts lean without losing what makes them useful",
        body: "Use only the context and model depth each request needs, with clearer visibility into usage and cost.",
      },
      {
        tag: "Scale with control",
        title: "Use one layer across people, teams, and agents",
        body: "Support daily work today and more structured AI workflows tomorrow without rebuilding the foundation.",
      },
    ] satisfies ValuePillar[],
  },
  useCases: {
    title: "Useful on day one. Stronger as usage grows.",
    description:
      "Support daily productivity, team knowledge, business-aware AI, and agent-driven workflows from the same foundation.",
    items: [
      {
        id: "professionals",
        label: "Professionals",
        title: "Get more useful AI for real daily work",
        body: "Use AI with the business context that sharpens writing, planning, research, and decision support instead of repeating background every time.",
        bullets: [
          "Fewer repetitive prompts",
          "More relevant outputs",
          "Faster time to a usable answer",
        ],
        cta: { label: "Start free", href: "/signup" },
      },
      {
        id: "teams",
        label: "Teams",
        title: "Create a more consistent AI layer for shared work",
        body: "Help teams get answers grounded in the same trusted knowledge instead of fragmented prompts and inconsistent outputs.",
        bullets: [
          "Shared context across workflows",
          "Clearer quality and consistency",
          "Less duplicated setup",
        ],
        cta: { label: "See team value", href: "/use-cases" },
      },
      {
        id: "companies",
        label: "Companies",
        title: "Build business-aware AI with better control",
        body: "Use a cleaner foundation for reliable AI usage, with visibility into model usage, costs, and how knowledge is applied.",
        bullets: [
          "Stronger operational visibility",
          "Trusted internal context",
          "A better path to scale",
        ],
        cta: { label: "View trust details", href: "/trust" },
      },
      {
        id: "evaluators",
        label: "Technical evaluators",
        title: "Assess the layer behind the experience",
        body: "Evaluate routing, context injection, provider flexibility, and API compatibility without digging through a generic AI facade.",
        bullets: [
          "OpenAI-compatible gateway surface",
          "Selective context injection",
          "Usage, latency, and routing visibility",
        ],
        cta: { label: "Read how it works", href: "/how-it-works" },
      },
    ] satisfies UseCase[],
  },
  howItWorks: {
    title: "How it works",
    description:
      "Send requests through Rikuchan. It adds trusted context when it helps, keeps prompts lean when it does not, routes to the right model, and tracks usage across the flow.",
    steps: [
      {
        step: "01",
        title: "Send",
        body: "Prompts from people, tools, or agents enter through one consistent layer.",
      },
      {
        step: "02",
        title: "Ground",
        body: "Relevant business context is added only when it improves the request.",
      },
      {
        step: "03",
        title: "Route",
        body: "Each request is matched to the right provider or model path for quality and efficiency.",
      },
      {
        step: "04",
        title: "Measure",
        body: "Usage, latency, and cost stay visible so the system remains useful as it grows.",
      },
    ] satisfies FlowStep[],
  },
  trustedContext: {
    title: "Use the information your business already trusts",
    description:
      "Ground responses in real internal knowledge so answers are more relevant, less generic, and easier to rely on.",
    sourceLabels: ["Policy handbook", "Project notes", "Support history"],
    left: {
      eyebrow: "Without grounded context",
      title: "Generic answer",
      body: "Suggest a broad onboarding process with common best practices, but no awareness of your environment, policies, or internal constraints.",
      meta: ["Needs manual follow-up", "Missing business detail"],
    } satisfies ComparisonSide,
    right: {
      eyebrow: "With trusted context",
      title: "Grounded answer",
      body: "Summarize the approved onboarding path, reference the policy owner, and call out the exact systems, limits, and exceptions your team already uses.",
      meta: ["Relevant to your workflow", "Backed by internal context"],
    } satisfies ComparisonSide,
  },
  efficiency: {
    title: "Lower waste without lowering quality",
    description:
      "Use the right amount of context and the right model for each request, with visibility into cost, latency, and usage.",
    bullets: [
      "Avoid stuffing every prompt with everything you know.",
      "Keep model usage intentional instead of accidental.",
      "See how quality and efficiency move together over time.",
    ],
    metrics: [
      { label: "Prompt bloat", value: "-37%", helper: "Less excess context" },
      { label: "Routing fit", value: "Adaptive", helper: "Right model path" },
      { label: "Usage clarity", value: "Visible", helper: "Cost and latency in view" },
    ] satisfies Metric[],
  },
  integrations: {
    title: "One trusted layer for people, apps, and agents",
    description:
      "Use the same platform across chat tools, API workflows, and agent-based systems without rebuilding your AI foundation each time.",
    items: ["OpenAI-compatible API", "Provider routing", "Trusted context", "Agent-ready flows"],
  },
  trust: {
    title: "Designed for control, visibility, and dependable use",
    description:
      "Keep provider credentials behind the platform, measure what is being used, and create a more consistent base for AI across your workflow.",
    items: [
      {
        title: "Protected provider access",
        body: "Keep provider credentials inside the platform instead of exposing them directly across tools and workflows.",
      },
      {
        title: "Operational visibility",
        body: "Track usage, latency, and request behavior so AI activity becomes easier to reason about and improve.",
      },
      {
        title: "A stronger foundation",
        body: "Use one trusted layer across people and agents instead of separate patterns that drift over time.",
      },
    ] satisfies TrustItem[],
  },
  signupCta: {
    title: "Start small. Prove value fast.",
    description:
      "Create an account, connect your workflow, and see more useful AI output without changing how you already work.",
    primaryCta: { label: "Create free account", href: "/signup" },
    secondaryCta: { label: "View pricing", href: "/pricing" },
    reassurance: "No credit card to start. Setup stays lightweight.",
  },
  finalCta: {
    title: "Put a smarter layer between your prompts and the model",
    description:
      "More relevant outputs, less token waste, and a stronger foundation for AI that people and agents can rely on.",
    primaryCta: { label: "Create free account", href: "/signup" },
    secondaryCta: { label: "See how it works", href: "/how-it-works" },
  },
} as const;
