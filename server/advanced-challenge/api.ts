/**
 * Advanced Challenge API Endpoints v2
 * 
 * Redesigned to work with actual database schema (questions table)
 * Following CRITICAL_DEVELOPMENT_GUIDELINES.md
 */

import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db';
import { challenges, questions, childProfiles } from '../../drizzle/schema';
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
  childId: z.coerce.number() // Query params are strings, coerce to number
});

const PreviewDistributionSchema = z.object({
  selections: z.array(TopicSelectionSchema).min(1).max(10),
  totalQuestions: z.number().optional(),
  focusArea: z.enum(['strengthen', 'balanced', 'improve']).default('balanced')
});

const CreateAdvancedChallengeSchema = z.object({
  childId: z.coerce.number(),
  selections: z.array(TopicSelectionSchema).min(1).max(10),
  totalQuestions: z.number().min(9).max(200),
  focusArea: z.enum(['strengthen', 'balanced', 'improve']).default('balanced'),
  title: z.string().optional(),
  message: z.string().optional(),
  dueDate: z.string().optional() // ISO date string
});

// ============================================
// ENDPOINT 1: GET AVAILABLE TOPICS
// ============================================

/**
 * GET /api/advanced-challenge/available-topics?childId=1
 * 
 * Returns all available topics and subtopics with question counts
 * Organized by subject > topics > subtopics
 */
router.get('/available-topics', async (req, res) => {
  try {
    const { childId } = GetAvailableTopicsSchema.parse(req.query);
    
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Verify child exists (optional - could skip this for performance)
    const childResult = await db.select({ id: childProfiles.id })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId));
    
    if (childResult.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    // Query all available subject/topic/subtopic combinations with counts
    const topicsWithCounts = await db
      .select({
        subject: questions.subject,
        topic: questions.topic,
        subTopic: questions.subTopic,
        count: sql<number>`count(*)::int`
      })
      .from(questions)
      .where(
        and(
          eq(questions.status, 'approved'),
          eq(questions.isActive, true)
        )
      )
      .groupBy(questions.subject, questions.topic, questions.subTopic)
      .orderBy(questions.subject, questions.topic, questions.subTopic);
    
    // Group by subject → topic → subtopics
    const grouped: Record<string, any[]> = {};
    
    for (const row of topicsWithCounts) {
      if (!grouped[row.subject]) {
        grouped[row.subject] = [];
      }
      
      // Find or create topic entry
      let topicEntry = grouped[row.subject].find((t: any) => t.topic === row.topic);
      if (!topicEntry) {
        topicEntry = {
          topic: row.topic,
          totalQuestions: 0,
          subtopics: []
        };
        grouped[row.subject].push(topicEntry);
      }
      
      // Add subtopic
      if (row.subTopic) {
        topicEntry.subtopics.push({
          name: row.subTopic,
          questionCount: row.count
        });
        topicEntry.totalQuestions += row.count;
      } else {
        // No subtopic (empty string or null)
        topicEntry.totalQuestions += row.count;
      }
    }
    
    res.json({
      success: true,
      data: grouped
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
 * Calculate and preview question distribution
 */
router.post('/preview', async (req, res) => {
  try {
    const { selections, totalQuestions, focusArea } = PreviewDistributionSchema.parse(req.body);
    
    // Suggest total if not provided
    const suggested = totalQuestions || suggestQuestionCount(selections.length);
    
    // Calculate distribution
    const { distribution, shortfalls } = await calculateDistribution(selections, suggested);
    
    // Format response
    const formattedDistribution = distribution.map(d => ({
      subject: d.subject,
      topic: d.topic,
      subtopics: d.subtopics,
      available: d.available,
      allocated: d.allocated,
      percentage: Math.round((d.allocated / suggested) * 100)
    }));
    
    const warnings = shortfalls.map(s => ({
      subject: s.subject,
      topic: s.topic,
      message: `Only ${s.available} questions available (requested ${s.requested})`
    }));
    
    res.json({
      success: true,
      suggestedTotal: suggested,
      actualTotal: distribution.reduce((sum, d) => sum + d.allocated, 0),
      distribution: formattedDistribution,
      warnings
    });
    
  } catch (error: any) {
    console.error('[Advanced Challenge] Error previewing distribution:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to preview distribution' 
    });
  }
});

// ============================================
// ENDPOINT 3: CREATE ADVANCED CHALLENGE
// ============================================

/**
 * POST /api/advanced-challenge/create
 * 
 * Create an advanced multi-topic challenge
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
    
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Verify child exists
    const childResult = await db.select({ 
      id: childProfiles.id,
      parentId: childProfiles.parentId 
    })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId));
    
    if (childResult.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    const child = childResult[0];
    
    // Calculate distribution
    const { distribution, shortfalls } = await calculateDistribution(selections, totalQuestions);
    
    // Select questions
    const selectedQuestions = await selectQuestions(distribution);
    
    if (selectedQuestions.length === 0) {
      return res.status(400).json({ error: 'No questions available for selected topics' });
    }
    
    // Generate title if not provided
    const challengeTitle = title || `Multi-Topic Challenge: ${selections.map(s => s.topic).join(', ')}`;
    
    // Create challenge record
    const challengeResult = await db.insert(challenges).values({
      assignedBy: child.parentId,
      assignedTo: childId,
      assignedToType: 'individual',
      moduleId: null, // No single module for advanced challenges
      challengeType: 'advanced', // Use camelCase to match schema
      challengeScope: selections as any, // Store selections as JSONB
      title: challengeTitle,
      message: message || null,
      questionCount: selectedQuestions.length,
      focusArea,
      estimatedDuration: selectedQuestions.length, // 1 min per question
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending'
    }).returning({ id: challenges.id });
    
    const challengeId = challengeResult[0].id;
    
    // Log shortfalls (silent - won't block)
    await logShortfalls(challengeId, shortfalls);
    
    // TODO: Store selected questions in a challenge_questions table
    // For now, questions will be selected dynamically when quiz starts
    
    res.json({
      success: true,
      challengeId,
      questionCount: selectedQuestions.length,
      message: 'Advanced challenge created successfully'
    });
    
  } catch (error: any) {
    console.error('[Advanced Challenge] Error creating challenge:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to create challenge' 
    });
  }
});

// ============================================
// ENDPOINT 4: GET SHORTFALLS (QB Admin)
// ============================================

/**
 * GET /api/advanced-challenge/shortfalls
 * 
 * Get question bank shortfalls for QB admin review
 */
router.get('/shortfalls', async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    const { questionBankShortfalls } = await import('../../drizzle/schema');
    
    const shortfalls = await db
      .select()
      .from(questionBankShortfalls)
      .orderBy(sql`created_at DESC`)
      .limit(100);
    
    res.json({
      success: true,
      data: shortfalls
    });
    
  } catch (error) {
    console.error('[Advanced Challenge] Error getting shortfalls:', error);
    res.status(500).json({ error: 'Failed to get shortfalls' });
  }
});

export default router;
