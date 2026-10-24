# Mapa de acesso às APIs — 24/10/2026

## Escopo e conclusão

Inspeção estática dos 56 arquivos `app/api/**/route.ts`, middleware, autenticação, limitadores por IP e consumidores no frontend do checkout/painel. O arquivo `route-back2.ts` não é um Route Handler ativo. O código local contém alterações ainda não necessariamente publicadas.

Não é um levantamento dos IPs reais em produção: não foram obtidos eventos do Firewall da Vercel nesta análise. Também não foram verificadas regras já configuradas no painel da hospedagem. O monitor do banco agrega por rota/operação, não por IP ou usuário. Registros de sessões guardam IP do login bem-sucedido, não o IP de cada chamada ou tentativa falha.

É possível restringir o painel a redes conhecidas, preservando o checkout. Isso exige uma lista confiável de IPs/CIDRs da equipe ou uma VPN com saída fixa. IP não identifica conta: redes compartilhadas e mudanças de IP impedem usá-lo como substituto de autenticação. Nunca permitir automaticamente um IP só porque apareceu nos logs ou porque tem cookie.

## Onde o IP é usado hoje

| Local | Uso | Limitação |
| --- | --- | --- |
| `lib/rate-limit.ts` | Lê primeiro IP de `x-forwarded-for`, com fallback `x-real-ip`; conta por rota/IP | Map em memória por instância; não é limite global entre funções/cold starts |
| `POST /api/checkout` | 10 chamadas/minuto/IP | Dentro do monitoramento; uma recusa ainda pode gerar amostra no banco |
| `GET /api/coupons/validate` | 20 chamadas/5 minutos/IP | Mesma limitação |
| `POST /api/user/change-password` | 5 chamadas/15 minutos/IP | Mesma limitação |
| `/api/auth/admin-password` | Até 5 falhas, bloqueio de 15 minutos em memória | Senha auxiliar `PASSWORD_ADMIN`; não protege o login de credenciais NextAuth |
| NextAuth `authorize` | Grava IP e User-Agent ao criar sessão | Tentativa com senha inválida consulta User; não tem limitador neste código |
| `POST /api/pixels/events` e `lib/pixel-deduplication.ts` | IP usado no registro/deduplicação de eventos | Não autoriza usuários nem restringe acesso |
| `/profile`, `/admin-sessions` e respectivas APIs | Exibem IP de sessões | Não demonstram a origem das tentativas atuais |

Não foi encontrada allowlist global de IP no código. A confiabilidade dos cabeçalhos de IP depende do proxy de entrada; para bloqueios operacionais usar o IP apurado pela Vercel, não um cabeçalho arbitrário escolhido pelo cliente.

## Checkout: acesso público necessário

| Método e rota | Consumidor encontrado | Política proposta |
| --- | --- | --- |
| `POST /api/checkout` | `checkout-form.tsx` | Público, com validação e limite de abuso |
| `GET /api/products/[productId]` | `checkout-content.tsx` | Público, retornar somente campos necessários |
| `GET /api/checkout-settings/banners` | Checkout e configuração no painel | Público somente no GET |
| `GET /api/coupons/validate` | `order-summary.tsx` | Público com limite |
| `GET /api/orders/[orderId]/status` | `processing-content.tsx` | Público hoje; avaliar credencial por pedido e limite sem quebrar acompanhamento do pagamento |
| `GET /api/pixels/[productId]` | `components/tracking/pixel-provider.tsx` | Público, configuração sem segredos |
| `POST /api/pixels/events` | `components/tracking/pixel-manager.tsx` | Público com validação e controle de abuso |

Páginas públicas incluem `/checkout`, `/processing`, `/success`, `/error` e `/unavailable`. Elas e seus recursos estáticos precisam continuar acessíveis. Leitura pública de produto/banners não implica permissão pública para PATCH/POST de configuração. As regras devem considerar método e caminho.

