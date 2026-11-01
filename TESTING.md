# Testes e evidências

Execução em 01/11/2026, Node portátil 22.23.4, PostgreSQL local isolado na porta 55439. Nenhum banco preexistente, cliente real ou cobrança foi usado.

## Base original

NexCal `0962e35`: npm ci, geração Prisma, quatro migrations e servidor original executados. GET `/` e `/login` retornaram HTTP 200. Não há script/suíte de testes no package.json original. Lint original falhou por duas aspas JSX não escapadas. Auditoria inicial apontou 48 vulnerabilidades (4 críticas, 20 altas).

As migrations originais não contemplavam todos os campos do schema. O erro apareceu no primeiro teste de cadastro real e foi corrigido em migration adicional, não por `db push`.

Calnode `c7b3e56`: clonado, licença e arquitetura inspecionadas, 179 arquivos de teste identificados. `go test ./...` retornou `command not found: go`. Não foi executado nem integrado; não há alegação de aprovação de seus testes.

## Agendaí

`npm test`: **16 testes aprovados**, incluindo subtestes:

- hash bcrypt e senha incorreta;
- cadastro persistido de duas empresas;
- RLS impede leitura, alteração e inserção em outra empresa;
- papel de empresa não pode alterar seu plano;
- limite de profissionais no plano Individual;
- oito reservas concorrentes: exatamente uma aceita;
- conflito no intervalo de buffer;
- FK composta impede serviço de outro profissional;
- cancelamento libera horário e reagendamento persiste;
- recuperação usa token uma vez e incrementa versão de sessão;
- empresa suspensa não cria reservas;
- duração inválida não causa loop;
- sessões, feriados, buffers e datas passadas.

`npx playwright test`: **3 cenários aprovados**:

1. Cadastro via formulário → login → criação de serviço → salvar disponibilidade nos sete dias → reserva em viewport de 390px → verificação direta no PostgreSQL → reagendamento → cancelamento → cliente no CRM → reserva no painel → logout → rota privada bloqueada.
2. Landing page renderizada a 390px e 1440px, sem overflow horizontal.
3. Webhook legado sem autenticação retorna 410; callback Google inválido retorna 503. Isso testa a desativação segura, **não** uma integração de pagamento ou Google funcional.

`npm run lint`, `npm run typecheck` e `npm run build`: **aprovados na rodada final**. Auditoria de produção: 0 vulnerabilidades. Auditoria completa: 1 baixa e 16 moderadas, sem altas/críticas.

## Reprodução

Crie um banco isolado com `agendai_test` no nome. Configure DATABASE_URL para ele; aplique `npm run db:deploy` e `scripts/provision-role.sql`. Execute `npm test` e `npx playwright install chromium && npx playwright test`. O Playwright inicia o servidor local. Testes criam empresas com sufixos únicos; não execute contra contas reais.

## Não validado

Envio real de recuperação, convite por e-mail, cobranças/PIX/cartão, WhatsApp, IA, Google Calendar, restauração de backup, carga sustentada, acessibilidade completa, todos os navegadores, painel da plataforma por E2E, fluxo de plano pago e segurança independente. Docker preparado, mas não executado porque Docker não está disponível. Testes de responsividade cobrem landing e reserva, não todas as telas administrativas.
