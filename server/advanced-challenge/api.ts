/**
 * Advanced Challenge API Endpoints
 * 
 * Provides REST API for:
 * - Getting available topics and subtopics
 * - Calculating question count suggestions
 * - Previewing distribution
 * - Creating advanced challenges
 */

import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db';
import { challenges, modules, questions } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  TopicSelection,
  calculateAvailableQuestions,
  suggestQuestionCount,
  calculateDistribution,
  selectQuestions,
  logShortfalls,
  adjustDistribution
} from './algorithm';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const TopicSelectionSchema = z.object({
  subject: z.string(),
  topic: z.string(),
  subtopics: z.union([z.array(z.string()), z.literal('all')])
});

const GetAvailableTopicsSchema = z.object({
  childId: z.number()
});

const PreviewDistributionSchema = z.object({
  selections: z.array(TopicSelectionSchema).min(1).max(10),
  totalQuestions: z.number().optional(),
  focusArea: z.enum(['strengthen', 'balanced', 'improve']).default('balanced')
});

const CreateAdvancedChallengeSchema = z.object({
  childId: z.number(),
  selections: z.array(TopicSelectionSchema).min(1).max(10),
  totalQuestions: z.number().min(3).max(200),
  focusArea: z.enum(['strengthen', 'balanced', 'improve']).default('balanced'),
  title: z.string().optional(),
  message: z.string().optional(),
  dueDate: z.string().optional() // ISO date string
});

// ============================================
// ENDPOINT 1: GET AVAILABLE TOPICS
// ============================================

/**
 * GET /api/advanced-challenge/available-topics
 * 
 * Returns all available topics and subtopics with question counts
 * Organized by subject > topic > subtopics
 */
