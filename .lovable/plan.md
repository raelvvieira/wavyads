

## Próximo passo: Configurar os 3 secrets e implementar

Agora que você tem o Developer Token, preciso coletar os 3 secrets para prosseguir com a implementação completa:

1. **GOOGLE_ADS_CLIENT_ID** — do Google Cloud Console (OAuth 2.0 Client ID)
2. **GOOGLE_ADS_CLIENT_SECRET** — do Google Cloud Console (OAuth 2.0 Client Secret)
3. **GOOGLE_ADS_DEVELOPER_TOKEN** — do Google Ads MCC (API Center)

### Implementação após os secrets

Ao mudar para o modo de implementação, vou:

1. Solicitar os 3 secrets via ferramenta segura (você cola os valores num campo protegido)
2. Rodar a migração SQL adicionando as colunas Google Ads na tabela `clients`
3. Criar as 2 edge functions (`google-ads-oauth`, `google-ads-fetch-insights`)
4. Criar hooks e callback page no frontend
5. Atualizar AdminDashboard com botão "Sincronizar Google"
6. Atualizar ClientDashboard com toggle Meta Ads / Google Ads

Tudo conforme o plano aprovado anteriormente.

