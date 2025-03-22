
/**
 * OpenAI client for analyzing airline pet policies
 * This file now serves as the main entry point, re-exporting functionality from modular components
 */

import { analyzePetPolicy } from './services/policyAnalyzer.ts';

// Re-export the main function for backward compatibility
export { analyzePetPolicy };
