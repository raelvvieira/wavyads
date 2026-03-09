

## Plan: Update ResetPasswordPage branding

The ResetPasswordPage (line 56-59) uses a generic Zap icon instead of the Wavy logo. Need to replace it with the same logo + "WAVY Dash" text used on the LoginPage.

### Changes

**File: `src/pages/ResetPasswordPage.tsx`**
- Replace the `Zap` icon import with the `wavyLogo` image import (same as LoginPage)
- Replace the icon div (lines 57-59) with the Wavy logo `<img>` tag: `<img src={wavyLogo} alt="WAVY" className="h-14 w-14 rounded-2xl object-contain" />`
- Update the title from "Criar sua senha" to "WAVY Dash" (line 60)
- Keep the subtitle as-is or adjust to match context

