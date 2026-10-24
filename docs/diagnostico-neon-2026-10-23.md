# Diagnóstico do consumo Neon — 23/10/2026

Consultas somente de leitura no PostgreSQL e na API do Neon; nenhuma alteração de capacidade, consultas de negócio, sessões ou dados. Dia 23 ainda parcial. Valores decimais de MB/GB. A coleta de aplicação usa amostragem de 10%; seus bytes medem JSON do resultado Prisma e não o protocolo PostgreSQL.

Referência de código inicialmente examinada: commit `7f4bdcb`. Ao final da investigação surgiram alterações locais em vendas e analytics, incluindo seleção de campos e cache, realizadas fora desta investigação. Elas foram preservadas; não foi confirmado deploy dessas alterações. Os achados históricos e os testes de volume se referem ao comportamento anterior, explicitamente reproduzido nas consultas de teste.

## Comparação de períodos iguais

| Janela UTC | Network real | Compute real |
|---|---:|---:|
| 01–23/09 | 10,0198 GB | 85,6408 CU-h |
| 01–30/09 | 16,1681 GB | 133,3264 CU-h |
| 01–23/10 | 9,3235 GB | 356,8056 CU-h |

Outubro não ultrapassou setembro em transferência nessa comparação: queda de aproximadamente 7%. Compute cresceu aproximadamente 317%. Os dias finais das janelas têm cobertura diferente: outubro ainda está em andamento, setembro está fechado.

O endpoint atual está fixo em 1 CU (mínimo=máximo=1), com suspensão após 300 segundos. Isso torna 1 hora ativa equivalente a 1 CU-h na configuração atual. Não há histórico suficiente para assumir que essa configuração permaneceu igual durante todos os períodos. Uma mudança de 0,25 CU para 1 CU explicaria um fator de quatro mesmo com atividade semelhante; é hipótese, não alteração confirmada. O endpoint legado de consumo retornou HTTP 403 para o plano atual; métricas v2 de consumo funcionam.

## Vendas versus releituras

Pedidos criados, agrupados por mês UTC no banco atual:

| Mês | Pedidos | Status atual paid |
|---|---:|---:|
| Agosto | 612 | 435 |
| Setembro | 282 | 197 |
| Outubro até a consulta | 190 | 140 |

Outubro é parcial e status atuais não reconstituem necessariamente o status no fechamento de cada mês. O volume de consultas de relatórios não depende diretamente do número de novas vendas.

## Concentração de transferência estimada

| Rota | Amostras | Chamadas extrapoladas | Resultado Prisma extrapolado |
|---|---:|---:|---:|
| GET /api/sales | 2.260 | 22.600 | 9,128 GB |
| GET /api/analytics/pixels | 3.367 | 33.670 | 2,594 GB |
| GET /api/transactions | 61 | 610 | 83 MB |

Order.findMany em vendas representa 9,107 GB estimados. PixelEventLog.findMany em analytics representa 2,305 GB estimados. Os totais estimados não conciliam exatamente com a fatura, pois serialização, repetição de relacionamentos no ORM e amostragem diferem dos bytes reais.

## Evidências de consultas recorrentes

- Todas as 2.260 amostras de vendas incluem atualização de sessão válida. Analytics exige administrador; 3.365 de 3.367 amostras incluem atualização de sessão. Não é explicado apenas por robôs anônimos acessando URLs públicas.
- Vendas e analytics têm amostras em todas as horas do dia. Em 17/10, entre 00h e 06h de Brasília, houve 78 amostras de vendas e 111 de analytics: aproximadamente 1.890 chamadas extrapoladas dessas duas rotas.
- Entre 17 e 19/10 UTC, intervalos entre amostras consecutivas de vendas apresentam picos em 62 segundos (55 ocorrências), 63 (29), 124 (26), 125 (25), 126 (25), 186–188 e 249–252. A amostragem omite requisições intermediárias; esse padrão é compatível com uma rotina recorrente em torno de um minuto. Não identifica quem a executa nem prova um intervalo exato.
- Há 122 amostras com exatamente 634.643 bytes entre 17 e 18/10, além de outros tamanhos repetidos dezenas de vezes. Igualdade de tamanho não prova igualdade de conteúdo, mas reforça a hipótese de releituras de resultados estáveis.
- O código de vendas não possui polling: busca ao montar, mudar filtros e paginar/exportar. DateProvider mantém o intervalo em useState; o date picker só chama onChange em interações. Não foi encontrado um loop de atualização automático nessas dependências.
- A tela /analytics monta resumo e lista, ambos chamando /api/analytics/pixels, mas não há temporizador nesses componentes. Paginar refaz todas as agregações. A duplicação explica parte do trabalho, mas não milhares de chamadas de uma aba simplesmente aberta.
- Rotas auxiliares apresentam poucas chamadas: apenas 10 amostras em /api/affiliates, 5 em /api/clients, 4 em paid-media e 2 em traffic-sources. Isso é pouco compatível com milhares de recarregamentos completos dessas páginas; acesso direto às APIs ou reutilização de páginas são hipóteses mais fortes.
- Entre as sessões usadas em outubro existem 7 administrativas com User-Agent Headless, além de Chrome/Safari e sessões de afiliados. Headless pode ser automação legítima. Como o monitor não associa amostras a sessões, não é possível atribuir o tráfego a essas sessões ou afirmar acesso indevido.

