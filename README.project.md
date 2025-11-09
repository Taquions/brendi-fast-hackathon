# Brendi Analytics - Dashboard & LLM Agent

Plataforma de analytics para gestão de restaurantes com dashboard interativo e agente LLM integrado.

## Stack Técnica

### Monorepo
- **Turborepo** - Build system e cache otimizado
- **npm workspaces** - Gerenciamento de dependências

### Frontend (`apps/web`)
- **Next.js 14** - React framework com App Router
- **TailwindCSS** - Styling
- **Nivo** - Visualizações avançadas (Bar, Line, Pie)
- **Tremor** - Componentes de analytics
- **AI SDK** - Integração com LLMs

### Backend (`apps/api`)
- **Fastify** - Web framework (~2x mais rápido que Express)
- **TypeScript** - Type safety end-to-end
- **Anthropic Claude** - LLM para agente inteligente
- **AI SDK** - Framework para LLMs
- **Zod** - Validação de schemas
- **Pino** - Logging estruturado

### Packages
- `@brendi/types` - Types compartilhados entre apps

## Estrutura do Projeto

```
brendi-fast-hackathon/
├── apps/
│   ├── web/              # Next.js dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx                    # Home page (dashboard principal)
│   │   │   │   ├── layout.tsx                  # Layout principal
│   │   │   │   ├── globals.css                 # Estilos globais
│   │   │   │   ├── orders/                     # Página de pedidos
│   │   │   │   ├── campaigns/                  # Página de campanhas
│   │   │   │   ├── consumers/                  # Página de consumidores
│   │   │   │   ├── feedbacks/                  # Página de feedbacks
│   │   │   │   ├── menu-events/                # Página de eventos do menu
│   │   │   │   ├── consumer-preferences/       # Página de preferências
│   │   │   │   └── chat/                       # Página de chat com agente LLM
│   │   │   └── components/
│   │   │       ├── Navigation.tsx              # Navegação principal
│   │   │       ├── FloatingChat.tsx            # Chat flutuante
│   │   │       └── FloatingChatWrapper.tsx     # Wrapper do chat
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/              # Fastify backend
│       ├── src/
│       │   ├── index.ts                        # Server setup
│       │   ├── config/                         # Configurações
│       │   ├── campaigns/                      # Rotas de campanhas
│       │   ├── chat/                           # Rotas de chat LLM
│       │   │   └── utils/                      # Utilitários do agente
│       │   ├── consumers/                      # Rotas de consumidores
│       │   ├── consumer-preferences/           # Rotas de preferências
│       │   ├── feedbacks/                      # Rotas de feedbacks
│       │   ├── menu/                           # Rotas de eventos do menu
│       │   ├── orders/                         # Rotas de pedidos
│       │   ├── stores/                         # Rotas de lojas
│       │   └── middlewares/                    # Middlewares (error handler)
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── types/            # Shared TypeScript types
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── data/                 # JSON data files
│   ├── orders_summary.json
│   ├── campaigns.json
│   ├── campaigns_results.json
│   ├── custom-campaigns.json
│   ├── feedbacks.json
│   ├── menu_events_last_30_days.json
│   ├── store_consumers_summary.json
│   ├── store_consumer_preferences.json
│   └── store.json
│
├── scripts/              # Scripts de processamento de dados
│   ├── extract-campaigns-insights.ts
│   ├── extract-consumers-summary.ts
│   └── extract-orders-summary.ts
│
├── package.json          # Root package.json
└── turbo.json           # Turborepo config
```

## Começando

### Pré-requisitos
- Node.js >= 18.0.0
- npm >= 9.0.0

### Instalação

```bash
# Instalar todas as dependências do monorepo
npm install
```

### Configuração de Ambiente

Copie o arquivo `env.example` e configure as variáveis de ambiente necessárias:

```bash
# Na raiz do projeto
cp env.example .env

# Configure as variáveis:
# - ANTHROPIC_API_KEY (para o agente LLM)
# - PORT (porta da API, padrão: 3001)
# - CORS_ORIGIN (origem permitida, padrão: http://localhost:3000)
```

### Desenvolvimento

```bash
# Iniciar todos os apps em modo dev (web + api)
npm run dev

# Ou iniciar individualmente:
cd apps/web && npm run dev    # Frontend em http://localhost:3000
cd apps/api && npm run dev    # API em http://localhost:3001
```

### Build

```bash
# Build de todos os apps
npm run build
```

### Testes

```bash
# Executar testes unitários
npm run test:ut

# Executar testes de um arquivo específico
npm run test:ut "nome-do-arquivo"
```

## Endpoints da API

### Chat & LLM
- `POST /api/chat` - Chat com agente LLM especializado em gestão de restaurantes

### Pedidos (Orders)
- `GET /api/orders/total` - Total de pedidos (suporta filtro por data: `?startDate=...&endDate=...`)
- `GET /api/orders/revenue` - Receita total (suporta filtro por data)
- `GET /api/orders/most-ordered` - Produtos mais pedidos (suporta filtro por data)
- `GET /api/orders` - Lista de pedidos (paginado: `?page=1&pageSize=20`)
- `GET /api/orders/payment-types` - Análise de tipos de pagamento (suporta filtro por data)
- `GET /api/orders/delivery` - Análise de entregas (suporta filtro por data)
- `GET /api/orders/motoboys` - Estatísticas de motoboys (suporta filtro por data)
- `GET /api/orders/by-day` - Pedidos agrupados por dia

