# Agendaí

Plataforma brasileira de agendamentos baseada no NexCal (MIT). **Versão de desenvolvimento/piloto; ainda não pronta para comercialização.** Consulte `DELIVERY_REPORT.md` para as evidências e pendências.

## Executar

Node 22, PostgreSQL 16+ com `btree_gist` e npm.

```sh
npm ci
cp .env.example .env
# Preencha DATABASE_URL, AUTH_SECRET e NEXT_PUBLIC_APP_URL.
npm run db:deploy
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/provision-role.sql
npm run dev
```

Gere o segredo de sessão com `openssl rand -base64 32`. Nunca use valores de exemplo em produção. Configure `TZ=America/Sao_Paulo` no processo de produção. Esta versão atende estabelecimentos nesse fuso; outros fusos brasileiros ainda precisam de suporte explícito.

Cadastre sua empresa em `/cadastro`, entre em `/login`, cadastre serviços e horários no painel. Compartilhe `/agendar/seu-slug`. Cada profissional administra sua própria disponibilidade; o proprietário visualiza a equipe. O cadastro inicia avaliação de 14 dias no plano Individual.

Valores monetários são inteiros em centavos de BRL. O cliente reserva sem cobrança online nesta versão. O proprietário pode registrar um pagamento recebido presencialmente; esse registro é uma declaração administrativa, não uma transação aprovada por gateway.

## Comandos

- `npm run typecheck`: TypeScript.
- `npm run lint`: ESLint.
- `npm test`: testes unitários e PostgreSQL. Exige banco separado cujo nome contenha `agendai_test`.
- `npm run build`: build de produção.
- `npm start`: servidor de produção.
- `npm run db:seed`: somente com `SEED_DEMO=true` e `SEED_PASSWORD` explícita, em banco de demonstração.

Para testes de banco, aplique as migrations e provisione o papel em `agendai_test` antes de executar. Testes criam empresas identificadas como teste e não enviam mensagens.

## Administração

`/admin/settings`: dados do estabelecimento, link público, status do plano e convite de colaboradores. Convites expiram em 48 horas; compartilhe somente com o destinatário. Aceitação respeita o limite do plano.

`/admin/platform`: exclusivo dos IDs de usuário em `PLATFORM_ADMIN_USER_IDS`. Não há conta administrativa ou senha padrão. Após cadastrar sua conta, o operador consulta seu ID no banco e o configura no ambiente. É possível visualizar empresas, alterar planos, suspender/reativar acesso e consultar eventos de auditoria. Alterar plano não inventa assinatura paga.

## Limites

| Plano | Mensalidade proposta | Profissionais | Serviços | Reservas criadas/mês |
|---|---:|---:|---:|---:|
| Individual | R$ 39,90 | 1 | 10 | 200 |
| Profissional | R$ 79,90 | 3 | 30 | 1.000 |
| Equipe | R$ 149,90 | 10 | 100 | 5.000 |

Limites são aplicados por triggers que bloqueiam a organização durante a verificação. Reservas canceladas ainda contam para a franquia de criação. Cobrança de assinatura não está integrada. A avaliação expirada bloqueia novas reservas/cadastros operacionais no banco.

Veja `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md` e `THIRD_PARTY_NOTICES.md`.