## Painel e autenticação

| Rotas/métodos | Situação no código local |
| --- | --- |
| `GET /api/sales`, `/api/clients`, `/api/clients/[clientId]` | Admin; sales também rejeita `days` e aplica Fetch Metadata antes do monitoramento |
| `GET /api/analytics/{sales,pixels,funnel,paid-media,traffic-sources}` | Admin; pixels aplica Fetch Metadata antes do monitoramento |
| `/api/admin/{all-sessions,force-relogin,db-monitoring,pixel-events/cleanup}` | Admin nos métodos implementados |
| `GET /api/affiliates` | Admin |
| `GET/PUT/DELETE /api/affiliates/[affiliateId]` | Só login; falta validar papel ou vínculo com o afiliado |
| `GET/POST /api/recipients`; `GET/PUT/DELETE /api/recipients/[recipientId]` | Só login; falta validar papel ou vínculo com o recebedor |
| `/api/recipients/all`, `/api/recipients/sync`, `POST /api/recipients/[recipientId]/{reset-password,logout-all}` | Admin; GET de reset-password retorna 405 |
| `POST /api/checkout-settings/banners`, `POST /api/upload-url` | Só login; consumidores encontrados são configurações administrativas; GET de upload retorna 405 |
| `GET /api/products` | Sem login; consumidores encontrados são my-links, tabela de transações e geração de links do painel. Candidato a exigir sessão de admin/afiliado; checkout usa produto por ID |
| `PATCH /api/products/[productId]`, `DELETE /api/coupons/[couponId]` | Admin |
| `POST /api/pixels`, `PATCH/DELETE /api/pixels/manage/[pixelId]`, `POST .../test` | Admin |
| `GET /api/transactions`, `GET /api/dashboard/metrics` | Login; restringem resultados por afiliado quando role é affiliate. Revisar tratamento de outros papéis |
| `GET /api/transactions/[transactionId]` | Admin ou afiliado dono da transação |
| `POST /api/transactions/[transactionId]/refund` | Admin |
| `/api/user/{affiliate,sessions,logout-all,change-password}` | Sessão, operações relativas ao usuário logado |
| `/api/integrations/google-ads/{config,sync,sync-logs}` | Admin nos métodos implementados |
| `/api/integrations/facebook-ads/{accounts,config,connect,disconnect,sync,sync-logs}` | Admin nos métodos implementados |
| `/api/auth/[...nextauth]` | Entrada de login/sessão/CSRF etc.; login precisa funcionar sem sessão prévia. Limitar tentativas antes de consultar banco |
| `/api/auth/admin-password` | Senha auxiliar e limite em memória, sem sessão; não é o login principal |
| `/api/auth/force-logout` | Logout/limpeza de cookies, sem sessão obrigatória |

Os consumidores de `/api/sales` estão em `clientes/_components/sales-table.tsx` (listagem e exportações). Os componentes de analytics compartilham `analytics-cache.ts` para `/api/analytics/pixels`. Cache no navegador não limita clientes externos.

O `middleware.ts` exclui `/api` do matcher. As restrições de páginas administrativas não se aplicam automaticamente às APIs: dependem dos checks de cada handler. Server Actions de produtos, cupons e configurações têm verificações próprias de admin e não passam por `/api`; precisam entrar no desenho de restrição do painel também.

## Integrações que precisam de regras próprias

| Rota | Autorização atual | Observação |
| --- | --- | --- |
| `POST /api/webhooks/pagarme` | HMAC apenas se `PAGARME_WEBHOOK_SECRET` existir | Sem segredo, o código aceita sem verificar assinatura. Confirmar configuração de produção e compatibilidade com o provedor antes de tornar obrigatório |
| `GET /api/cron/sync-facebook-ads` | Bearer apenas se `CRON_SECRET` existir | Sem segredo, o código permite execução. Não foi encontrado `vercel.json`; agendamento real não confirmado |
| `GET /api/integrations/facebook-ads/callback` | Compara state da URL com cookie OAuth | Retorno pelo navegador vindo do Facebook; não aplicar same-origin estrito indiscriminadamente. Revisar vínculo com sessão admin e consumo único do state |

