import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import SettingsPage from "@/pages/SettingsPage";
import ComercialPage from "@/pages/ComercialPage";
import ComercialIndexPage from "@/pages/ComercialIndexPage";
import CrmPage from "@/pages/CrmPage";
import GoogleAdsAIPage from "@/pages/GoogleAdsAIPage";
import CriativoStudioPage from "@/pages/CriativoStudioPage";
import CriativoStudioV2Page from "@/pages/CriativoStudioV2Page";
import UgcStudioPage from "@/pages/UgcStudioPage";
import UgcProjectPage from "@/pages/UgcProjectPage";
import { UgcStudioPreview } from "@/features/ugc-studio/components/UgcStudioPreview";
import SocialMidiaStudioPage from "@/pages/SocialMidiaStudioPage";
import SocialTemplateLabPage from "@/pages/SocialTemplateLabPage";
import MetaCallbackPage from "@/pages/MetaCallbackPage";
import GoogleAdsCallbackPage from "@/pages/GoogleAdsCallbackPage";
import NotFound from "./pages/NotFound";
import { StudioShellPreview } from "@/features/creative-studio/shell/StudioShellPreview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/meta/callback" element={<MetaCallbackPage />} />
            <Route path="/auth/google-ads/callback" element={<GoogleAdsCallbackPage />} />
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/:clientId" element={<DashboardPage />} />
              <Route path="/comercial" element={<ComercialIndexPage />} />
              <Route path="/comercial/:clientId" element={<ComercialPage />} />
              <Route path="/crm" element={<CrmPage />} />
              <Route path="/crm/:clientId" element={<CrmPage />} />
              <Route path="/google-ads-ai" element={<GoogleAdsAIPage />} />
              {/* A V2 é o Criativo Studio. A ilha de navegação já aponta para
                  esta rota, então o menu passou a levar à versão nova sem
                  precisar mudar a navegação. */}
              <Route path="/criativo-studio" element={<CriativoStudioV2Page />} />
              {/* A antiga continua alcançável enquanto ela for necessária —
                  é a saída de emergência que o botão da faixa oferece. */}
              <Route path="/criativo-studio/v1" element={<CriativoStudioPage />} />
              {/* Redireciona em vez de renderizar: manter duas rotas servindo
                  a mesma tela cria dois endereços canônicos e, com eles, dois
                  lugares para corrigir na próxima mudança. */}
              <Route path="/criativo-studio/v2" element={<Navigate to="/criativo-studio" replace />} />
              <Route path="/ugc-studio" element={<UgcStudioPage />} />
              <Route path="/ugc-studio/:id" element={<UgcProjectPage />} />
              <Route path="/social-midia-studio" element={<SocialMidiaStudioPage />} />
              <Route path="/social-template-lab" element={<SocialTemplateLabPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
            {/* Bancada visual do shell V2: monta os componentes reais com
                dados de exemplo, sem sessão. Só em desenvolvimento — é
                ferramenta de verificação, não rota do produto. */}
            {import.meta.env.DEV && (
              <Route
                path="/__ugc-studio"
                element={
                  <div className="wavy-shell relative min-h-screen bg-background">
                    <div className="wavy-app-content relative z-10 min-h-screen">
                      <UgcStudioPreview />
                    </div>
                  </div>
                }
              />
            )}
            {import.meta.env.DEV && (
              <Route
                path="/__studio-v2"
                element={
                  <div className="wavy-shell relative min-h-screen bg-background">
                    <div className="wavy-app-content relative z-10 min-h-screen">
                      <StudioShellPreview />
                    </div>
                  </div>
                }
              />
            )}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
