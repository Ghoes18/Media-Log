import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./lib/auth-context";
import { GrayscaleMediaProvider } from "./lib/grayscale-media-context";
import { ThemeProvider } from "@/components/theme-provider";

import NotFound from "./pages/not-found";
import Home from "./pages/home";
import Discover from "./pages/discover";
import Watchlist from "./pages/watchlist";
import ReviewCreate from "./pages/review-create";
import Profile from "./pages/profile";
import MediaDetail from "./pages/media-detail";
import SignIn from "./pages/signin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/discover" component={Discover} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/review/new" component={ReviewCreate} />
      <Route path="/u/:handle" component={Profile} />
      <Route path="/m/:id" component={MediaDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <GrayscaleMediaProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
          </GrayscaleMediaProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
