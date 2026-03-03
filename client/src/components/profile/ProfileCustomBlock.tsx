import { useMemo } from "react";
import DOMPurify from "dompurify";
import { Card } from "@/components/ui/card";

const ALLOWED_TAGS = [
  "a", "b", "i", "u", "em", "strong", "br", "p", "div", "span",
  "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "img", "hr", "pre", "code",
];

function sanitizeCss(css: string): string {
  return css
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/behavior\s*:/gi, "")
    .replace(/-moz-binding\s*:/gi, "")
    .replace(/@import/gi, "");
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "title", "src", "alt"],
    ADD_ATTR: ["target"],
    ADD_TAGS: [],
  });
}

export interface ProfileCustomBlockProps {
  html: string | null;
  css: string | null;
}

export function ProfileCustomBlock({ html, css }: ProfileCustomBlockProps) {
  const srcdoc = useMemo(() => {
    const cleanHtml = html ? sanitizeHtml(html) : "";
    const cleanCss = css ? sanitizeCss(css) : "";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${cleanCss}</style></head><body style="margin:0;padding:1rem;font-family:inherit;font-size:0.875rem;line-height:1.5;color:inherit;">${cleanHtml}</body></html>`;
  }, [html, css]);

  return (
    <Card className="overflow-hidden rounded-lg border border-border bg-card" data-testid="profile-custom-block">
      <iframe
        title="Profile custom content"
        sandbox=""
        srcDoc={srcdoc}
        className="w-full min-h-[80px] border-0 bg-transparent"
        style={{ maxHeight: "400px" }}
      />
    </Card>
  );
}
