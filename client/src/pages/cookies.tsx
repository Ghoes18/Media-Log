import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Cookies() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="secondary" size="icon" className="rounded-md" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-serif text-lg font-semibold">Cookie Policy</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <div className="mt-4 space-y-4 text-sm leading-relaxed">
            <p>
              We use cookies and similar technologies to run Tastelog and, with your consent, to show ads.
            </p>
            <h2 className="font-semibold text-foreground">Essential</h2>
            <p className="text-muted-foreground">
              Session and authentication cookies are required to keep you signed in and to protect your account. These cannot be disabled if you use the service.
            </p>
            <h2 className="font-semibold text-foreground">Advertising</h2>
            <p className="text-muted-foreground">
              If you accept the consent banner, we load third-party ad scripts (e.g. Google AdSense) that may set cookies for ad delivery and measurement. You can decline this via the banner; we will not load ad scripts until you accept.
            </p>
            <h2 className="font-semibold text-foreground">Managing preferences</h2>
            <p className="text-muted-foreground">
              Your ad consent choice is stored locally in your browser. To change it, clear site data or contact support. See our{" "}
              <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">Privacy Policy</Link> for more.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
