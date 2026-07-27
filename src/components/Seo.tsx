import { useEffect } from "react";

interface SeoInput {
  title: string;
  description?: string;
  canonical?: string;
  jsonLd?: object | object[];
}

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Per-page SEO for the SPA: sets title + description and injects
 * (and cleans up) a JSON-LD <script> block.
 */
export function useSeo({ title, description, canonical, jsonLd }: SeoInput) {
  useEffect(() => {
    document.title = title;
    if (description) upsertMeta("description", description);
    if (canonical) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo", "page");
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      if (script) script.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonical, JSON.stringify(jsonLd)]);
}
