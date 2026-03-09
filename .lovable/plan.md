

# Plan: Fix Account Selection — Show Picker for Multiple Ad Accounts

## Problem

In `AdminDashboard.tsx`, when Meta returns multiple ad accounts after OAuth, the code automatically picks `pendingAccounts[0]` (the first one) instead of letting the admin choose. This is why "Mauricio De Oliveira Kwitko" appears instead of the actual chosen account — it's the first account in the list, not the one associated with Kitesurf Adventure.

The `ClientDashboard.tsx` already has a proper account picker UI with `handleSelectAccount`. The `AdminDashboard` needs the same.

## Changes

### `src/pages/AdminDashboard.tsx`

- Remove the auto-select logic for multiple accounts (lines 76-89 that pick `pendingAccounts[0]`)
- Keep auto-select only for single account (lines 61-74)
- Add an account picker Dialog/modal: when `pendingAccounts.length > 1`, show a dialog listing all accounts with name and business_name so the admin can pick the correct one
- On click, call `selectAccount.mutate(...)` with the chosen account
- Reuse the same glass card style as `ClientDashboard` account picker

Single file change only.

