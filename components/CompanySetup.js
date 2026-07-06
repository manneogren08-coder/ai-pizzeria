'use client';

import { useState } from 'react';

export default function CompanySetup({ onSetupComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (formData.ownerPassword !== formData.confirmPassword) {
      setError('Lösenorden matchar inte');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Frontend Debug - Sending request:', {
        companyName: formData.companyName,
        companyEmail: formData.companyEmail,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail
      });
      
      const response = await fetch('/api/admin/setup-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          companyEmail: formData.companyEmail,
          ownerName: formData.ownerName,
          ownerEmail: formData.ownerEmail,
          ownerPassword: formData.ownerPassword
        })
      });

      console.log('🔍 Frontend Debug - Response status:', response.status);
      console.log('🔍 Frontend Debug - Response ok:', response.ok);

      const data = await response.json();
      console.log('🔍 Frontend Debug - Response data:', data);

      if (!response.ok) {
        console.log('🔍 Frontend Debug - Error:', data.error);
        setError(data.error || 'Kunde inte skapa företag');
        setLoading(false);
        return;
      }

      // Success - redirect to login
      onSetupComplete && onSetupComplete(data);
      
    } catch (err) {
      setError('Ett fel uppstod. Försök igen.');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{
      maxWidth: '500px',
      margin: '50px auto',
      padding: '40px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{
        textAlign: 'center',
        marginBottom: '30px',
        color: '#1f2937',
        fontSize: '24px',
        fontWeight: '600'
      }}>
        Skapa nytt företag
      </h2>
      
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Företagsnamn *
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            placeholder="t.ex. Restaurant Kungen"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Företagse-post *
          </label>
          <input
            type="email"
            name="companyEmail"
            value={formData.companyEmail}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            placeholder="foretag@exempel.com"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Ditt namn (ägare) *
          </label>
          <input
            type="text"
            name="ownerName"
            value={formData.ownerName}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            placeholder="Anna Andersson"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Din e-post (ägare) *
          </label>
          <input
            type="email"
            name="ownerEmail"
            value={formData.ownerEmail}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            placeholder="din.epost@exempel.com"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Lösenord *
          </label>
          <input
            type="password"
            name="ownerPassword"
            value={formData.ownerPassword}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            placeholder="Minst 8 tecken"
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Bekräfta lösenord *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '16px'
            }}
            placeholder="Samma lösenord igen"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? 'Skapar företag...' : 'Skapa företag'}
        </button>
      </form>

      <div style={{
        marginTop: '30px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        <p style={{ margin: '0 0 10px 0' }}>
          * Obligatoriska fält
        </p>
        <p style={{ margin: 0 }}>
          Efter att företaget är skapat kan du logga in med företags-ID och lösenord.
        </p>
      </div>
    </div>
  );
}
