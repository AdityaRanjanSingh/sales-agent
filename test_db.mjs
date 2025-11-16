import { PrismaClient } from './lib/generated/prisma/index.js';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✓ Connected to database');
    
    // Test query
    const count = await prisma.userPreferences.count();
    console.log(`✓ UserPreferences table exists with ${count} rows`);
    
    // Close connection
    await prisma.$disconnect();
    console.log('✓ Test complete');
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testConnection();
