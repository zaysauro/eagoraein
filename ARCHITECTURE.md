# Arquitetura

## Decisão

Manter Next.js App Router, React, Prisma/PostgreSQL, Auth.js Credentials, bcrypt e o mecanismo de disponibilidade do NexCal. Preservar componentes de serviços, profissionais, horários, bloqueios e gestão de reservas, adaptando interface, moeda, acesso e regras. Renovar landing page, cadastro, navegação, reserva pública e dashboard em português.

Calnode foi clonado e inspecionado: Go + SQLite + frontend Svelte embutido, API REST, webhooks e MCP. Não houve vantagem em operar um segundo motor e um segundo banco. Nenhum código Calnode foi incorporado. Sua execução ficou impedida pela ausência do toolchain Go 1.26.10.

## Fronteiras

- Auth.js emite sessão JWT assinada. Cada chamada administrativa reconsulta usuário, função, empresa, suspensão e versão de sessão. Recuperar senha incrementa versão e invalida sessões antigas.
- `withTenant` abre transação, executa `SET LOCAL ROLE agendai_tenant` e define organização, usuário e função com parâmetros. RLS limita leitura e escrita no PostgreSQL.
- O proprietário vê dados da empresa; profissionais veem seus próprios serviços/agendamentos/horários. CRM é exclusivo do proprietário nesta versão.
- Cadastro, autenticação, página pública, gestão por token e administração da plataforma usam conexão proprietária. Esses pontos exigem filtros/projeções explícitos e validação no servidor. Não são endpoints de consulta arbitrária. A conexão privilegiada jamais vai ao navegador.
- Horários usam o motor `src/lib/slots.ts`, com validação de duração, feriados, sessões e buffers. PostgreSQL usa exclusão GiST parcial por profissional e intervalo `[início,fim+buffer)`, incluindo reservas PENDING e CONFIRMED. Cancelamento libera o horário.
- Buffer é capturado no momento de inserir/reagendar; alterações futuras no serviço não alteram silenciosamente o intervalo já reservado.
- Reserva e criação de cliente são atômicas. FK composta impede associar o serviço de outro profissional.
- Triggers de plano serializam criação por empresa. RLS não permite que empresas alterem seu plano ou assinatura.
- Tokens de recuperação/convite: 256 bits aleatórios, hash SHA-256 persistido, expiração e consumo atômico único.

## Persistência e compatibilidade

Migrations originais mantidas. Migrations adicionais completam campos faltantes do schema original, acrescentam CRM, ciclo de assinatura, auditoria, limites, RLS e exclusão de horários. `scripts/provision-role.sql` deve ser aplicado pelo proprietário após migrations.

Somente `America/Sao_Paulo` nesta entrega. A base herdada usa timestamp sem timezone, Prisma transmite instantes e o processo precisa do TZ especificado. Ampliar para múltiplos fusos exige revisão integral de conversões e migração para timestamptz.

## Integrações

Midtrans, MultiWA e callbacks Google inseguros foram retirados/desativados. Nenhuma aprovação de pagamento ou mensagem é simulada. Recuperação de senha tem adaptador Resend configurável e desativado por padrão. PIX/cartão, WhatsApp oficial, assinatura recorrente e IA permanecem pendentes.

## Limites conhecidos

CSV/CRM limitam a listagem a 500 clientes; precisam de paginação/exportação em lotes para escala. Dashboard preserva a base de agregação NexCal; não inclui ainda ocupação e todos os indicadores solicitados. Não há agenda recorrente, logotipo por upload, calendário arrastável ou integração MCP. Auditoria registra eventos selecionados, ainda não todas as mutações.
