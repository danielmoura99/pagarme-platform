# Monitoramento do banco

A página `/monitoring` e a API `/api/admin/db-monitoring` exigem sessão administrativa válida.
O acesso à página é direto pela URL; ela não aparece no menu lateral.

## Ativação

1. Aplique a migration `20260930120000_add_db_monitoring`. Em bancos com histórico de migrations divergente, `node scripts/setup-db-monitoring.cjs` cria **somente** as tabelas aditivas e o índice do monitoramento, de forma idempotente. Esse comando não reconcilia o histórico de migrations anteriores.
2. Configure no servidor (local e hospedagem separadamente):

```dotenv
DB_MONITOR_ENABLED=true
DB_MONITOR_SAMPLE_RATE=0.1
NEON_API_KEY=...
NEON_PROJECT_ID=...
NEON_ORG_ID=...
```

Nunca use `NEXT_PUBLIC_` para essas variáveis. Reinicie a aplicação após configurá-las. `DB_MONITOR_ENABLED=false` desliga a coleta sem apagar o histórico. A chave deve pertencer à organização e permitir leitura das métricas do projeto.

## Medição

Cada requisição de API tem probabilidade independente de 10% de ser amostrada. Um contexto AsyncLocalStorage associa suas operações Prisma à rota estática, sem IDs, query strings, argumentos, SQL, tokens ou dados pessoais. Todas as operações concluídas dentro da requisição amostrada são contadas, incluindo autenticação, raw SQL e resultados de escrita. Relacionamentos fazem parte do tamanho do resultado da operação principal; uma operação não corresponde necessariamente a uma consulta SQL.

O tamanho é o JSON UTF-8 do resultado materializado do Prisma (BigInt convertido em string). É uma aproximação, não a medição do protocolo do banco. Includes podem repetir objetos no resultado do ORM; serialização e protocolo têm custos diferentes. Nada do conteúdo serializado é persistido. O painel mostra bytes observados e extrapolados por `1 / taxa`, com alerta para amostras pequenas. Dados anteriores à ativação não podem ser reconstruídos por rota.

Cobertura: handlers de API em `app/api/**/route.ts`, inclusive NextAuth. O monitoramento em si, respostas estáticas de método não suportado, páginas servidor, Server Actions, scripts externos e tarefas destacadas que continuam após a resposta não são medidos. Novas APIs devem usar `withDbMonitoring("GET /api/rota/[id]", handler)`. Use a rota estática, nunca a URL da requisição.

## Persistência e custo

Uma requisição amostrada gera uma inserção com operações agregadas em JSON, aguardada antes do encerramento do handler. Não há timer de coleta, buffer em memória dependente da sobrevivência da instância nem chamadas regulares para acordar o banco. A transação tem timeout de 2 segundos, espera máxima de 1 segundo e limite SQL de 1 segundo. Falhas de telemetria não mudam o resultado do pagamento; interrompem tentativas por 60 segundos por instância e emitem aviso genérico no log. Amostras podem se perder durante falhas ou encerramento abrupto. O painel mostra a última amostra, mas não comprova cobertura contínua.

Em aproximadamente 1% das gravações amostradas, a retenção remove até 1.000 amostras com mais de 30 dias e caches antigos. Sem tráfego a limpeza fica adiada. A gravação, o painel e a coleta têm custo próprio no Neon e não entram no ranking, portanto a soma não deve ser interpretada como reconciliação exata da fatura.

`VERCEL_ENV` separa production/preview/development; fora da Vercel usa NODE_ENV. A API Neon mostra o projeto completo, e não cada ambiente da aplicação. Cache persistente por intervalo/projeto durante 15 minutos. Dias em UTC; o dia atual e dados recentes podem estar incompletos. O histórico Neon é independente da coleta local.

## Validação e uso

`node scripts/test-db-monitoring.cjs` verifica isolamento de requisições concorrentes, amostragem, serialização e preservação dos resultados/erros quando a telemetria falha. `npx tsc --noEmit` verifica os tipos.

Após o deploy, use a aplicação normalmente, escolha Produção e acompanhe a cobertura. Compare pelo menos alguns dias de uso e priorize rotas com volume alto e amostra suficiente. Investigue também períodos sem amostras: não significam consumo zero. A primeira versão não atribui todo o tráfego do projeto nem substitui logs da hospedagem.
