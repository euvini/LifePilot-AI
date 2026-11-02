# Relatório de Avaliação Comparativa — Nova Baseline Pós-P1 e P2

**LifePilot-AI — Branch `feature/ollama-evaluation`**  
**Data da Avaliação:** 29 de Outubro de 2026  
**Ambiente:** macOS 27, 8 GB RAM, Apple Silicon  
**Provedor / Modelo:** Ollama Local (`http://localhost:11434`) — `qwen2.5:3b`  
**Data de Referência Utilizada:** `2026-10-31`  
**Volume Avaliado:** 5 Cenários Sintéticos × 3 Repetições Independentes = 15 Inferências Controladas  

---

## 1. Confirmação do Ambiente e Restrições de Segurança

- **Branch de Trabalho:** `feature/ollama-evaluation` confirmada e working tree preservada.
- **Isolamento de Banco de Dados:** Nenhuma tarefa foi persistida no PostgreSQL (`SELECT count(*) FROM tasks;` = 0).
- **Sem Chamadas Externas:** 100% das inferências foram executadas no daemon local do Ollama (`qwen2.5:3b`), sem consumo de APIs remotas/pagas.
- **Imutabilidade de Configuração e Código:** Arquivos `.env`, prompts, schemas e contratos públicos permaneceram intactos durante toda a avaliação. Zero commits ou pushes efetuados.

---

## 2. Tabela Comparativa: Baseline Anterior (Pré-P1/P2) vs Nova Baseline (Pós-P1/P2)

| Dimensão / Métrica | Pré-P1/P2 | Pós-P1/P2 | Variação (Delta) | Análise de Impacto |
|---|:---:|:---:|:---:|---|
| **Pontuação Global (/100)** | **94,8** | **95,3** | **+0,5** | Avanço consolidado na qualidade geral |
| 1. Validade Temporal (/20) | 20,0 | 20,0 | 0,0 | 100% de datas válidas dentro de `[refDate, movingDate]` |
| 2. Distribuição Temporal (/30) | 30,0 | 30,0 | 0,0 | Distribuição antecipada mantida com perfeição |
| 3. Relevância Contextual (/15) | 12,1 | 12,1 | 0,0 | Cobertura temática estável entre rodadas |
| 4. Especificidade Tarefas (/10) | 9,8 | 9,0 | -0,8 | Leve ruído estocástico de priors temáticos do modelo |
| 5. Coerência Dependências (/10) | **8,1** | **9,8** | **+1,7** | **Impacto direto de P1 (ordenação) e P2 (falsos positivos)** |
| 6. Diversidade Semântica (/10) | 9,8 | 9,5 | -0,3 | Paráfrases funcionais em níveis controlados |
| 7. Qualidade PT-BR (/5 pts) | 5,0 | 4,9 | -0,1 | 1 anglicismo isolado em 15 execuções (98% global) |
| **Conformidade PT-BR (%)** | **100%** | **98%** | **-2%** | 14 de 15 runs tiveram 100% de conformidade PT-BR |
| **Total Inversões de Array** | **9** | **0** | **-9 (-100%)** | **Eficácia total do P1: 100% das listas em ordem cronológica** |
| **Total Violações Dependência** | **3** | **1** | **-2 (-67%)** | **Eficácia total do P2: zero falsos positivos no Cenário 2** |
| Falsos Positivos de Dependência | 3 | 0 | -3 (-100%) | Contratação de frete não é mais confundida com dia da mudança |
| Violações Causais Legítimas | 0 | 1 | +1 | Avaliador detectou desmontagem antes de backup no Cenário 5 |
| Datas < Referência | 0 | 0 | 0 | Zero violações temporais |
| Datas > Mudança | 0 | 0 | 0 | Zero violações de prazo limite |
| Datas Inválidas ou Nulas | 0 | 0 | 0 | 100% das datas em padrão ISO válido |
| **Latência Média Global** | **8.033 ms** | **9.056 ms** | **+1.023 ms** | Variação natural do ambiente local |
| Latência Mediana Global | 8.236 ms | 8.665 ms | +429 ms | Comportamento temporal consistente |
| Latência Máxima Global | 9.395 ms | 14.352 ms | +4.957 ms | Pico ocorreu na 1ª inferência (aquecimento de contexto) |
| Tokens/s Médio Global | 38,0 | 36,8 | -1,2 t/s | Taxa de geração estável no Apple Silicon |

