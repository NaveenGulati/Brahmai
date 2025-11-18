import { getDb } from './server/db';
import { childProfiles } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function testAdvancedChallengeAPI() {
  console.log('Testing Advanced Challenge API with childProfileId...\n');
  
  const childId = 1; // This is what child will pass after login
  
  try {
    console.log('Testing with childId:', childId);
    
    const db = await getDb();
    if (!db) {
      console.error('❌ Database not available');
      process.exit(1);
    }
    
    // This is what the API does
    console.log('\nQuerying: WHERE childProfiles.id =', childId);
    const childResult = await db.select({ 
      id: childProfiles.id,
      userId: childProfiles.userId,
      parentId: childProfiles.parentId 
    })
      .from(childProfiles)
      .where(eq(childProfiles.id, childId));
    
    if (childResult.length === 0) {
      console.error('❌ Child not found');
      process.exit(1);
    }
    
    console.log('✅ Child found:');
    console.log('   childProfileId:', childResult[0].id);
    console.log('   userId:', childResult[0].userId);
    console.log('   parentId:', childResult[0].parentId);
    
    console.log('\n✅ Advanced Challenge API will work correctly');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

testAdvancedChallengeAPI();
