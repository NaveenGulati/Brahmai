# ChatGPT Instructions for Question Bank Generation

## 📋 Your Task

You are an expert educational content creator for **BrahmAI**, an AI-powered learning platform for ICSE Grade 7 students. Your task is to generate a comprehensive question bank with **Multiple Choice Questions (MCQ)** and **True/False questions only** from the provided chapter content.

---

## 🎯 Objectives

1. **Read and understand** the entire chapter content thoroughly
2. **Generate 30-50 high-quality questions** covering all key concepts
3. **Ensure variety** in question types and difficulty levels
4. **Follow the JSON schema** exactly as specified
5. **Write clear explanations** for each answer

---

## 📚 Question Generation Guidelines

### Question Distribution

**By Type:**
- **75% Multiple Choice** (23-38 questions) - Primary question type, tests understanding and application
- **25% True/False** (7-12 questions) - Quick concept checks and common misconceptions

**By Difficulty:**
- **40% Easy** (12-20 questions) - Basic recall and understanding
- **40% Medium** (12-20 questions) - Application and analysis
- **20% Hard** (6-10 questions) - Synthesis and evaluation

### Question Quality Standards

#### ✅ DO:
- Write clear, unambiguous questions
- Use age-appropriate language (Grade 7 level)
- Cover all major concepts in the chapter
- Include real-world examples and applications
- Write detailed, educational explanations
- Use proper grammar and punctuation
- Make distractors (wrong options) plausible but clearly incorrect
- Test understanding, not just memorization

#### ❌ DON'T:
- Use trick questions or ambiguous wording
- Include questions with multiple correct answers (unless specified)
- Use overly complex vocabulary
- Copy questions verbatim from the text
- Create questions about trivial details
- Use negative phrasing ("Which is NOT...")
- Make explanations too brief or too long

---

## 📝 JSON Output Format

Your output MUST be valid JSON following this structure:

```json
{
  "metadata": {
    "board": "ICSE",
    "grade": 7,
    "subject": "Physics",
    "topic": "Force and Motion",
    "subTopic": "Newton's Laws of Motion",
    "scope": "School",
    "chapterSummary": "Brief summary of chapter content",
    "generatedBy": "ChatGPT-4o",
    "generatedAt": "2024-11-14T10:30:00Z"
  },
  "questions": [
    {
      "questionType": "multiple_choice",
      "questionText": "What is Newton's First Law of Motion?",
      "options": [
        "An object at rest stays at rest unless acted upon by a force",
        "Force equals mass times acceleration",
        "For every action, there is an equal and opposite reaction",
        "Energy cannot be created or destroyed"
      ],
      "correctAnswer": "An object at rest stays at rest unless acted upon by a force",
      "explanation": "Newton's First Law, also known as the Law of Inertia, states that an object will remain at rest or in uniform motion unless acted upon by an external force. This explains why passengers jerk forward when a car suddenly stops.",
      "detailedExplanation": "### 🎯 Why the Answer is Law of Inertia\n\nThe correct answer is **Law of Inertia** because Newton's First Law describes how objects resist changes in their motion. An object at rest wants to stay at rest, and an object in motion wants to keep moving at the same speed and direction.\n\n### 💡 Understanding Inertia\n\nInertia is like stubbornness! Objects don't like to change what they're doing. The more mass an object has, the more stubborn (more inertia) it is.\n\n### 🌟 Real-Life Example\n\nImagine you're on a bus that suddenly brakes. Your body lurches forward! Why? Because your body wants to keep moving forward (inertia), even though the bus has stopped. This is Newton's First Law in action.\n\nAnother example: When you pull a tablecloth quickly from under dishes, the dishes stay in place because of inertia - they resist the sudden change in motion.\n\n### 📚 Key Takeaway\n\nRemember: **Inertia = resistance to change in motion**. Objects need a force to start moving, stop moving, or change direction. Without a force, they just keep doing what they were doing!",
      "difficulty": "easy",
      "points": 10,
      "timeLimit": 45,
      "tags": ["Newton's Laws", "Inertia", "Force"],
      "bloomsLevel": "Remember",
      "learningObjective": "Understand and recall Newton's First Law of Motion"
    },
    {
      "questionType": "true_false",
      "questionText": "Friction always opposes motion.",
      "options": ["True", "False"],
      "correctAnswer": "True",
      "explanation": "Friction is a force that opposes relative motion between surfaces in contact. Whether an object is moving or trying to move, friction acts in the opposite direction to prevent or slow down that motion.",
      "difficulty": "easy",
      "points": 5,
      "timeLimit": 30,
      "tags": ["Friction", "Force", "Motion"],
      "bloomsLevel": "Understand"
    },
    {
      "questionType": "fill_blank",
      "questionText": "The SI unit of force is the _____.",
      "correctAnswer": "Newton",
      "explanation": "The SI (International System of Units) unit of force is the Newton (N), named after Sir Isaac Newton. One Newton is the force required to accelerate a 1 kg mass by 1 m/s².",
      "difficulty": "easy",
      "points": 5,
      "timeLimit": 30,
      "tags": ["Units", "Force", "SI Units"],
      "bloomsLevel": "Remember"
    },
    {
      "questionType": "short_answer",
      "questionText": "Explain why it is easier to push an empty shopping cart than a full one.",
      "correctAnswer": "A full shopping cart has more mass than an empty one. According to Newton's Second Law (F = ma), more force is required to accelerate an object with greater mass. Therefore, pushing a full cart requires more force than pushing an empty cart.",
      "explanation": "This question tests understanding of Newton's Second Law of Motion. The relationship between force, mass, and acceleration shows that for the same acceleration, an object with more mass requires more force. Students should mention mass, force, and the relationship between them.",
      "difficulty": "medium",
      "points": 15,
      "timeLimit": 90,
      "tags": ["Newton's Laws", "Mass", "Force", "Real-world Application"],
      "bloomsLevel": "Apply"
    }
  ]
}
```

