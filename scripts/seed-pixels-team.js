// Script to seed Pixels team members into DynamoDB Users table
import AWS from 'aws-sdk';

// Configure AWS for local DynamoDB
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'dummy',
  secretAccessKey: 'dummy',
  endpoint: 'http://localhost:8000'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Pixels team members based on .env file
const pixelsTeam = [
  {
    id: '557058:22f7c68d-94c8-4fc5-9f08-6b4ab5374c82',
    displayName: 'Alicja Wolnik',
    email: 'alicja.wolnik@auctane.com',
    role: 'Senior Software Engineer',
    avatarColor: '#E91E63',
    team: 'Pixels'
  },
  {
    id: '557058:41afc69b-a7a7-4c0c-a567-e8a546d839a2',
    displayName: 'Krzysztof Rak',
    email: 'krzysztof.rak@auctane.com', 
    role: 'Associate Software Engineer',
    avatarColor: '#9C27B0',
    team: 'Pixels'
  },
  {
    id: '5d19ba6643d1510d3accd22d',
    displayName: 'Tomasz Rusiński',
    email: 'tomasz.rusinski@auctane.com',
    role: 'Software Engineer',
    avatarColor: '#2196F3',
    team: 'Pixels'
  },
  {
    id: '557058:55341d8b-a3fe-491b-ab75-40d9e3170a3b',
    displayName: 'Krzysztof Adamek',
    email: 'krzysztof.adamek@auctane.com',
    role: 'Senior Software Engineer',
    avatarColor: '#00BCD4',
    team: 'Pixels'
  },
  {
    id: '712020:25d2841e-e973-410c-8305-848ec4228eb8',
    displayName: 'Oliwer Pawelski',
    email: 'oliwer.pawelski@auctane.com',
    role: 'Associate Software Engineer',
    avatarColor: '#4CAF50',
    team: 'Pixels'
  },
  {
    id: 'bartosz-bossy',
    displayName: 'Bartosz Bossy',
    email: 'bartosz.bossy@auctane.com',
    role: 'Associate Manager, Engineering',
    avatarColor: '#FF9800',
    team: 'Pixels'
  }
];

const seedUsers = async () => {
  console.log('🚀 Seeding Pixels team members into Users table...');
  
  try {
    for (const user of pixelsTeam) {
      const params = {
        TableName: 'Users',
        Item: {
          ...user,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      await dynamodb.put(params).promise();
      console.log(`✅ Added: ${user.displayName} (${user.role})`);
    }
    
    console.log('🎉 All Pixels team members added successfully!');
    console.log(`📊 Total users added: ${pixelsTeam.length}`);
    
    // Show summary
    console.log('\n📋 Team Summary:');
    pixelsTeam.forEach(user => {
      console.log(`   ${user.displayName} - ${user.role}`);
    });
    
  } catch (error) {
    console.error('💥 Failed to seed users:', error);
    process.exit(1);
  }
};

// Run seeding
seedUsers();