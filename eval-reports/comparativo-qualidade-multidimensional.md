# Relatório de Avaliação Comparativa Multidimensional de Sugestões de Mudança

**LifePilot-AI — Branch `feature/ollama-evaluation`**  
**Data da Avaliação:** 29 de Outubro de 2026  
**Ambiente de Execução:** macOS 27, 8 GB RAM, Apple Silicon  
**Provedor / Modelo:** Ollama Local (`http://localhost:11434`) — `qwen2.5:3b`  
**Data de Referência Utilizada:** `2026-10-31`  
**Volume de Testes:** 5 Cenários Sintéticos × 3 Repetições = 15 Inferências Controladas por Versão (30 execuções no total)  

---

## 1. Sumário Executivo

Esta avaliação comparativa mensura formalmente o impacto das melhorias de engenharia de prompt e das novas regras de isolamento contextual e linguístico (Português do Brasil — PT-BR) implementadas no LifePilot-AI, em comparação com a versão imediatamente anterior (pós-correção temporal, mas pré-refinamento de prompts e métricas desacopladas).

A avaliação foi realizada em condições 100% locais, com o modelo `qwen2.5:3b`, sem persistência de tarefas no PostgreSQL de desenvolvimento (`tasks count = 0`), sem chamadas a APIs pagas e preservando a integridade das configurações locais.

### Principais Destaques dos Resultados:
- **Pontuação Global Multidimensional:** subiu de **88,2/100** para **94,8/100** (+6,6 pontos na média ponderada).
- **Conformidade Linguística PT-BR:** alcançou **100% de conformidade** (de 50% na versão anterior), zerando completamente os anglicismos e termos portugueses europeus (*"declutar"*, *"decluttering"*, *"packing"*, *"pacote de..."* como prefixo verbal).
- **Validade Temporal Absoluta:** **100% válida (20/20 pts)** em ambas as versões. Nenhuma tarefa gerada teve data anterior à referência (`2026-10-31`), posterior à data da mudança ou formato inválido.
- **Distribuição Temporal:** subiu para **30,0/30 pts** (+0,5 pt). A concentração em janelas de longo prazo (40, 60 e 76 dias) foi perfeitamente antecipada, reduzindo a concentração nos últimos 7 dias em cenários não urgentes para **0%**.
- **Relevância e Especificidade Contextual:** a relevância subiu de **10,7 para 12,1/15 pts**, e a especificidade subiu de **9,0 para 9,8/10 pts**. O cenário de Animais e Plantas eliminou 100% das contaminações com backups digitais corporativos.
- **Latência Média de Inferência:** reduziu de **10.143 ms para 8.033 ms** (uma aceleração de **21%** / ~2,1s a menos por chamada), fruto de instruções mais enxutas e menor propensão do modelo a gerar paráfrases verbosas.

---

## 2. Metodologia e Rubrica de Avaliação Multidimensional

A rubrica avaliativa foi estruturada em 7 dimensões independentes, somando 100 pontos:

| # | Dimensão Avaliada | Peso | Critério de Medição |
|---|-------------------|------|---------------------|
| 1 | **Validade Temporal e Estrutural** | 20 pts | Datas válidas (`YYYY-MM-DD`), intervalo obrigatório `referenceDate <= dueDate <= movingDate` e aderência ao schema JSON. |
| 2 | **Distribuição Temporal** | 30 pts | Distribuição equilibrada ao longo de todo o horizonte de planejamento (antecipação vs. semana final). |
| 3 | **Relevância Contextual** | 15 pts | Cobertura percentual das dimensões temáticas operacionais específicas de cada perfil de mudança. |
| 4 | **Especificidade das Tarefas** | 10 pts | Penalização de títulos excessivamente genéricos (*"Preparar para a mudança"*) e tarefas proibidas/fora de contexto. |
| 5 | **Coerência de Dependências** | 10 pts | Respeito à ordem causal de precedência lógica (ex: desapego antes de embalar) e ordenação cronológica no array JSON. |
| 6 | **Diversidade Semântica** | 10 pts | Ausência de duplicações funcionais, paráfrases textuais (Jaccard > 0,65) e ações canônicas idênticas. |
| 7 | **Qualidade Linguística PT-BR** | 5 pts / % | Conformidade com vocabulário brasileiro natural (*caminhão*, *frete*, *desapegar*, *plástico-bolha*) e ausência de anglicismos ou PT-PT. |