Saídas do servidor para Pagar.me, Meta, Google Ads e API de consumo Neon não são IPs de usuários entrando no painel. A conexão ao Neon também vem do servidor, não diretamente do comprador. Não usar IPs de compradores como allowlist do banco.

Há uma chamada servidor-servidor na exclusão de afiliado para `/api/recipients/[id]`, sem encaminhar sessão e sem verificar resposta. Ela já não satisfaz a autenticação atual; uma regra global de origem/IP não deve ser usada para contornar esse problema.

## Achados prioritários

1. Login de credenciais consulta banco em cada tentativa e não possui rate limit no código analisado. A proteção de `/api/auth/admin-password` é outra rota.
2. Login e recusas de sessão executados dentro do monitoramento podem gerar escrita de amostra. Para evitar acordar o banco, rejeitar no firewall ou antes de autenticação/monitoramento.
3. Recebedores e afiliados por ID têm lacunas de autorização mesmo com sessão válida. Banners POST e upload também não verificam admin. Corrigir permissões antes de considerar que qualquer usuário autenticado está autorizado.
4. `GET /api/products` está público sem consumidor público encontrado no repositório.
5. Webhook e cron permitem execução sem segredo configurado. Isso é uma condição identificada no código, não prova de ausência de configuração em produção.
6. O login não testa `user.active`; desativar uma conta não substitui bloquear autenticação/revogar sessões no estado atual.

## Política proposta, sem ativação nesta análise

- APIs privadas: autenticação e autorização por papel/recurso. Rejeitar token ausente/inválido antes de banco quando possível. Token válido localmente não prova que a sessão continua válida após troca de senha; manter verificação de revogação.
- Login: limite distribuído na entrada, antes de `authorize` e da coleta de amostra. Não exigir login prévio para fazer login.
- Contenção imediata: negar IP confirmado da automação somente nas rotas atacadas, incluindo callback/credentials. Considerar IP compartilhado e mudança de IP.
- Allowlist de redes: viável para um painel de equipe com IP fixo/VPN. Usar `caminho privado AND IP fora da lista => Deny`, incluindo páginas e APIs selecionadas; não usar bloqueio global do domínio. Não depender só de hostname, deixando URL alternativa do deployment desprotegida.
- Afiliados/usuários móveis: autenticação, autorização e limites; não lista inferida de IPs de login. Se a rede restrita for requisito, precisam acessar pela VPN autorizada.
- Checkout: manter acesso público às rotas/métodos listados, com limites apropriados ao fluxo. Evitar challenge genérico em APIs de pagamento/webhooks.
- Serviços: credenciais próprias, sem depender de sessão de admin nem de uma lista arbitrária de IPs.

Antes de ativar allowlist faltam: IP/CIDR público de saída das redes autorizadas (IPv4/IPv6), confirmação de acesso de afiliados/celulares/VPN e IP/horário/caminho das tentativas nos eventos Vercel. Não pedir senhas, cookies, tokens nem corpos de pagamentos.

Critérios de validação posteriores: login autorizado; rejeição sem execução da função nas rotas bloqueadas; afiliado sem acesso administrativo; checkout e status PIX de rede externa; webhook válido e inválido; callback OAuth; comparação do compute/transferência no mesmo intervalo UTC. Somente o bloqueio de tentativas não garante queda do compute se outros acessos continuarem mantendo o banco ativo.

Referências consultadas: [condições e ações do WAF Vercel](https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration), [rate limiting no WAF](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting). Disponibilidade e limites dependem do plano Vercel, que não foi confirmado; Launch informado é o plano Neon.
