"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Code, Scale, BarChart3, Megaphone, ShoppingCart, Calculator, Heart, GraduationCap, Ticket, Building2 } from "lucide-react";

const ORG_TYPES = [
  { id: "software_dev", label: "Tecnologia", description: "Desenvolvimento, SaaS, tech", Icon: Code },
  { id: "legal", label: "Juridico", description: "Advocacia, departamento juridico", Icon: Scale },
  { id: "consulting", label: "Consultoria", description: "Gestao, tech, estrategia", Icon: BarChart3 },
  { id: "marketing_agency", label: "Marketing", description: "Agencia, comunicacao, publicidade", Icon: Megaphone },
  { id: "retail_ecommerce", label: "Varejo", description: "E-commerce, loja, marketplace", Icon: ShoppingCart },
  { id: "accounting", label: "Contabilidade", description: "Escritorio contabil, auditoria", Icon: Calculator },
  { id: "healthcare", label: "Saude", description: "Clinica, hospital, laboratorio", Icon: Heart },
  { id: "education", label: "Educacao", description: "Escola, curso, universidade", Icon: GraduationCap },
  { id: "lottery_agency", label: "Loterica", description: "Correspondente bancario Caixa", Icon: Ticket },
  { id: "general", label: "Outro", description: "Nao se encaixa acima", Icon: Building2 },
] as const;

export default function OnboardingKnowledgePage() {
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("intent") || "personal";
  const [selected, setSelected] = useState<string | null>(null);

  function handleContinue() {
    if (!selected) return;
    router.push(`/onboarding/knowledge-languages?intent=${intent}&orgType=${selected}`);
  }

  function handleSkip() {
    router.push(`/onboarding/model?intent=${intent}&orgType=general`);
  }

  const stepLabel = intent === "team" ? "Step 3 of 5" : "Step 2 of 3";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{stepLabel} — Knowledge Profile</p>
        <button onClick={handleSkip} className="text-xs text-accent hover:text-accent/80 transition">
          Skip
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">What type of business?</h1>
        <p className="mt-1 text-sm text-foreground-soft">
          This optimizes how Rikuchan organizes and searches your company&#39;s knowledge.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ORG_TYPES.map(({ id, label, description, Icon }) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
              selected === id
                ? "border-accent bg-accent/[0.06]"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
              selected === id ? "bg-accent/20" : "bg-surface-strong"
            }`}>
              <Icon size={16} className={selected === id ? "text-accent" : "text-foreground-muted"} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-[11px] text-foreground-muted leading-tight">{description}</p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition disabled:opacity-50"
      >
        Continue
      </button>

      <p className="text-xs text-foreground-muted text-center">
        You can change this later in Settings &gt; Knowledge Base.
      </p>
    </div>
  );
}
