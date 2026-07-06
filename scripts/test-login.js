// Script to test login with the test company
// Run with: node scripts/test-login.js

import 'dotenv/config';

const testLogin = async () => {
  try {
    console.log('🔐 Testing login with test company...\n');

    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyIdentifier: '7',
        password: 'test123456'
      })
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Response:', data);

    if (response.ok) {
      console.log('\n✅ Login successful!');
      console.log(`   Company ID: ${data.company.id}`);
      console.log(`   Company Name: ${data.company.name}`);
      console.log(`   Token: ${data.token.substring(0, 50)}...`);
    } else {
      console.log('\n❌ Login failed');
    }

  } catch (error) {
    console.error('❌ Error testing login:', error);
  }
};

testLogin();