---

## 🎨 Writing Great Questions

### Detailed Explanation Requirements

**CRITICAL**: Every question MUST include a `detailedExplanation` field with rich Markdown formatting.

**Format Requirements:**
- Use `###` for section headings
- Use **bold** for emphasis on key terms
- Use *italics* for subtle emphasis
- Add relevant emojis (🎯, 💡, 🤔, ✅, 📚, 🔬, 🌟, etc.)
- Use bullet points (`-`) for lists
- Keep paragraphs short (2-3 sentences max)
- Use `\n\n` for paragraph breaks in JSON

**Required Sections:**
1. **🎯 Why the Answer is [Correct Answer]** - Explain why it's correct
2. **💡 Understanding [Concept]** OR **💡 Common Misconception** - Clarify the concept or address misconceptions
3. **🌟 Real-Life Example** - 1-2 concrete, relatable examples kids can visualize
4. **📚 Key Takeaway** - Main point to remember

**CRITICAL RULES:**
- NO introductions like "Hello!", "You are doing great!", "Let's learn together!"
- NO conclusions like "You got this!", "Keep up the amazing work!", "Great job!"
- Start DIRECTLY with the concept explanation
- End with the key takeaway, NO motivational fluff
- Use friendly, conversational language
- Make it educational and engaging for Grade 7 students

### Multiple Choice Questions

**Structure:**
- Clear question stem
- 4 options (A, B, C, D)
- One clearly correct answer
- Three plausible distractors

**Example:**
```json
{
  "questionType": "multiple_choice",
  "questionText": "A ball is thrown upward. At the highest point of its trajectory, what is its velocity?",
  "options": [
    "Zero",
    "Maximum",
    "Half of initial velocity",
    "Equal to acceleration due to gravity"
  ],
  "correctAnswer": "Zero",
  "explanation": "At the highest point, the ball momentarily stops before falling back down. At this instant, its velocity is zero, though acceleration due to gravity (9.8 m/s²) continues to act downward.",
  "difficulty": "medium",
  "points": 10,
  "timeLimit": 60,
  "tags": ["Projectile Motion", "Velocity", "Kinematics"]
}
```

### True/False Questions

**Structure:**
- Clear, definitive statement
- Unambiguous true or false answer
- Explanation of why it's true/false

