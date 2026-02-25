import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./lib/auth-context";
import { AdsConsentProvider } from "./lib/ads-consent";
import { GrayscaleMediaProvider } from "./lib/grayscale-media-context";
import { ConsentBanner } from "@/components/ads/ConsentBanner";
import { AdSenseProvider } from "@/components/ads/AdSenseProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "./lib/websocket";

import NotFound from "./pages/not-found";
import Home from "./pages/home";
import Discover from "./pages/discover";
import Pick from "./pages/pick";
import Watchlist from "./pages/watchlist";
import ReviewCreate from "./pages/review-create";
import Profile from "./pages/profile";
import MediaDetail from "./pages/media-detail";
import SignIn from "./pages/signin";
import Privacy from "./pages/privacy";
import Cookies from "./pages/cookies";
import AffiliateDisclosure from "./pages/affiliate-disclosure";
import Messages from "./pages/messages";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/discover" component={Discover} />
      <Route path="/pick" component={Pick} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/review/new" component={ReviewCreate} />
      <Route path="/u/:handle" component={Profile} />
      <Route path="/m/:id" component={MediaDetail} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/cookies" component={Cookies} />
      <Route path="/affiliate-disclosure" component={AffiliateDisclosure} />
      <Route path="/messages" component={Messages} />
      <Route path="/messages/:conversationId" component={Messages} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AdsConsentProvider>
          <AdSenseProvider>
          <GrayscaleMediaProvider>
          <WebSocketProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <ConsentBanner />
          </TooltipProvider>
          </WebSocketProvider>
          </GrayscaleMediaProvider>
          </AdSenseProvider>
          </AdsConsentProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
