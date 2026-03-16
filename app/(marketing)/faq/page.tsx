import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";
import { SimplePageHeader } from "@/components/marketing/simple-page-header";

export const metadata = {
  title: "FAQ",
};

const faqs = [
  {
    question: "Is this just another AI wrapper?",
    answer:
      "No. The core value is the layer between requests and providers: trusted context, smarter routing, and usage visibility that can support people and agents from the same foundation.",
  },
  {
    question: "Do I need to change how my team already uses AI?",
    answer:
      "Not necessarily. The goal is to fit into existing workflows and improve them, not force a brand-new interface for every user.",
  },
  {
    question: "Why does trusted context matter so much?",
    answer:
      "Because generic prompts often produce generic answers. Trusted business context helps responses reflect the information your team already relies on.",
  },
  {
    question: "Why emphasize token efficiency?",
    answer:
      "Because cost control and response quality are linked. Bloated prompts waste money and often reduce clarity at the same time.",
  },
] as const;

export default function FaqPage() {
  return (
    <>
      <SimplePageHeader
        eyebrow="Frequently asked questions"
        title="The practical questions most evaluators ask first"
        description="Clear answers about product scope, workflow fit, and why the layer behind the model matters."
      />
      <SectionShell>
        <Container>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-[1.4rem] border border-line/80 bg-white/72 p-6">
                <summary className="cursor-pointer list-none text-[1.1rem] font-semibold text-foreground">
                  {faq.question}
                </summary>
                <p className="mt-4 max-w-[820px] leading-8 text-foreground-soft">{faq.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </SectionShell>
    </>
  );
}
