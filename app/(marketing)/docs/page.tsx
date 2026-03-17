import { Book, ChevronRight } from "lucide-react";
import { docsNav, docsSections } from "@/content/marketing/docs";
import { CodeBlock } from "@/components/shared/code-block";
import { Container } from "@/components/shared/container";
import { GlowCard } from "@/components/shared/glow-card";
import { Mascot } from "@/components/shared/mascot";

export const metadata = {
  title: "Documentation",
};

export default function DocsPage() {
  return (
    <div className="relative">
      {/* Header */}
      <section className="hero-gradient border-b border-line pt-28 pb-12 sm:pt-32 sm:pb-14 lg:pt-36 lg:pb-16">
        <Container>
          <div className="flex items-center gap-4 mb-6">
            <Mascot size="md" glow />
            <div>
              <p className="mono text-xs uppercase tracking-[0.18em] text-accent">Documentation</p>
              <h1 className="text-[2.5rem] leading-[0.95] font-semibold text-foreground sm:text-[3.5rem]">
                Rikuchan Docs
              </h1>
            </div>
          </div>
          <p className="max-w-[720px] text-[1.05rem] leading-8 text-foreground-soft sm:text-[1.12rem]">
            Everything you need to set up, configure, and get the most out of the Rikuchan AI stack — gateway, RAG engine, agents, and integrations.
          </p>
        </Container>
      </section>

      <Container>
        <div className="grid gap-10 py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:py-16">
          {/* Sidebar nav */}
          <nav className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="mono mb-3 text-[0.65rem] uppercase tracking-[0.18em] text-foreground-muted">On this page</p>
              {docsNav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground-soft transition hover:bg-surface-strong hover:text-foreground"
                >
                  <ChevronRight className="h-3 w-3 text-foreground-muted" />
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="space-y-16">
            {/* Quick nav cards (mobile + desktop) */}
            <div className="grid gap-3 sm:grid-cols-3 lg:hidden">
              {docsNav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface p-3 text-sm text-foreground-soft transition hover:bg-surface-strong hover:text-foreground"
                >
                  <Book className="h-4 w-4 text-accent" />
                  {item.label}
                </a>
              ))}
            </div>

            {/* Sections */}
            {docsSections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <div className="mb-8">
                  <h2 className="text-[2rem] leading-[1.04] font-semibold text-foreground sm:text-[2.5rem]">
                    {section.title}
                  </h2>
                  {section.description ? (
                    <p className="mt-4 max-w-[720px] text-[1rem] leading-8 text-foreground-soft">
                      {section.description}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-6">
                  {section.items.map((item) => (
                    <GlowCard key={item.title}>
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      <div className="mt-3 text-sm leading-7 text-foreground-soft whitespace-pre-line">
                        {item.body.split("\n").map((line, i) => {
                          const boldMatch = line.match(/\*\*(.*?)\*\*/g);
                          if (boldMatch) {
                            const parts = line.split(/\*\*(.*?)\*\*/);
                            return (
                              <span key={i}>
                                {parts.map((part, j) =>
                                  j % 2 === 1 ? (
                                    <strong key={j} className="font-semibold text-foreground">
                                      {part}
                                    </strong>
                                  ) : (
                                    <span key={j}>{part}</span>
                                  ),
                                )}
                                {"\n"}
                              </span>
                            );
                          }
                          return (
                            <span key={i}>
                              {line}
                              {"\n"}
                            </span>
                          );
                        })}
                      </div>
                      {item.code ? (
                        <div className="mt-4">
                          <CodeBlock title={item.codeTitle}>{item.code}</CodeBlock>
                        </div>
                      ) : null}
                    </GlowCard>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
