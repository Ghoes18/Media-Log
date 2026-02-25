import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AffiliateDisclosure() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="secondary" size="icon" className="rounded-md" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-serif text-lg font-semibold">Affiliate Disclosure</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <div className="mt-4 space-y-4 text-sm leading-relaxed">
            <p>
              Some links on Tastelog are affiliate links. If you click and make a qualifying purchase, we may earn a small commission at no extra cost to you.
            </p>
            <h2 className="font-semibold text-foreground">Where we link</h2>
            <p className="text-muted-foreground">
              On media pages we may show links to retailers such as Amazon, Bookshop.org, or streaming services. These are chosen to help you find the title; we do not control their content or pricing.
            </p>
            <h2 className="font-semibold text-foreground">No extra cost</h2>
            <p className="text-muted-foreground">
              Commission comes from the retailer, not from you. It does not change the price you pay.
            </p>
            <h2 className="font-semibold text-foreground">Honesty</h2>
            <p className="text-muted-foreground">
              Our recommendations and reviews are not influenced by affiliate relationships. We only recommend things we think are worth your attention.
            </p>
            <p className="text-muted-foreground">
              Questions? See our{" "}
              <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">Privacy Policy</Link> or contact support.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
