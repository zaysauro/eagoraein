# Entrega Agendaí — 01/11/2026

**Resultado: núcleo funcional de agendamento entregue para avaliação. O SaaS comercial completo solicitado NÃO está concluído.** Não há cobrança, mensagem ou IA simulada apresentada como funcional.

Repositório: https://github.com/zaysauro/eagoraein

Base NexCal importada a partir de `0962e35cf8fdd521b68b5aa2c66572afd1f627d8`; origem e licença em `THIRD_PARTY_NOTICES.md`. Commit final: consultar HEAD do repositório (este documento acompanha o commit).

## Situação por módulo

| Funcionalidade | Classificação | Evidência / limite |
|---|---|---|
| Cadastro de empresa e usuário | IMPLEMENTADA E TESTADA | Formulário → PostgreSQL em teste de navegador |
| Login/logout e acesso privado | IMPLEMENTADA E TESTADA | Fluxo E2E completo |
| Isolamento multiempresa administrativo | IMPLEMENTADA E TESTADA | RLS PostgreSQL, tentativas de leitura/escrita entre empresas recusadas |
| Revogação por versão de sessão | IMPLEMENTADA E TESTADA | Recuperação incrementa versão; identidade revalidada por requisição |
| Recuperação de senha | PARCIAL | Token testado; adaptador de e-mail depende de credencial e homologação |
| Convites | IMPLEMENTADA, NÃO VALIDADA | Link com hash, expiração e consumo único; sem ensaio E2E de convite |
| Serviços | IMPLEMENTADA E TESTADA | Cadastro pelo navegador, persistência e seleção pública |
| Gestão de profissionais | PARCIAL | CRUD herdado adaptado, desativação e limite no banco; falta E2E completo |
| Disponibilidade semanal | IMPLEMENTADA E TESTADA | Salvamento e recarga dos sete dias no navegador |
| Feriados/bloqueios/intervalos | PARCIAL | Motor testado e UI existente; falta E2E completo de bloqueios |
| Reserva pública | IMPLEMENTADA E TESTADA | Página por empresa, mobile e persistência real |
| Concorrência e buffers | IMPLEMENTADA E TESTADA | Oito inserts concorrentes, um aceito; exclusão PostgreSQL |
| Reagendamento/cancelamento | IMPLEMENTADA E TESTADA | Portal pelo navegador e verificação no banco |
| Calendário | PARCIAL | Agenda/listagem persistida e disponibilidade; sem calendário visual completo |
| CRM | PARCIAL | Criação por reserva e consulta testadas; notas, filtros e CSV implementados; limite de 500 |
| Dashboard | PARCIAL | Dados reais; faltam ocupação e parte dos indicadores solicitados |
| Planos e limites | PARCIAL | Limites server/banco testados; assinatura recorrente não integrada |
| Administração SaaS | IMPLEMENTADA, NÃO VALIDADA | Acesso por IDs de operador, empresas, plano, suspensão e auditoria; sem E2E completo |
| Identidade e landing page | IMPLEMENTADA E TESTADA | Logo original, português, responsividade 390/1440px |
| Tradução integral e mobile administrativo | PARCIAL | Fluxos principais traduzidos; revisão integral de acessibilidade/textos herdados pendente |
| WhatsApp oficial e lembretes | NÃO IMPLEMENTADA | MultiWA removido; nenhum envio real |
| PIX/cartão/sinal/estorno | NÃO IMPLEMENTADA | Gateway legado desligado; somente registro manual de pagamento recebido |
| Assistente IA / MCP | NÃO IMPLEMENTADA | Nenhum modelo ou agente simulado |
| Google Calendar | BLOQUEADA | Callback inseguro desativado; exige implementação OAuth segura e homologação |
| Banco Neon exclusivo | IMPLEMENTADA E TESTADA | Migrations e provisionamento executados; plano gratuito |
| Publicação web | BLOQUEADA | Revisão automática rejeitou transferência de segredos à Vercel; precisa autorização explícita |
| Documentação e .env.example | IMPLEMENTADA E TESTADA | Arquivos presentes e instruções reproduzidas nos testes locais |
| Backups | PARCIAL | Procedimento documentado; restauração não ensaiada |

## Validação executada

- NexCal original: instalação, migrations, servidor, HTTP 200 em inicial/login; lint original com 2 erros.
- Agendaí: 16 testes de unidade/banco e 3 cenários Playwright aprovados na rodada final.
- Última rodada: build de produção, TypeScript, lint, 16 testes de banco/unidade e 3 cenários Playwright aprovados.
- Migrations aplicadas no PostgreSQL local e no novo Neon; papel restrito provisionado.
- Nenhuma mensagem enviada a clientes, nenhuma cobrança real e nenhum banco de outro projeto utilizado.
- Calnode não executado: toolchain Go ausente. Não integrado.

## Pendências externas

1. Aprovação explícita da transferência de DATABASE_URL e AUTH_SECRET para a conta Vercel Primary. O revisor automático bloqueou essa ação, não houve contorno.
2. Credenciais e homologação de provedor de e-mail; domínio de envio.
3. Escolha/credenciais/homologação de pagamentos brasileiros, WhatsApp oficial e modelo de IA — além da implementação desses módulos.

## Limites materiais

O produto não atende todos os critérios de conclusão do pedido: não está publicado, não possui integrações essenciais implementadas e ainda exige revisão operacional e de segurança. Somente fuso America/Sao_Paulo; CRM/exportação limitado a 500; auditoria parcial; sem recorrência, upload de logo ou calendário visual completo. Consulte SECURITY.md e ROADMAP.md antes de cadastrar clientes reais.

## Administração

Cadastre a empresa em `/cadastro`; configure serviços e disponibilidade no painel; compartilhe `/agendar/slug`. Para painel global, cadastrar conta e configurar seu ID em PLATFORM_ADMIN_USER_IDS. Não existe senha padrão. Plano Individual oferece avaliação de 14 dias; cobrança não é ativada automaticamente.

Auditoria npm final: dependências de produção com **0 vulnerabilidades**; inventário completo com 17 (1 baixa, 16 moderadas), sem altas ou críticas. Alertas restantes concentram-se nas ferramentas de desenvolvimento e precisam de acompanhamento.