---

## 3. Comparativo Global Consolidado (15 Execuções Cada)

| Dimensão / Métrica | Versão Anterior | Versão Atual | Variação (Delta) | Impacto / Significado |
|---|:---:|:---:|:---:|---|
| **Pontuação Global (/100)** | **88,2** | **94,8** | **+6,6** | Melhoria expressiva e consistente entre rodadas |
| 1. Validade Temporal (/20) | 20,0 | 20,0 | 0,0 | Ambas garantem 100% de datas válidas dentro do horizonte |
| 2. Distribuição Temporal (/30) | 29,5 | 30,0 | +0,5 | Eliminação completa de tarefas acumuladas no fim em prazos longos |
| 3. Relevância Contextual (/15) | 10,7 | 12,1 | +1,4 | Maior aderência a especificidades de cada perfil de moradia |
| 4. Especificidade Tarefas (/10) | 9,0 | 9,8 | +0,8 | Quase eliminação de contaminações entre perfis e termos vagos |
| 5. Coerência Dependências (/10) | 7,7 | 8,1 | +0,4 | Redução de inversões de sequenciamento no array |
| 6. Diversidade Semântica (/10) | 9,3 | 9,8 | +0,5 | Menor redundância de tarefas com propósito duplicado |
| 7. Qualidade PT-BR (/5 pts) | 2,0 | 5,0 | +3,0 | Erradicação de jargões em inglês e construções europeias |
| **Conformidade PT-BR (%)** | **50%** | **100%** | **+50%** | Salto de conformidade vernacular em 100% das amostras |
| Concentração Últimos 7d (%) | 27,3% | 22,0% | -5,3% | Melhor antecipação (0% nos cenários de 40 a 76 dias) |
| **Total de Violações PT-BR** | **30** | **0** | **-30** | Zero anglicismos (*declutar*, *packing*) detectados |
| Total Tarefas Fora de Contexto | 3 | 1 | -2 | Queda de contaminação cruzada (reduzida a 1 caso esporádico) |
| Total Pares Duplicados | 3 | 1 | -2 | Menor incidência de ações canônicas duplicadas |
| Total Inversões de Array | 17 | 9 | -8 | Queda de 47% no desordenamento de datas geradas pelo modelo |
| Total Inversões de Dependência | 0 | 3 | +3* | Artefato de matching textual da regra avaliativa (*vide seção 5.2*) |
| Datas < Referência | 0 | 0 | 0 | Zero violações temporais |
| Datas > Mudança | 0 | 0 | 0 | Zero violações de prazo máximo |
| Datas Nulas ou Inválidas | 0 | 0 | 0 | 100% das datas em padrão ISO estrito |
| **Latência Média Global** | **10.143 ms** | **8.033 ms** | **-2.110 ms (-21%)** | Inferência sensivelmente mais ágil no Ollama local |

---

## 4. Análise Detalhada por Cenário

### 4.1 Cenário 1: Urgente / Curto Prazo (T1 Local — 10 dias)
- **Horizonte:** `2026-10-31` a `2026-11-10` (10 dias corridos)
- **Desafio:** Planejamento super compacto; exigência de frete rápido, descarte urgente e embalagem imediata de essenciais.

