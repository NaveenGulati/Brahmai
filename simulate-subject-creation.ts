import { getDb } from './server/db';
import { subjects } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function simulateSubjectCreation() {
    const db = await getDb();
    if (!db) {
        console.error("Database connection failed.");
        return;
    }

    const subjectName = "Hindi";
    const code = "HIND"; // Assume this code is already taken

    console.log(`Attempting to create subject: ${subjectName} with code: ${code}`);

    try {
        const result = await db.insert(subjects).values({
            name: subjectName,
            code: code,
            description: `${subjectName} curriculum`,
            icon: '🇮🇳',
            color: '#6366f1',
            category: 'core',
            isActive: true,
            displayOrder: 0,
        }).returning({ id: subjects.id });

        console.log(`✅ Subject created successfully with ID: ${result[0].id}`);

    } catch (error: any) {
        console.error("❌ Subject creation failed. Full error message:");
        console.error(error.message);
        console.error("--- End of Error ---");
    }
}

simulateSubjectCreation();