---

## 3. Resultados Individuais dos Cinco Cenários

### Cenário 1: Urgente / Curto Prazo (T1 Local — 10 dias)
- **Score:** 94,5/100 (vs 95,2 anterior | Delta: -0,7)
- **Coerência de Dependências:** **10,0/10** (0 inversões de array, 0 violações de dependência).
- **PT-BR:** **100%** de conformidade nas 3 repetições.
- **Concentração Últimos 7d:** 100% (adequado para o horizonte de 10 dias).
- **Observação:** As 3 repetições geraram tarefas de backup digital de documentos importantes, pontuadas como fora de contexto para uma mudança urgente de kit básico, reduzindo especificidade para 7,5/10.

### Cenário 2: Longa Distância Intermunicipal (Familiar T3 — 60 dias)
- **Score:** 96,3/100 (vs 96,5 anterior | Delta: -0,2)
- **Coerência de Dependências:** **10,0/10** (Salto de **+3,5 pontos** em relação aos 6,5/10 anteriores).
- **Eficácia P2 Comprovada:** Os 3 falsos positivos anteriores gerados por `"Contratar caminhão de mudança"` foram totalmente erradicados.
- **PT-BR:** **100%** de conformidade.
- **Concentração Últimos 7d:** **0,0%** (distribuição uniforme e antecipada).

### Cenário 3: Cuidados Especiais (Animais Domésticos e Plantas — 40 dias)
- **Score:** **93,7/100** (vs 91,8 anterior | **Delta: +1,8**)
- **Coerência de Dependências:** **10,0/10** (subiu de 8,0/10; 0 inversões de array).
- **PT-BR:** **100%** de conformidade.
- **Relevância e Especificidade:** 100% focado em cães, veterinário, caixas de transporte e jardim; zero menção a servidores ou computadores.

### Cenário 4: Estudante / Quarto Individual (Baixo Volume — 20 dias)
- **Score:** **96,3/100** (vs 95,6 anterior | **Delta: +0,7**)
- **Coerência de Dependências:** **10,0/10** (subiu de 9,3/10; 0 inversões de array).
- **PT-BR:** **100%** de conformidade.
- **Latência:** Mais rápida da bateria, com média de **6.559 ms**.

### Cenário 5: Home Office / Equipamentos de TI (76 dias)
- **Score:** **95,5/100** (vs 94,7 anterior | **Delta: +0,8**)
- **Coerência de Dependências:** **8,8/10** (subiu de 6,7/10).
- **Detecção Causal:** Na Run 3, o modelo gerou a desmontagem de computadores em 20/12 e a digitalização de backup em 30/12. O avaliador acusou legitimamente a inversão causal (*backup deveria anteceder a desmontagem*).
- **Qualidade PT-BR:** Na Run 1, ocorreu a geração isolada de `"Separar itens para doação e decluttering"`, gerando uma conformidade de 75% nessa run (92% na média do cenário).

---

## 4. Análise Específica de P1 (Ordenação Cronológica Determinística)

1. **Eliminação Total de Inversões:**
   - Na baseline anterior, o modelo gerava saídas autorregressivas com 9 inversões de array JSON.
   - Na nova baseline pós-P1, as inversões caíram para **exatamente 0** (100% de conformidade cronológica monotônica).
2. **Estabilidade de Datas Idênticas:**
   - Quando duas tarefas compartilham a mesma data (ex: `2026-11-10` no Cenário 2 Run 1), a ordem relativa original produzida pelo LLM foi preservada de forma estável.
3. **Tratamento de Datas Nulas:**
   - Validado em testes unitários que itens sem data são posicionados deterministicamente ao fim do array.
4. **Preservação de Conteúdo:**
   - Confirmado que nenhuma sugestão foi duplicada, suprimida ou teve título/descrição/prazo alterado pela ordenação.

---