router.get('/available-topics', async (req, res) => {
  try {
    const { childId } = GetAvailableTopicsSchema.parse(req.query);
    
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get child's grade
    const childResult = await db.select({
      gradeId: sql<number>`${sql.identifier('child_profiles', 'grade_id')}`
    })
    .from(sql`child_profiles`)
    .where(sql`id = ${childId}`);
    
    if (childResult.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    const gradeId = childResult[0].gradeId;
    
    // Query all modules for this grade
    const availableModules = await db.select({
      id: modules.id,
      subject: modules.subject,
      topic: modules.topic,
      description: modules.description
    })
    .from(modules)
    .where(and(
      eq(modules.gradeId, gradeId),
      eq(modules.isActive, true)
    ));
    
    // For each module, get subtopics and question counts
    const topicsWithCounts = await Promise.all(
      availableModules.map(async (module) => {
        // Get all subtopics for this topic
        const subtopicsResult = await db.select({
          subTopic: questions.subTopic,
          count: sql<number>`count(*)::int`
        })
        .from(questions)
        .where(and(
          eq(questions.subject, module.subject),
          eq(questions.topic, module.topic),
          eq(questions.status, 'approved'),
          eq(questions.isActive, true)
        ))
        .groupBy(questions.subTopic);
        
        const totalQuestions = subtopicsResult.reduce((sum, st) => sum + st.count, 0);
        
        return {
          subject: module.subject,
          topic: module.topic,
          description: module.description,
          totalQuestions,
          subtopics: subtopicsResult.map(st => ({
            name: st.subTopic,
            questionCount: st.count
          }))
        };
      })
    );
    
    // Group by subject
    const groupedBySubject = topicsWithCounts.reduce((acc, topic) => {
      if (!acc[topic.subject]) {
        acc[topic.subject] = [];
      }
      acc[topic.subject].push({
        topic: topic.topic,
        description: topic.description,
        totalQuestions: topic.totalQuestions,
        subtopics: topic.subtopics
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    res.json({
      success: true,
      data: groupedBySubject
    });
    
  } catch (error) {
    console.error('[Advanced Challenge] Error getting available topics:', error);
    res.status(500).json({ error: 'Failed to get available topics' });
  }
});

// ============================================
// ENDPOINT 2: PREVIEW DISTRIBUTION
// ============================================

/**
 * POST /api/advanced-challenge/preview
 * 
 * Returns suggested question count and distribution preview
 * Used for real-time updates as parent configures challenge
 */
router.post('/preview', async (req, res) => {
  try {
    const { selections, totalQuestions, focusArea } = PreviewDistributionSchema.parse(req.body);
    
    // Step 1: Calculate available questions
    const available = await calculateAvailableQuestions(selections);
    
    // Step 2: Get suggestion if total not provided
    const suggestion = suggestQuestionCount(available);
    const finalTotal = totalQuestions || suggestion.recommended;
    
    // Step 3: Calculate distribution
    const { distribution, shortfalls } = calculateDistribution(
      available,
      finalTotal,
      focusArea
    );
    
    // Step 4: Format response
    res.json({
      success: true,
      data: {
        suggestion: {
          recommended: suggestion.recommended,
          minimum: suggestion.minimum,
          maximum: suggestion.maximum,
          reasoning: suggestion.reasoning,
          estimatedDuration: suggestion.estimatedDuration
        },
        distribution: distribution.map(d => ({
          subject: d.selection.subject,
          topic: d.selection.topic,
          subtopics: d.selection.subtopics,
          allocated: d.allocated,
          percentage: Math.round(d.percentage * 10) / 10, // Round to 1 decimal
          byDifficulty: d.byDifficulty
        })),
        totalQuestions: finalTotal,
        hasShortfalls: shortfalls.length > 0,
        shortfallCount: shortfalls.length
      }
    });
    
  } catch (error) {
    console.error('[Advanced Challenge] Error previewing distribution:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to preview distribution' });
  }
});

// ============================================
// ENDPOINT 3: CREATE ADVANCED CHALLENGE
// ============================================

/**
 * POST /api/advanced-challenge/create
 * 
 * Creates an advanced multi-topic challenge
 * - Selects questions with adaptive mixing
 * - Logs shortfalls silently
 * - Returns challenge ID
 */
router.post('/create', async (req, res) => {
  try {
    const {
      childId,
      selections,
      totalQuestions,
      focusArea,
      title,
      message,
      dueDate
    } = CreateAdvancedChallengeSchema.parse(req.body);
    
    // Get parent ID from session/auth
    const parentId = (req as any).user?.id;
    if (!parentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Step 1: Calculate available questions
    const available = await calculateAvailableQuestions(selections);
    
    // Step 2: Calculate distribution
    const { distribution, shortfalls } = calculateDistribution(
      available,
      totalQuestions,
      focusArea
    );
    
    // Step 3: Select specific questions with adaptive mixing
    const selectedQuestions = await selectQuestions(distribution);
    
    if (selectedQuestions.length === 0) {
      return res.status(400).json({ 
        error: 'No questions available for selected topics' 
      });
    }
    
    // Step 4: Generate title if not provided
    const challengeTitle = title || generateChallengeTitle(selections);
    
    // Step 5: Create challenge in database
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    const [challenge] = await db.insert(challenges).values({
      assignedBy: parentId,
      assignedTo: childId,
      assignedToType: 'individual',
      challengeType: 'advanced',
      challengeScope: {
        type: 'advanced',
        selections: selections.map(s => ({
          subject: s.subject,
          topic: s.topic,
          subtopics: s.subtopics
        })),
        distribution: distribution.map(d => ({
          subject: d.selection.subject,
          topic: d.selection.topic,
          subtopics: d.selection.subtopics,
          allocated: d.allocated,
          byDifficulty: d.byDifficulty
        })),
        totalQuestions: selectedQuestions.length,
        focusArea,
        questionMixing: 'adaptive'
      },
      moduleId: null, // No single module for advanced challenges
      title: challengeTitle,
      message: message || null,
      questionCount: selectedQuestions.length,
      focusArea,
      estimatedDuration: selectedQuestions.length, // 1 min per question
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending'
    }).returning();
    
    // Step 6: Store question IDs in order
    // TODO: Create challenge_questions junction table if needed
    // For now, store in challengeScope
    await db.update(challenges)
      .set({
        challengeScope: {
          ...(challenge.challengeScope as any),
          questionIds: selectedQuestions.map(q => q.questionId),
          questionOrder: selectedQuestions.map(q => ({
            questionId: q.questionId,
            orderIndex: q.orderIndex,
            topicIndex: q.topicIndex
          }))
        }
      })
      .where(eq(challenges.id, challenge.id));
    
    // Step 7: Log shortfalls silently (don't block creation)
    await logShortfalls(challenge.id, shortfalls);
    
    // Step 8: Return success
    res.json({
      success: true,
      data: {
        challengeId: challenge.id,
        title: challengeTitle,
        questionCount: selectedQuestions.length,
        estimatedDuration: selectedQuestions.length,
        hasShortfalls: shortfalls.length > 0,
        message: shortfalls.length > 0 
          ? `Challenge created with ${selectedQuestions.length} questions. Some topics had limited questions available.`
          : `Challenge created successfully with ${selectedQuestions.length} questions.`
      }
    });
    
  } catch (error) {
    console.error('[Advanced Challenge] Error creating challenge:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateChallengeTitle(selections: TopicSelection[]): string {
  if (selections.length === 1) {
    const sel = selections[0];
    if (sel.subtopics === 'all') {
      return `${sel.topic} - Complete Review`;
    } else {
      return `${sel.topic} - ${sel.subtopics.length} Subtopic${sel.subtopics.length > 1 ? 's' : ''}`;
    }
  } else if (selections.length === 2) {
    return `${selections[0].topic} & ${selections[1].topic}`;
  } else {
    const subjects = [...new Set(selections.map(s => s.subject))];
    if (subjects.length === 1) {
      return `${subjects[0]} - ${selections.length} Topics`;
    } else {
      return `Multi-Subject Challenge - ${selections.length} Topics`;
    }
  }
}

// ============================================
// ENDPOINT 4: GET SHORTFALLS (QB ADMIN)
// ============================================

/**
 * GET /api/advanced-challenge/shortfalls
 * 
 * Returns unresolved question bank shortfalls
 * For QB admin dashboard
 */
router.get('/shortfalls', async (req, res) => {
  try {
    // Check if user is QB admin
    const userRole = (req as any).user?.role;
    if (userRole !== 'qb_admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden - QB admin access required' });
    }
    
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get unresolved shortfalls
    const shortfallsList = await db.query.questionBankShortfalls.findMany({
      where: (shortfalls, { eq }) => eq(shortfalls.resolved, false),
      orderBy: (shortfalls, { desc }) => [desc(shortfalls.createdAt)],
      limit: 100
    });
    
    // Group by topic
    const grouped = shortfallsList.reduce((acc, sf) => {
      const key = `${sf.subject}-${sf.topic}`;
      if (!acc[key]) {
        acc[key] = {
          subject: sf.subject,
          topic: sf.topic,
          totalShortfall: 0,
          occurrences: 0,
          lastOccurred: sf.createdAt
        };
      }
      acc[key].totalShortfall += sf.shortfall;
      acc[key].occurrences++;
      if (sf.createdAt > acc[key].lastOccurred) {
        acc[key].lastOccurred = sf.createdAt;
      }
      return acc;
    }, {} as Record<string, any>);
    
    res.json({
      success: true,
      data: {
        shortfalls: Object.values(grouped),
        totalUnresolved: shortfallsList.length
      }
    });
    
  } catch (error) {
    console.error('[Advanced Challenge] Error getting shortfalls:', error);
    res.status(500).json({ error: 'Failed to get shortfalls' });
  }
});

export default router;
