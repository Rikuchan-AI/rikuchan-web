export type Locale = "pt-BR" | "en";

const messages: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    "hero.title": "Sua economia com Rikuchan",
    "hero.subtitle": "economizados nos ultimos {period}",
    "roi.label": "Retorno sobre o plano",
    "roi.free": "Plano gratuito",
    "cost.with": "Custo com Rikuchan",
    "cost.without": "Custo sem Rikuchan",
    "savings.total": "Economia total",
    "savings.cache": "Economia por Cache",
    "savings.cache.desc": "Respostas servidas do cache semantico, sem custo de provider",
    "savings.routing": "Economia por Roteamento",
    "savings.routing.desc": "Economia ao rotear para modelos mais eficientes",
    "savings.trimming": "Otimizacao de Contexto",
    "savings.trimming.desc": "Tokens removidos de ruido antes do envio ao modelo",
    "rag.label": "Contexto Enriquecido",
    "rag.desc": "Requests enriquecidos com conhecimento do seu projeto",
    "confidence.measured": "Baseado em dados reais de uso",
    "confidence.calculated": "Calculado a partir de precos e contagem de tokens",
    "confidence.estimated": "Projetado com base em padroes historicos",
    "empty.no_data": "Conecte seu primeiro client para comecar a ver suas metricas",
    "empty.collecting": "Estamos coletando dados — suas metricas aparecem em alguns dias",
    "empty.insufficient": "Precisa de mais requests para analises confiaveis. Voce tem {n} ate agora.",
    "milestone.savings": "Voce economizou mais do que o valor do plano este mes",
    "timeline.title": "Custo real vs custo sem Rikuchan",
    "providers.title": "Distribuicao por provider",
    "models.title": "Top modelos",
    "insights.title": "Insights",
    "period.7d": "7 dias",
    "period.30d": "30 dias",
    "period.90d": "90 dias",
    "tooltip.total_savings": "Diferenca entre o custo sem e com Rikuchan, baseado em dados reais de cada request",
    "tooltip.cache_savings": "Custo evitado quando respostas similares foram servidas do cache, sem chamar o provider",
    "tooltip.routing_savings": "Economia ao rotear tarefas simples para modelos mais eficientes, como Haiku em vez de Sonnet",
    "tooltip.trimming_savings": "Tokens de contexto removidos (boilerplate, prompts redundantes) antes do envio ao modelo",
    "tooltip.roi": "Economia total dividida pelo preco do seu plano. 5x significa que voce economizou 5 vezes o que pagou",
    "upgrade.title": "Disponivel no plano Team",
    "upgrade.description": "Faca upgrade para ver o breakdown detalhado de economia",
  },
  en: {
    "hero.title": "Your savings with Rikuchan",
    "hero.subtitle": "saved in the last {period}",
    "roi.label": "Return on plan",
    "roi.free": "Free plan",
    "cost.with": "Cost with Rikuchan",
    "cost.without": "Cost without Rikuchan",
    "savings.total": "Total savings",
    "savings.cache": "Cache Savings",
    "savings.cache.desc": "Requests served from semantic cache, avoiding provider costs",
    "savings.routing": "Routing Savings",
    "savings.routing.desc": "Cost saved by routing to more efficient models",
    "savings.trimming": "Context Optimization",
    "savings.trimming.desc": "Tokens trimmed from noise before sending to model",
    "rag.label": "Context Enhancement",
    "rag.desc": "Requests enhanced with your project knowledge",
    "confidence.measured": "Based on actual usage data",
    "confidence.calculated": "Computed from pricing and token counts",
    "confidence.estimated": "Projected from historical patterns",
    "empty.no_data": "Connect your first client to start seeing your metrics",
    "empty.collecting": "We're collecting data — analytics will appear after a few days of usage",
    "empty.insufficient": "Need more requests for reliable analytics. You have {n} so far.",
    "milestone.savings": "You saved more than your plan cost this month",
    "timeline.title": "Actual cost vs cost without Rikuchan",
    "providers.title": "Provider distribution",
    "models.title": "Top models",
    "insights.title": "Insights",
    "period.7d": "7 days",
    "period.30d": "30 days",
    "period.90d": "90 days",
    "tooltip.total_savings": "Difference between cost without and with Rikuchan, based on actual data from each request",
    "tooltip.cache_savings": "Cost avoided when similar responses were served from cache, without calling the provider",
    "tooltip.routing_savings": "Savings from routing simple tasks to more efficient models, such as Haiku instead of Sonnet",
    "tooltip.trimming_savings": "Context tokens removed (boilerplate, redundant prompts) before sending to the model",
    "tooltip.roi": "Total savings divided by your plan price. 5x means you saved 5 times what you paid",
    "upgrade.title": "Available on Team plan",
    "upgrade.description": "Upgrade to see detailed savings breakdown",
  },
};

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let msg = messages[locale]?.[key] ?? messages.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replaceAll(`{${k}}`, String(v));
    }
  }
  return msg;
}

export function detectLocale(): Locale {
  if (typeof navigator !== "undefined") {
    const lang = navigator.language;
    if (lang.startsWith("pt")) return "pt-BR";
  }
  return "pt-BR"; // default for Brazilian users
}
