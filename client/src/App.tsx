import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import { AdminLogin } from "./components/AdminLogin"; 
import { trpc } from "@/lib/trpc"; 
import { ChatWidget } from "./components/ChatWidget";

export function ProtectedAdminRoute() {
  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false, 
  });

  const [isUnlocked, setIsUnlocked] = useState(false);
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-[#D4AF37]">A carregar o Painel...</div>;
  }

  // Se tem credencial ou acabou de fazer login, liberta o painel
  if (user || isUnlocked) {
    return <AdminDashboard />;
  }

  return <AdminLogin onLoginSuccess={() => {
    setIsUnlocked(true); 
    refetch();           
  }} />;
}

// Subcomponente criado para gerir as rotas e o hook useLocation corretamente
function AppContent() {
  const [location] = useLocation();

  return (
    <main>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={ProtectedAdminRoute} />
        <Route component={NotFound} />
      </Switch>

      {/* O WIDGET DO CHAT TEM QUE FICAR AQUI, FORA DO SWITCH! */}
      {!location.includes('admin') && <ChatWidget />}
    </main>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;