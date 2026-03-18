import jwt from 'jsonwebtoken';
import { getSupabaseAdminClient } from "../../../lib/supabase.js";
import { extractAuthToken } from "../../../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return res.status(500).json({ error: "Servern saknar SUPABASE_SERVICE_ROLE_KEY" });
    }

    const token = extractAuthToken(req);
    
    console.log("DEBUG: Extracted token:", token ? token.substring(0, 50) + "..." : "null");
    
    if (!token) {
      console.log("DEBUG: No token found in request");
      return res.status(401).json({ error: "Missing token" });
    }

    // Verify JWT token
    console.log("DEBUG: Verifying JWT token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DEBUG: Decoded token:", decoded);
    const companyId = decoded.companyId;

    if (!companyId) {
      console.log("DEBUG: No companyId in decoded token");
      return res.status(401).json({ error: "Invalid token" });
    }

    // Get company and check if admin
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, is_admin")
      .eq("id", companyId)
      .single();

    if (companyError || !company || !company.is_admin) {
      return res.status(403).json({ error: "Du är inte admin" });
    }

  if (req.method === "GET") {
      try {
        console.log("DEBUG: Fetching staff with companyId:", companyId);
        
        const { data: staff, error: staffError } = await supabase
          .from("restaurant_staff")
          .select("id, name, email, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        console.log("DEBUG: Supabase response:", { staff, staffError });

        if (staffError) {
          console.error("Staff fetch error:", staffError);
          return res.status(500).json({ error: "Kunde inte hämta personal" });
        }

        console.log("DEBUG: Returning staff:", staff || []);
        res.status(200).json({ staff: staff || [] });
      } catch (err) {
        console.error("Staff GET error:", err);
        res.status(500).json({ error: "Serverfel" });
      }
    } else if (req.method === "POST") {
      try {
        const { email, name } = req.body;

        if (!email || !email.includes("@")) {
          return res.status(400).json({ error: "Ange en giltig e-postadress" });
        }

        // Check if staff member already exists
        const { data: existingStaff, error: checkError } = await supabase
          .from("restaurant_staff")
          .select("id")
          .eq("company_id", companyId)
          .eq("email", email.toLowerCase())
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Staff check error:", checkError);
          return res.status(500).json({ error: "Kunde inte kontrollera personal" });
        }

        if (existingStaff) {
          return res.status(409).json({ error: "Denna e-postadress är redan registrerad" });
        }

        // Add new staff member
        const { data: newStaff, error: insertError } = await supabase
          .from("restaurant_staff")
          .insert({
            company_id: companyId,
            email: email.toLowerCase(),
            name: name || null
          })
          .select()
          .single();

        if (insertError) {
          console.error("Staff insert error:", insertError);
          return res.status(500).json({ error: "Kunde inte lägga till personal" });
        }

        res.status(201).json({ staff: newStaff });
      } catch (err) {
        console.error("Staff POST error:", err);
        res.status(500).json({ error: "Serverfel" });
      }
    } else if (req.method === "DELETE") {
      try {
        const staffId = req.query.id;

        if (!staffId) {
          return res.status(400).json({ error: "Missing staff ID" });
        }

        // Verify staff belongs to this company
        const { data: staff, error: staffError } = await supabase
          .from("restaurant_staff")
          .select("id")
          .eq("id", staffId)
          .eq("company_id", companyId)
          .single();

        if (staffError || !staff) {
          return res.status(404).json({ error: "Personal hittades inte" });
        }

        // Delete staff member
        const { error: deleteError } = await supabase
          .from("restaurant_staff")
          .delete()
          .eq("id", staffId);

        if (deleteError) {
          console.error("Staff delete error:", deleteError);
          return res.status(500).json({ error: "Kunde inte ta bort personal" });
        }

        res.status(200).json({ success: true });
      } catch (err) {
        console.error("Staff DELETE error:", err);
        res.status(500).json({ error: "Serverfel" });
      }
    }
  } catch (err) {
    console.error("Staff API error:", err);
    res.status(500).json({ error: "Serverfel" });
  }
}