### Campanhas (Campaigns)
- `GET /api/campaigns/summary` - Resumo de campanhas (suporta filtro por data)
- `GET /api/campaigns/performance` - Performance de campanhas (suporta filtro por data)
- `GET /api/campaigns/conversion` - Taxa de conversão (suporta filtro por data)
- `GET /api/campaigns/revenue` - Receita de campanhas (suporta filtro por data)
- `GET /api/campaigns/vouchers` - Análise de vouchers (suporta filtro por data)
- `GET /api/campaigns/status` - Status das campanhas (suporta filtro por data)
- `GET /api/campaigns/custom-analysis` - Análise customizada (suporta filtro por data)
- `GET /api/campaigns/top-performing` - Top campanhas (suporta filtro por data)

### Consumidores (Consumers)
- `GET /api/consumers/stats` - Estatísticas de consumidores (`?limit=10&startDate=...&endDate=...`)
- `GET /api/consumers/new` - Novos consumidores (suporta filtro por data)
- `GET /api/consumers/new-zero-orders` - Novos consumidores sem pedidos (suporta filtro por data)

### Preferências de Consumidores
- `GET /api/consumer-preferences/stats` - Estatísticas de preferências

### Feedbacks
- `GET /api/feedbacks/average` - Nota média (suporta filtro por data)
- `GET /api/feedbacks/analysis` - Análise detalhada de feedbacks (suporta filtro por data)

### Menu Events
- `GET /api/menu-events/insights` - Insights de eventos do menu (suporta filtro por data)

### Loja (Store)
- `GET /api/store` - Informações da loja

## Funcionalidades do Frontend

### Dashboard Principal (`/`)
- Visão geral com métricas principais:
  - Total de pedidos
  - Faturamento total
  - Nota média de feedbacks
  - Top 3 produtos mais vendidos
- Filtros de período:
  - Último dia
  - Últimos 7 dias
  - Últimos 30 dias
  - Período personalizado
  - Todos os dados

### Páginas Especializadas
- **Pedidos** (`/orders`) - Análise detalhada de pedidos
- **Campanhas** (`/campaigns`) - Performance de campanhas de marketing
- **Consumidores** (`/consumers`) - Análise de base de clientes
- **Feedbacks** (`/feedbacks`) - Análise de satisfação do cliente
- **Menu Events** (`/menu-events`) - Eventos e interações com o menu
- **Preferências** (`/consumer-preferences`) - Preferências dos consumidores
- **Chat** (`/chat`) - Interface de chat com agente LLM

### Chat com Agente LLM
O agente LLM é especializado em gestão de restaurantes e pode:
- Analisar dados de vendas e receita
- Fornecer insights sobre comportamento do consumidor
- Avaliar performance de campanhas de marketing
- Analisar performance de produtos do menu
- Fornecer recomendações operacionais
- Responder perguntas sobre métricas e KPIs

## Agente LLM

O agente utiliza **Anthropic Claude** e possui acesso a todas as APIs do sistema através de ferramentas (tools). Ele pode:

1. **Analisar perguntas do usuário** e identificar quais dados são necessários
2. **Selecionar APIs apropriadas** para buscar informações
3. **Executar múltiplas chamadas** de API quando necessário
4. **Fornecer análises especializadas** com contexto de negócio
5. **Recomendar ações** baseadas em dados

O agente entende filtros de tempo e pode aplicar automaticamente quando o usuário menciona períodos específicos.

## Decisões Técnicas

### Por que Fastify?
Performance superior (~2x Express), validação built-in (Ajv), TypeScript first-class support, logging estruturado com Pino.

### Por que Turborepo?
Cache inteligente de builds, execução paralela de tasks, ideal para monorepos pequenos/médios, reduz tempo de build significativamente.

### Por que não usar banco de dados?
Dados estáticos em JSON. Carregar em memória é ~10x mais rápido que queries SQL para este volume e caso de uso. Cache em memória para performance ainda maior.

### Por que Nivo?
Visualizações únicas com estética superior. D3.js por baixo, mas API React declarativa. Suporte completo a TypeScript.

### Por que AI SDK?
Framework unificado para LLMs, suporte a streaming, ferramentas (tools) integradas, e abstração que permite trocar de provider facilmente.

## Scripts Disponíveis

- `npm run dev` - Inicia todos os apps em modo desenvolvimento
- `npm run build` - Build de todos os apps
- `npm run lint` - Lint de todos os apps
- `npm run clean` - Limpa builds e node_modules
- `npm run test:ut` - Executa testes unitários

## Próximos Passos

- [x] Implementar data loaders para processar JSONs
- [x] Criar endpoints de analytics
- [x] Construir dashboards com Nivo e Tremor
- [x] Integrar agente LLM Claude
- [ ] Adicionar mais visualizações (Sankey, Sunburst)
- [ ] Implementar cache Redis para produção
- [ ] Adicionar autenticação e autorização
- [ ] Deploy (Vercel + Railway)
- [ ] Adicionar testes E2E

