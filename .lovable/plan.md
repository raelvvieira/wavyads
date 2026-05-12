# Reorganizar sidebar em grupos

Atualmente os itens do menu lateral aparecem em uma única lista. Vamos separar em dois grupos visuais com um divisor sutil:

## Estrutura nova

**Grupo 1 — Cliente** (no topo)
- Dashboard
- Comercial

**(divisor: linha fina + label discreto "Gestão WAVY")**

**Grupo 2 — Gestão interna WAVY** (visível apenas para admins)
- Insights
- Google Ads I.A
- Configurações

Observação: "Configurações" hoje aparece para todos (`show: true`). Como o usuário pediu para deixá-la na área de gestão da WAVY, vou movê-la para o grupo interno e restringi-la a admins (`show: isAdmin`). Se o cliente final ainda precisar de algum acesso a configurações próprias (ex.: trocar senha), me avise — posso manter um item separado "Minha conta" no grupo do cliente.

## Arquivo a editar

- `src/components/AppSidebar.tsx` — substituir o array único `navItems` por dois arrays (`clientItems`, `adminItems`) e renderizar com um divisor entre eles (`<div className="my-3 border-t border-white/10" />` + pequeno label `text-xs uppercase text-white/40 px-4` "Gestão WAVY"). O divisor e o label só aparecem se houver itens admin visíveis (i.e., `isAdmin`).

Nenhuma mudança de rota, lógica ou backend.
