import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Analysis from "@/pages/analysis";
import Feedback from "@/pages/feedback";
import Teaching from "@/pages/teaching";
import History from "@/pages/history";
import Progress from "@/pages/progress";
import { SessionProvider } from "./contexts/SessionContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/teaching" component={Teaching} />
      <Route path="/history" component={History} />
      <Route path="/progress" component={Progress} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Router />
        <Toaster />
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;