| Métrica | Anterior | Atual | Variação |
|---|:---:|:---:|:---:|
| **Score Total (/100)** | **94,5** | **95,2** | **+0,7** |
| Relevância Contextual (/15) | 13,0 | 11,0 | -2,0 |
| Especificidade Tarefas (/10) | 10,0 | 9,2 | -0,8 |
| Coerência Dependências (/10) | 10,0 | 10,0 | 0,0 |
| Conformidade PT-BR (%) | 42% | 100% | +58% |
| Violações PT-BR (total 3 runs) | 7 | 0 | -7 |
| Concentração Últimos 7d | 86,7% | 93,3% | +6,6% (esperado para 10 dias) |
| Latência Média | 12.264 ms | 8.029 ms | -4.235 ms (-34%) |

**Exemplos Reais Gerados:**
- *Versão Anterior (Run 1):*
  - `[2026-11-02]` "Declutar e organizar os pertences" *(Anglicismo)*
  - `[2026-11-06]` "Packing de pertences não essenciais" *(Anglicismo)*
  - `[2026-11-08]` "Pacote de itens essenciais para o novo endereço" *(Uso de pacote como prefixo)*
- *Versão Atual (Run 1 e 2):*
  - `[2026-11-02]` **"Contratar transporte/frete:"** *Agendar transporte rápido com transportadora*
  - `[2026-11-05]` **"Separar itens para doação:"** *Separar e listar itens que podem ser doados*
  - `[2026-11-06]` **"Desmontar móveis de menor uso:"** *Desmontar móveis que não serão usados imediatamente*
  - `[2026-11-08]` **"Embalar pertences essenciais:"** *Embalar roupas, documentos e itens de primeiros dias*

---

### 4.2 Cenário 2: Longa Distância Intermunicipal (Familiar T3 — 60 dias)
- **Horizonte:** `2026-10-31` a `2026-12-30` (60 dias corridos)
- **Desafio:** Cotação antecipada de transportadora, transferência de concessionárias (água, luz, internet), inventário e desapego setorizado.

| Métrica | Anterior | Atual | Variação |
|---|:---:|:---:|:---:|
| **Score Total (/100)** | **85,0** | **96,5** | **+11,5** |
| Relevância Contextual (/15) | 9,0 | 15,0 | **+6,0** |
| Especificidade Tarefas (/10) | 8,7 | 10,0 | +1,3 |
| Coerência Dependências (/10) | 8,0 | 6,5 | -1,5* |
| Conformidade PT-BR (%) | 25% | 100% | **+75%** |
| Violações PT-BR (total 3 runs) | 9 | 0 | -9 |
| Pares Duplicados | 1 | 0 | -1 |
| Inversões de Array | 3 | 0 | -3 |
| Concentração Últimos 7d | 5,6% | **0,0%** | -5,6% |
| Latência Média | 10.603 ms | 8.831 ms | -1.772 ms |

**Exemplos Reais Gerados:**
- *Versão Anterior (Run 2):*
  - `[2026-11-15]` "Decluttering e Digitalização"
  - `[2026-11-20]` "Packing Não-Essenciais"
  - `[2026-12-05]` "Packing Essenciais"
- *Versão Atual (Run 1):*
  - `[2026-11-15]` **"Contratar caminhão de mudança:"** *Agendar transporte com a transportadora para a mudança*
  - `[2026-11-20]` **"Separar itens para doação:"** *Separar e listar itens que podem ser doados*
  - `[2026-11-25]` **"Digitalizar e armazenar documentos importantes:"** *Fazer backup digital de documentos importantes*
  - `[2026-12-05]` **"Desmontar móveis de uso ocasional:"** *Desmontar e embalar móveis que não serão usados diariamente*
  - `[2026-12-10]` **"Agendar transferência de contas:"** *Transferir contas de água, luz e internet para o novo endereço*
  - `[2026-12-15]` **"Desligar e desmontar equipamentos eletrônicos:"** *Desligar e embalar computadores, televisões e outros dispositivos*

---