## Teste controlado de volume de vendas

Foi executada, em transação somente de leitura, a mesma consulta de relacionamentos da API para os pedidos de outubro, sem expor seus dados no relatório:

| Consulta | Linhas | JSON do resultado |
|---|---:|---:|
| Completa, limite 50 | 50 | 295.005 bytes |
| Completa, limite 100 | 100 | 626.648 bytes |
| Completa, limite 200 | 190 | 1.159.645 bytes |
| Apenas campos usados, os mesmos 100 pedidos | 100 | 54.648 bytes |

O tamanho de 626.648 bytes coincide exatamente com uma amostra real de 23/10. É evidência consistente com consultas de 100 pedidos; os parâmetros originais não foram armazenados, então não comprova o limit solicitado. A tela comum solicita 50. Exportações solicitam limit=999999 e export=true, mas essas variantes não são distinguidas pelo monitor.

A seleção de campos reduziu o resultado em 91,3% nesse teste. A consulta completa traz pagarmeResponse, demais campos de Order e relacionamentos completos, incluindo User, e descarta muitos deles ao construir o JSON HTTP. A economia medida é do resultado Prisma da consulta testada, não uma promessa de economia de 91,3% na conta inteira.

## Compute, monitoramento e demais custos

- Consultas recorrentes em intervalos menores que cinco minutos podem impedir a suspensão do compute. Isso explica por que poucas vendas não significam poucas CU-h.
- O monitor gravou aproximadamente 8.028 amostras, ocupando 7,6 MB com índices. Cada amostra acrescenta transação e inserção; sua gravação acontece após uma requisição que já está usando a aplicação. Não há timer de coleta em background. A limpeza é oportunística. O impacto existe e não está discriminado no ranking.
- A soma dos tempos medidos das operações na amostra é aproximadamente 1.949 segundos; extrapolada, cerca de 5,4 horas. Esses tempos incluem esperas e operações concorrentes, não medem CPU e não podem ser convertidos em CU-h. O compute faturado não é somente tempo de execução SQL.
- O painel não tem atualização periódica automática. Consultar manualmente o monitor usa banco e autenticação; a API Neon tem cache persistente de 15 minutos.
- Status PIX tem polling de 10 segundos com pausa em aba oculta/PIX expirado, mas só 54 amostras no período. Não é o maior fluxo observado.
- Não há amostras do cron de Facebook no período analisado; o código tem checagem de intervalo. Isso não prova ausência de execuções, mas não há evidência de que domine a carga.
- pg_stat_statements havia reiniciado em 23/10 às 22:55 UTC. Não permite reconstruir as consultas de todo o mês. O snapshot recente confirma a leitura completa de Order, mas não serve para atribuição histórica.
- Falta índice em OrderItem.orderId, identificada na investigação anterior, é um problema adicional de trabalho SQL; não explica por si só grandes respostas de rede.

## Limites e informações pendentes

Não há nos registros de monitoramento: parâmetros, usuário/sessão, User-Agent, IP, origem, identificador do deployment ou número de linhas por operação. Isso foi deliberado para a coleta inicial mínima, mas impede atribuição do consumidor. A instrumentação não abrange Server Actions, renderização de páginas no servidor ou scripts externos. Sem essas informações, não é honesto concluir que existe loop, automação específica ou invasão.

Solicitado ao usuário:

1. Existência de automação/extensão/painel/script que acessa as APIs ou mantém atualizações recorrentes, inclusive automações via navegador.
2. Logs da hospedagem de /api/sales e /api/analytics/pixels numa janela de 15–30 minutos: horário, parâmetros, status, User-Agent/origem e deployment quando disponíveis. Remover cookies, tokens e dados pessoais. Se históricos não estiverem disponíveis, usar uma janela atual enquanto o padrão estiver ocorrendo.
3. Confirmação de eventual mudança de capacidade do Neon perto de 30/09, especialmente de 0,25 CU para 1 CU.

## Sequência de resolução proposta

1. Identificar consumidor e necessidade de atualização com os logs. Reduzir frequência/reutilizar resposta conforme o uso real, sem impedir relatórios legítimos.
2. Selecionar apenas campos usados em vendas; separar resumo/listagem de analytics e agregar plataformas no SQL. Verificar equivalência dos resultados antes de publicar.
3. Se logs não resolverem, adicionar telemetria limitada à atribuição: motivo da chamada (lista/exportação/resumo), limite, quantidade retornada, duração do intervalo, identificador pseudônimo de sessão/consumidor e deployment. Não registrar URLs completas, SQL, tokens ou resultados pessoais.
4. Revisar capacidade mínima e suspensão com métricas de CPU/latência de pico. Não reduzir compute automaticamente sem validar a carga.
5. Comparar dias completos com mesma janela UTC e comportamento de uso, separando redução de bytes por consulta de redução de frequência e de capacidade.

Conclusão: releituras autenticadas e recorrentes de resultados grandes estão comprovadas. A assinatura temporal é compatível com automação, cuja origem ainda requer logs. O aumento de compute em relação a setembro é desproporcional à transferência e exige confirmar histórico de capacidade; a configuração atual de 1 CU e consultas recorrentes tornam o custo de horas ativas relevante.
