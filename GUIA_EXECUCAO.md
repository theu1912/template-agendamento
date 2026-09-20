# 🎯 Guia de Execução - Barbearia Template de Barbearia

## 📋 Pré-requisitos

Certifique-se de ter instalado:
- **Node.js** 18+ (recomendado 22.13.0)
- **pnpm** 10.4.1+ (gerenciador de pacotes)
- **Git** (para versionamento)

## 🚀 Comando Único para Subir o Ambiente

Execute este comando único na raiz do projeto para instalar dependências e iniciar o servidor:

```bash
pnpm install && pnpm dev
```

### O que acontece:
1. ✅ Instala todas as dependências do `package.json`
2. ✅ Otimiza dependências do Vite
3. ✅ Inicia o servidor de desenvolvimento
4. ✅ Abre a aplicação em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
barbearia-demo/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx      # Página principal (MÁQUINA DE CONVERSÃO)
│   │   ├── components/        # Componentes reutilizáveis
│   │   ├── index.css         # Estilos globais (Borgonha/Dourado)
│   │   └── App.tsx           # Roteamento principal
│   ├── index.html            # HTML com fontes Playfair Display + Lato
│   └── public/               # Assets estáticos
├── server/                    # Backend (placeholder)
├── package.json              # Dependências do projeto
└── GUIA_EXECUCAO.md         # Este arquivo
```

## ⚙️ Configuração do Make.com Webhook

### 1. Localize a variável de webhook

Abra o arquivo: `client/src/pages/Home.tsx`

Procure pela linha:
```typescript
const M_WEBHOOK_URL = 'https://hook.make.com/YOUR_WEBHOOK_URL_HERE';
```

### 2. Cole sua URL do Make.com

Substitua `YOUR_WEBHOOK_URL_HERE` pela URL do seu webhook:

```typescript
const M_WEBHOOK_URL = 'https://hook.make.com/seu-webhook-id-aqui';
```

### 3. Dados que serão enviados

O webhook receberá um JSON com esta estrutura:

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "41999999999",
  "services": "Corte Tradicional, Barba Terapia",
  "totalPrice": 110,
  "date": "2026-03-17",
  "time": "14:30",
  "clientCPF": "12345678901",
  "referralCPF": "98765432100",
  "message": "Observações do cliente",
  "fidelity": {
    "clientCPF": "12345678901",
    "referralCount": 1,
    "discountPercentage": 10,
    "lastReferralDate": "2026-03-16T09:48:00.000Z"
  },
  "timestamp": "2026-03-16T09:48:00.000Z"
}
```

## 🎨 Paleta de Cores (Já Configurada)

- **Primária (Borgonha)**: `#800020`
- **Secundária (Dourado)**: `#D4AF37`
- **Fundo**: `#F5F5F5`
- **Texto**: `#1A1A1A`

Todas as cores estão definidas em `client/src/index.css` e podem ser ajustadas lá.

## 📝 Funcionalidades Implementadas

### ✅ Máquina de Conversão Premium
- Seleção interativa de serviços com inversão de cores
- Resumo dinâmico de total de serviços
- Cards com borda dourada para destaque comercial

### ✅ Validação CPF Anti-fraude
- Máscara de entrada: `000.000.000-00`
- Validação matemática dos dígitos verificadores
- Trava: CPF cliente ≠ CPF indicação
- Feedback visual em tempo real

### ✅ Sistema de Fidelidade
- Campo "Quem te indicou?" aparece apenas se Total > 0
- Rastreio de indicações por CPF
- Estrutura pronta para desconto de 10% após 10 indicações
- Timestamp de última indicação

### ✅ Integração Make.com
- Dados sanitizados (apenas números em CPF e telefone)
- Webhook pronto para automação
- Suporta Google Calendar, WhatsApp e Email

### ✅ Componentes Extras
- Navegação sticky com scroll suave
- Botões flutuantes Instagram + WhatsApp
- Mapa do Google integrado (coordenadas exatas)
- Depoimentos com 4.9 ⭐ Google Maps
- Galeria de fotos (Masonry style)
- Formulário de contato funcional

## 🔧 Comandos Úteis

```bash
# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Preview da build
pnpm preview

# Verificar tipos TypeScript
pnpm check

# Formatar código
pnpm format
```

## 📱 Responsividade

O site foi otimizado para:
- ✅ Mobile (320px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)

Teste em diferentes tamanhos de tela para garantir a melhor experiência.

## 🐛 Troubleshooting

### Erro: "Cannot find module '@/components/Map'"
- Certifique-se de que o arquivo `client/src/components/Map.tsx` existe
- Verifique a configuração de alias em `vite.config.ts`

### Erro: "Webhook não está recebendo dados"
- Verifique se a URL do Make.com está correta em `M_WEBHOOK_URL`
- Teste a URL do webhook no Make.com primeiro
- Verifique o console do navegador (F12) para erros

### Cores não aparecem como Borgonha/Dourado
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Reinicie o servidor: `pnpm dev`
- Verifique se `client/src/index.css` foi atualizado

## 📞 Contato e Suporte

Para dúvidas sobre a implementação:
1. Verifique este guia
2. Consulte os comentários no código (`Home.tsx`)
3. Teste as funcionalidades no navegador (F12 - Console)

## ✨ Próximos Passos Recomendados

1. **Configurar Make.com** - Crie um cenário que integre Google Calendar, WhatsApp e Email
2. **A/B Testing** - Teste a paleta Borgonha/Dourado com clientes reais
3. **Galeria de Trabalhos** - Adicione fotos dos cortes mais populares
4. **Blog de Dicas** - Crie conteúdo sobre tendências e cuidados com barba

---

**Última atualização**: 16 de Março de 2026
**Versão**: 6.0 - Máquina de Conversão Premium
**Status**: ✅ Pronto para Apresentação
