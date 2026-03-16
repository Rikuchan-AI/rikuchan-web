import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { Container } from "@/components/shared/container";
import { SectionShell } from "@/components/shared/section-shell";
import { SimplePageHeader } from "@/components/marketing/simple-page-header";

export const metadata = {
  title: "Developers",
};

export default function DevelopersPage() {
  return (
    <>
      <SimplePageHeader
        eyebrow="Developer surface"
        title="A cleaner technical layer behind your AI requests"
        description="Expose one request path to apps and agents while keeping routing, context injection, and provider access behind the platform."
      />
      <SectionShell>
        <Container>
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              ["OpenAI-compatible", "Fit the gateway into existing request flows without forcing a new protocol everywhere."],
              ["Selective context injection", "Apply trusted knowledge when it helps instead of blindly inflating every request."],
              ["Usage visibility", "Track request patterns, latency, and cost in one operational layer."],
            ].map(([title, body]) => (
              <Card key={title}>
                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                <p className="mt-4 leading-7 text-foreground-soft">{body}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            <Button href="/signup" size="lg">
              Get API access
            </Button>
          </div>
        </Container>
      </SectionShell>
    </>
  );
}
