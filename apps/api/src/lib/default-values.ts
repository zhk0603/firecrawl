export const defaultOrigin = "api";

export const defaultTimeout = 45000; // 45 seconds

export const defaultPageOptions = {
  onlyMainContent: false,
  includeHtml: false,
  waitFor: 30000,
  screenshot: false,
  parsePDF: true
};

export const defaultCrawlerOptions = {
  allowBackwardCrawling: false
}

export const defaultCrawlPageOptions = {
  onlyMainContent: false,
  includeHtml: false,
  removeTags: [],
  parsePDF: true
}

export const defaultExtractorOptions = {
  mode: "markdown"
}