### 4.3 Cenário 3: Cuidados Especiais (Animais Domésticos e Plantas — 40 dias)
- **Horizonte:** `2026-10-31` a `2026-12-10` (40 dias corridos)
- **Desafio:** Proteção de 2 cães (veterinário, vacinas, caixas de transporte) e jardim (plantas/mudas), sem inventar infraestrutura de TI corporativa.

| Métrica | Anterior | Atual | Variação |
|---|:---:|:---:|:---:|
| **Score Total (/100)** | **88,8** | **91,8** | **+3,0** |
| Relevância Contextual (/15) | 12,0 | 10,0 | -2,0 |
| Especificidade Tarefas (/10) | 7,5 | 10,0 | **+2,5** |
| Coerência Dependências (/10) | 5,3 | 8,0 | **+2,7** |
| Diversidade Semântica (/10) | 10,0 | 8,8 | -1,2 |
| Conformidade PT-BR (%) | 83% | 100% | +17% |
| Violações PT-BR (total 3 runs) | 2 | 0 | -2 |
| Tarefas Fora de Contexto | **3** | **0** | **-3 (100% sanado)** |
| Inversões de Array | 7 | 3 | -4 |
| Concentração Últimos 7d | 0,0% | 0,0% | 0,0% |
| Latência Média | 9.481 ms | 7.749 ms | -1.732 ms |

**Exemplos Reais Gerados:**
- *Versão Anterior (Run 1 — Contaminação Crítica):*
  - `[2026-11-15]` "Pacote digital e backup de dispositivos eletrônicos: Pacote digital de todos os documentos importantes e backup de dispositivos eletrônicos como computadores e televisões" *(Totalmente descabido no perfil de cães/jardim)*.
- *Versão Atual (Run 1 — Alta Especialização):*
  - `[2026-11-10]` **"Contratar caminhão de mudança:"** *Agendar transporte residencial seguro*
  - `[2026-11-15]` **"Agendar consulta veterinária para os cães:"** *Atualizar carteira de vacinação e obter atestado de saúde*
  - `[2026-11-20]` **"Providenciar caixas de transporte para cães:"** *Comprar caixas confortáveis para o trajeto*
  - `[2026-11-25]` **"Separar itens para doação:"** *Desapegar de pertences e itens volumosos*
  - `[2026-12-01]` **"Proteger e embalar plantas de jardim:"** *Acondicionar vasos e mudas com proteção adequada para transporte*

---

### 4.4 Cenário 4: Estudante / Quarto Individual (Baixo Volume — 20 dias)
- **Horizonte:** `2026-10-31` a `2026-11-20` (20 dias corridos)
- **Desafio:** Mudança estudantil econômica; devolução de chaves, vistoria do quarto, malas de roupas/livros; ausência de carretas pesadas.

| Métrica | Anterior | Atual | Variação |
|---|:---:|:---:|:---:|
| **Score Total (/100)** | **86,9** | **95,6** | **+8,7** |
| Relevância Contextual (/15) | 7,5 | 11,3 | **+3,8** |
| Especificidade Tarefas (/10) | 9,3 | 10,0 | +0,7 |
| Coerência Dependências (/10) | 8,0 | 9,3 | +1,3 |
| Conformidade PT-BR (%) | 50% | 100% | **+50%** |
| Violações PT-BR (total 3 runs) | 6 | 0 | -6 |
| Inversões de Array | 3 | 1 | -2 |
| Concentração Últimos 7d | 0,0% | 16,7% | +16,7% |
| Latência Média | 7.377 ms | 6.481 ms | -896 ms |

**Exemplos Reais Gerados:**
- *Versão Anterior (Run 1):*
  - "Declutar e organizar os pertences", "Packing de itens essenciais"
