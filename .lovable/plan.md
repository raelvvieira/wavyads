

## Plan: Add dashboard URL to invitation email

**File:** `supabase/functions/invite-client/index.ts`

Add a new step/note in the email HTML body, after the 4-step instructions, informing the client that they can always access the dashboard at `https://dashboard.wavydigital.com.br/`.

### Change

In the email HTML template, after step 4 ("Acesse seu dashboard com os dados das suas campanhas"), add a highlighted section:

```html
<tr>
  <td style="padding:16px 0 8px 0; font-size:14px; color:#3f3f46; line-height:1.6;">
    📌 Sempre que quiser acessar seu dashboard, entre em: 
    <a href="https://dashboard.wavydigital.com.br/" style="color:#18181b; font-weight:600;">dashboard.wavydigital.com.br</a>
  </td>
</tr>
```

Single file change, redeploy the edge function after.

