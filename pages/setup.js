import { useState } from 'react';
import CompanySetup from '../components/CompanySetup';

export default function SetupPage() {
  const [showSetup, setShowSetup] = useState(true);
  const [setupData, setSetupData] = useState(null);

  const handleSetupComplete = (data) => {
    setSetupData(data);
    setShowSetup(false);
  };

  if (!showSetup) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h1 style={{
            textAlign: 'center',
            marginBottom: '20px',
            color: '#1f2937',
            fontSize: '28px',
            fontWeight: '700'
          }}>
            Företag skapat! 🎉
          </h1>
          
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2 style={{
              margin: '0 0 10px 0',
              color: '#166534',
              fontSize: '18px'
            }}>
              {setupData.company.name}
            </h2>
            <p style={{
              margin: '0 0 5px 0',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              Företags-ID: <strong>{setupData.company.id}</strong>
            </p>
            <p style={{
              margin: '0 0 5px 0',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              E-post: <strong>{setupData.company.email}</strong>
            </p>
            <p style={{
              margin: '0',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              Ägare: <strong>{setupData.owner.name}</strong> ({setupData.owner.email})
            </p>
          </div>

          <div style={{
            background: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h3 style={{
              margin: '0 0 15px 0',
              color: '#1e40af',
              fontSize: '16px'
            }}>
              Nästa steg
            </h3>
            <ol style={{
              margin: '0',
              paddingLeft: '20px',
              color: '#374151',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <li style={{ marginBottom: '10px' }}>
                <strong>Logga in</strong> med företags-ID och lösenord
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Lägg till personal</strong> via admin-panelen
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong>Konfigurera</strong> recept, meny och rutiner
              </li>
            </ol>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '30px'
          }}>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#2563eb'}
              onMouseOut={(e) => e.target.style.background = '#3b82f6'}
            >
              Gå till inloggning
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <CompanySetup onSetupComplete={handleSetupComplete} />
    </div>
  );
}