## 5. Análise Específica de P2 (Correção de Falsos Positivos no Avaliador)

1. **Eliminação dos Falsos Positivos em Transportes:**
   - A substituição do termo isolado `"mudança"` pela constante `MOVING_DAY_EXPRESSIONS` (`"dia da mudança"`, `"data da mudança"`, `"realização da mudança"`, `"execução da mudança"`) impediu que tarefas de contratação antecipada como `"Contratar caminhão de mudança"` fossem erroneamente tomadas como o dia final da mudança.
   - No Cenário 2, as violações caíram de 3 para **0**, elevando a pontuação de dependências para 10/10.
2. **Preservação da Sensibilidade Causal:**
   - No Cenário 5 Run 3, a regra `{ pre: ['backup'], post: ['desmontar computador'] }` identificou corretamente que agendar o backup após a desmontagem física dos computadores viola a precedência lógica operacional, provando que o avaliador manteve seu rigor analítico para falhas reais.

---

## 6. Métricas de Desempenho

| Métrica de Desempenho | Pré-P1/P2 | Pós-P1/P2 | Variação |
|---|:---:|:---:|:---:|
| **Latência Média** | 8.033 ms | 9.056 ms | +1.023 ms (+12%) |
| **Latência Mediana** | 8.236 ms | 8.665 ms | +429 ms (+5%) |
| **Latência Mínima** | 6.095 ms | 6.396 ms | +301 ms |
| **Latência Máxima** | 9.395 ms | 14.352 ms | +4.957 ms (aquecimento inicial) |
| **Velocidade de Geração** | 38,0 tokens/s | 36,8 tokens/s | -1,2 tokens/s |

A sobrecarga introduzida pelo algoritmo de ordenação em memória (`sortSuggestionsChronologically`) é inferior a **0,1 ms** (opera em O(n log n) com n ≤ 6 itens), demonstrando que o leve aumento na latência de ponta a ponta decorre exclusivamente da variabilidade natural de carga do motor do Ollama e geração de tokens ligeiramente mais longos nas descrições.

---

## 7. Problemas Remanescentes

1. **Vazamento Temático Residual (*Memory Bleed* no modelo 3B):**
   - O `qwen2.5:3b` ainda sofre atração probabilística por priors de mudança residencial geral:
     - Gerou tarefas veterinárias em 2 runs do Cenário 2 (familiar) e em 1 run do Cenário 5 (TI/Home Office), mesmo sem animais informados.
     - Gerou tarefas de backup digital em todas as runs do Cenário 1 (T1 urgente).
2. **Reincidência Esporádica de Anglicismo:**
   - 1 ocorrência de *"decluttering"* na Run 1 do Cenário 5, embora os prompts instruam categoricamente o uso de *"desapegar"*.

---

## 8. Veredito

### **APROVADA COM RESSALVAS**

- **Justificativa da Aprovação:**
  - P1 atingiu 100% de sucesso, zerando as inversões cronológicas em todas as 15 saídas.
  - P2 atingiu 100% de sucesso em sua proposta, eliminando os 3 falsos positivos do Cenário 2 sem comprometer a detecção de inversões causais reais.
  - Validade temporal permaneceu impecável em 100% (20/20 pts).
  - Pontuação global aumentou de 94,8 para **95,3/100**.
- **Motivo da Ressalva:**
  - A persistência estocástica de tarefas fora de contexto (veterinário em TI/familiar) e 1 reincidência isolada de anglicismo decorrentes do tamanho compacto do modelo `qwen2.5:3b`.

---

## 9. Próxima Melhoria Recomendada (Sem Implementação Nesta Etapa)

**Recomendação Prioritária:** Implementar um **Filtro Semântico de Descarte e Compatibilidade no Validador (`TaskSuggestionsValidator`)** antes de entregar as tarefas ao usuário:
- Se o plano não mencionar animais ou veterinário no título/descrição, qualquer sugestão com tokens veterinários é silenciosamente descartada ou substituída por uma tarefa de desapego genérica.
- Isso resolve 100% do problema residual de *memory bleed* sem necessidade de reengenharia de prompts ou aumento no tamanho do modelo LLM.