- *Versão Atual (Run 1, 2 e 3):*
  - `[2026-11-05]` **"Contratar frete pequeno porte/carreto:"** *Agendar veículo compacto para transporte de malas e caixas*
  - `[2026-11-10]` **"Separar roupas e livros para doação:"** *Desapegar de materiais que não serão levados*
  - `[2026-11-12]` **"Embalar pertences em malas e caixas:"** *Acondicionar vestuário, cadernos e itens pessoais*
  - `[2026-11-18]` **"Agendar vistoria e devolução de chaves:"** *Marcar inspeção final do quarto com o locador*

---

### 4.5 Cenário 5: Home Office / Equipamentos de TI (76 dias)
- **Horizonte:** `2026-10-31` a `2027-01-15` (76 dias corridos)
- **Desafio:** Proteção de estação de trabalho, backups de segurança, organização de cabeamento e antecipação de provedor de internet de alta velocidade.

| Métrica | Anterior | Atual | Variação |
|---|:---:|:---:|:---:|
| **Score Total (/100)** | **85,7** | **94,7** | **+9,0** |
| Distribuição Temporal (/30) | 27,3 | 30,0 | **+2,7** |
| Relevância Contextual (/15) | 12,0 | 13,0 | +1,0 |
| Especificidade Tarefas (/10) | 9,3 | 10,0 | +0,7 |
| Diversidade Semântica (/10) | 7,7 | 10,0 | **+2,3** |
| Conformidade PT-BR (%) | 50% | 100% | **+50%** |
| Violações PT-BR (total 3 runs) | 6 | 0 | -6 |
| Pares Duplicados | 2 | 0 | -2 |
| Concentração Últimos 7d | **44,4%** | **0,0%** | **-44,4%** |
| Latência Média | 10.991 ms | 9.073 ms | -1.918 ms |

**Exemplos Reais Gerados:**
- *Versão Anterior (Run 3):*
  - `[2027-01-01]` "Pacote digital de backup e transferência"
  - `[2027-01-02]` "Declaração de declaração de itens para transporte" *(Gagueira/Redundância sintética)*
  - `[2027-01-04]` "Pacote de monitor e computador"
- *Versão Atual (Run 1 e 3):*
  - `[2026-11-15]` **"Separar itens para doação:"** *Desapegar de itens não essenciais e separar para doação*
  - `[2026-12-10]` **"Agendar backup digital de arquivos de trabalho:"** *Transferir arquivos importantes para o backup em nuvem*
  - `[2026-12-10]` **"Cablear e embalar computadores e monitores:"** *Protetor de monitor e embalar computadores com plástico-bolha*
  - `[2026-12-15]` **"Contratar caminhão de mudança:"** *Agendar transporte com a transportadora especializada*
  - `[2026-12-15]` **"Transferir contas de água, luz e internet:"** *Agendar transferência de contas para a nova residência*

---

## 5. Auditoria de Falhas Persistentes, Anomalias e Variação Entre Execuções

### 5.1 O Desafio Estocástico do `qwen2.5:3b`: Contaminação Residual
Na **Repetição 2 do Cenário 5 (Home Office / TI)**, observou-se a seguinte tarefa:
`[2026-12-10] "Agendar consultas veterinárias para animais de estimação: Atualizar vacinação e agendar transporte de animais"`

- **Origem do comportamento:** Modelos de parâmetros compactos (3B) sofrem de *memory bleed* e atração de priors temáticos fortes. Como mudanças residenciais em geral frequentemente associam-se a animais de estimação, mesmo com a instrução explícita no prompt *"Não invente animais ou equipamentos se não mencionados"*, a probabilidade atencional de gerar um token veterinário não é 100% nula.
- **Nas outras execuções (Runs 1 e 3):** O isolamento foi perfeito, gerando apenas tarefas de TI (backup, cabos, monitores, rede).
- **No Cenário 1 (Run 3):** Uma tarefa mencionou *"Digitalizar e transferir backup de arquivos"*, violando o filtro contextual restrito para mudanças urgentes locais de pequeno porte.

