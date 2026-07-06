import React, { useState } from 'react';

export default function ChangeAdminPassword({ companyId, onPasswordChanged }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    console.log("🔍 DEBUG: ChangeAdminPassword handleSubmit called");

    if (newPassword.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Lösenorden matchar inte');
      setLoading(false);
      return;
    }

    try {
      // Get token from localStorage (using same key as main app)
      const token = localStorage.getItem("token");
      console.log("🔍 DEBUG: Token from localStorage:", token ? "exists" : "missing");
      
      const response = await fetch('/api/admin/change-admin-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword }),
      });

      console.log("🔍 DEBUG: API response status:", response.status);
      console.log("🔍 DEBUG: API response headers:", response.headers);

      const data = await response.json();
      console.log("🔍 DEBUG: API response data:", data);

      if (response.ok) {
        setSuccess('Admin-lösenord uppdaterat!');
        setNewPassword('');
        setConfirmPassword('');
        if (onPasswordChanged) {
          onPasswordChanged();
        }
      } else {
        setError(data.error || 'Kunde inte uppdatera lösenord');
      }
    } catch (err) {
      console.error("🔍 DEBUG: Fetch error:", err);
      setError('Serverfel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #e5e7eb', 
      borderRadius: '8px', 
      marginBottom: '20px',
      backgroundColor: '#f9fafb'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>
        Ändra Admin-lösenord
      </h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#4b5563' }}>
            Nytt admin-lösenord:
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="Minst 6 tecken"
            minLength={6}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#4b5563' }}>
            Bekräfta lösenord:
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="Bekräfta nytt lösenord"
            minLength={6}
            required
          />
        </div>

        {error && (
          <div style={{
            padding: '10px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            padding: '10px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#16a34a',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 20px',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          {loading ? 'Uppdaterar...' : 'Uppdatera admin-lösenord'}
        </button>
      </form>
    </div>
  );
}
