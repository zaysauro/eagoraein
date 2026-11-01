# Implantação e operação

## Infraestrutura preparada

- Repositório autorizado: https://github.com/zaysauro/eagoraein
- Conta Vercel escolhida pelo usuário: Primary, equipe Bruno.
- Banco novo e exclusivo: projeto Neon `agendai`, ID `fancy-hat-36198428`, região AWS us-east-1, organização no plano gratuito.
- Banco `agendai`, migrations aplicadas e papel RLS provisionado. Nenhuma conta real ou seed de demonstração foi inserido.
- Publicação Vercel bloqueada pela revisão automática: exige autorização explícita para transmitir `DATABASE_URL` e `AUTH_SECRET` à Vercel. Não há URL publicada confirmada.

## Vercel

Importar `zaysauro/eagoraein`, framework Next.js, Node 22, instalação `npm ci`, build `npm run build`, região iad1. Não contratar upgrades pagos.

Configurar somente no ambiente Production:

- DATABASE_URL: conexão pooled do banco exclusivo.
- AUTH_SECRET: segredo aleatório exclusivo, pelo menos 32 bytes.
- AUTH_TRUST_HOST=true.
- TZ=America/Sao_Paulo.
- NEXT_PUBLIC_APP_URL: URL HTTPS efetivamente atribuída ao projeto, sem barra final.
- NEXT_PUBLIC_APP_NAME=Agendaí.
- PLATFORM_ADMIN_USER_IDS: IDs autorizados, após cadastro da conta administrativa.

Não conectar preview automaticamente ao banco de produção. Cada ambiente de teste exige banco/branch isolado e segredo próprio. Não exponha DATABASE_URL em variável NEXT_PUBLIC_. Não publique arquivos .env. As credenciais locais geradas ficam em arquivo ignorado pelo Git e pelo Docker.

Migrations pela conexão direta, antes da implantação:

```sh
DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:deploy
psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -f scripts/provision-role.sql
```

O build não executa migrations, seeds ou cobranças. Após publicar, verificar cadastro, login, serviço, horário, reserva, acesso privado e logs. Não anunciar URL antes de confirmar que o deployment está READY e os fluxos respondem.

## Docker

Dockerfile preparado para Node 22 com output standalone. Executar migrations e provisionamento de papéis antes de iniciar o container; entrypoint não altera dados e não semeia senhas. Docker não foi executado nesta entrega.

## Backup

Usar conexão direta e credencial operacional restrita ao responsável. Nunca colocar senha na linha de comando ou no Git.

```sh
pg_dump "$DATABASE_URL_UNPOOLED" --format=custom --no-owner --file=agendai-backup.dump
# Em banco NOVO e ISOLADO, previamente autorizado:
pg_restore --dbname="$RESTORE_DATABASE_URL" --no-owner --no-acl agendai-backup.dump
```

Criptografar backups, definir retenção e acesso, copiar para armazenamento separado, testar restauração periódica. Após restauração, provisionar papel e executar testes de isolamento/concorrência. O procedimento está documentado, mas uma restauração completa ainda não foi ensaiada.

## Atualizações

Revisar migrations, executar testes locais, build e auditoria; fazer backup; implantar migrations compatíveis; publicar o commit validado; verificar logs e fluxo real. Rollback de código não reverte schema automaticamente.
