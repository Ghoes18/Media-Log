import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="secondary" size="icon" className="rounded-md" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-serif text-lg font-semibold">Privacy Policy</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <div className="mt-4 space-y-4 text-sm leading-relaxed">
            <p>
              Tastelog respects your privacy. This policy describes how we collect, use, and protect your information when you use our service.
            </p>
            <h2 className="font-semibold text-foreground">Information we collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide when you sign up (e.g. display name, email), content you create (reviews, watchlist), and usage data necessary to operate the service. When you accept cookies, we may load third-party ad scripts that collect data per their own policies.
            </p>
            <h2 className="font-semibold text-foreground">How we use it</h2>
            <p className="text-muted-foreground">
              We use your information to provide and improve the service, personalize your experience, and, if you consent, to show relevant ads. We do not sell your personal data to third parties.
            </p>
            <h2 className="font-semibold text-foreground">Your choices</h2>
            <p className="text-muted-foreground">
              You can decline ad-related cookies via the consent banner. You can update or delete your account and content through the app. Pro subscribers do not see ads.
            </p>
            <h2 className="font-semibold text-foreground">Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related questions, contact us through the support channel provided in the app.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