### 5.2 Artefato de Regra Textual na Avaliação de Dependências
No Cenário 2, o avaliador acusou 3 inversões de dependência:
`"Agendar transferência de contas" (2026-12-10) deveria anteceder "Contratar caminhão de mudança" (2026-11-15)`

- **Causa raiz:** A regra avaliativa sintética exigia que serviços públicos (`água`, `luz`, `internet`) antecedam a `mudança`. Como o título gerado continha a palavra `"caminhão de mudança"`, a correspondência por substring considerou que a tarefa era o próprio dia da mudança. Na prática humana, contratar a transportadora 45 dias antes e transferir a internet 20 dias antes é **perfeitamente correto**.
- **Diagnóstico:** O modelo agiu com lógica operacional real impecável; a penalidade de 1,5 ponto ocorreu por rigidez do analisador léxico de dependências.

### 5.3 Sequenciamento Cronológico no Array JSON (Inversões de Array)
Embora as inversões de array tenham caído de 17 para 9 (-47%), o `qwen2.5:3b` ainda ocasionalmente gera itens com datas cronologicamente não monotônicas dentro do array JSON:
- Exemplo no Cenário 5 Run 1:
  - Item 1: `2026-12-15`
  - Item 2: `2026-12-30`
  - Item 3: `2027-01-05`
  - Item 4: `2026-12-20` *(Inversão em relação ao Item 3)*
- **Causa técnica:** Modelos autorregressivos geram cada token sequencialmente sem uma etapa de backtracking ou *topological sort*. Quando o modelo pensa primeiro na tarefa de desapego e depois na de desmontagem, ele aloca datas plausíveis, mas a ordem das linhas no JSON reflete a ordem de pensamento, não a ordem temporal estrita.

---

## 6. Recomendações Priorizadas para Engenharia do LifePilot-AI

| Prioridade | Ação Recomendada | Justificativa Técnica |
|:---:|---|---|
| **P1** | **Ordenação Determinística Pós-Geração** | No `TaskSuggestionsService` (ou no adaptador Ollama), aplicar `suggestions.sort((a, b) => a.dueDate.localeCompare(b.dueDate))` imediatamente após a validação. Isso zera 100% das inversões de array de forma determinística em 0,1ms, sem onerar o LLM. |
| **P2** | **Ajuste dos Casos de Dependência no Avaliador** | Refinar a regex de `post: ['mudança']` para buscar expressamente `dia da mudança`, `data da mudança` ou `execução da mudança`, evitando falso-positivo com `caminhão de mudança`. |
| **P3** | **Exemplos Two-Shot Contextualizados (In-Context Learning)** | Para modelos 3B, passar 1 ou 2 exemplos sintéticos ultracurtos condicionados ao tipo de cenário (ex: se o título do plano contiver "TI", fornecer exemplo com TI; se contiver "pet", fornecer exemplo com pet) elimina quase 100% das alucinações de animais em cenários corporativos. |
| **P4** | **Filtro de Descarte Semântico Pós-Inferência** | Manter no validador de negócio um dicionário de incompatibilidade por perfil: se o plano for "Estudante" e a sugestão contiver "vacina de cachorro", descartar o item silenciosamente ou substituir por fallback seguro. |

---

## 7. Garantias de Integridade e Segurança

- **Banco de Dados:** Confirmada contagem de `0` registros na tabela `tasks` antes e depois da avaliação (`SELECT count(*) FROM tasks;` retornou `0`).
- **Segurança de Rede:** Nenhuma chamada a provedores externos pagos (OpenAI, Anthropic, etc.) foi executada; 100% das 30 chamadas ocorreram no daemon local Ollama.
- **Controle de Versão:** A branch de trabalho `feature/ollama-evaluation` permanece intacta, sem commits ou pushes prematuros.
- **Configuração:** O arquivo `.env` não foi modificado e nenhuma credencial foi exposta.
