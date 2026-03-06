

# Plan: Update Login Page Branding

Replace the current AdsPro icon+text on the login page with the WAVY logo and "WAVY Dash" text.

**File:** `src/pages/LoginPage.tsx`

- Import `wavyLogo from "@/assets/wavy-logo.png"`
- Replace the green Zap icon block (lines 67-69: the `div` with `btn-accent accent-glow` containing `<Zap>`) with an `<img src={wavyLogo}>` styled with rounded corners (~`rounded-2xl h-14 w-14 object-contain`)
- Change `<h1>AdsPro</h1>` to `<h1>WAVY Dash</h1>`
- Remove the `Zap` import from lucide-react

Single file change, no other modifications needed.

