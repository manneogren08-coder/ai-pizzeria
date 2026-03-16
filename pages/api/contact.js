async function sendContactEmail({ name, restaurant, email, message }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@staffguide.se";

  console.log('Contact email attempt:', {
    resendApiKey: resendApiKey ? 'exists' : 'missing',
    fromEmail,
    to: 'staffguide.se@gmail.com'
  });

  if (!resendApiKey) {
    console.error('Missing RESEND_API_KEY environment variable');
    return { sent: false, reason: "missing_api_key" };
  }

  const subject = `Ny kontaktförfrågan från ${name}`;
  
  const text = [
    `Ny kontaktförfrågan från Staffguide.se`,
    ``,
    `Namn: ${name}`,
    `Restaurang: ${restaurant || 'Ej angivet'}`,
    `E-post: ${email}`,
    ``,
    `Meddelande:`,
    message,
    ``,
    `Skickat: ${new Date().toLocaleString('sv-SE')}`
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827; max-width: 600px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">Ny kontaktförfrågan</h2>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px;"><strong>Namn:</strong> ${name}</p>
        <p style="margin: 0 0 10px;"><strong>Restaurang:</strong> ${restaurant || 'Ej angivet'}</p>
        <p style="margin: 0 0 10px;"><strong>E-post:</strong> ${email}</p>
      </div>
      <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #374151;">Meddelande:</h3>
        <p style="white-space: pre-wrap; margin: 10px 0; color: #4b5563;">${message}</p>
      </div>
      <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
        Skickat: ${new Date().toLocaleString('sv-SE')}
      </p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: ["staffguide.se@gmail.com"],
        subject,
        text,
        html
      })
    });

    console.log('Resend API response status:', response.status);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Resend API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      return {
        sent: false,
        reason: "resend_error",
        status: response.status,
        details: errorBody
      };
    }

    const responseData = await response.json();
    console.log('Resend success response:', responseData);
    return { sent: true };
  } catch (error) {
    console.error('Resend API fetch error:', error);
    return { sent: false, reason: "fetch_error", error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, restaurant, email, message } = req.body;

    console.log('Contact form received:', { name, restaurant, email, messageLength: message?.length });

    // Validate required fields
    if (!name || !email || !message) {
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!email) missingFields.push('email');
      if (!message) missingFields.push('message');
      
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email address:', email);
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Send email using Resend
    const emailResult = await sendContactEmail({ name, restaurant, email, message });

    if (!emailResult.sent) {
      console.error('Contact email send failed:', emailResult);
      
      let errorMessage = 'Kunde inte skicka meddelandet';
      
      if (process.env.NODE_ENV !== 'production') {
        // In development, return detailed error information
        errorMessage = `Email send failed: ${emailResult.reason}`;
        if (emailResult.status) {
          errorMessage += ` (status: ${emailResult.status})`;
        }
        if (emailResult.details) {
          errorMessage += ` - ${emailResult.details}`;
        }
        if (emailResult.error) {
          errorMessage += ` - ${emailResult.error}`;
        }
      } else {
        // In production, return user-friendly messages
        if (emailResult.reason === "missing_api_key") {
          errorMessage = 'Servern saknar RESEND_API_KEY';
        }
        
        if (emailResult.reason === "resend_error") {
          if (emailResult.status === 401) {
            errorMessage = 'Ogiltig Resend API-nyckel';
          } else if (emailResult.status === 403) {
            errorMessage = 'Avsändaradressen är inte verifierad';
          } else if (emailResult.status === 422) {
            errorMessage = 'Ogiltig e-postadress';
          } else if (emailResult.status === 429) {
            errorMessage = 'För många e-postförsök. Försök igen om en minut.';
          }
        }
        
        if (emailResult.reason === "fetch_error") {
          errorMessage = 'Kunde inte ansluta till mejltjänsten';
        }
      }
      
      return res.status(500).json({ error: errorMessage, ...(process.env.NODE_ENV !== 'production' ? { debug: emailResult } : {}) });
    }

    console.log('Contact form submission sent successfully:', {
      name,
      restaurant,
      email,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    
    const errorMessage = process.env.NODE_ENV !== 'production' 
      ? `Server error: ${error.message}`
      : 'Internal server error';
    
    res.status(500).json({ 
      error: errorMessage,
      ...(process.env.NODE_ENV !== 'production' ? { debug: { message: error.message, stack: error.stack } } : {})
    });
  }
}
