# Quick Start Guide: Question Bank Generation

## 📋 Overview

This guide will help you quickly generate question banks from chapter content using ChatGPT and upload them to BrahmAI.

---

## 🚀 Step-by-Step Process

### Step 1: Prepare Your Chapter Content

**What you need:**
- Scanned PDF or images of the chapter
- OR typed/OCR text of the chapter content
- Clear, readable content covering all major concepts

**Tips:**
- Ensure scans are high quality and readable
- If using OCR, proofread for errors
- Include diagrams and examples if available

---

### Step 2: Set Up ChatGPT

**Open ChatGPT** (GPT-4o recommended for best results)

**Copy and paste this prompt:**

```
I need you to generate a comprehensive question bank for an educational platform called BrahmAI.

Please read the attached chapter content carefully and generate 30-50 high-quality questions following the instructions and JSON schema I'm providing.

[Paste the entire content of CHATGPT_INSTRUCTIONS.md here]

[Paste the JSON schema from QUESTION_BANK_SCHEMA.json here]

Here is the chapter content:

[Paste or attach your chapter content here]

Please generate the question bank as a single, valid JSON file following all the guidelines.
```

---

### Step 3: Review ChatGPT's Output

**Check for:**
- ✅ Valid JSON syntax (no errors)
- ✅ All required fields present
- ✅ 30-50 questions generated
- ✅ Proper distribution of question types
- ✅ Appropriate difficulty levels
- ✅ Clear, educational explanations
- ✅ Correct answers verified

