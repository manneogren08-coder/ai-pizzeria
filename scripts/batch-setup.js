// Batch setup script for multiple companies
// Run with: node scripts/batch-setup.js

const companies = [
  {
    companyName: "Restaurant A",
    companyEmail: "contact@restauranga.se",
    ownerName: "Anna Andersson",
    ownerEmail: "anna@restauranga.se",
    ownerPassword: "securePassword123"
  },
  {
    companyName: "Restaurant B", 
    companyEmail: "info@restaurangb.se",
    ownerName: "Bengt Bengtsson",
    ownerEmail: "bengt@restaurangb.se",
    ownerPassword: "securePassword456"
  },
  {
    companyName: "Restaurant C",
    companyEmail: "hello@restaurangc.se", 
    ownerName: "Carolina Carlsson",
    ownerEmail: "carolina@restaurangc.se",
    ownerPassword: "securePassword789"
  }
];

async function setupCompany(companyData) {
  try {
    const response = await fetch('http://localhost:3000/api/admin/setup-company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(companyData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${companyData.companyName} - Skapat!`);
      console.log(`   Företags-ID: ${result.company.id}`);
      console.log(`   Ägare: ${result.owner.name} (${result.owner.email})`);
    } else {
      console.log(`❌ ${companyData.companyName} - Fel: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ ${companyData.companyName} - Nätverksfel: ${error.message}`);
  }
}

async function setupAllCompanies() {
  console.log('🚀 Börjar batch-setup av 3 restauranger...\n');
  
  for (let i = 0; i < companies.length; i++) {
    console.log(`\n--- Restaurang ${i + 1}/${companies.length} ---`);
    await setupCompany(companies[i]);
    
    // Vänta 1 sekund mellan varje för att undvika rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Batch-setup klar!');
  console.log('\n📋 Sammanfattning:');
  companies.forEach((company, index) => {
    console.log(`${index + 1}. ${company.companyName} - ${company.ownerEmail}`);
  });
  console.log('\n🎯 Nästa steg: Logga in med företags-ID och lösenord');
}

// Kör setup för alla companies
setupAllCompanies();
