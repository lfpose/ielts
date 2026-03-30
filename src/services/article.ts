import RSSParser from "rss-parser";
import { extract } from "@extractus/article-extractor";

// Curated feeds: fascinating stories, discoveries, culture, science
// No financial news. Focus on things that make people more curious and intellectual.
const RSS_FEEDS = [
  // Science & Discovery
  "https://www.atlasobscura.com/feeds/latest",
  "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
  "https://www.nationalgeographic.com/feed",

  // Culture & Ideas
  "https://feeds.bbci.co.uk/future/feed",
  "https://www.theguardian.com/science/rss",
  "https://www.theguardian.com/culture/rss",

  // Nature & World
  "https://www.smithsonianmag.com/rss/latest_articles/",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
];

const parser = new RSSParser();

export interface Article {
  title: string;
  source: string;
  url: string;
  content: string;
}

export async function fetchRandomArticle(): Promise<Article> {
  const shuffled = RSS_FEEDS.sort(() => Math.random() - 0.5);

  for (const feedUrl of shuffled) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const items = feed.items.filter((item) => item.link);
      const shuffledItems = items.sort(() => Math.random() - 0.5);

      for (const item of shuffledItems.slice(0, 5)) {
        try {
          const article = await extract(item.link!);
          if (!article?.content) continue;

          const plainText = stripHtml(article.content);
          if (plainText.split(/\s+/).length < 300) continue;

          const trimmed = trimToWordCount(plainText, 900);

          return {
            title: article.title || item.title || "Untitled",
            source: feed.title || feedUrl,
            url: item.link!,
            content: trimmed,
          };
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  throw new Error("Could not fetch a suitable article from any feed");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function trimToWordCount(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  const trimmed = words.slice(0, maxWords).join(" ");
  const lastPeriod = trimmed.lastIndexOf(".");
  if (lastPeriod > trimmed.length * 0.7) {
    return trimmed.slice(0, lastPeriod + 1);
  }
  return trimmed + "...";
}
