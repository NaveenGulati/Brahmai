# UI Update Guide - Focus Areas

## Overview
This guide shows how to update the ChallengeCreator component to use Focus Areas instead of Complexity Levels.

## Changes Required

### 1. Remove Complexity State (Line 62-63)
**OLD:**
```typescript
const [useComplexityBoundaries, setUseComplexityBoundaries] = useState(true);
const [complexity, setComplexity] = useState(5);
const [focusArea, setFocusArea] = useState<'strengthen' | 'improve' | 'neutral'>('neutral');
```

**NEW:**
```typescript
const [focusArea, setFocusArea] = useState<'strengthen' | 'improve' | 'balanced'>('balanced');
```

### 2. Remove Complexity Definitions (Lines 76-88)
**DELETE:** The entire `COMPLEXITY_LEVELS` object

### 3. Update Focus Area Options (Line 64)
**OLD:** `'neutral'`  
**NEW:** `'balanced'`

### 4. Update createChallenge Mutation (Lines 120-127)
**OLD:**
```typescript
createChallenge.mutate({
  childId,
  moduleId: selectedModule,
  questionCount,
  complexity,
  focusArea,
  useComplexityBoundaries,
});
```

**NEW:**
```typescript
createChallenge.mutate({
  childId,
  moduleId: selectedModule,
  questionCount,
  focusArea, // Only this is needed now!
});
```

### 5. Replace Complexity Slider UI with Focus Area Cards

**Find the complexity slider section (around lines 260-300) and replace with:**

```tsx
{/* Focus Area Selection */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Target className="w-5 h-5" />
      Focus Area
    </CardTitle>
    <CardDescription>
      What should this quiz focus on?
    </CardDescription>
  </CardHeader>
  <CardContent>
    <RadioGroup value={focusArea} onValueChange={(value: any) => setFocusArea(value)}>
      <div className="space-y-3">
        {/* Strengthen Option */}
        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
          <RadioGroupItem value="strengthen" id="strengthen" />
          <div className="flex-1">
            <Label htmlFor="strengthen" className="cursor-pointer font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Strengthen
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Focus on topics where {childName} is already performing well (>70% accuracy).
              Builds confidence and deepens mastery.
            </p>
            <Badge variant="secondary" className="mt-2">Best for: Exam prep, gifted students</Badge>
          </div>
        </div>

        {/* Improve Option */}
        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
          <RadioGroupItem value="improve" id="improve" />
          <div className="flex-1">
            <Label htmlFor="improve" className="cursor-pointer font-semibold flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-orange-600" />
              Improve
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Focus on topics where {childName} needs more practice (<60% accuracy).
              Builds foundation and fills knowledge gaps.
            </p>
            <Badge variant="secondary" className="mt-2">Best for: Remedial learning, struggling topics</Badge>
          </div>
        </div>

        {/* Balanced Option */}
        <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
          <RadioGroupItem value="balanced" id="balanced" />
          <div className="flex-1">
            <Label htmlFor="balanced" className="cursor-pointer font-semibold flex items-center gap-2">
              <Minus className="w-4 h-4 text-blue-600" />
              Balanced
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Random mix of all topics with adaptive difficulty.
              Comprehensive assessment across the entire module.
            </p>
            <Badge variant="secondary" className="mt-2">Best for: General practice, exploration</Badge>
          </div>
        </div>
      </div>
    </RadioGroup>
  </CardContent>
</Card>
```

### 6. Update Review Step (Step 3)
**Find the review section and update to show Focus Area instead of Complexity:**

```tsx
<div className="flex justify-between py-2">
  <span className="text-muted-foreground">Focus Area:</span>
  <span className="font-medium capitalize flex items-center gap-2">
    {focusArea === 'strengthen' && <TrendingUp className="w-4 h-4 text-green-600" />}
    {focusArea === 'improve' && <TrendingDown className="w-4 h-4 text-orange-600" />}
    {focusArea === 'balanced' && <Minus className="w-4 h-4 text-blue-600" />}
    {focusArea}
  </span>
</div>
```

## Testing Checklist

After making these changes:

- [ ] Challenge creation form loads without errors
- [ ] All 3 focus areas are selectable
- [ ] Focus area selection is reflected in review step
- [ ] Challenge is created successfully with focusArea
- [ ] No console errors related to complexity
- [ ] Duration estimation still works (if it uses complexity, update that too)

## Backend API Update

The backend `createAdaptiveChallenge` mutation should also be updated to:
1. Remove `complexity` and `useComplexityBoundaries` from input schema
2. Only require `focusArea` field
3. Remove question pre-selection logic (let adaptive engine handle it)

## Migration Notes

- Existing challenges with `complexity` will be migrated to `focusArea` via SQL migration
- Old complexity values map as: 1-4 → improve, 5-7 → balanced, 8-10 → strengthen
- The adaptive quiz engine will now handle difficulty selection dynamically
