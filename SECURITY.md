# Segurança

Não publicar como produto comercial sem concluir os itens pendentes do relatório.

## Controles implementados

Autenticação no servidor; bcrypt com custo 12 em cadastro/recuperação; JWT assinado; identidade/função/suspensão revalidadas no banco; versão de sessão para revogação; tokens aleatórios de uso único; validação Zod; limites de tentativas persistidos; isolamento RLS para operações administrativas; prevenção de conflitos por exclusão PostgreSQL; proteções de origem das Server Actions Next.js; exportação CSV com neutralização de fórmulas; segredos somente no servidor.

O papel `agendai_tenant` deve ser NOLOGIN, NOSUPERUSER e NOBYPASSRLS. Sem provisionamento, operações administrativas falham fechadas. A conexão de execução é proprietária para os fluxos públicos controlados; esse é um limite de defesa em profundidade. Uma futura separação em papéis de autenticação, reserva pública e administração reduzirá o alcance da conexão privilegiada.

Não confiar em identificador de organização enviado pelo cliente. `withTenant` deriva identidade da sessão revalidada. O proprietário não recebe permissão SQL para alterar plano/status da assinatura. Nenhum segredo de integração é retornado nas telas.

## Operação

- HTTPS obrigatório em produção e segredo aleatório exclusivo.
- Sem senha padrão ou seed automático. Dados demonstrativos somente com opt-in explícito em banco isolado.
- Não habilitar envios e cobranças em testes. Credenciais de outros projetos não são utilizadas.
- Rotacionar credenciais após incidente, invalidar sessões incrementando `session_version`, avaliar acesso aos logs.
- Limitar retenção de dados e acesso administrativo; evitar observações clínicas/sensíveis no CRM sem análise específica.
- Contadores de rate limit usam hash de identidade; excluir janelas antigas periodicamente: `DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`.
- O limitador por IP pressupõe proxy confiável. Antes de abertura pública ampla, complementar com proteção de borda/CAPTCHA, limites globais, monitoramento e testes de abuso.

## Pendências para produção comercial

Auditoria completa, verificação de e-mail, monitoramento de segurança, política de retenção/exclusão/consentimento e revisão jurídica de privacidade, homologação de integrações e revisão independente dos fluxos privilegiados. Recuperação por e-mail não foi homologada com provedor real. Não há declaração de conformidade LGPD.

Referência: https://www.postgresql.org/docs/17/ddl-rowsecurity.html — proprietários de tabela normalmente ignoram RLS; por isso as operações administrativas trocam explicitamente para o papel restrito.
