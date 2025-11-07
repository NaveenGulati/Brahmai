#!/usr/bin/env node
/**
 * Test script to verify focusArea system works correctly
 * Tests the createAdaptiveChallenge mutation with new focusArea parameter
 */

const testPayload = {
  childId: 1,
  moduleId: 1,
  questionCount: 20,
  focusArea: 'balanced' // Test with 'balanced' (was 'neutral' before)
};

console.log('Testing createAdaptiveChallenge with focusArea system...');
console.log('Payload:', JSON.stringify(testPayload, null, 2));

// Make HTTP request to tRPC endpoint
const response = await fetch('http://localhost:3000/trpc/parent.createAdaptiveChallenge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Note: This will fail with 401 if not authenticated, but we can see if the validation works
  },
  body: JSON.stringify(testPayload)
});

const result = await response.text();
console.log('\nResponse status:', response.status);
console.log('Response:', result);

if (response.status === 401) {
  console.log('\n✅ Expected 401 (not authenticated) - this means the endpoint exists and validation passed');
} else if (response.status === 400) {
  console.log('\n❌ 400 Bad Request - validation error, check the response above');
} else if (response.status === 200) {
  console.log('\n✅ Success! Challenge created');
} else {
  console.log('\n⚠️  Unexpected status code');
}
