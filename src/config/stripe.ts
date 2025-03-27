
// Test Mode Credentials
export const TEST_STRIPE_PUBLISHABLE_KEY = "pk_test_51NqfHjElvVFKoCN6Lsnm2iuMMTySB71zpLvlMI6IlqfDG4aMJAFCbEccoGZERXUD5W1BD8YdmNTefLDUcwk869hY00qbXJV9Rl";
export const TEST_STRIPE_PRICING_TABLE_ID = "prctbl_1QsXnwElvVFKoCN6vbUHDEL5";

// Production Mode Credentials (to be filled when ready for production)
export const PROD_STRIPE_PUBLISHABLE_KEY = "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";  // Add your production publishable key here
export const PROD_STRIPE_PRICING_TABLE_ID = "prctbl_1R77usElvVFKoCN6GAFlKWCd"; // Add your production pricing table ID here

// Active credentials (switch these when moving to production)
export const STRIPE_PUBLISHABLE_KEY = TEST_STRIPE_PUBLISHABLE_KEY;
export const STRIPE_PRICING_TABLE_ID = TEST_STRIPE_PRICING_TABLE_ID;

// Environment helper
export const isTestMode = () => STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_');

