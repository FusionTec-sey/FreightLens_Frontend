export const SALES_DRAFTS_ROUTE = '/sales/drafts';
export const SALES_PRICING_ROUTE = '/sales/pricing';
export const SALES_VIEWS = {
  [SALES_DRAFTS_ROUTE]: 'DRAFTS',
  '/sales/local-drafts': 'LOCAL_DRAFTS',
  '/sales/follow-up/overdue': 'OVERDUE',
  '/sales/reviews/releases': 'RELEASE_REVIEWS',
  '/sales/reviews/follow-up': 'DEADLINE_REVIEWS',
  '/sales/reviews/reallocations': 'REALLOCATION_REVIEWS',
  '/sales/reviews/other-store': 'OTHER_STORE_REVIEWS',
  '/sales/reviews/price-floors': 'PRICE_FLOOR_REVIEWS',
};
export const salesViewRoute = view => Object.keys(SALES_VIEWS).find(path => SALES_VIEWS[path] === view) || SALES_DRAFTS_ROUTE;
