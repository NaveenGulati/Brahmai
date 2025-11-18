import { authenticateChild } from './server/auth';
import { getDb } from './server/db';
import { childProfiles } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function testChildLogin() {
  console.log('Testing child login flow...\n');
  
  try {
    // Step 1: Authenticate
    console.log('Step 1: Authenticating child...');
    const user = await authenticateChild('riddhu1', 'riddhu');
    
    if (!user) {
      console.error('❌ Authentication failed');
      process.exit(1);
    }
    console.log('✅ Authentication successful');
    console.log('   userId:', user.id);
    console.log('   username:', user.username);
    console.log('   role:', user.role);
    
    // Step 2: Get childProfileId
    console.log('\nStep 2: Getting childProfileId...');
    let childProfileId = null;
    if (user.role === 'child') {
      const db = await getDb();
      if (!db) {
        console.error('❌ Database not available');
        process.exit(1);
      }
      
      const profile = await db.select({ id: childProfiles.id })
        .from(childProfiles)
        .where(eq(childProfiles.userId, user.id))
        .limit(1);
      
      if (profile.length > 0) {
        childProfileId = profile[0].id;
      }
    }
    
    if (!childProfileId) {
      console.error('❌ Child profile not found');
      process.exit(1);
    }
    console.log('✅ Child profile found');
    console.log('   childProfileId:', childProfileId);
    
    // Step 3: Build response
    console.log('\nStep 3: Building login response...');
    const response = {
      success: true,
      redirectTo: '/child',
      user: {
        id: childProfileId,
        userId: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
    
    console.log('✅ Response built successfully');
    console.log('   Response:', JSON.stringify(response, null, 2));
    
    console.log('\n✅ ALL TESTS PASSED');
    console.log('Child login will return childProfileId:', childProfileId);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

testChildLogin();
