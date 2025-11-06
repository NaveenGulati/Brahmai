/**
 * Adaptive Quiz Module - Public API
 * 
 * Import this module to use the adaptive quiz system:
 * 
 * ```typescript
 * import { adaptiveQuizRouter } from './adaptive-quiz';
 * 
 * export const appRouter = router({
 *   adaptiveQuiz: adaptiveQuizRouter,
 *   // ... other routers
 * });
 * ```
 */

export { adaptiveQuizRouter } from './router';
export type { FocusArea, PerformanceMetrics, TopicPerformance } from './types';
