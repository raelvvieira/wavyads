# FASE 1 Test Suite — Documentação

## 📋 Visão Geral

Este diretório contém a especificação congelada e testes para **FASE 1** (Extração de Copy) do módulo Social Mídia Studio. Os testes garantem que transcrição de áudio (Apify) e extração de texto (Google Vision) não sejam quebrados por mudanças futuras.

---

## 📁 Arquivos

| Arquivo | Propósito |
|---------|-----------|
| `FASE1-SPECIFICATION.md` | Contrato congelado: o que entra, o que sai, o que NUNCA deve mudar |
| `FASE1-FIXTURES.json` | 5 casos de teste com inputs esperados e validações |
| `FASE1-TEST.ts` | Versão Deno do validador (referência) |
| `TEST-README.md` | Esta documentação |
| `../../../scripts/test-fase1-extract.js` | Script Node.js para executar os testes |

---

## 🚀 Como Rodar os Testes

### Pré-requisitos

1. Você precisa ter as variáveis de ambiente configuradas:
   ```bash
   export SUPABASE_URL="https://seu-projeto.supabase.co"
   export SUPABASE_ANON_KEY="seu-anon-key"
   ```

2. A edge function `social-extract-copy` deve estar deployada e acessível

### Executar os testes

```bash
npm run test:fase1-extract
```

**Saída esperada:**
```
📋 FASE 1 - Extração de Copy - Test Suite
============================================================

Testing "Reel com áudio detectado"... ✅ PASS
Testing "Carrossel com 3 slides com texto"... ✅ PASS
Testing "Post único com imagem e legenda"... ✅ PASS
Testing "Post sem legenda (apenas imagem)"... ✅ PASS
Testing "Reel sem áudio detectado (ou muito curto)"... ✅ PASS

============================================================

📊 Results: 5/5 passed ✅
```

---

## ✅ O que os testes validam

### 1. **Estrutura da resposta**
   - Campos obrigatórios: `tipo`, `status`, `copy_consolidada`, `usage`
   - Todos devem estar presentes em TODA resposta

### 2. **Detecção de tipo**
   - `reel` para vídeos
   - `carrossel` para posts com múltiplos slides
   - `post_estatico` para imagens únicas

### 3. **Transcrição (reels)**
   - Quando há áudio: `status.transcricao === "ok"` e `transcricao` não vazio
   - Quando não há áudio: `status.transcricao` é um de `["sem_fala_detectada", "erro_actor"]`
   - Número de chamadas ao Apify registrado em `usage.transcribe_calls`

### 4. **OCR (posts e carrosséis)**
   - Cada slide/imagem é processada por Google Vision
   - Status registrado em `status.ocr`
   - Número de chamadas ao Vision registrado em `usage.ocr_calls`

### 5. **Consolidação de copy**
   - Ordem: [transcrição] → [texto visual] → [legenda]
   - Resultado final em `copy_consolidada`

### 6. **Status granular**
   - `status.legenda`: "ok" ou "ausente"
   - `status.transcricao`: "ok", "sem_fala_detectada", "erro_actor", "erro_config"
   - `status.ocr`: "ok", "sem_texto_detectado", "ocr_desabilitado", "ausente"

---

## 🔒 O que NUNCA deve mudar

Conforme `FASE1-SPECIFICATION.md`:

- ❌ Tipo de detecção
- ❌ Ordem de consolidação
- ❌ Estrutura do JSON de resposta
- ❌ Status codes
- ❌ Fallbacks de tentativas de transcrição (4 URLs)

Qualquer mudança nestes pontos **QUEBRA** os testes.

---

## ✏️ O que pode mudar (com validação)

- ✅ Timeouts
- ✅ Mensagens de erro
- ✅ Edge cases não mencionados
- ✅ Performance (se output não mudar)

**Mas sempre rode os testes depois.**

---

## 📝 Como adicionar novos testes

1. Abra `FASE1-FIXTURES.json`
2. Adicione um novo objeto à array `test_cases`:
   ```json
   {
     "id": "seu_id",
     "nome": "Descrição do teste",
     "tipo_esperado": "reel|carrossel|post_estatico",
     "input": { /* seu input do Instagram */ },
     "validacoes": [
       {
         "campo": "campo.aninhado",
         "esperado": "valor_esperado",
         "descricao": "O que está sendo validado"
       }
     ]
   }
   ```
3. Use `esperado` para valores exatos
4. Use `nao_deve_ser` para valores que NÃO devem aparecer
5. Use `esperado_um_de` para múltiplas opções válidas
6. Use `campo[*].subfield` para arrays

---

## 🐛 Diagnosticar falhas

Se um teste falhar, verifique:

1. **Variáveis de ambiente**: 
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_ANON_KEY
   ```

2. **Status da edge function**:
   - Verifique se está deployada e acessível
   - Confira logs no Supabase Dashboard

3. **Mudanças recentes no código**:
   - Abra `../index.ts` (edge function)
   - Compare com `FASE1-SPECIFICATION.md`
   - Procure por mudanças não intencionais

4. **Mensagens de erro específicas**:
   - O teste mostra qual validação falhou
   - Campo, valor esperado e valor obtido

---

## 🔄 Integração com CI/CD

Para prevenir que alguém quebre Phase 1 sem perceber, adicione a um workflow de CI:

```yaml
- name: Run FASE 1 Tests
  run: npm run test:fase1-extract
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

Tests devem passar antes de merge para main.

---

## 📞 Contato

Se um teste falhar e você não souber por quê:

1. Leia a mensagem de erro (específica e acionável)
2. Confira `FASE1-SPECIFICATION.md` para entender o contrato
3. Se for uma mudança intencional, atualize a spec e os testes (com cuidado)

**NÃO altere os testes para passar — altere o código.**
