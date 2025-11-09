# Brendi Analytics - Dashboard & LLM Agent

Plataforma de analytics para gestão de restaurantes com dashboard interativo e agente LLM integrado.

## Stack Técnica

### Monorepo
- **Turborepo** - Build system e cache otimizado

### Frontend (`apps/web`)
- **Next.js 14** - React framework com App Router
- **TailwindCSS** - Styling
- **Nivo** - Visualizações avançadas (Sankey, Sunburst, Stream)
- **Tremor** - Componentes de analytics

### Backend (`apps/api`)
- **Fastify** - Web framework (~2x mais rápido que Express)
- **TypeScript** - Type safety end-to-end
- **Anthropic Claude** - LLM para agente inteligente

### Packages
- `@brendi/types` - Types compartilhados entre apps

## Estrutura do Projeto

```
brendi-fast-hackathon/
├── apps/
│   ├── web/              # Next.js dashboard
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── page.tsx          # Home page
│   │   │       ├── layout.tsx        # Layout principal
│   │   │       └── globals.css       # Estilos globais
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/              # Fastify backend
│       ├── src/
│       │   ├── index.ts              # Server setup
│       │   └── routes/
│       │       └── health.ts         # Health & hello routes
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
│   ├── orders.json
│   ├── campaigns.json
│   ├── store_consumers.json
│   └── ...
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

## Endpoints da API

### Health Check
- `GET /health` - Status da API

### Hello World
- `GET /api/hello` - Teste básico da API

## Próximos Passos

- [ ] Implementar data loaders para processar JSONs
- [ ] Criar endpoints de analytics
- [ ] Construir dashboards com Nivo e Tremor
- [ ] Integrar agente LLM Claude
- [ ] Deploy (Vercel + Railway)

## Decisões Técnicas

### Por que Fastify?
Performance superior (~2x Express), validação built-in (Ajv), TypeScript first-class support.

### Por que Turborepo?
Cache inteligente de builds, execução paralela de tasks, ideal para monorepos pequenos/médios.

### Por que não usar banco de dados?
Dados estáticos em JSON. Carregar em memória é ~10x mais rápido que queries SQL para este volume e caso de uso.

### Por que Nivo?
Visualizações únicas (Sankey, Sunburst) com estética superior. D3.js por baixo, mas API React declarativa.