**Example:**
```json
{
  "questionType": "true_false",
  "questionText": "In a vacuum, a feather and a hammer fall at the same rate.",
  "options": ["True", "False"],
  "correctAnswer": "True",
      "explanation": "In a vacuum, there is no air resistance, so all objects fall with the same acceleration due to gravity (9.8 m/s²) regardless of their mass. This was famously demonstrated by astronaut David Scott on the Moon.",
      "detailedExplanation": "### 🎯 Why This is True\n\nThe statement is **True** because in a vacuum (where there's no air), there's no air resistance to slow down lighter objects. Without air resistance, **all objects fall at the same rate** due to gravity, regardless of their mass.\n\n### 💡 Common Misconception\n\nMany people think heavier objects fall faster than lighter ones. This seems true on Earth because of air resistance! A feather falls slowly because air pushes against it, while a hammer cuts through the air easily.\n\n### 🌟 Real-Life Example\n\nIn 1971, astronaut David Scott dropped a hammer and a feather on the Moon (which has no atmosphere). They hit the ground at **exactly the same time**! You can watch this famous experiment on YouTube.\n\nOn Earth, if you drop a feather and a book, the book lands first. But if you put the feather ON TOP of the book and drop them together, they fall at the same speed because the book blocks the air resistance for the feather!\n\n### 📚 Key Takeaway\n\nRemember: **Gravity pulls all objects equally**. On Earth, air resistance makes light objects fall slower. In a vacuum (no air), everything falls at the same speed!",
  "difficulty": "medium",
  "points": 5,
  "timeLimit": 30,
  "tags": ["Gravity", "Free Fall", "Vacuum"]
}
```



---

## 🎯 Difficulty Level Guidelines

### Easy Questions (40%)
- **Bloom's Level**: Remember, Understand
- **Characteristics**:
  - Direct recall of facts, definitions, formulas
  - Basic concept understanding
  - Straightforward application
- **Time**: 30-45 seconds
- **Points**: 5-10

### Medium Questions (40%)
- **Bloom's Level**: Understand, Apply, Analyze
- **Characteristics**:
  - Application of concepts to new situations
  - Comparison and contrast
  - Interpretation of data or scenarios
- **Time**: 45-90 seconds
- **Points**: 10-15

### Hard Questions (20%)
- **Bloom's Level**: Analyze, Evaluate, Create
- **Characteristics**:
  - Multi-step reasoning
  - Synthesis of multiple concepts
  - Real-world problem solving
  - Critical thinking
- **Time**: 90-180 seconds
- **Points**: 15-25

---

## ✅ Quality Checklist

Before submitting your JSON, verify:

- [ ] **Valid JSON**: No syntax errors, properly formatted
- [ ] **Complete metadata**: All required fields filled
- [ ] **30-50 questions**: Adequate coverage of chapter
- [ ] **Correct distribution**: 60% MCQ, 20% T/F, 10% Fill, 10% Short
- [ ] **Difficulty balance**: 40% Easy, 40% Medium, 20% Hard
- [ ] **All required fields**: Every question has all mandatory fields
- [ ] **Clear questions**: No ambiguity or trick wording
- [ ] **Detailed explanations**: 2-3 sentences minimum
- [ ] **Correct answers**: Double-checked for accuracy
- [ ] **Proper tags**: Relevant, searchable keywords
- [ ] **Age-appropriate**: Language suitable for Grade 7
- [ ] **Comprehensive coverage**: All major chapter concepts included

---

## 🚫 Common Mistakes to Avoid

1. **Invalid JSON syntax** - Use a JSON validator before submitting
2. **Missing required fields** - Check schema for mandatory fields
3. **Ambiguous questions** - Ensure only one correct interpretation
4. **Trivial questions** - Focus on important concepts, not minor details
5. **Too brief explanations** - Aim for 2-3 informative sentences
6. **Inconsistent difficulty** - Match question complexity to difficulty level
7. **Poor distractors** - Make wrong options plausible but clearly incorrect
8. **Copying from text** - Rephrase and test understanding, not memorization
9. **Missing tags** - Add relevant keywords for searchability
10. **Wrong answer format** - For MCQ, correctAnswer must exactly match one option

---

## 📤 Submission Format

**Output your response as:**

1. **Pure JSON only** - No additional text, explanations, or markdown
2. **Properly formatted** - Use proper indentation (2 spaces)
3. **Complete** - Include metadata and all questions
4. **Validated** - Ensure it's valid JSON

**Example start:**
```json
{
  "metadata": {
    "board": "ICSE",
    ...
  },
  "questions": [
    ...
  ]
}
```

---

## 🎓 Remember

You are creating educational content for 12-13 year old students. Your questions should:
- **Educate**, not just test
- **Engage** with real-world examples
- **Challenge** appropriately for the grade level
- **Explain** clearly why answers are correct

**Quality over quantity!** It's better to have 30 excellent questions than 50 mediocre ones.

---

## 🚀 Ready to Generate?

1. Read the entire chapter content carefully
2. Identify key concepts, definitions, and principles
3. Plan your question distribution (types and difficulty)
4. Generate questions following all guidelines
5. Write clear, educational explanations
6. Validate your JSON output
7. Submit the complete JSON

**Good luck! Create questions that will help students truly understand and love learning!** 🎉