**Validation Tools:**
- Use [JSONLint](https://jsonlint.com/) to validate JSON syntax
- Use [JSON Schema Validator](https://www.jsonschemavalidator.net/) for schema validation

---

### Step 4: Save the JSON File

1. Copy the entire JSON output from ChatGPT
2. Save it as `[subject]_[topic]_questions.json`
   - Example: `physics_force_and_motion_questions.json`
3. Keep it in a dedicated folder for question banks

---

### Step 5: Upload to BrahmAI

**Method 1: Through QB Admin Dashboard** (Recommended)
1. Log in to BrahmAI with QB Admin credentials
2. Navigate to QB Admin Dashboard
3. Click "Import Questions" or "Upload Question Bank"
4. Select your JSON file
5. Review the preview
6. Click "Import" to add questions to the database

**Method 2: Direct Database Import** (For developers)
```bash
# Use the QB Admin API endpoint
curl -X POST https://brahmai.ai/api/qb-admin/import \
  -H "Content-Type: application/json" \
  -H "Cookie: brahmai_session=YOUR_SESSION_COOKIE" \
  -d @physics_force_and_motion_questions.json
```

---

## 📝 Example Workflow

### Real Example: Physics Chapter on Force and Motion

**1. Prepare Content:**
```
Chapter 5: Force and Motion
- Newton's Laws of Motion
- Types of Forces
- Friction
- Applications in Daily Life
[Full chapter text...]
```

**2. ChatGPT Prompt:**
```
Generate a question bank for:
- Board: ICSE
- Grade: 7
- Subject: Physics
- Topic: Force and Motion
- Sub-topic: Newton's Laws of Motion

[Include full instructions and schema]
[Include chapter content]
```

**3. ChatGPT Output:**
```json
{
  "metadata": {
    "board": "ICSE",
    "grade": 7,
    "subject": "Physics",
    "topic": "Force and Motion",
    ...
  },
  "questions": [
    {
      "questionType": "multiple_choice",
      "questionText": "What is Newton's First Law?",
      ...
    },
    ...
  ]
}
```

**4. Validate & Save:**
- Check JSON validity ✅
- Review questions ✅
- Save as `physics_force_and_motion_questions.json` ✅

**5. Upload:**
- Login as QB Admin ✅
- Import JSON file ✅
- Questions added to database ✅

---

## 🎯 Best Practices

### For Better Results

**DO:**
- ✅ Provide complete chapter content
- ✅ Include examples and diagrams
- ✅ Specify grade level and board clearly
- ✅ Review and edit questions before uploading
- ✅ Test a few questions manually
- ✅ Keep original files for reference

**DON'T:**
- ❌ Upload without validation
- ❌ Skip reviewing explanations
- ❌ Use incomplete chapter content
- ❌ Generate questions for multiple chapters at once
- ❌ Ignore difficulty distribution
- ❌ Upload duplicate questions

---

## 🔧 Troubleshooting

### Issue: ChatGPT generates invalid JSON

**Solution:**
- Ask ChatGPT to fix the JSON syntax
- Use JSONLint to identify the error
- Manually fix common issues (missing commas, quotes)

### Issue: Questions are too easy/hard

**Solution:**
- Specify difficulty distribution in your prompt
- Ask ChatGPT to regenerate specific difficulty levels
- Manually adjust difficulty tags before uploading

### Issue: Explanations are too brief

**Solution:**
- Ask ChatGPT to expand explanations
- Specify "2-3 sentences minimum" in your prompt
- Manually enhance explanations if needed

### Issue: Questions don't cover all concepts

**Solution:**
- List key concepts in your prompt
- Ask ChatGPT to generate questions for missing topics
- Append additional questions to the JSON

### Issue: Upload fails

**Solution:**
- Validate JSON syntax
- Check all required fields are present
- Ensure correct data types (numbers as numbers, not strings)
- Verify QB Admin session is active

---

## 📊 Quality Checklist

Before uploading, ensure:

### Content Quality
- [ ] Questions are clear and unambiguous
- [ ] Explanations are educational and detailed
- [ ] Difficulty levels are appropriate
- [ ] All major concepts are covered
- [ ] Real-world examples are included

### Technical Quality
- [ ] Valid JSON syntax
- [ ] All required fields present
- [ ] Correct data types
- [ ] No duplicate questions
- [ ] Proper tags for searchability

### Educational Quality
- [ ] Age-appropriate language
- [ ] Accurate information
- [ ] Proper terminology
- [ ] Bloom's taxonomy alignment
- [ ] Learning objectives clear

---

## 📚 Resources

### Files Included
1. **QUESTION_BANK_SCHEMA.json** - JSON schema definition
2. **CHATGPT_INSTRUCTIONS.md** - Detailed instructions for ChatGPT
3. **EXAMPLE_QUESTION_BANK.json** - Sample output for reference
4. **QUICK_START_GUIDE.md** - This file

### Useful Tools
- [JSONLint](https://jsonlint.com/) - Validate JSON syntax
- [JSON Schema Validator](https://www.jsonschemavalidator.net/) - Validate against schema
- [ChatGPT](https://chat.openai.com/) - Generate questions
- [BrahmAI QB Admin](https://brahmai.ai/qb-admin) - Upload questions

---

## 🎓 Tips for Success

### Generating High-Quality Questions

1. **Provide Context**: Give ChatGPT complete chapter content
2. **Be Specific**: Clearly state board, grade, subject, topic
3. **Review Output**: Always review and validate before uploading
4. **Iterate**: If quality is low, regenerate with more specific instructions
5. **Test Questions**: Try answering a few questions yourself

### Maintaining Consistency

1. **Use Templates**: Keep a template prompt for each subject
2. **Standard Format**: Always use the same JSON structure
3. **Naming Convention**: Use consistent file naming
4. **Version Control**: Keep track of question bank versions
5. **Documentation**: Note any manual edits made

### Scaling Up

1. **Batch Processing**: Generate multiple chapters in sequence
2. **Quality Control**: Have someone review before bulk upload
3. **Tagging Strategy**: Use consistent tags across chapters
4. **Progress Tracking**: Maintain a spreadsheet of completed chapters
5. **Feedback Loop**: Update instructions based on what works

---

## ✅ Ready to Start!

You now have everything you need to generate high-quality question banks for BrahmAI.

**Next Steps:**
1. Gather chapter content
2. Open ChatGPT
3. Use the instructions and schema
4. Generate questions
5. Validate and upload

**Need Help?**
- Review CHATGPT_INSTRUCTIONS.md for detailed guidelines
- Check EXAMPLE_QUESTION_BANK.json for reference
- Refer to QUESTION_BANK_SCHEMA.json for field definitions

---

**Happy Question Banking! 🎉**
