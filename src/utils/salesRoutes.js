export const SALES_DRAFTS_ROUTE = '/sales/drafts';
export const SALES_LOCAL_DRAFTS_ROUTE = '/sales/local-drafts';
export const SALES_OVERDUE_ROUTE = '/sales/follow-up/overdue';
export const SALES_RELEASE_REVIEWS_ROUTE = '/sales/reviews/releases';
export const SALES_DEADLINE_REVIEWS_ROUTE = '/sales/reviews/follow-up';
export const SALES_REALLOCATION_REVIEWS_ROUTE = '/sales/reviews/reallocations';

// Each POS sidebar entry owns a route so the workspace is deep-linkable and the
// register screen no longer carries its own navigation toolbar.
export const SALES_VIEWS = {
  [SALES_DRAFTS_ROUTE]: 'DRAFTS',
  [SALES_LOCAL_DRAFTS_ROUTE]: 'LOCAL_DRAFTS',
  [SALES_OVERDUE_ROUTE]: 'OVERDUE',
  [SALES_RELEASE_REVIEWS_ROUTE]: 'RELEASE_REVIEWS',
  [SALES_DEADLINE_REVIEWS_ROUTE]: 'DEADLINE_REVIEWS',
  [SALES_REALLOCATION_REVIEWS_ROUTE]: 'REALLOCATION_REVIEWS',
};
