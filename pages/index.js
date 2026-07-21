import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { canAccessPrep, canViewPrep, canEditPrep, canAccessAdminTab, getRoleDescription } from "../lib/roles.js";

const ADMIN_TABS = ["info", "menu", "recipes", "routines", "prep", "staff", "security", "stats"];

function getTodayDateString() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function getSingleQueryParam(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return typeof value === "string" ? value : "";
}

function isValidAdminTab(tab) {
  return ADMIN_TABS.includes(tab);
}

function getPriorityMeta(priority) {
  const normalized = String(priority || "medium").toLowerCase();
  if (normalized === "high") {
    return { key: "high", label: "Hög", style: styles.prepPriorityHigh };
  }
  if (normalized === "low") {
    return { key: "low", label: "Låg", style: styles.prepPriorityLow };
  }
  return { key: "medium", label: "Medel", style: styles.prepPriorityMedium };
}

function dueTimeSortValue(dueTime) {
  const value = String(dueTime || "").trim();
  if (!value) return Number.MAX_SAFE_INTEGER;
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return hours * 60 + minutes;
}

function normalizeTemplatePriority(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["high", "hög", "hög", "h"].includes(normalized)) return "high";
  if (["low", "låg", "låg", "l"].includes(normalized)) return "low";
  return "medium";
}

function normalizeTemplateDueTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return "";

  const hours = Number(match[1]);
  const minutes = Number(match[2] || "0");
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return "";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function emptyPrepTemplateRow() {
  return {
    title: "",
    priority: "medium",
    station: "",
    due_time: "",
    assigned_to: ""
  };
}

function parsePrepTemplateText(templateText) {
  const lines = String(templateText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*⬢]\s*/, ""));

  const rows = lines
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        title: parts[0] || "",
        priority: normalizeTemplatePriority(parts[1]),
        station: String(parts[2] || "").trim(),
        due_time: normalizeTemplateDueTime(parts[3]),
        assigned_to: String(parts[4] || "").trim()
      };
    })
    .filter((row) => row.title);

  return rows.length > 0 ? rows : [emptyPrepTemplateRow()];
}

function serializePrepTemplateRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      title: String(row?.title || "").trim(),
      priority: normalizeTemplatePriority(row?.priority),
      station: String(row?.station || "").trim(),
      due_time: normalizeTemplateDueTime(row?.due_time),
      assigned_to: String(row?.assigned_to || "").trim()
    }))
    .filter((row) => row.title)
    .map((row) => [row.title, row.priority, row.station, row.due_time, row.assigned_to].join(" | "))
    .join("\n");
}

let recipeRowIdSeed = 1;

function nextRecipeRowId() {
  recipeRowIdSeed += 1;
  return `recipe-${recipeRowIdSeed}`;
}

function emptyRecipeRow(overrides = {}) {
  return {
    id: nextRecipeRowId(),
    dish_name: "",
    category: "",
    is_active: true,
    ingredients: "",
    yield: "",
    mise: "",
    cooking: "",
    plating: "",
    allergens: "",
    time: "",
    ...overrides
  };
}

function parseRecipeSection(block, label) {
  const labels = ["Kategori", "Aktiv", "Ingredienser", "Yield", "Mise en place", "Tillagning", "Plating", "Allergener", "Tid"];
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\n)${escaped}:\\s*([\\s\\S]*?)(?=\\n(?:${labels.join("|")}):|$)`, "i");
  const match = block.match(pattern);
  return match?.[1]?.trim() || "";
}

function parseRecipeActive(block) {
  const raw = parseRecipeSection(block, "Aktiv").toLowerCase();
  if (!raw) return true;
  if (["nej", "false", "0", "inaktiv", "no"].includes(raw)) return false;
  return true;
}

function parseRecipesText(recipesText) {
  const text = String(recipesText || "").trim();
  if (!text) {
    return [emptyRecipeRow()];
  }

  const hasStructuredHeadings = /(^|\n)###\s+/m.test(text);
  if (!hasStructuredHeadings) {
    return [emptyRecipeRow({ dish_name: "Rätt 1", cooking: text })];
  }

  const blocks = text
    .split(/\n(?=###\s+)/)
    .map((block) => block.trim())
    .filter(Boolean);

  const rows = blocks.map((block) => {
    const dishMatch = block.match(/^###\s*(.+)$/m);
    const dishName = dishMatch?.[1]?.trim() || "";
    return emptyRecipeRow({
      dish_name: dishName,
      category: parseRecipeSection(block, "Kategori"),
      is_active: parseRecipeActive(block),
      ingredients: parseRecipeSection(block, "Ingredienser"),
      yield: parseRecipeSection(block, "Yield"),
      mise: parseRecipeSection(block, "Mise en place"),
      cooking: parseRecipeSection(block, "Tillagning"),
      plating: parseRecipeSection(block, "Plating"),
      allergens: parseRecipeSection(block, "Allergener"),
      time: parseRecipeSection(block, "Tid")
    });
  }).filter((row) => row.dish_name || row.category || row.ingredients || row.yield || row.mise || row.cooking || row.plating || row.allergens || row.time);

  return rows.length > 0 ? rows : [emptyRecipeRow({ dish_name: "Rätt 1", cooking: text })];
}

function serializeRecipesRows(rows) {
  const safeRows = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      dish_name: String(row?.dish_name || "").trim(),
      category: String(row?.category || "").trim(),
      is_active: row?.is_active !== false,
      ingredients: String(row?.ingredients || "").trim(),
      yield: String(row?.yield || "").trim(),
      mise: String(row?.mise || "").trim(),
      cooking: String(row?.cooking || "").trim(),
      plating: String(row?.plating || "").trim(),
      allergens: String(row?.allergens || "").trim(),
      time: String(row?.time || "").trim()
    }))
    .filter((row) => row.dish_name || row.category || row.ingredients || row.yield || row.mise || row.cooking || row.plating || row.allergens || row.time);

  return safeRows
    .map((row) => {
      const dishName = row.dish_name || "Namnlös rätt";
      return [
        `### ${dishName}`,
        "Kategori:",
        row.category,
        "",
        "Aktiv:",
        row.is_active ? "ja" : "nej",
        "",
        "Ingredienser:",
        row.ingredients,
        "",
        "Yield:",
        row.yield,
        "",
        "Mise en place:",
        row.mise,
        "",
        "Tillagning:",
        row.cooking,
        "",
        "Plating:",
        row.plating,
        "",
        "Allergener:",
        row.allergens,
        "",
        "Tid:",
        row.time
      ].join("\n").trim();
    })
    .join("\n\n");
}

export default function Home() {
  const router = useRouter();
  const emptyDetails = {
    support_email: "",
    opening_hours: "",
    closure_info: "",
    menu: "",
    recipes: "",
    allergens: "",
    routines: "",
    opening_routine: "",
    closing_routine: "",
    behavior_guidelines: "",
    staff_roles: "",
    staff_situations: ""
  };

  const tabFieldMap = {
    info: ["support_email", "opening_hours", "closure_info"],
    menu: ["menu", "allergens"],
    recipes: ["recipes"],
    routines: ["routines", "opening_routine", "closing_routine", "behavior_guidelines", "staff_roles", "staff_situations"]
  };

  const quickQuestions = [
    { key: "menu", label: "Visa hela menyn", prompt: "Visa hela menyn inklusive priser och eventuella tillval." },
    { key: "allergens", label: "Vilka allergener finns?", prompt: "Lista alla allergener i menyn och nämn vilka alternativ som finns." },
    { key: "opening_hours", label: "Vad är öppettiderna?", prompt: "Vad är öppettiderna idag och i veckan?" },
    { key: "opening_routine", label: "Vad är öppningsrutinen?", prompt: "Beskriv öppningsrutinen steg för steg." }
  ];

  const landingFaqs = [
    {
      question: "Vad är Effexo?",
      answer: "Effexo är företaget bakom StaffGuide och hemsidor för restauranger och småföretag."
    },
    {
      question: "Vad är StaffGuide?",
      answer: "StaffGuide är Effexos interna verktyg som hjälper restauranger och företag att samla rutiner, recept och information på ett ställe."
    },
    {
      question: "Hur snabbt kommer vi igång?",
      answer: "Vanligtvis kan ni börja använda systemet inom några dagar efter onboarding."
    },
    {
      question: "Behöver vi teknisk kunskap?",
      answer: "Nej, vi sätter upp allt åt er."
    },
    {
      question: "Kan vi anpassa innehållet?",
      answer: "Ja, all information är helt anpassningsbar för ert företag."
    }
  ];

  const [token, setToken] = useState("");
  const [loginMode, setLoginMode] = useState("company");
  const [companyIdentifier, setCompanyIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [employeeLoginStep, setEmployeeLoginStep] = useState("request");
  const [codeRequestTime, setCodeRequestTime] = useState(null);
  const [showLoginButton, setShowLoginButton] = useState(false);
  const [company, setCompany] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [adminTab, setAdminTab] = useState("info");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");
  const [adminPasswordPrompt, setAdminPasswordPrompt] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminPanelCurrentPassword, setAdminPanelCurrentPassword] = useState("");
  const [adminPanelNewPassword, setAdminPanelNewPassword] = useState("");
  const [adminPanelConfirmPassword, setAdminPanelConfirmPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState(emptyDetails);
  const [savedCompanyDetails, setSavedCompanyDetails] = useState(emptyDetails);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [toast, setToast] = useState({ text: "", type: "success", visible: false });
  const [prepDate, setPrepDate] = useState(getTodayDateString());
  const [prepTasks, setPrepTasks] = useState([]);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState("");
  const [prepTemplateRows, setPrepTemplateRows] = useState([emptyPrepTemplateRow()]);
  const [savedPrepTemplateRows, setSavedPrepTemplateRows] = useState([emptyPrepTemplateRow()]);
  const [prepTemplateLoading, setPrepTemplateLoading] = useState(false);
  const [prepBulkUpdating, setPrepBulkUpdating] = useState(false);
  const [prepOnlyOpen, setPrepOnlyOpen] = useState(false);
  const [prepStationFilter, setPrepStationFilter] = useState("all");
  const [showMyPrepTasks, setShowMyPrepTasks] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("member");
  const [recipeRows, setRecipeRows] = useState([emptyRecipeRow()]);
  const [savedRecipeRows, setSavedRecipeRows] = useState([emptyRecipeRow()]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [contactForm, setContactForm] = useState({
    name: "",
    restaurant: "",
    email: "",
    message: ""
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const chatAreaRef = useRef(null);
  const toastTimerRef = useRef(null);
  const skipNextAdminRoutePromptRef = useRef(false);
  const tokenRef = useRef("");

  const syncAdminRoute = useCallback((nextShowAdmin, nextTab = "info") => {
    if (!router.isReady) return;

    const nextQuery = { ...router.query };
    if (nextShowAdmin) {
      nextQuery.view = "admin";
      nextQuery.tab = isValidAdminTab(nextTab) ? nextTab : "info";
    } else {
      delete nextQuery.view;
      delete nextQuery.tab;
    }

    void router.replace(
      {
        pathname: router.pathname,
        query: nextQuery
      },
      undefined,
      { shallow: true }
    );
  }, [router]);

  const logout = useCallback(() => {
    // Clear all user data
    setCompany(null);
    setUserRole(null);
    setChat([]);
    
    // Clear all admin-related states to prevent access after logout
    setShowAdmin(false);
    setAdminPasswordPrompt(false);
    setAdminPassword("");
    setAdminTab("info");
    
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("company");
    
    // Sync admin route to false
    syncAdminRoute(false);
  }, [syncAdminRoute]);

  const isJwtExpired = (jwtToken) => {
    if (!jwtToken || typeof jwtToken !== "string") {
      return true;
    }

    try {
      const parts = jwtToken.split(".");
      if (parts.length !== 3) return true;

      const payload = JSON.parse(atob(parts[1]));
      if (!payload?.exp) return true;
      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  };

  const showToast = (text, type = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ text, type, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2600);
  };

  const isTabDirty = (tab) => {
    const fields = tabFieldMap[tab] || [];
    return fields.some(field => (companyDetails[field] || "") !== (savedCompanyDetails[field] || ""));
  };

  const resetCurrentTab = () => {
    const fields = tabFieldMap[adminTab] || [];
    if (fields.length === 0) {
      return;
    }

    const nextDetails = { ...companyDetails };
    fields.forEach((field) => {
      nextDetails[field] = savedCompanyDetails[field] || "";
    });
    setCompanyDetails(nextDetails);
    if (adminTab === "recipes") {
      const restoredRows = savedRecipeRows.length > 0 ? savedRecipeRows : parseRecipesText(savedCompanyDetails.recipes || "");
      setRecipeRows(restoredRows);
      setSelectedRecipeId(restoredRows[0]?.id || "");
    }
    showToast("Ändringar återställda", "info");
  };

  const formatAiAnswer = (answer) => {
    if (typeof answer !== "string") return "";
    const trimmed = answer.trim();
    if (trimmed.length < 520 || trimmed.includes("\n\n") || trimmed.includes("**")) {
      return trimmed;
    }

    const lower = trimmed.toLowerCase();
    if (!/(meny|allergen|rutin|öppettid|kontakt)/i.test(lower)) {
      return trimmed;
    }

    const chunks = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
    if (chunks.length < 6) {
      return trimmed;
    }

    const sectionSize = Math.ceil(chunks.length / 3);
    const sections = [
      { title: "Meny", body: chunks.slice(0, sectionSize) },
      { title: "Rutiner", body: chunks.slice(sectionSize, sectionSize * 2) },
      { title: "Kontakt", body: chunks.slice(sectionSize * 2) }
    ];

    return sections
      .filter(section => section.body.length)
      .map(section => `${section.title}:\n${section.body.join(" ").trim()}`)
      .join("\n\n");
  };

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const renderAiTextWithClickableMenuItems = (msg, msgIndex) => {
    const text = typeof msg?.text === "string" ? msg.text : "";
    const menuItems = Array.isArray(msg?.menuItems)
      ? [...new Set(msg.menuItems.map((item) => String(item || "").trim()).filter(Boolean))]
      : [];

    if (!text || menuItems.length === 0) {
      return text;
    }

    const sortedItems = [...menuItems].sort((a, b) => b.length - a.length);
    const itemRegex = new RegExp(`(${sortedItems.map(escapeRegExp).join("|")})`, "gi");
    const parts = text.split(itemRegex);

    return parts.map((part, partIndex) => {
      const matchingItem = sortedItems.find((item) => item.toLowerCase() === part.toLowerCase());

      if (!matchingItem) {
        return (
          <span key={`msg-${msgIndex}-text-${partIndex}`} style={styles.menuInlineText}>
            {part}
          </span>
        );
      }

      return (
        <button
          key={`msg-${msgIndex}-menu-${matchingItem}-${partIndex}`}
          type="button"
          style={styles.menuInlineItemButton}
          className="menuInlineItem"
          onClick={() => askAI(`Vad är receptet för ${matchingItem}?`)}
          disabled={loading}
        >
          {part}
        </button>
      );
    });
  };

  const fetchCompanyDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/get-details", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.details) {
        setCompanyDetails(data.details);
        setSavedCompanyDetails(data.details);
        const parsedRecipeRows = parseRecipesText(data.details.recipes || "");
        setRecipeRows(parsedRecipeRows);
        setSavedRecipeRows(parsedRecipeRows);
        setSelectedRecipeId(parsedRecipeRows[0]?.id || "");
      }
    } catch (err) {
      console.error("Failed to fetch details:", err);
    }
  }, [token]);

  const fetchPrepTemplate = useCallback(async () => {
    if (!token) return;

    setPrepTemplateLoading(true);
    try {
      const res = await fetch("/api/admin/prep-template", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data?.error || "Kunde inte hämta prep-mall", "error");
        return;
      }

      const templateText = typeof data?.template === "string" ? data.template : "";
      const parsedRows = parsePrepTemplateText(templateText);
      setPrepTemplateRows(parsedRows);
      setSavedPrepTemplateRows(parsedRows);
    } catch {
      showToast("Kunde inte hämta prep-mall", "error");
    } finally {
      setPrepTemplateLoading(false);
    }
  }, [token]);

  const fetchPrepTasks = useCallback(async (targetDate) => {
    // Use tokenRef so this callback never has a stale token closure
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    const requestedDate = typeof targetDate === "string" ? targetDate : getTodayDateString();

    setPrepLoading(true);
    setPrepError("");

    try {
      const res = await fetch(`/api/prep/day?date=${encodeURIComponent(requestedDate)}`, {
        headers: {
          "Authorization": `Bearer ${currentToken}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setPrepError(data?.error || "Kunde inte hämta dagens prep.");
        setPrepTasks([]);
        setPrepLoading(false);
        return;
      }

      setPrepDate(data?.prepDate || requestedDate);

      // Extract tasks correctly from API response
      const tasks = data.tasks || [];

      setPrepTasks(tasks);
    } catch (err) {
      setPrepError("Kunde inte hämta dagens prep.");
      setPrepTasks([]);
    } finally {
      setPrepLoading(false);
    }
  }, []); // stable – reads token via tokenRef, never goes stale

  const savePrepTemplate = async () => {
    if (!token || prepTemplateLoading) return;

    const serializedTemplate = serializePrepTemplateRows(prepTemplateRows);

    setPrepTemplateLoading(true);
    try {
      const res = await fetch("/api/admin/prep-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          template: serializedTemplate,
          publishToday: true,
          prepDate
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data?.error || "Kunde inte spara prep-mall", "error");
        setPrepTemplateLoading(false);
        return;
      }

      const nextTemplate = typeof data?.template === "string" ? data.template : serializedTemplate;
      const parsedRows = parsePrepTemplateText(nextTemplate);
      setPrepTemplateRows(parsedRows);
      setSavedPrepTemplateRows(parsedRows);
      void fetchPrepTasks(prepDate);
      showToast("Prep-mall sparad", "success");
    } catch {
      showToast("Kunde inte spara prep-mall", "error");
    }

    setPrepTemplateLoading(false);
  };

  const assignPrepTask = async (taskId, assignedTo) => {
    if (!token) return;

    try {
      const res = await fetch("/api/prep/assign", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ taskId, assignedTo })
      });

      if (res.ok) {
        // Update local state to reflect the change
        setPrepTasks(prev => prev.map(task =>
          task.id === taskId ? { ...task, assigned_to: assignedTo } : task
        ));
        showToast("Uppgift tilldelad", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Kunde inte uppdatera tilldelning", "error");
      }
    } catch (err) {
      showToast("Kunde inte uppdatera tilldelning", "error");
    }
  };

  const togglePrepTask = async (taskId, isDone) => {
    if (!token || prepLoading) return;

    setPrepTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, is_done: isDone } : task)));

    try {
      const res = await fetch("/api/prep/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ taskId, isDone })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Kunde inte uppdatera prep-uppgift");
      }
    } catch (err) {
      setPrepTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, is_done: !isDone } : task)));
      showToast(err?.message || "Kunde inte uppdatera prep-uppgift", "error");
    }
  };

  const setFilteredPrepTasksDone = async (isDone) => {
    if (!token || prepLoading || prepBulkUpdating) return;

    const targetTasks = prepTasks
      .filter((task) => {
        if (prepOnlyOpen && task.is_done) return false;
        if (prepStationFilter !== "all" && String(task.station || "").trim() !== prepStationFilter) return false;
        return true;
      })
      .filter((task) => Boolean(task.is_done) !== isDone);

    if (targetTasks.length === 0) {
      showToast(isDone ? "Alla synliga uppgifter är redan klara" : "Inga synliga uppgifter att återställa", "info");
      return;
    }

    const targetIds = new Set(targetTasks.map((task) => task.id));
    setPrepBulkUpdating(true);
    setPrepTasks((prev) => prev.map((task) => (targetIds.has(task.id) ? { ...task, is_done: isDone } : task)));

    const failedIds = [];

    const results = await Promise.allSettled(
      targetTasks.map(async (task) => {
        const res = await fetch("/api/prep/toggle", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ taskId: task.id, isDone })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Kunde inte uppdatera prep-uppgift");
        }
      })
    );

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        failedIds.push(targetTasks[index].id);
      }
    });

    if (failedIds.length > 0) {
      const failedSet = new Set(failedIds);
      setPrepTasks((prev) => prev.map((task) => (failedSet.has(task.id) ? { ...task, is_done: !isDone } : task)));
      showToast("Vissa prep-uppgifter kunde inte uppdateras", "error");
    } else {
      showToast(isDone ? "Synliga uppgifter markerade som klara" : "Synliga uppgifter återställda", "success");
    }

    setPrepBulkUpdating(false);
  };

  // Keep tokenRef in sync so fetchPrepTasks never has a stale closure
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedCompany = localStorage.getItem("company");

    if (!savedToken || !savedCompany || isJwtExpired(savedToken)) {
      localStorage.removeItem("token");
      localStorage.removeItem("company");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRestoringSession(false);
      return;
    }

    try {
      const parsedCompany = JSON.parse(savedCompany);
      tokenRef.current = savedToken;
      setToken(savedToken);
      setCompany(parsedCompany);
      setUserRole(parsedCompany?.role || 'member');
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("company");
    }

    setIsRestoringSession(false);
  }, []);

  // scroll when chat updates
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chat, loading]);

  useEffect(() => {
    if (showAdmin && adminTab === "staff") {
      fetchStaffList();
    }
  }, [showAdmin, adminTab]);

  useEffect(() => {
    if (showAdmin && adminTab === "prep") {
      fetchStaffList();
    }
  }, [showAdmin, adminTab]);

  useEffect(() => {
    // Also fetch staff list when prep view is opened
    if (showPrep && token && staffList.length === 0) {
      fetchStaffList();
    }
  }, [showPrep, token, staffList.length]);

  // Timer for showing login button after 30 seconds
  useEffect(() => {
    if (codeRequestTime && employeeLoginStep === "request") {
      const timer = setTimeout(() => {
        setShowLoginButton(true);
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [codeRequestTime, employeeLoginStep]);

  // Role-based admin access control - prevents admin panel from showing for non-admin users
  useEffect(() => {
    if (company && token) {
      try {
        // Check if current user should have admin access
        const shouldHaveAdminAccess = company.is_admin;
        
        // If admin panel is showing but user shouldn't have access, hide it
        if (showAdmin && !shouldHaveAdminAccess) {
          setShowAdmin(false);
          setAdminPasswordPrompt(false);
          syncAdminRoute(false);
          showToast("Admin-åtkomst kräver administratörsrättigheter", "info");
        }
      } catch (err) {
        // If token is invalid, hide admin
        setShowAdmin(false);
        setAdminPasswordPrompt(false);
        syncAdminRoute(false);
      }
    }
  }, [company?.is_admin, showAdmin, token]);

  useEffect(() => {
    // Load showMyPrepTasks from localStorage
    const saved = localStorage.getItem("showMyPrepTasks");
    if (saved !== null) {
      setShowMyPrepTasks(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Save showMyPrepTasks to localStorage
    localStorage.setItem("showMyPrepTasks", JSON.stringify(showMyPrepTasks));
  }, [showMyPrepTasks]);

  useEffect(() => {
    if (!router.isReady || !company?.is_admin) {
      return;
    }

    const routeView = getSingleQueryParam(router.query.view);
    const routeTab = getSingleQueryParam(router.query.tab);
    const nextTab = isValidAdminTab(routeTab) ? routeTab : "info";

    if (routeView === "admin") {
      setAdminTab((prevTab) => (prevTab === nextTab ? prevTab : nextTab));

      if (skipNextAdminRoutePromptRef.current) {
        skipNextAdminRoutePromptRef.current = false;
        return;
      }

      // Keep admin protected: route can request admin view, but password is still required.
      if (!showAdmin && !adminPasswordPrompt) {
        setAdminPasswordPrompt(true);
        setAdminPasswordError("");
        setAdminPassword("");
      }
      return;
    }

    if (showAdmin) {
      setShowAdmin(false);
    }
  }, [
    router.isReady,
    router.query.view,
    router.query.tab,
    company?.is_admin,
    showAdmin,
    adminPasswordPrompt
  ]);

  useEffect(() => {
    if (!showPrep || !tokenRef.current) return;
    fetchPrepTasks(prepDate);
  }, [showPrep, token, prepDate, fetchPrepTasks]); // token kept in deps to re-run if token arrives after showPrep=true

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (recipeRows.length === 0) {
      setSelectedRecipeId("");
      return;
    }

    const hasSelected = recipeRows.some((row) => row.id === selectedRecipeId);
    if (!hasSelected) {
      setSelectedRecipeId(recipeRows[0].id);
    }
  }, [recipeRows, selectedRecipeId]);

  const login = async () => {
    if (!companyIdentifier.trim()) {
      setError("Skriv in restaurangens namn");
      return;
    }

    if (!password.trim()) {
      setError("Skriv in lösenord");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, companyIdentifier })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Fel företagskod eller lösenord");
        setLoading(false);
        return;
      }

      // Set role to 'owner' for company login
      const companyWithOwner = {
        ...data.company,
        role: 'owner'
      };

      setToken(data.token);
      setCompany(companyWithOwner);
      setUserRole('owner');

      // Clear admin states when new user logs in to prevent cross-user access
      setShowAdmin(false);
      setAdminPasswordPrompt(false);
      setAdminPassword("");
      setAdminTab("info");

      localStorage.setItem("token", data.token);
      localStorage.setItem("company", JSON.stringify(companyWithOwner));
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  const requestEmployeeCode = async () => {
    if (!employeeEmail.trim()) {
      setError("Ange din e-postadress");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employeeEmail.trim())) {
      setError("Ange en giltig e-postadress");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employee/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: employeeEmail.trim().toLowerCase()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Kunde inte skicka kod");
        setLoading(false);
        return;
      }

      if (res.ok) {
        setEmployeeLoginStep("code");
        setCodeRequestTime(Date.now());
        setShowLoginButton(false);
        setEmployeeCode("");
        setError("");
        const debugHint = data?.debugCode ? ` Testkod: ${data.debugCode}` : "";
        showToast(`Kod skickad till ${employeeEmail}.${debugHint}`, "info");
      } else {
        setError("Ett fel uppstod. Försök igen.");
      }

      setLoading(false);
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  const loginWithEmployeeCode = async () => {
    if (!employeeEmail.trim()) {
      setError("Ange din e-postadress");
      return;
    }

    if (!employeeCode.trim()) {
      setError("Ange engångskoden");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employee/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: employeeEmail.trim().toLowerCase(), code: employeeCode.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Felaktig kod");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("company", JSON.stringify(data.company));
      setCompany(data.company);
      const role = data.company.role || 'member';
      setUserRole(role);
      
      // Clear admin states when employee logs in to prevent access issues
      setShowAdmin(false);
      setAdminPasswordPrompt(false);
      setAdminPassword("");
      setAdminTab("info");
      
      setEmployeeLoginStep("request");
      setEmployeeEmail("");
      setEmployeeCode("");
      setCodeRequestTime(null);
      setShowLoginButton(false);

      // Debug logging
      console.log("DEBUG: Login successful - Company data:", data.company);
      console.log("DEBUG: Stored company:", JSON.parse(localStorage.getItem("company")));
      console.log("DEBUG: Stored token:", localStorage.getItem("token"));

      showToast(`Inloggad som ${data.company.name}`, "success");
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  const askAI = async (presetQuestion, options = {}) => {
    const messageSource = typeof presetQuestion === "string" ? presetQuestion : question;
    const userMessage = messageSource.trim();
    if (!userMessage || loading) return;
    const activeToken = token || localStorage.getItem("token") || "";

    if (!activeToken) {
      showToast("Session saknas. Logga in igen.", "info");
      logout();
      return;
    }

    setChat(prev => [...prev, { from: "user", text: userMessage }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({ question: userMessage, quickActionKey: options.quickActionKey || null })
      });

      const data = await res.json();

      if (res.status === 401 && /ogiltig token|ingen token|session/i.test(data?.answer || "")) {
        logout();
        showToast("Sessionen har gått ut. Logga in igen.", "info");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setChat(prev => [...prev, { from: "ai", text: data?.answer || "Ett fel uppstod. Försök igen." }]);
        setLoading(false);
        return;
      }

      setChat(prev => [
        ...prev,
        {
          from: "ai",
          text: formatAiAnswer(data.answer),
          menuItems: Array.isArray(data?.menuItems) ? data.menuItems : []
        }
      ]);
    } catch {
      setChat(prev => [
        ...prev,
        { from: "ai", text: "Ett fel uppstod. Försök igen." }
      ]);
    }

    setLoading(false);
  };

  const updatePassword = async () => {
    if (!currentPassword.trim()) {
      showToast("Ange nuvarande lösenord", "error");
      return;
    }
    if (!newPassword.trim()) {
      showToast("Skriv in ett nytt lösenord", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setAdminMessage("❌ Lösenorden matchar inte.");
      showToast("Lösenorden matchar inte.", "error");
      return;
    }

    setAdminMessage("");
    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details ? `${data.error || "Fel vid uppdatering"} (${data.details})` : (data.error || "Fel vid uppdatering");
        setAdminMessage("❌ " + errorText);
        showToast(errorText, "error");
        setAdminLoading(false);
        return;
      }

      setAdminMessage("✅ Lösenord uppdaterat!");
      showToast("Lösenord uppdaterat", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setAdminMessage(""), 3000);
    } catch {
      setAdminMessage("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const updateAdminPanelPassword = async () => {
    if (!adminPanelCurrentPassword.trim()) {
      showToast("Ange nuvarande admin-lösenord", "error");
      return;
    }
    if (!adminPanelNewPassword.trim()) {
      showToast("Skriv in ett nytt admin-lösenord", "error");
      return;
    }
    if (adminPanelNewPassword !== adminPanelConfirmPassword) {
      setAdminMessage("❌ Lösenorden matchar inte.");
      showToast("Lösenorden matchar inte.", "error");
      return;
    }

    setAdminMessage("");
    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/change-admin-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: adminPanelCurrentPassword,
          newPassword: adminPanelNewPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details ? `${data.error || "Fel vid uppdatering"} (${data.details})` : (data.error || "Fel vid uppdatering");
        setAdminMessage("❌ " + errorText);
        showToast(errorText, "error");
        setAdminLoading(false);
        return;
      }

      setAdminMessage("✅ Admin-panelens lösenord uppdaterat!");
      showToast("Admin-panelens lösenord uppdaterat", "success");
      setAdminPanelCurrentPassword("");
      setAdminPanelNewPassword("");
      setAdminPanelConfirmPassword("");
      setTimeout(() => setAdminMessage(""), 3000);
    } catch {
      setAdminMessage("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const updateCompanyDetails = async () => {
    setAdminMessage("");
    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/update-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ details: companyDetails })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details ? `${data.error || "Fel vid uppdatering"} (${data.details})` : (data.error || "Fel vid uppdatering");
        setAdminMessage("❌ " + errorText);
        showToast(errorText, "error");
        setAdminLoading(false);
        return;
      }

      setAdminMessage("✅ Uppgifter uppdaterade!");
      setSavedCompanyDetails(companyDetails);
      setSavedRecipeRows(recipeRows);
      setLastSavedAt(new Date());
      const skippedColumns = Array.isArray(data?.skippedColumns) ? data.skippedColumns : [];
      if (skippedColumns.length > 0) {
        showToast(`Sparat, men saknade DB-kolumner: ${skippedColumns.join(", ")}`, "info");
      } else {
        showToast("Ändringar sparade", "success");
      }
      setTimeout(() => setAdminMessage(""), 3000);
    } catch {
      setAdminMessage("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const toggleCompanyStatus = async () => {
    if (!confirm(`Vill du ${company.active ? 'deaktivera' : 'aktivera'} företaget?`)) {
      return;
    }

    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/toggle-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setAdminMessage("❌ " + (data.error || "Fel vid statusändring"));
        showToast(data.error || "Fel vid statusändring", "error");
        setAdminLoading(false);
        return;
      }

      // Update local company state
      const updatedCompany = { ...company, active: !company.active };
      setCompany(updatedCompany);
      localStorage.setItem("company", JSON.stringify(updatedCompany));

      setAdminMessage(`✅ Företaget är nu ${!company.active ? 'aktiverat' : 'deaktiverat'}`);
      showToast(`Företaget är nu ${!company.active ? 'aktiverat' : 'deaktiverat'}`, "success");
      setTimeout(() => setAdminMessage(""), 3000);
    } catch {
      setAdminMessage("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const verifyAdminPassword = async () => {
    if (!adminPassword.trim()) {
      setAdminPasswordError("Ange admin-lösenord");
      return;
    }

    setAdminPasswordError("");
    setAdminLoading(true);

    try {
      const res = await fetch("/api/admin/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ adminPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorText = data.details ? `${data.error || "Fel vid verifiering"} (${data.details})` : (data.error || "Fel vid verifiering");
        setAdminPasswordError("❌ " + errorText);
        showToast(errorText, "error");
        setAdminLoading(false);
        return;
      }

      // Success! Open admin panel
      skipNextAdminRoutePromptRef.current = true;
      setAdminPasswordPrompt(false);
      setShowAdmin(true);
      setShowPrep(false);
      syncAdminRoute(true, adminTab);
      fetchCompanyDetails();
      fetchPrepTemplate();
      setAdminPassword("");
    } catch {
      setAdminPasswordError("❌ Ett fel uppstod");
      showToast("Ett fel uppstod", "error");
    }

    setAdminLoading(false);
  };

  const handleAdminClick = () => {
    if (showAdmin) {
      // Close admin panel
      setShowAdmin(false);
      syncAdminRoute(false);
    } else {
      // Show password prompt
      setShowPrep(false);
      setAdminPasswordPrompt(true);
      setAdminPasswordError("");
      setAdminPassword("");
      syncAdminRoute(true, adminTab);
    }
  };

  const closeAdminPasswordPrompt = () => {
    setAdminPasswordPrompt(false);
    setAdminPasswordError("");
    setAdminPassword("");
    if (!showAdmin) {
      syncAdminRoute(false);
    }
  };

  const handleAdminTabChange = (nextTab) => {
    setAdminTab(nextTab);
    syncAdminRoute(true, nextTab);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      setContactMessage("Fyll i alla obligatoriska fält");
      return;
    }

    setContactSubmitting(true);
    setContactMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });

      if (res.ok) {
        setContactMessage("Tack för ditt meddelande! Vi återkommer snart.");
        setContactForm({ name: "", restaurant: "", email: "", message: "" });
      } else {
        setContactMessage("Något gick fel. Försök igen senare.");
      }
    } catch {
      setContactMessage("Något gick fel. Försök igen senare.");
    }

    setContactSubmitting(false);
  };

  const handleContactChange = (field, value) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
    setContactMessage("");
  };

  const fetchStaffList = async () => {
    console.log("DEBUG: Starting fetchStaffList");
    console.log("DEBUG: Token exists:", !!token);
    console.log("DEBUG: Token value:", token ? token.substring(0, 50) + "..." : "null");
    console.log("DEBUG: Company exists:", !!company);

    if (!token || !company) {
      console.log("DEBUG: Missing token or company, returning early");
      return;
    }

    console.log("DEBUG: Fetching staff list with token and company:", {
      hasToken: !!token,
      companyId: company.id,
      companyName: company.name
    });

    setStaffLoading(true);
    try {
      const res = await fetch("/api/admin/staff", {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("DEBUG: Staff API response status:", res.status);
      console.log("DEBUG: Staff API response headers:", Object.fromEntries(res.headers.entries()));

      if (res.ok) {
        const data = await res.json();
        console.log("DEBUG: Staff API response:", data);
        console.log("DEBUG: Setting staff list:", data.staff || []);
        console.log("DEBUG: Staff roles:", data.staff?.map(s => ({ id: s.id, email: s.email, role: s.role })) || []);
        setStaffList(data.staff || []);
        console.log("DEBUG: Staff list state after setting:", data.staff || []);
      } else {
        console.error("Failed to fetch staff list, status:", res.status);
        const errorText = await res.text();
        console.error("Error response body:", errorText);
      }
    } catch (err) {
      console.error("Staff list fetch error:", err);
    } finally {
      setStaffLoading(false);
    }
  };

  const addStaffMember = async () => {
    if (!token || !company) return;

    if (!newStaffEmail.trim()) {
      showToast("Ange e-postadress", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStaffEmail.trim())) {
      showToast("Ange en giltig e-postadress", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: newStaffEmail.trim().toLowerCase(),
          name: newStaffName.trim() || null,
          role: newStaffRole
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Personal tillagd", "success");
        setNewStaffEmail("");
        setNewStaffName("");
        setNewStaffRole("member");
        fetchStaffList();
      } else {
        showToast(data.error || "Kunde inte lägga till personal", "error");
      }
    } catch (err) {
      console.error("Add staff error:", err);
      showToast("Kunde inte lägga till personal", "error");
    }
  };

  const removeStaffMember = async (staffId) => {
    if (!token || !company) return;

    if (!confirm("Är du säker på att du vill ta bort denna person?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/staff/${staffId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Personal borttagen", "success");
        fetchStaffList();
      } else {
        showToast(data.error || "Kunde inte ta bort personal", "error");
      }
    } catch (err) {
      console.error("Remove staff error:", err);
      showToast("Kunde inte ta bort personal", "error");
    }
  };

  // Helper function to get staff name by email
  const getStaffNameByEmail = (email) => {
    const staff = staffList.find(s => s.email === email);
    return staff ? (staff.name || email) : email;
  };

  const updateStaffRole = async (staffId, newRole) => {
    if (!token || !company) return;
    
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: staffId, role: newRole })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showToast("Roll uppdaterad", "success");
        fetchStaffList();
      } else {
        showToast(data.error || "Kunde inte uppdatera roll", "error");
      }
    } catch (err) {
      console.error("Update staff role error:", err);
      showToast("Kunde inte uppdatera roll", "error");
    }
  };

  const handlePrepClick = () => {
    const nextShowPrep = !showPrep;
    
    // Check if user has permission to view prep
    if (nextShowPrep && !canViewPrep(userRole)) {
      showToast("Du har inte behörighet att se Mise en place", "error");
      return;
    }
    
    setShowPrep(nextShowPrep);
    setShowAdmin(false);
    setAdminPasswordPrompt(false);
    syncAdminRoute(false);

    // Fetch immediately on open – tokenRef guarantees we always have the latest token
    if (nextShowPrep) {
      fetchPrepTasks(prepDate);
    }
  };

  const updatePrepTemplateRow = (rowIndex, field, value) => {
    setPrepTemplateRows((prev) => prev.map((row, index) => {
      if (index !== rowIndex) return row;

      if (field === "priority") {
        return { ...row, [field]: normalizeTemplatePriority(value) };
      }

      if (field === "due_time") {
        return { ...row, [field]: normalizeTemplateDueTime(value) || String(value || "").trim() };
      }

      return { ...row, [field]: value };
    }));
  };

  const addPrepTemplateRow = () => {
    setPrepTemplateRows((prev) => [...prev, emptyPrepTemplateRow()]);
  };

  const removePrepTemplateRow = (rowIndex) => {
    setPrepTemplateRows((prev) => {
      if (prev.length <= 1) {
        return [emptyPrepTemplateRow()];
      }
      return prev.filter((_, index) => index !== rowIndex);
    });
  };

  const prepTemplateDirty = serializePrepTemplateRows(prepTemplateRows) !== serializePrepTemplateRows(savedPrepTemplateRows);

  const upsertRecipeRows = (nextRows) => {
    const normalizedRows = Array.isArray(nextRows) && nextRows.length > 0 ? nextRows : [emptyRecipeRow()];
    setRecipeRows(normalizedRows);
    const serialized = serializeRecipesRows(normalizedRows);
    setCompanyDetails((prev) => ({ ...prev, recipes: serialized }));
  };

  // Permission checking functions based on user role
  const hasPermission = (permission) => {
    if (!company) return false;

    const userRole = company.role || 'member';

    switch (permission) {
      case 'view_admin':
        return ['owner', 'admin', 'editor'].includes(userRole);
      case 'manage_staff':
        return ['owner', 'admin'].includes(userRole);
      case 'manage_security':
        return ['owner'].includes(userRole);
      case 'view_prep':
        return ['owner', 'admin', 'editor', 'member'].includes(userRole);
      case 'manage_prep':
        return ['owner', 'admin', 'editor', 'member'].includes(userRole);
      case 'access_ai':
        return ['owner', 'admin', 'editor', 'member'].includes(userRole);
      default:
        return false;
    }
  };

  const updateRecipeRow = (recipeId, field, value) => {
    if (!recipeId) return;
    const nextRows = recipeRows.map((row) => {
      if (row.id !== recipeId) return row;
      return { ...row, [field]: value };
    });
    upsertRecipeRows(nextRows);
  };

  const addRecipeRow = () => {
    const nextRow = emptyRecipeRow({ dish_name: `Rätt ${recipeRows.length + 1}` });
    const nextRows = [...recipeRows, nextRow];
    upsertRecipeRows(nextRows);
    setSelectedRecipeId(nextRow.id);
  };

  const duplicateRecipeRow = () => {
    const source = recipeRows.find((row) => row.id === selectedRecipeId);
    if (!source) return;

    const nextRow = emptyRecipeRow({
      dish_name: source.dish_name ? `${source.dish_name} kopia` : "Ny kopia",
      category: source.category,
      is_active: source.is_active,
      ingredients: source.ingredients,
      yield: source.yield,
      mise: source.mise,
      cooking: source.cooking,
      plating: source.plating,
      allergens: source.allergens,
      time: source.time
    });

    const nextRows = [...recipeRows, nextRow];
    upsertRecipeRows(nextRows);
    setSelectedRecipeId(nextRow.id);
  };

  const removeRecipeRow = (recipeId) => {
    if (recipeRows.length <= 1) {
      const onlyRow = emptyRecipeRow();
      upsertRecipeRows([onlyRow]);
      setSelectedRecipeId(onlyRow.id);
      return;
    }

    const filteredRows = recipeRows.filter((row) => row.id !== recipeId);
    upsertRecipeRows(filteredRows);
    setSelectedRecipeId(filteredRows[0]?.id || "");
  };

  const visibleRecipeRows = recipeRows.filter((row) => {
    const term = recipeSearch.trim().toLowerCase();
    if (!term) return true;
    const haystack = `${row.dish_name} ${row.category} ${row.ingredients} ${row.yield} ${row.cooking}`.toLowerCase();
    return haystack.includes(term);
  });

  const selectedRecipeRow = recipeRows.find((row) => row.id === selectedRecipeId) || recipeRows[0] || {
    id: "",
    dish_name: "",
    category: "",
    is_active: true,
    ingredients: "",
    yield: "",
    mise: "",
    cooking: "",
    plating: "",
    allergens: "",
    time: ""
  };

  const completedPrepCount = prepTasks.filter((task) => task.is_done).length;
  const prepStations = [...new Set(prepTasks.map((task) => String(task.station || "").trim()).filter(Boolean))];

  // Reuse the employee identity already stored on `company` (set at login and restored
  // from localStorage on refresh) instead of re-decoding the JWT, whose employee token
  // uses `employeeEmail`/`isEmployee`, not `email`/`type`.
  const currentUserEmail = company?.employee_email || null;
  const isCurrentUserEmployee = !!company?.is_employee;

  const filteredPrepTasks = prepTasks.filter((task) => {
    if (prepOnlyOpen && task.is_done) {
      return false;
    }
    if (prepStationFilter !== "all" && String(task.station || "").trim() !== prepStationFilter) {
      return false;
    }

    // When "Visa mina uppgifter" is enabled, show only tasks assigned to current user
    if (showMyPrepTasks && (!task.assigned_to || task.assigned_to !== currentUserEmail)) {
      return false;
    }
    return true;
  });

  const visiblePrepTasks = [...filteredPrepTasks].sort((a, b) => {
    // First, prioritize tasks assigned to current user
    const aIsAssignedToMe = a.assigned_to === currentUserEmail;
    const bIsAssignedToMe = b.assigned_to === currentUserEmail;

    if (aIsAssignedToMe !== bIsAssignedToMe) {
      return aIsAssignedToMe ? -1 : 1;
    }

    // Then sort by completion status
    if (a.is_done !== b.is_done) {
      return a.is_done ? 1 : -1;
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[String(a.priority || "medium").toLowerCase()] ?? 1;
    const bPriority = priorityOrder[String(b.priority || "medium").toLowerCase()] ?? 1;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aDueTime = String(a.due_time || "").trim();
    const bDueTime = String(b.due_time || "").trim();

    if (aDueTime && bDueTime) {
      return aDueTime.localeCompare(bDueTime);
    }

    if (aDueTime) return -1;
    if (bDueTime) return 1;

    return 0;
  });

  const filteredCompletedPrepCount = visiblePrepTasks.filter((task) => task.is_done).length;
  const prepProgressPercent = visiblePrepTasks.length > 0
    ? Math.round((filteredCompletedPrepCount / visiblePrepTasks.length) * 100)
    : 0;

  // "Dina uppgifter": tasks assigned to the logged-in user, closest deadline first,
  // then not-done before done. Reuses the existing dueTimeSortValue helper.
  const myPrepTasks = filteredPrepTasks
    .filter((task) => currentUserEmail && task.assigned_to === currentUserEmail)
    .slice()
    .sort((a, b) => {
      const aDue = dueTimeSortValue(a.due_time);
      const bDue = dueTimeSortValue(b.due_time);
      if (aDue !== bDue) return aDue - bDue;
      if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
      return 0;
    });

  // "Övriga uppgifter": everything else, keeping the existing sort order.
  const otherPrepTasks = visiblePrepTasks.filter(
    (task) => !(currentUserEmail && task.assigned_to === currentUserEmail)
  );

  const renderPrepTaskItem = (task) => {
    const priorityMeta = getPriorityMeta(task.priority);
    const stationText = String(task.station || "").trim();
    const dueTimeText = String(task.due_time || "").trim();
    const isAssignedToMe = isCurrentUserEmployee && task.assigned_to === currentUserEmail;

    return (
      <label
        key={task.id}
        style={{
          ...styles.prepItem,
          ...(task.is_done ? { opacity: 0.5, background: "#f1f5f9" } : {}),
          ...(task.assigned_to && !task.is_done ? { borderLeft: "3px solid #2563EB" } : {})
        }}
        onMouseEnter={(e) => {
          if (!task.is_done) {
            e.currentTarget.style.background = "#f0f9ff";
            e.currentTarget.style.borderColor = "#bfdbfe";
          }
        }}
        onMouseLeave={(e) => {
          if (!task.is_done) {
            e.currentTarget.style.background = "#f9fafb";
            e.currentTarget.style.borderColor = "#e5e7eb";
          }
        }}
      >
        <input
          type="checkbox"
          checked={!!task.is_done}
          onChange={(e) => togglePrepTask(task.id, e.target.checked)}
          disabled={prepLoading || !canEditPrep(userRole)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
        <div style={styles.prepItemBody}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              ...styles.prepItemText,
              ...(task.is_done ? styles.prepItemDone : {})
            }}>
              {task.title}
            </span>
            {isAssignedToMe && !task.is_done && (
              <span style={styles.assignedToMeBadge}>
                Tilldelad till dig
              </span>
            )}
          </div>
          <div style={styles.prepMetaRow}>
            <span style={{ ...styles.prepMetaChip, ...priorityMeta.style }}>
              Prioritet: {priorityMeta.label}
            </span>
            {stationText && <span style={styles.prepMetaChip}>Station: {stationText}</span>}
            {dueTimeText && <span style={styles.prepMetaChip}>Klar före {dueTimeText}</span>}
            {task.assigned_to && (
              <span style={styles.prepMetaChip}>Tilldelad: {getStaffNameByEmail(task.assigned_to)}</span>
            )}
          </div>
        </div>
      </label>
    );
  };

  if (isRestoringSession) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h2 style={{ marginBottom: 8 }}>Laddar session...</h2>
          <p style={styles.subtitle}>Ett ögonblick, vi hämtar din inloggning.</p>
        </div>
      </div>
    );
  }

  // LOGIN PAGE
  if (!company) {
    const scrollToLogin = (mode) => {
      setLoginMode(mode);
      setError("");
      requestAnimationFrame(() => {
        const placeholder = mode === "company" ? "Restaurangens namn" : "Din e-post";
        const field = document.querySelector(`input[placeholder="${placeholder}"]`);
        if (field && typeof field.focus === "function") {
          field.focus();
        }
        const loginSection = document.getElementById("login-section");
        if (loginSection) {
          loginSection.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    };

    const scrollToSection = (id) => {
      const section = document.getElementById(id);
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    };

    return (
      <div style={styles.landingPage} className="landingPage">
        <Head>
          <title>Effexo | Digitala lösningar för restauranger och småföretag</title>
          <meta name="description" content="Effexo bygger digitala lösningar som StaffGuide och hemsidor för restauranger och småföretag." />
          <meta property="og:title" content="Effexo | Digitala lösningar för restauranger och småföretag" />
          <meta property="og:description" content="Effexo bygger digitala lösningar som StaffGuide och hemsidor för restauranger och småföretag." />
        </Head>
        <style jsx>{`
          .landingOrb {
            position: absolute;
            border-radius: 9999px;
            filter: blur(2px);
            opacity: 0.55;
            animation: drift 12s ease-in-out infinite;
          }

          .orbA {
            width: 280px;
            height: 280px;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.28) 0%, rgba(37, 99, 235, 0) 72%);
            top: 5%;
            left: -70px;
          }

          .orbB {
            width: 360px;
            height: 360px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.24) 0%, rgba(59, 130, 246, 0) 74%);
            bottom: -100px;
            right: -100px;
            animation-duration: 15s;
          }

          .orbC {
            width: 180px;
            height: 180px;
            background: radial-gradient(circle, rgba(191, 219, 254, 0.8) 0%, rgba(191, 219, 254, 0) 72%);
            top: 44%;
            right: 20%;
            animation-duration: 10s;
          }

          .heroPulse {
            animation: pulse 6s ease-in-out infinite;
          }

          @keyframes drift {
            0% { transform: translate3d(0, 0, 0) scale(1); }
            50% { transform: translate3d(0, -12px, 0) scale(1.04); }
            100% { transform: translate3d(0, 0, 0) scale(1); }
          }

          @keyframes pulse {
            0% { box-shadow: 0 10px 28px rgba(37, 99, 235, 0.14); }
            50% { box-shadow: 0 14px 34px rgba(37, 99, 235, 0.2); }
            100% { box-shadow: 0 10px 28px rgba(37, 99, 235, 0.14); }
          }

          @media (max-width: 1040px) {
            .landingGrid {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }

            .faqGrid {
              grid-template-columns: 1fr !important;
            }

            .landingGrid > section {
              min-width: 0;
            }

            .footerGrid {
              grid-template-columns: repeat(2, 1fr) !important;
            }

            .servicesSection,
            .staffguideSection,
            .hemsidorSection,
            .loginRow,
            .faqSection,
            .trustSection {
              margin-top: 48px !important;
            }

            .ctaSection {
              margin: 48px auto 0 !important;
            }

            .siteFooter {
              margin-top: 48px !important;
            }
          }

          @media (max-width: 700px) {
            .landingPage {
              overflow-x: hidden;
            }

            .landingGrid {
              gap: 12px !important;
            }

            .landingContentWrap {
              padding: 12px !important;
            }

            .heroPanel {
              padding: 16px !important;
              border-radius: 14px !important;
            }

            .heroTitle {
              font-size: 1.55rem !important;
            }

            .heroLead {
              font-size: 0.95rem !important;
            }

            .heroCtaRow {
              flex-direction: column;
            }

            .heroCtaBtn {
              width: 100%;
            }

            .loginCard {
              padding: "25px 18px 18px" !important;
              border-radius: 14px !important;
            }

            .contactSection {
              padding: 20px 16px !important;
              margin-bottom: 28px !important;
            }

            .servicesSection,
            .staffguideSection,
            .hemsidorSection,
            .loginRow,
            .faqSection,
            .trustSection {
              margin-top: 32px !important;
            }

            .faqSection {
              margin-bottom: 28px !important;
            }

            .ctaSection {
              margin: 32px auto 0 !important;
            }

            .siteFooter {
              margin-top: 32px !important;
            }

            .ctaButtons {
              flex-direction: column;
              gap: 8px !important;
            }

            .ctaButtonPrimary,
            .ctaButtonSecondary {
              width: 100%;
            }

            .ctaSection {
              padding: 36px 20px !important;
            }

            .ctaTitle {
              font-size: 1.5rem !important;
            }

            .trustGrid {
              grid-template-columns: 1fr !important;
            }

            .trustTitle {
              font-size: 1.3rem !important;
            }

            .footerGrid {
              grid-template-columns: 1fr !important;
              text-align: center !important;
            }

            .footerColumn {
              align-items: center !important;
            }

            .footerBottom {
              flex-direction: column;
              gap: 8px !important;
            }

            .appHeaderActions {
              flex-direction: row !important;
              gap: 6px !important;
              flex-wrap: wrap !important;
            }

            .logoutButton {
              padding: "8px 12px" !important;
              font-size: 12px !important;
              border-radius: 6px !important;
              min-width: auto !important;
              flex: 1 !important;
              white-space: nowrap !important;
            }

            .chatAreaMobile {
              padding: 8px !important;
            }

            .emptyStateCard {
              margin: "0 auto" !important;
              padding: "10px 14px" !important;
            }
          }

          :global(body) {
            background: #05070d;
          }

          .fadeInSection {
            animation: fadeInUp 0.7s ease both;
          }

          .landingNav {
            animation: fadeInDown 0.7s ease both;
          }

          .heroMockupWrap {
            animation: fadeInUp 0.7s ease 0.1s both, floatMockup 8s ease-in-out 0.8s infinite;
          }

          .loginRow {
            animation: fadeInUp 0.7s ease 0.1s both;
          }

          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-12px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes floatMockup {
            0% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0); }
          }

          .landingNavLink {
            transition: color 0.2s ease;
          }

          .landingNavLink:hover {
            color: #f8fafc !important;
          }

          .landingNavLoginBtn:hover {
            background: rgba(255, 255, 255, 0.09) !important;
            border-color: rgba(148, 163, 184, 0.5) !important;
            transform: translateY(-1px);
          }

          .heroCtaBtn {
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
          }

          .heroCtaPrimaryBtn:hover {
            background: #1d4ed8 !important;
            transform: translateY(-2px);
            box-shadow: 0 12px 26px rgba(37, 99, 235, 0.35);
          }

          .heroCtaSecondaryBtn:hover {
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: rgba(148, 163, 184, 0.5) !important;
            transform: translateY(-2px);
          }

          .mockupWindow {
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }

          .heroMockupWrap:hover .mockupWindow {
            transform: translateY(-4px);
            box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5), 0 0 50px rgba(37, 99, 235, 0.14);
          }

          .servicesSection {
            animation: fadeInUp 0.7s ease 0.1s both;
          }

          .serviceCard {
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          }

          .serviceCard:hover {
            transform: translateY(-6px);
            box-shadow: 0 22px 48px rgba(0, 0, 0, 0.4), 0 0 32px rgba(37, 99, 235, 0.14);
            border-color: rgba(59, 130, 246, 0.4) !important;
          }

          .serviceCardButton {
            transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
          }

          .serviceCardButton:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(148, 163, 184, 0.5) !important;
            transform: translateY(-1px);
          }

          .staffguideSection {
            animation: fadeInUp 0.7s ease 0.1s both;
          }

          .guideVisualWrap {
            animation: fadeInUp 0.7s ease 0.1s both, floatMockupSoft 8s ease-in-out 0.8s infinite;
          }

          .guideVisualWrap .mockupWindow {
            transition: transform 0.25s ease, box-shadow 0.25s ease;
          }

          .guideVisualWrap:hover .mockupWindow {
            transform: translateY(-4px);
            box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5), 0 0 50px rgba(37, 99, 235, 0.14);
          }

          @keyframes floatMockupSoft {
            0% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
            100% { transform: translateY(0); }
          }

          .hemsidorSection {
            animation: fadeInUp 0.7s ease 0.1s both;
          }

          .trustSection,
          .faqSection {
            animation: fadeInUp 0.7s ease 0.1s both;
          }

          .ctaSection {
            animation: fadeInUp 0.7s ease 0.1s both, pulse 5s ease-in-out 1s infinite;
          }

          .siteFooter {
            animation: fadeInUp 0.7s ease both;
          }

          .ctaButtonPrimary:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(37, 99, 235, 0.45);
          }

          .ctaButtonSecondary:hover {
            background: rgba(255, 255, 255, 0.07) !important;
            border-color: rgba(148, 163, 184, 0.5) !important;
            transform: translateY(-2px);
          }

          .footerColLink:hover {
            color: #e2e8f0 !important;
          }

          .contactField {
            caret-color: #60a5fa;
          }

          .contactField::placeholder {
            color: #64748b;
          }

          .contactField:focus {
            border-color: rgba(59, 130, 246, 0.5) !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
          }

          .contactSubmitButton:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(37, 99, 235, 0.35);
          }

          .faqItem:hover {
            border-color: rgba(59, 130, 246, 0.35) !important;
            background: rgba(255, 255, 255, 0.045) !important;
          }

          .faqItem[open] .faqAnswer {
            animation: faqReveal 0.25s ease both;
          }

          @keyframes faqReveal {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @media (max-width: 1040px) {
            .servicesGrid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 18px !important;
            }

            .staffguideGrid {
              grid-template-columns: 1fr !important;
              gap: 24px !important;
            }

            .valueFeaturesGrid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 16px !important;
            }
          }

          @media (max-width: 700px) {
            .landingNavLinks a.landingNavLink {
              display: none;
            }

            .servicesGrid {
              grid-template-columns: 1fr !important;
            }

            .servicesTitle {
              font-size: 1.6rem !important;
            }

            .guideFeaturesGrid {
              grid-template-columns: 1fr !important;
            }

            .staffguideTitle {
              font-size: 1.6rem !important;
            }

            .valueFeaturesGrid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        <nav style={styles.landingNav} className="landingNav">
          <div style={styles.landingNavInner} className="landingNavInner">
            <span style={styles.landingNavLogo}>Effexo</span>
            <div style={styles.landingNavLinks} className="landingNavLinks">
              <a
                href="#services-section"
                style={styles.landingNavLink}
                className="landingNavLink"
                onClick={(e) => { e.preventDefault(); scrollToSection("services-section"); }}
              >
                Hemsidor
              </a>
              <a
                href="#contact-section"
                style={styles.landingNavLink}
                className="landingNavLink"
                onClick={(e) => { e.preventDefault(); scrollToSection("contact-section"); }}
              >
                Kontakt
              </a>
              <button
                type="button"
                style={styles.landingNavLoginBtn}
                className="landingNavLoginBtn"
                onClick={() => scrollToLogin("company")}
              >
                Logga in
              </button>
            </div>
          </div>
        </nav>

        <div style={styles.landingBackground}>
          <div className="landingOrb orbA" />
          <div className="landingOrb orbB" />
          <div className="landingOrb orbC" />
        </div>

        <div style={styles.landingContentWrap} className="landingContentWrap">
          <div className="landingGrid" style={styles.landingGrid}>
            <section style={styles.heroPanel} className="heroPanel fadeInSection">
              <span style={styles.heroBadge}>EFFEXO</span>
              <h1 className="heroTitle" style={styles.heroTitle}>
                Digitala lösningar som sparar tid och hjälper företag att växa.
              </h1>
              <p className="heroLead" style={styles.heroLead}>
                Vi bygger smarta digitala verktyg, hemsidor och synlighet för småföretag och restauranger – så att ni kan lägga tiden på det ni gör bäst.
              </p>

              <div style={styles.heroCtaRow} className="heroCtaRow">
                <button
                  type="button"
                  style={styles.heroCtaPrimary}
                  className="heroCtaBtn heroCtaPrimaryBtn"
                  onClick={() => scrollToSection("contact-section")}
                >
                  Boka möte
                </button>
                <button
                  type="button"
                  style={styles.heroCtaSecondary}
                  className="heroCtaBtn heroCtaSecondaryBtn"
                  onClick={() => scrollToSection("services-section")}
                >
                  Utforska våra tjänster
                </button>
              </div>

              <div style={styles.heroMetaRow}>
                <span style={styles.heroMetaChip}>Meny + recept i realtid</span>
                <span style={styles.heroMetaChip}>Säkrare svar om allergener</span>
                <span style={styles.heroMetaChip}>Byggt för iPad och mobil</span>
              </div>
            </section>

            <div style={styles.heroMockupWrap} className="heroMockupWrap">
              <div style={styles.mockupWindow} className="mockupWindow">
                <div style={styles.mockupTopBar}>
                  <span style={{ ...styles.mockupDot, background: "#ff5f57" }} />
                  <span style={{ ...styles.mockupDot, background: "#febc2e" }} />
                  <span style={{ ...styles.mockupDot, background: "#28c840" }} />
                  <span style={styles.mockupUrlPill}>staffguide.app/dashboard</span>
                </div>
                <div style={styles.mockupBody}>
                  <div style={styles.mockupSidebar}>
                    <span style={{ ...styles.mockupSidebarIcon, background: "#2563eb" }} />
                    <span style={styles.mockupSidebarIcon} />
                    <span style={styles.mockupSidebarIcon} />
                    <span style={styles.mockupSidebarIcon} />
                  </div>
                  <div style={styles.mockupMain}>
                    <div style={styles.mockupMainHeader}>
                      <span>Dagens prep</span>
                      <span style={styles.mockupLivePill}>Live</span>
                    </div>
                    <div style={styles.mockupTaskRow}>
                      <span style={styles.mockupTaskCheck}>✓</span>
                      <span style={styles.mockupTaskText}>Degjäsning kontrollerad 09:00</span>
                    </div>
                    <div style={styles.mockupTaskRow}>
                      <span style={styles.mockupTaskCheck}>✓</span>
                      <span style={styles.mockupTaskText}>Allergenlista verifierad</span>
                    </div>
                    <div style={styles.mockupTaskRow}>
                      <span style={{ ...styles.mockupTaskCheck, ...styles.mockupTaskCheckPending }}>•</span>
                      <span style={styles.mockupTaskText}>Specialsås uppdateras</span>
                    </div>
                    <div style={styles.mockupChartRow}>
                      <span style={{ ...styles.mockupChartBar, height: 14 }} />
                      <span style={{ ...styles.mockupChartBar, height: 22 }} />
                      <span style={{ ...styles.mockupChartBar, height: 30 }} />
                      <span style={{ ...styles.mockupChartBar, height: 18 }} />
                      <span style={{ ...styles.mockupChartBar, height: 26 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section id="services-section" style={styles.servicesSection} className="servicesSection">
            <h2 className="servicesTitle" style={styles.servicesTitle}>Våra tjänster</h2>
            <div style={styles.servicesGrid} className="servicesGrid">
              <div style={styles.serviceCard} className="serviceCard">
                <div style={styles.serviceIconWrap}>
                  <span style={styles.serviceIcon}>🤖</span>
                </div>
                <h3 style={styles.serviceCardTitle}>StaffGuide</h3>
                <p style={styles.serviceCardDesc}>
                  Effexo erbjuder StaffGuide för restauranger – en AI-assistent som hjälper personalen att hitta svar på rutiner, allergener, recept, arbetsuppgifter och intern information på några sekunder.
                </p>
                <div style={styles.serviceBadgeRow}>
                  <span style={styles.serviceBadge}>AI</span>
                  <span style={styles.serviceBadge}>Personal</span>
                  <span style={styles.serviceBadge}>Kunskap</span>
                  <span style={styles.serviceBadge}>Mise en place</span>
                </div>
                <button type="button" style={styles.serviceCardButton} className="serviceCardButton">Läs mer</button>
              </div>

              <div style={styles.serviceCard} className="serviceCard">
                <div style={styles.serviceIconWrap}>
                  <span style={styles.serviceIcon}>🌐</span>
                </div>
                <h3 style={styles.serviceCardTitle}>Hemsidor</h3>
                <p style={styles.serviceCardDesc}>
                  Vi bygger moderna, snabba och mobilanpassade hemsidor som hjälper företag att skapa förtroende och få fler kunder.
                </p>
                <div style={styles.serviceBadgeRow}>
                  <span style={styles.serviceBadge}>Responsive</span>
                  <span style={styles.serviceBadge}>SEO</span>
                  <span style={styles.serviceBadge}>Modern Design</span>
                  <span style={styles.serviceBadge}>Snabb</span>
                </div>
                <button type="button" style={styles.serviceCardButton} className="serviceCardButton">Läs mer</button>
              </div>
            </div>
          </section>

          <section id="staffguide-section" style={styles.staffguideSection} className="staffguideSection">
            <div style={styles.staffguideHeader}>
              <h2 style={styles.staffguideTitle}>StaffGuide</h2>
              <p style={styles.staffguideSubtitle}>
                Effexos AI-assistent som samlar all viktig information på ett ställe och hjälper personalen att få svar direkt.
              </p>
            </div>

            <div style={styles.staffguideGrid} className="staffguideGrid">
              <div style={styles.guideFeaturesGrid} className="guideFeaturesGrid">
                <div style={styles.serviceCard} className="serviceCard">
                  <div style={styles.serviceIconWrap}>
                    <span style={styles.serviceIcon}>💬</span>
                  </div>
                  <h3 style={styles.serviceCardTitle}>AI-chat</h3>
                  <p style={styles.serviceCardDesc}>
                    Ställ frågor om rutiner, recept, allergener och interna instruktioner och få svar direkt.
                  </p>
                </div>

                <div style={styles.serviceCard} className="serviceCard">
                  <div style={styles.serviceIconWrap}>
                    <span style={styles.serviceIcon}>📋</span>
                  </div>
                  <h3 style={styles.serviceCardTitle}>Mise en place</h3>
                  <p style={styles.serviceCardDesc}>
                    Planera dagens arbetsuppgifter och ge personalen tydliga checklistor.
                  </p>
                </div>

                <div style={styles.serviceCard} className="serviceCard">
                  <div style={styles.serviceIconWrap}>
                    <span style={styles.serviceIcon}>📚</span>
                  </div>
                  <h3 style={styles.serviceCardTitle}>Kunskapsbank</h3>
                  <p style={styles.serviceCardDesc}>
                    Samla företagets rutiner, instruktioner och viktiga dokument på ett ställe.
                  </p>
                </div>

                <div style={styles.serviceCard} className="serviceCard">
                  <div style={styles.serviceIconWrap}>
                    <span style={styles.serviceIcon}>👥</span>
                  </div>
                  <h3 style={styles.serviceCardTitle}>Personal</h3>
                  <p style={styles.serviceCardDesc}>
                    Bjud in medarbetare och ge rätt personer rätt behörigheter.
                  </p>
                </div>
              </div>

              <div style={styles.guideVisualWrap} className="guideVisualWrap">
                <div style={styles.mockupWindow} className="mockupWindow">
                  <div style={styles.mockupTopBar}>
                    <span style={{ ...styles.mockupDot, background: "#ef4444" }} />
                    <span style={{ ...styles.mockupDot, background: "#f59e0b" }} />
                    <span style={{ ...styles.mockupDot, background: "#22c55e" }} />
                    <span style={styles.mockupUrlPill}>staffguide.app/chat</span>
                  </div>
                  <div style={styles.guideChatBody}>
                    <div style={styles.guideChatBubbleUser}>Vilka allergener finns i fredagens special?</div>
                    <div style={styles.guideChatBubbleAI}>Gluten och mjölk. Vill du se hela receptet?</div>
                    <div style={styles.guideChatInputRow}>
                      <span style={styles.guideChatInputText}>Skriv din fråga...</span>
                      <span style={styles.guideChatSendBtn}>➤</span>
                    </div>
                  </div>
                </div>

                <div style={styles.guideStatsRow}>
                  <div style={styles.guideStatCard}>
                    <span style={styles.guideStatCheck}>✓</span> Snabbare svar på personalens frågor
                  </div>
                  <div style={styles.guideStatCard}>
                    <span style={styles.guideStatCheck}>✓</span> Samla rutiner, recept och information på ett ställe
                  </div>
                  <div style={styles.guideStatCard}>
                    <span style={styles.guideStatCheck}>✓</span> Minska tiden chefer lägger på att svara på samma frågor
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div style={styles.sectionDivider} />

          <section id="hemsidor-section" style={styles.staffguideSection} className="hemsidorSection">
            <div style={styles.staffguideHeader}>
              <h2 style={styles.staffguideTitle}>Hemsidor</h2>
              <p style={styles.staffguideSubtitle}>
                Moderna hemsidor som gör att företag ser professionella ut och får fler kunder.
              </p>
              <div style={styles.valuesRow}>
                <span style={styles.heroMetaChip}>Snabba</span>
                <span style={styles.heroMetaChip}>Mobilanpassade</span>
                <span style={styles.heroMetaChip}>SEO-optimerade</span>
                <span style={styles.heroMetaChip}>Konverteringsfokuserade</span>
              </div>
            </div>

            <div style={styles.valueFeaturesGrid} className="valueFeaturesGrid">
              <div style={styles.serviceCard} className="serviceCard">
                <div style={styles.serviceIconWrap}>
                  <span style={styles.serviceIcon}>🎨</span>
                </div>
                <h3 style={styles.serviceCardTitle}>Design</h3>
                <p style={styles.serviceCardDesc}>
                  Vi skapar en modern design som speglar ert varumärke.
                </p>
              </div>

              <div style={styles.serviceCard} className="serviceCard">
                <div style={styles.serviceIconWrap}>
                  <span style={styles.serviceIcon}>💻</span>
                </div>
                <h3 style={styles.serviceCardTitle}>Utveckling</h3>
                <p style={styles.serviceCardDesc}>
                  Vi bygger snabba, säkra och skalbara hemsidor från grunden.
                </p>
              </div>

              <div style={styles.serviceCard} className="serviceCard">
                <div style={styles.serviceIconWrap}>
                  <span style={styles.serviceIcon}>🔍</span>
                </div>
                <h3 style={styles.serviceCardTitle}>SEO</h3>
                <p style={styles.serviceCardDesc}>
                  Vi optimerar er sida så att fler hittar er via sökmotorer.
                </p>
              </div>

              <div style={styles.serviceCard} className="serviceCard">
                <div style={styles.serviceIconWrap}>
                  <span style={styles.serviceIcon}>📈</span>
                </div>
                <h3 style={styles.serviceCardTitle}>Konvertering</h3>
                <p style={styles.serviceCardDesc}>
                  Vi designar för att fler besökare ska bli kunder.
                </p>
              </div>
            </div>
          </section>

          <div style={styles.loginRow} className="loginRow">
            <div id="login-section" style={styles.loginCard} className="loginCard">
              <h2 style={{ marginBottom: 6, color: "#0f172a" }}>Intern personalguide</h2>
              <p style={styles.subtitle}>Välj inloggningssätt</p>

              <div style={styles.loginModeRow}>
                <button
                  type="button"
                  style={{
                    ...styles.loginModeButton,
                    ...(loginMode === "company" ? styles.loginModeButtonActive : {})
                  }}
                  onClick={() => {
                    setLoginMode("company");
                    setError("");
                  }}
                  disabled={loading}
                >
                  Företag
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.loginModeButton,
                    ...(loginMode === "employee" ? styles.loginModeButtonActive : {})
                  }}
                  onClick={() => {
                    setLoginMode("employee");
                    setError("");
                  }}
                  disabled={loading}
                >
                  Anställd
                </button>
              </div>

              {loginMode === "company" && (
                <input
                  style={styles.input}
                  className="chatInput"
                  type="text"
                  placeholder="Restaurangens namn"
                  value={companyIdentifier}
                  onChange={e => setCompanyIdentifier(e.target.value)}
                  disabled={loading}
                />
              )}

              {loginMode === "company" && (
                <input
                  style={styles.input}
                  className="chatInput"
                  type="password"
                  placeholder="Restaurangens lösenord"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== "Enter" || loading) return;
                    if (loginMode === "company") {
                      login();
                    } else {
                      loginWithEmployeeCode();
                    }
                  }}
                  disabled={loading}
                />
              )}

              {loginMode === "employee" && (
                <>
                  {employeeLoginStep === "request" ? (
                    <>
                      <input
                        style={styles.input}
                        className="chatInput"
                        type="email"
                        placeholder="Din e-post"
                        value={employeeEmail}
                        onChange={e => setEmployeeEmail(e.target.value)}
                        disabled={loading}
                      />

                      <button
                        style={{ ...styles.secondaryButton, width: "100%", marginBottom: 10 }}
                        onClick={requestEmployeeCode}
                        disabled={loading || employeeLoginStep === "code"}
                      >
                        {loading ? "Skickar kod..." : "Skicka engångskod"}
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        style={styles.input}
                        className="chatInput"
                        type="text"
                        placeholder="Engångskod"
                        value={employeeCode}
                        onChange={e => setEmployeeCode(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !loading && loginWithEmployeeCode()}
                        disabled={loading}
                        autoFocus
                      />

                      <button
                        style={{ ...styles.secondaryButton, width: "100%", marginBottom: 10 }}
                        onClick={() => {
                          setEmployeeLoginStep("request");
                          setCodeRequestTime(null);
                          setShowLoginButton(false);
                        }}
                        disabled={loading}
                      >
                        Tillbaka
                      </button>
                    </>
                  )}
                </>
              )}

              {error && <p style={styles.error}>{error}</p>}

              {!(loginMode === "employee" && employeeLoginStep === "request") && (
                <button
                  style={styles.primaryButton}
                  className="primaryButton"
                  onClick={loginMode === "company" ? login : loginWithEmployeeCode}
                  disabled={loading}
                >
                  {loading ? "Loggar in..." : "Logga in"}
                </button>
              )}
            </div>
          </div>

          <section style={styles.faqSection} className="faqSection">
            <h3 style={styles.faqTitle}>Vanliga frågor</h3>
            <div className="faqGrid" style={styles.faqGrid}>
              {landingFaqs.map((item, index) => (
                <details key={item.question} style={styles.faqItem} className="faqItem">
                  <summary
                    className={`faqSummary faq-${index}`}
                    style={styles.faqSummary}
                  >{item.question}</summary>
                  <p style={styles.faqAnswer} className="faqAnswer">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="contact-section" style={styles.contactSection} className="contactSection fadeInSection">
            <h2 style={styles.contactTitle}>Intresserad? Hör av dig</h2>
            <form style={styles.contactForm} onSubmit={handleContactSubmit}>
              <input
                style={styles.contactInput}
                className="contactField"
                type="text"
                placeholder="Namn *"
                value={contactForm.name}
                onChange={(e) => handleContactChange("name", e.target.value)}
                disabled={contactSubmitting}
                required
              />
              <input
                style={styles.contactInput}
                className="contactField"
                type="text"
                placeholder="Restaurangnamn"
                value={contactForm.restaurant}
                onChange={(e) => handleContactChange("restaurant", e.target.value)}
                disabled={contactSubmitting}
              />
              <input
                style={styles.contactInput}
                className="contactField"
                type="email"
                placeholder="E-post *"
                value={contactForm.email}
                onChange={(e) => handleContactChange("email", e.target.value)}
                disabled={contactSubmitting}
                required
              />
              <textarea
                style={styles.contactTextarea}
                className="contactField"
                placeholder="Meddelande *"
                value={contactForm.message}
                onChange={(e) => handleContactChange("message", e.target.value)}
                disabled={contactSubmitting}
                required
              />
              {contactMessage && (
                <p style={{ color: contactMessage.includes("Tack") ? "#059669" : "#dc2626", fontSize: 14, textAlign: "center" }}>
                  {contactMessage}
                </p>
              )}
              <button
                style={styles.contactSubmitButton}
                className="contactSubmitButton"
                type="submit"
                disabled={contactSubmitting}
              >
                {contactSubmitting ? "Skickar..." : "Skicka"}
              </button>
            </form>
          </section>

          <section style={styles.trustSection} className="trustSection">
            <h2 style={styles.trustTitle}>Inte bara en idé – redan testat i verkligheten</h2>
            <div style={styles.trustGrid} className="trustGrid">
              <div style={{ ...styles.serviceCard, ...styles.trustCard }} className="serviceCard">
                <div style={styles.trustCheckWrap}>✓</div>
                <h3 style={styles.trustCardTitle}>Snabbare arbetsflöden</h3>
              </div>
              <div style={{ ...styles.serviceCard, ...styles.trustCard }} className="serviceCard">
                <div style={styles.trustCheckWrap}>✓</div>
                <h3 style={styles.trustCardTitle}>Mindre frågor till chefen</h3>
              </div>
              <div style={{ ...styles.serviceCard, ...styles.trustCard }} className="serviceCard">
                <div style={styles.trustCheckWrap}>✓</div>
                <h3 style={styles.trustCardTitle}>Bättre struktur i teamet</h3>
              </div>
            </div>
          </section>

          <section style={styles.ctaSection} className="ctaSection">
            <h2 style={styles.ctaTitle}>Redo att digitalisera er verksamhet?</h2>
            <p style={styles.ctaSubtitle}>
              Vi hjälper företag att spara tid, minska stress och få bättre struktur i vardagen.
            </p>
            <div style={styles.ctaButtons}>
              <button
                style={styles.ctaButtonPrimary}
                className="ctaButtonPrimary"
                onClick={() => scrollToSection("contact-section")}
              >
                Boka demo
              </button>
              <button
                style={styles.ctaButtonSecondary}
                className="ctaButtonSecondary"
                onClick={() => scrollToSection("contact-section")}
              >
                Kontakta oss
              </button>
            </div>
          </section>

          <footer style={styles.footer} className="siteFooter">
            <div style={styles.footerGrid} className="footerGrid">
              <div style={styles.footerColumn} className="footerColumn">
                <div style={styles.footerLogo}>Effexo</div>
                <p style={styles.footerTagline}>
                  Digitala lösningar som sparar tid och hjälper företag att växa.
                </p>
              </div>

              <div style={styles.footerColumn} className="footerColumn">
                <h4 style={styles.footerHeading}>Produkt</h4>
                <a href="#staffguide-section" className="footerColLink" style={styles.footerColLink} onClick={(e) => { e.preventDefault(); scrollToSection("staffguide-section"); }}>StaffGuide</a>
                <a href="#hemsidor-section" className="footerColLink" style={styles.footerColLink} onClick={(e) => { e.preventDefault(); scrollToSection("hemsidor-section"); }}>Hemsidor</a>
              </div>

              <div style={styles.footerColumn} className="footerColumn">
                <h4 style={styles.footerHeading}>Företag</h4>
                <a href="#" className="footerColLink" style={styles.footerColLink} onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Om oss</a>
                <a href="#contact-section" className="footerColLink" style={styles.footerColLink} onClick={(e) => { e.preventDefault(); scrollToSection("contact-section"); }}>Kontakt</a>
              </div>

              <div style={styles.footerColumn} className="footerColumn">
                <h4 style={styles.footerHeading}>Juridik</h4>
                <a href="/privacy" className="footerColLink" style={styles.footerColLink}>Integritetspolicy</a>
                <a href="/privacy" className="footerColLink" style={styles.footerColLink}>GDPR</a>
              </div>
            </div>

            <div style={styles.footerBottom}>
              <a href="mailto:hej@staffguide.se" style={styles.footerLink}>staffguide.se@gmail.com</a>
            </div>
            <p style={styles.footerText}>© 2026 Effexo. Alla rättigheter reserverade.</p>
          </footer>
        </div>
      </div>
    );
  }

  // APP
  return (
    <div style={styles.appContainer}>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap');

        :global(body) {
          font-family: 'Manrope', 'Segoe UI', sans-serif;
          background: #f8fafc;
          color: #0f172a;
        }

        .loginCard:hover { transform: translateY(-3px); }
        .primaryButton:hover { background: #1e40af; }
        .sendButton:hover { background: #1e40af; }
        .loginModeButton:hover { border-color: #93c5fd; background: #f8fbff; }
        .logoutButton:hover { background: #eff6ff; }
        .chatInput:focus { border-color: #2563eb; }
        input:focus, textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .adminSectionCard {
          background: #fff;
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .adminSectionCard:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
        }
        .quickActionButton:hover {
          background: #e0ebff;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(30, 64, 175, 0.18);
        }
        .menuInlineItem:hover {
          color: #1e3a8a;
          text-decoration-thickness: 2px;
        }

        .typing { display: flex; gap: 4px; align-items: center; }
        .typing .dot {
          width: 8px; height: 8px;
          background: #2563eb;
          border-radius: 50%;
          animation: blink 1s infinite alternate;
        }
        .typing .dot:nth-child(2) { animation-delay: 0.2s; }
        .typing .dot:nth-child(3) { animation-delay: 0.4s; }

        @media (max-width: 768px) {
          .typing { display: flex; gap: 4px; }
          .adminTabsBar { padding: 12px 12px !important; gap: 6px !important; }
          .quickActionWrap { padding: 10px 12px 14px 12px !important; }
          .recipeBuilderGrid { grid-template-columns: 1fr !important; }
          .appHeader {
            padding: 12px 12px !important;
            align-items: stretch !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          .appHeaderActions {
            width: 100%;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px !important;
          }
          .appHeaderActions button:last-child {
            grid-column: 1 / -1;
          }
          .prepHeaderActionsMobile {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr;
            gap: 8px !important;
          }
          .prepFiltersMobile {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .prepFiltersMobile select {
            width: 100%;
            min-width: 0 !important;
          }
          .inputAreaWrap {
            flex-direction: column !important;
            gap: 8px;
            padding: 10px 12px 12px 12px !important;
          }
          .inputAreaWrap .chatInput {
            margin-right: 0 !important;
          }
          .inputAreaWrap .sendButton {
            width: 100%;
            min-height: 44px;
          }
          .chatAreaMobile {
            padding: 12px !important;
          }
        }

        @keyframes blink {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* --- Small UX polish --- */
        input:focus, textarea:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
          background: #fff !important;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        button:active:not(:disabled) {
          transform: translateY(0px);
        }

        .adminTabButton:hover {
          background: #f1f5f9;
        }

        .adminSectionCard {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(15,23,42,0.05);
          margin-bottom: 16px;
        }
      `}</style>
      {toast.visible && (
        <div
          style={{
            ...styles.toast,
            ...(toast.type === "error" ? styles.toastError : {}),
            ...(toast.type === "info" ? styles.toastInfo : {})
          }}
        >
          {toast.text}
        </div>
      )}
      <header style={styles.header} className="appHeader">
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{company.name}</h2>
          <span style={styles.headerSub}>STAFFGUIDE</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="appHeaderActions">
          <button
            style={{
              ...styles.logoutButton,
              background: showPrep ? "#2563eb" : "#ffffff",
              color: showPrep ? "#ffffff" : "#1d4ed8"
            }}
            onClick={handlePrepClick}
          >
            {showPrep ? "Tillbaka till chat" : "Dagens prep"}
          </button>
          {hasPermission('view_admin') && (
            <button
              style={{
                ...styles.logoutButton,
                background: showAdmin ? "#2563eb" : "#ffffff",
                color: showAdmin ? "#ffffff" : "#1d4ed8"
              }}
              onClick={handleAdminClick}
            >
              {showAdmin ? "Tillbaka" : "Admin"}
            </button>
          )}
          <button
            style={styles.logoutButton}
            onClick={logout}
          >
            Logga ut
          </button>
        </div>
      </header>

      {adminPasswordPrompt && (
        <div style={styles.modalOverlay} onClick={closeAdminPasswordPrompt}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Admin-lösenord krävs</h3>
            <p style={{ color: "#6b7280", fontSize: 14 }}>Ange admin-lösenord för att komma åt admin-panelen</p>

            <input
              style={styles.input}
              type="password"
              placeholder="Admin-lösenord"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !adminLoading && verifyAdminPassword()}
              disabled={adminLoading}
              autoFocus
            />

            {adminPasswordError && (
              <p style={{ color: "#dc2626", fontSize: 14, marginBottom: 12 }}>
                {adminPasswordError}
              </p>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={{ ...styles.primaryButton, flex: 1 }}
                onClick={verifyAdminPassword}
                disabled={adminLoading}
              >
                {adminLoading ? "Verifierar..." : "Öppna admin"}
              </button>
              <button
                style={{ ...styles.secondaryButton, flex: 1, background: "#e5edff", color: "#1e40af" }}
                onClick={closeAdminPasswordPrompt}
                disabled={adminLoading}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdmin ? (
        <>
          <div style={styles.adminPanel}>
            {/* Admin Tabs */}
            <div style={styles.adminTabs} className="adminTabsBar">
              <button
                style={{
                  ...styles.adminTab,
                  ...(adminTab === "info" ? styles.adminTabActive : {})
                }}
                className="adminTabButton"
                onClick={() => handleAdminTabChange("info")}
              >
                Företagsinfo
                {isTabDirty("info") && <span style={styles.tabDirtyDot}>●</span>}
              </button>
              {canAccessAdminTab(userRole, "menu") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "menu" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("menu")}
                >
                  Meny & Allergener
                  {isTabDirty("menu") && <span style={styles.tabDirtyDot}>●</span>}
                </button>
              )}
              {canAccessAdminTab(userRole, "recipes") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "recipes" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("recipes")}
                >
                  Receptbyggare
                  {isTabDirty("recipes") && <span style={styles.tabDirtyDot}>●</span>}
                </button>
              )}
              {canAccessAdminTab(userRole, "routines") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "routines" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("routines")}
                >
                  Rutiner & Regler
                  {isTabDirty("routines") && <span style={styles.tabDirtyDot}>●</span>}
                </button>
              )}
              {canAccessAdminTab(userRole, "prep") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "prep" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("prep")}
                >
                  Prep-mall
                  {prepTemplateDirty && <span style={styles.tabDirtyDot}>●</span>}
                </button>
              )}
              {canAccessAdminTab(userRole, "staff") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "staff" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("staff")}
                >
                  Personal
                </button>
              )}
              {canAccessAdminTab(userRole, "security") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "security" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("security")}
                >
                  Säkerhet
                </button>
              )}
              {canAccessAdminTab(userRole, "stats") && (
                <button
                  style={{
                    ...styles.adminTab,
                    ...(adminTab === "stats" ? styles.adminTabActive : {})
                  }}
                  className="adminTabButton"
                  onClick={() => handleAdminTabChange("stats")}
                >
                  Statistik
                </button>
              )}
            </div>

            {/* Admin Content */}
            <div style={styles.adminContent}>
              {lastSavedAt && (
                <p style={styles.lastSavedText}>
                  Senast uppdaterad: {lastSavedAt.toLocaleString("sv-SE")}
                </p>
              )}
              {adminTab === "info" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Företagsinformation</h3>
                  <p style={styles.helperText}>Exempel: supportmail, öppettider och eventuell stängningsinfo.</p>

                  <label style={styles.label}>Support E-post</label>
                  <input
                    style={styles.input}
                    type="email"
                    placeholder="t.ex. support@restaurang.se"
                    value={companyDetails.support_email || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, support_email: e.target.value })}
                  />

                  <label style={styles.label}>Öppettider</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Mån-Fre 10-22"
                    value={companyDetails.opening_hours || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, opening_hours: e.target.value })}
                  />

                  <label style={styles.label}>Stängningsinformation</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 60 }}
                    placeholder="t.ex. Stängt röda dagar"
                    value={companyDetails.closure_info || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, closure_info: e.target.value })}
                  />

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.destructiveButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("info") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("info") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "menu" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Meny & Allergener</h3>
                  <p style={styles.helperText}>Exempel: kategori + rätt + pris + kort beskrivning.</p>

                  <label style={styles.label}>Meny</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 120 }}
                    placeholder="t.ex. Förrätt: Toast Skagen - 145 kr"
                    value={companyDetails.menu || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, menu: e.target.value })}
                  />

                  <label style={styles.label}>Allergener</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 100 }}
                    placeholder="t.ex. Innehåller gluten, mjölk, nötter"
                    value={companyDetails.allergens || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, allergens: e.target.value })}
                  />

                  <div style={styles.prepEmptyState}>
                    Recept hanteras nu i fliken <strong>Receptbyggare</strong> för tydligare redigering.
                  </div>

                  <button
                    type="button"
                    style={{ ...styles.secondaryButton, width: "100%", marginBottom: 10 }}
                    onClick={() => handleAdminTabChange("recipes")}
                  >
                    Öppna Receptbyggare
                  </button>

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.destructiveButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("menu") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("menu") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "recipes" && (
                <div className="adminSectionCard">
                  <div style={styles.recipeTabHeader}>
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>Receptbyggare</h3>
                    <span style={styles.recipeCountBadge}>{recipeRows.length} recept</span>
                  </div>
                  <p style={styles.helperText}>Sök rätt, välj i listan och fyll i strukturerade fält istället för en lång text.</p>

                  <div style={styles.recipeBuilderLayout} className="recipeBuilderGrid">
                    <div style={styles.recipeSidebar}>
                      <input
                        style={{ ...styles.input, marginBottom: 10 }}
                        placeholder="Sök rätt..."
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                      />

                      <div style={styles.recipeList}>
                        {visibleRecipeRows.map((row) => {
                          const dishLabel = String(row.dish_name || "").trim() || "Namnlös rätt";
                          const categoryLabel = String(row.category || "").trim();
                          const isActive = selectedRecipeRow.id === row.id;
                          return (
                            <button
                              key={row.id}
                              type="button"
                              style={{
                                ...styles.recipeListButton,
                                ...(isActive ? styles.recipeListButtonActive : {})
                              }}
                              onClick={() => setSelectedRecipeId(row.id)}
                            >
                              {dishLabel}
                              {categoryLabel && <span style={styles.recipeListMeta}> · {categoryLabel}</span>}
                              {row.is_active === false && <span style={styles.recipeInactiveTag}> (inaktiv)</span>}
                            </button>
                          );
                        })}

                        {visibleRecipeRows.length === 0 && (
                          <div style={styles.prepEmptyState}>Ingen rätt matchar sökningen.</div>
                        )}
                      </div>

                      <button
                        type="button"
                        style={{ ...styles.secondaryButton, width: "100%", padding: "10px 12px", fontSize: 14 }}
                        onClick={addRecipeRow}
                        disabled={adminLoading}
                      >
                        + Ny rätt
                      </button>
                    </div>

                    <div style={styles.recipeEditor}>
                      <label style={{ ...styles.label, marginTop: 0 }}>Rättnamn</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.dish_name || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "dish_name", e.target.value)}
                        placeholder="t.ex. Margherita"
                      />

                      <label style={styles.label}>Kategori</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.category || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "category", e.target.value)}
                        placeholder="t.ex. Förrätt, Pizza, Dessert"
                      />

                      <label style={styles.label}>Status</label>
                      <select
                        style={styles.prepTemplateSelect}
                        value={selectedRecipeRow.is_active === false ? "inactive" : "active"}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "is_active", e.target.value === "active")}
                      >
                        <option value="active">Aktiv (synlig i drift)</option>
                        <option value="inactive">Inaktiv (utkast/pausad)</option>
                      </select>

                      <div style={styles.recipeEditorActions}>
                        <button
                          type="button"
                          style={{ ...styles.secondaryButton, padding: "10px 12px", fontSize: 14 }}
                          onClick={duplicateRecipeRow}
                          disabled={adminLoading}
                        >
                          Duplicera rätt
                        </button>
                        <button
                          type="button"
                          style={styles.prepDeleteRowButton}
                          onClick={() => removeRecipeRow(selectedRecipeRow.id)}
                          disabled={adminLoading}
                        >
                          Ta bort rätt
                        </button>
                      </div>

                      <label style={styles.label}>Ingredienser (basrecept)</label>
                      <textarea
                        style={{ ...styles.input, minHeight: 90 }}
                        value={selectedRecipeRow.ingredients || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "ingredients", e.target.value)}
                        placeholder="Exempel klassisk toast (basrecept):\n40 skivor toastbrod\n300 g smor\n40 skivor ost\n20 skivor skinka"
                      />

                      <label style={styles.label}>Yield (t.ex. 20 port)</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.yield || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "yield", e.target.value)}
                        placeholder="t.ex. 20 port"
                      />

                      <label style={styles.label}>Mise en place</label>
                      <textarea
                        style={{ ...styles.input, minHeight: 80 }}
                        value={selectedRecipeRow.mise || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "mise", e.target.value)}
                        placeholder="t.ex. Ta fram deg 30 min innan, riv ost"
                      />

                      <label style={styles.label}>Tillagning</label>
                      <textarea
                        style={{ ...styles.input, minHeight: 90 }}
                        value={selectedRecipeRow.cooking || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "cooking", e.target.value)}
                        placeholder="t.ex. Baka i 3-4 min på 320 grader"
                      />

                      <label style={styles.label}>Plating</label>
                      <textarea
                        style={{ ...styles.input, minHeight: 80 }}
                        value={selectedRecipeRow.plating || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "plating", e.target.value)}
                        placeholder="t.ex. Ringla olivolja, toppa med basilika"
                      />

                      <label style={styles.label}>Allergener</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.allergens || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "allergens", e.target.value)}
                        placeholder="t.ex. Gluten, mjölk"
                      />

                      <label style={styles.label}>Tidsåtgång</label>
                      <input
                        style={styles.input}
                        value={selectedRecipeRow.time || ""}
                        onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "time", e.target.value)}
                        placeholder="t.ex. 6 min"
                      />
                    </div>
                  </div>

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.destructiveButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("recipes") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("recipes") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "routines" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Rutiner & Regler</h3>
                  <p style={styles.helperText}>Exempel: korta punktlistor för öppning, stängning och personalsituationer.</p>

                  <label style={styles.label}>Arbetsrutiner</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Starta kassan, fyll på stationer"
                    value={companyDetails.routines || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, routines: e.target.value })}
                  />

                  <label style={styles.label}>Öppningsrutiner</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Ugn 250°, deg ut 30 min innan"
                    value={companyDetails.opening_routine || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, opening_routine: e.target.value })}
                  />

                  <label style={styles.label}>Stängningsrutiner</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Stäng kassan, rengör alla ytor"
                    value={companyDetails.closing_routine || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, closing_routine: e.target.value })}
                  />

                  <label style={styles.label}>Beteenderegler</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Mobil endast på rast"
                    value={companyDetails.behavior_guidelines || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, behavior_guidelines: e.target.value })}
                  />

                  <label style={styles.label}>Personalroller</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Kassa, kök, servering"
                    value={companyDetails.staff_roles || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, staff_roles: e.target.value })}
                  />

                  <label style={styles.label}>Personalsituationer</label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="t.ex. Sen kollega, allergifråga, stress"
                    value={companyDetails.staff_situations || ""}
                    onChange={e => setCompanyDetails({ ...companyDetails, staff_situations: e.target.value })}
                  />

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.destructiveButton, flex: 1 }}
                      onClick={resetCurrentTab}
                      disabled={!isTabDirty("routines") || adminLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={updateCompanyDetails}
                      disabled={!isTabDirty("routines") || adminLoading}
                    >
                      {adminLoading ? "Sparar..." : "Spara ändringar"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "prep" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Prep-mall (chef)</h3>
                  <p style={styles.helperText}>
                    Fyll i en rad per prep-uppgift med separat fält för uppgift, stress, station och klar-tid.
                  </p>

                  <div style={styles.prepTemplateTableWrap}>
                    <table style={styles.prepTemplateTable}>
                      <thead>
                        <tr>
                          <th style={styles.prepTemplateTh}>Uppgift</th>
                          <th style={styles.prepTemplateTh}>Stress</th>
                          <th style={styles.prepTemplateTh}>Station</th>
                          <th style={styles.prepTemplateTh}>Klar tid</th>
                          <th style={styles.prepTemplateTh}>Tilldelad till</th>
                          <th style={styles.prepTemplateTh}>Ta bort</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prepTemplateRows.map((row, index) => (
                          <tr key={`prep-row-${index}`}>
                            <td style={styles.prepTemplateTd}>
                              <input
                                style={styles.prepTemplateInput}
                                value={row.title}
                                onChange={(e) => updatePrepTemplateRow(index, "title", e.target.value)}
                                placeholder="t.ex. Hacka lok"
                                disabled={prepTemplateLoading}
                              />
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <select
                                style={styles.prepTemplateSelect}
                                value={row.priority}
                                onChange={(e) => updatePrepTemplateRow(index, "priority", e.target.value)}
                                disabled={prepTemplateLoading}
                              >
                                <option value="high">Hög</option>
                                <option value="medium">Medel</option>
                                <option value="low">Låg</option>
                              </select>
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <input
                                style={styles.prepTemplateInput}
                                value={row.station}
                                onChange={(e) => updatePrepTemplateRow(index, "station", e.target.value)}
                                placeholder="t.ex. kok"
                                disabled={prepTemplateLoading}
                              />
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <input
                                type="time"
                                style={styles.prepTemplateInput}
                                value={row.due_time}
                                onChange={(e) => updatePrepTemplateRow(index, "due_time", e.target.value)}
                                disabled={prepTemplateLoading}
                              />
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <select
                                style={styles.prepTemplateSelect}
                                value={row.assigned_to || ""}
                                onChange={(e) => updatePrepTemplateRow(index, "assigned_to", e.target.value)}
                                disabled={prepTemplateLoading}
                              >
                                <option value="">Ej tilldelad</option>
                                {staffList.map((staff) => (
                                  <option key={staff.id} value={staff.email}>
                                    {staff.name || staff.email}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={styles.prepTemplateTd}>
                              <button
                                type="button"
                                style={styles.prepDeleteRowButton}
                                onClick={() => removePrepTemplateRow(index)}
                                disabled={prepTemplateLoading}
                              >
                                Ta bort
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    style={{ ...styles.secondaryButton, width: "100%", marginTop: 12 }}
                    onClick={addPrepTemplateRow}
                    disabled={prepTemplateLoading}
                  >
                    + Ny rad
                  </button>

                  <div style={styles.adminActionBar}>
                    <button
                      style={{ ...styles.secondaryButton, flex: 1 }}
                      onClick={() => setPrepTemplateRows(savedPrepTemplateRows)}
                      disabled={!prepTemplateDirty || prepTemplateLoading}
                    >
                      Återställ
                    </button>
                    <button
                      style={{ ...styles.primaryButton, flex: 1, width: "auto" }}
                      onClick={savePrepTemplate}
                      disabled={!prepTemplateDirty || prepTemplateLoading}
                    >
                      {prepTemplateLoading ? "Sparar..." : "Spara prep-mall"}
                    </button>
                  </div>
                </div>
              )}

              {adminTab === "staff" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Personalhantering</h3>
                  <p style={styles.helperText}>
                    Hantera anställda som kan logga in med e-post och engångskod.
                  </p>

                  {/* Add new staff */}
                  <div style={{ background: "#f8fafc", padding: 20, borderRadius: 12, marginBottom: 24 }}>
                    <h4 style={{ margin: "0 0 16px", fontSize: 16, color: "#374151" }}>Lägg till ny personal</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <input
                        style={styles.input}
                        type="email"
                        placeholder="E-postadress *"
                        value={newStaffEmail}
                        onChange={e => setNewStaffEmail(e.target.value)}
                        disabled={staffLoading}
                      />
                      <input
                        style={styles.input}
                        type="text"
                        placeholder="Namn (valfritt)"
                        value={newStaffName}
                        onChange={e => setNewStaffName(e.target.value)}
                        disabled={staffLoading}
                      />
                      <select
                        style={styles.input}
                        value={newStaffRole}
                        onChange={e => setNewStaffRole(e.target.value)}
                        disabled={staffLoading}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="member">Member</option>
                      </select>
                    </div>
                    <button
                      style={styles.primaryButton}
                      onClick={addStaffMember}
                      disabled={staffLoading}
                    >
                      {staffLoading ? "Lägger till..." : "Lägg till personal"}
                    </button>
                  </div>

                  {/* Staff list */}
                  <div>
                    <h4 style={{ margin: "0 0 16px", fontSize: 16, color: "#374151" }}>Registrerad personal ({staffList.length})</h4>
                    {staffLoading ? (
                      <p style={{ textAlign: "center", color: "#6b7280", padding: 20 }}>Laddar...</p>
                    ) : staffList.length === 0 ? (
                      <p style={{ textAlign: "center", color: "#6b7280", padding: 20 }}>Ingen personal registrerad</p>
                    ) : (
                      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>Namn</th>
                              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>E-post</th>
                              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>Roll</th>
                              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>Tillagd datum</th>
                              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, fontWeight: 600, color: "#374151" }}>Åtgärd</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffList.map((staff) => (
                              <tr key={staff.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "12px 16px", color: "#374151" }}>
                                  {staff.name || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Ej namngiven</span>}
                                </td>
                                <td style={{ padding: "12px 16px", color: "#2563eb", fontSize: 14 }}>{staff.email}</td>
                                <td style={{ padding: "12px 16px", color: "#374151", fontSize: 14 }}>
                                  <select
                                    value={staff.role || 'member'}
                                    onChange={(e) => updateStaffRole(staff.id, e.target.value)}
                                    style={{
                                      padding: "6px 10px",
                                      border: "1px solid #d1d5db",
                                      borderRadius: 6,
                                      fontSize: 13,
                                      width: "100%",
                                      maxWidth: 200,
                                      backgroundColor: "#ffffff",
                                      cursor: "pointer"
                                    }}
                                    disabled={staffLoading}
                                  >
                                    <option value="owner">Owner</option>
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editor</option>
                                    <option value="member">Member</option>
                                  </select>
                                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 1.3 }}>
                                    {getRoleDescription(staff.role || 'member')}
                                  </div>
                                </td>
                                <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 14 }}>
                                  {new Date(staff.created_at).toLocaleDateString("sv-SE")}
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                  <button
                                    style={{
                                      background: "#fef2f2",
                                      color: "#dc2626",
                                      border: "1px solid #fecaca",
                                      borderRadius: 6,
                                      padding: "6px 12px",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      transition: "background 0.15s"
                                    }}
                                    onClick={() => removeStaffMember(staff.id)}
                                    disabled={staffLoading}
                                    onMouseOver={(e) => e.target.style.background = "#fee2e2"}
                                    onMouseOut={(e) => e.target.style.background = "#fef2f2"}
                                  >
                                    Ta bort
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {adminTab === "security" && hasPermission('manage_security') && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Säkerhet & Åtkomst</h3>
                  <p style={styles.helperText}>Hantera åtkomst och byt lösenord vid behov.</p>

                  <div style={{ background: "#f3f4f6", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: 14 }}>
                      <strong>Status:</strong> Företaget är {company.active ? "aktiverat" : "deaktiverat"}
                    </p>
                  </div>

                  <button
                    style={{
                      ...styles.primaryButton,
                      background: company.active ? "#dc2626" : "#059669",
                      marginBottom: 24
                    }}
                    onClick={toggleCompanyStatus}
                    disabled={adminLoading}
                  >
                    {company.active ? "Deaktivera företag" : "Aktivera företag"}
                  </button>

                  <h4>Byt lösenord (StaffGuide-inloggning)</h4>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nuvarande lösenord"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nytt lösenord"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Bekräfta nytt lösenord"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p style={{ color: "#dc2626", fontSize: 13, marginTop: -8, marginBottom: 12 }}>
                      Lösenorden matchar inte.
                    </p>
                  )}

                  <button
                    style={styles.primaryButton}
                    onClick={updatePassword}
                    disabled={adminLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  >
                    {adminLoading ? "Uppdaterar..." : "Uppdatera lösenord"}
                  </button>

                  <h4 style={{ marginTop: 24 }}>Byt Admin-panelens lösenord</h4>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nuvarande lösenord"
                    value={adminPanelCurrentPassword}
                    onChange={e => setAdminPanelCurrentPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nytt lösenord"
                    value={adminPanelNewPassword}
                    onChange={e => setAdminPanelNewPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Bekräfta nytt lösenord"
                    value={adminPanelConfirmPassword}
                    onChange={e => setAdminPanelConfirmPassword(e.target.value)}
                    disabled={adminLoading}
                  />
                  {adminPanelConfirmPassword && adminPanelNewPassword !== adminPanelConfirmPassword && (
                    <p style={{ color: "#dc2626", fontSize: 13, marginTop: -8, marginBottom: 12 }}>
                      Lösenorden matchar inte.
                    </p>
                  )}

                  <button
                    style={styles.primaryButton}
                    onClick={updateAdminPanelPassword}
                    disabled={adminLoading || !adminPanelCurrentPassword || !adminPanelNewPassword || !adminPanelConfirmPassword || adminPanelNewPassword !== adminPanelConfirmPassword}
                  >
                    {adminLoading ? "Uppdaterar..." : "Uppdatera admin-lösenord"}
                  </button>

                  {adminMessage && (
                    <p style={{
                      ...styles.adminMessage,
                      color: adminMessage.includes("✅") ? "#059669" : "#dc2626"
                    }}>
                      {adminMessage}
                    </p>
                  )}
                </div>
              )}

              {adminTab === "stats" && (
                <div className="adminSectionCard">
                  <h3 style={{ marginTop: 0 }}>Statistik</h3>

                  <button
                    style={{ ...styles.primaryButton, marginBottom: 24, fontSize: 13 }}
                    onClick={fetchCompanyDetails}
                    disabled={adminLoading}
                  >
                    Uppdatera statistik
                  </button>

                  <div style={styles.statCard}>
                    <div style={styles.statNumber}>{companyDetails.query_count || 0}</div>
                    <div style={styles.statLabel}>Totalt antal frågor</div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statNumber}>{company.is_admin ? "Ja" : "Nej"}</div>
                    <div style={styles.statLabel}>Admin-behörighet</div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statNumber}>{company.active ? "Aktiv" : "Inaktiv"}</div>
                    <div style={styles.statLabel}>Företagsstatus</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : showPrep ? (
        <div style={styles.prepPanel}>
          <div style={styles.prepCard}>
            <div style={styles.prepHeaderRow}>
              <div>
                <h3 style={{ margin: "0 0 4px 0" }}>Dagens prep</h3>
                <p style={{ ...styles.helperText, margin: 0 }}>
                  {prepDate} · {completedPrepCount}/{prepTasks.length} klara
                </p>
              </div>
              <div style={styles.prepHeaderActions} className="prepHeaderActionsMobile">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={showMyPrepTasks}
                    onChange={(e) => setShowMyPrepTasks(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: 14 }}>Visa mina uppgifter</span>
                </label>
                <button
                  style={{ ...styles.secondaryButton, padding: "10px 14px", fontSize: 14 }}
                  onClick={() => setFilteredPrepTasksDone(true)}
                  disabled={prepLoading || prepBulkUpdating}
                >
                  <div>
                    <div>Markera synliga klara</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Bockar av alla uppgifter i nuvarande vy</div>
                  </div>
                </button>
                <button
                  style={{ ...styles.secondaryButton, padding: "10px 14px", fontSize: 14 }}
                  onClick={() => setFilteredPrepTasksDone(false)}
                  disabled={prepLoading || prepBulkUpdating}
                >
                  <div>
                    <div>Återställ synliga</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Avmarkerar alla klarmarkeringar</div>
                  </div>
                </button>
                <button
                  style={{ ...styles.secondaryButton, padding: "10px 14px", fontSize: 14 }}
                  onClick={() => fetchPrepTasks(prepDate)}
                  disabled={prepLoading || prepBulkUpdating}
                >
                  <div>
                    <div>{prepLoading ? "Laddar..." : "Uppdatera"}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Hämtar senaste uppgifter från servern</div>
                  </div>
                </button>
              </div>
            </div>

            <div style={styles.prepProgressWrap}>
              <div style={styles.prepProgressText}>
                Synliga uppgifter: {filteredCompletedPrepCount}/{visiblePrepTasks.length} klara ({prepProgressPercent}%)
              </div>
              <div style={styles.prepProgressTrack}>
                <div style={{ ...styles.prepProgressFill, width: `${prepProgressPercent}%` }} />
              </div>
            </div>

            <div style={styles.prepFiltersRow} className="prepFiltersMobile">
              <label style={styles.prepFilterToggle}>
                <input
                  type="checkbox"
                  checked={prepOnlyOpen}
                  onChange={(e) => setPrepOnlyOpen(e.target.checked)}
                />
                Visa bara ej klara
              </label>

              <select
                value={prepStationFilter}
                onChange={(e) => setPrepStationFilter(e.target.value)}
                style={styles.prepSelect}
              >
                <option value="all">Alla stationer</option>
                {prepStations.map((station) => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            </div>

            {prepError && <p style={styles.error}>{prepError}</p>}

            {!prepError && !prepLoading && prepTasks.length === 0 && (
              <div style={styles.prepEmptyState}>
                Inga prep-uppgifter för idag. Be chefen lägga in en prep-mall i admin.
              </div>
            )}

            {!prepError && prepTasks.length > 0 && (
              <>
                <h4 style={styles.prepSectionTitle}>
                  Dina uppgifter <span style={styles.prepSectionCount}>({myPrepTasks.length})</span>
                </h4>
                <div style={styles.prepList}>
                  {myPrepTasks.length > 0 ? (
                    myPrepTasks.map((task) => renderPrepTaskItem(task))
                  ) : (
                    <div style={styles.prepEmptyState}>Inga uppgifter tilldelade just nu.</div>
                  )}
                </div>

                <h4 style={{ ...styles.prepSectionTitle, marginTop: 24 }}>Övriga uppgifter</h4>
                <div style={styles.prepList}>
                  {otherPrepTasks.length > 0 ? (
                    otherPrepTasks.map((task) => renderPrepTaskItem(task))
                  ) : (
                    <div style={styles.prepEmptyState}>Inga övriga uppgifter.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={styles.chatArea} ref={chatAreaRef} className="chatAreaMobile">
            {chat.length === 0 && !loading && (
              <div style={styles.emptyStateCard}>
                <div style={styles.emptyStateTitle}>Hej</div>
                <div style={styles.emptyStateText}>Välj en snabbfråga nedan eller skriv en egen fråga till personalguiden.</div>
              </div>
            )}

            {chat.map((msg, i) => (
              <div
                key={i}
                style={
                  msg.from === "user"
                    ? styles.userBubble
                    : styles.aiBubble
                }
              >
                {msg.from === "ai" ? renderAiTextWithClickableMenuItems(msg, i) : msg.text}
                {msg.from === "ai" && Array.isArray(msg.menuItems) && msg.menuItems.length > 0 && (
                  <div style={styles.menuItemsWrap}>
                    <div style={styles.menuItemsTitle}>Tryck på en rätt för recept</div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={styles.aiBubble} className="typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            )}
          </div>

          <div style={styles.quickActions} className="quickActionWrap">
            {quickQuestions.map((quickQuestion) => (
              <button
                key={quickQuestion.key}
                style={styles.quickActionButton}
                className="quickActionButton"
                onClick={() => askAI(quickQuestion.prompt, { quickActionKey: quickQuestion.key })}
                disabled={loading}
              >
                {quickQuestion.label}
              </button>
            ))}
          </div>

          <div style={styles.inputArea} className="inputAreaWrap">
            <input
              style={styles.chatInput}
              className="chatInput"
              placeholder="Ställ en fråga till personalguiden..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && askAI()}
              disabled={loading}
              autoComplete="off"
            />

            <button
              style={styles.sendButton}
              className="sendButton"
              onClick={() => askAI()}
              disabled={loading}
            >
              Skicka
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },

  landingPage: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(180deg, #05070d 0%, #0a0e1a 45%, #0b0f1c 100%)"
  },

  landingNav: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "rgba(5, 7, 13, 0.72)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.12)"
  },

  landingNavInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },

  landingNavLogo: {
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: "0.01em",
    color: "#f8fafc"
  },

  landingNavLinks: {
    display: "flex",
    alignItems: "center",
    gap: 22
  },

  landingNavLink: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none"
  },

  landingNavLoginBtn: {
    border: "1px solid rgba(148, 163, 184, 0.28)",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#f8fafc",
    borderRadius: 8,
    padding: "8px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease"
  },

  landingBackground: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none"
  },

  landingContentWrap: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1200,
    margin: "0 auto",
    padding: "56px 18px 34px"
  },

  landingGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 1fr",
    gap: 40,
    alignItems: "center"
  },

  heroPanel: {
    padding: "12px 4px"
  },

  heroBadge: {
    display: "inline-block",
    background: "rgba(37, 99, 235, 0.14)",
    border: "1px solid rgba(59, 130, 246, 0.35)",
    color: "#93c5fd",
    padding: "7px 14px",
    borderRadius: 999,
    fontSize: 12,
    letterSpacing: "0.09em",
    fontWeight: 800,
    marginBottom: 20
  },

  heroTitle: {
    margin: "0 0 18px",
    fontSize: "3rem",
    lineHeight: 1.1,
    color: "#f8fafc",
    fontWeight: 800,
    letterSpacing: "-0.02em"
  },

  heroLead: {
    margin: "0 0 28px",
    fontSize: "1.13rem",
    lineHeight: 1.6,
    color: "#94a3b8",
    maxWidth: "52ch"
  },

  heroCtaRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 28
  },

  heroCtaPrimary: {
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 48,
    fontSize: 15
  },

  heroCtaSecondary: {
    border: "1px solid rgba(148, 163, 184, 0.3)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "#e2e8f0",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 48,
    fontSize: 15
  },

  heroMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4
  },

  heroMetaChip: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    color: "#cbd5e1",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600
  },

  heroMockupWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  mockupWindow: {
    width: "100%",
    maxWidth: 420,
    background: "linear-gradient(155deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: 20,
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45), 0 0 40px rgba(37, 99, 235, 0.08)",
    overflow: "hidden",
    backdropFilter: "blur(6px)"
  },

  mockupTopBar: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "12px 14px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.14)"
  },

  mockupDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    display: "inline-block"
  },

  mockupUrlPill: {
    marginLeft: 10,
    fontSize: 11,
    color: "#64748b",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 999,
    padding: "3px 10px"
  },

  mockupBody: {
    display: "flex",
    minHeight: 220
  },

  mockupSidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "16px 12px",
    borderRight: "1px solid rgba(148, 163, 184, 0.12)"
  },

  mockupSidebarIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    background: "rgba(148, 163, 184, 0.16)",
    display: "inline-block"
  },

  mockupMain: {
    flex: 1,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  mockupMainHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 700
  },

  mockupLivePill: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.05em",
    color: "#4ade80",
    background: "rgba(74, 222, 128, 0.12)",
    border: "1px solid rgba(74, 222, 128, 0.3)",
    borderRadius: 999,
    padding: "3px 8px"
  },

  mockupTaskRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    borderRadius: 10,
    padding: "8px 10px"
  },

  mockupTaskCheck: {
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "rgba(37, 99, 235, 0.25)",
    color: "#93c5fd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    flexShrink: 0
  },

  mockupTaskCheckPending: {
    background: "rgba(148, 163, 184, 0.16)",
    color: "#94a3b8"
  },

  mockupTaskText: {
    fontSize: 12.5,
    color: "#cbd5e1",
    fontWeight: 500
  },

  mockupChartRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 6,
    marginTop: "auto",
    paddingTop: 8
  },

  mockupChartBar: {
    width: 14,
    borderRadius: 4,
    background: "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
    display: "inline-block"
  },

  loginRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: 64
  },

  servicesSection: {
    marginTop: 64
  },

  servicesTitle: {
    margin: "0 0 36px",
    fontSize: "2.1rem",
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "#f8fafc",
    textAlign: "center"
  },

  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 24,
    alignItems: "stretch",
    maxWidth: 820,
    margin: "0 auto"
  },

  serviceCard: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    padding: "28px 24px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)"
  },

  serviceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "rgba(37, 99, 235, 0.14)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22
  },

  serviceIcon: {
    lineHeight: 1
  },

  serviceCardTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#f8fafc"
  },

  serviceCardDesc: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: "#94a3b8",
    flex: 1
  },

  serviceBadgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
  },

  serviceBadge: {
    fontSize: 12,
    fontWeight: 600,
    color: "#cbd5e1",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: 999,
    padding: "5px 10px"
  },

  serviceCardButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    border: "1px solid rgba(148, 163, 184, 0.3)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "#f8fafc",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer"
  },

  staffguideSection: {
    marginTop: 64
  },

  staffguideHeader: {
    maxWidth: 640,
    margin: "0 auto 40px",
    textAlign: "center"
  },

  staffguideTitle: {
    margin: "0 0 14px",
    fontSize: "2.1rem",
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "#f8fafc"
  },

  staffguideSubtitle: {
    margin: "0 auto",
    fontSize: "1.05rem",
    lineHeight: 1.6,
    color: "#94a3b8"
  },

  staffguideGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 40,
    alignItems: "center"
  },

  guideFeaturesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 16
  },

  guideVisualWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },

  guideChatBody: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "18px 16px",
    minHeight: 220
  },

  guideChatBubbleUser: {
    alignSelf: "flex-end",
    maxWidth: "78%",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#f8fafc",
    padding: "10px 14px",
    borderRadius: "14px 14px 4px 14px",
    fontSize: 12.5,
    lineHeight: 1.5,
    fontWeight: 600
  },

  guideChatBubbleAI: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    color: "#cbd5e1",
    padding: "10px 14px",
    borderRadius: "14px 14px 14px 4px",
    fontSize: 12.5,
    lineHeight: 1.55
  },

  guideChatInputRow: {
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 999,
    padding: "8px 8px 8px 14px"
  },

  guideChatInputText: {
    flex: 1,
    fontSize: 12,
    color: "#64748b"
  },

  guideChatSendBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    flexShrink: 0
  },

  guideStatsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
    width: "100%",
    maxWidth: 420
  },

  guideStatCard: {
    flex: "1 1 140px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#cbd5e1"
  },

  guideStatCheck: {
    color: "#4ade80",
    fontWeight: 800
  },

  sectionDivider: {
    height: 1,
    maxWidth: 1100,
    margin: "0 auto",
    background: "linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.22), transparent)"
  },

  valuesRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 18
  },

  valueFeaturesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 20
  },

  loginCard: {
    background: "#ffffff",
    padding: "35px 30px 30px",
    borderRadius: 16,
    width: "100%",
    maxWidth: 430,
    boxShadow: "0 10px 24px rgba(37,99,235,0.08)",
    border: "1px solid #dbeafe",
    textAlign: "center",
    boxSizing: "border-box",
    transition: "transform 0.2s, box-shadow 0.2s",
  },

  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 32,
    margin: "0 auto 20px auto"
  },

  subtitle: {
    marginBottom: 24,
    color: "#475569",
    fontSize: 14,
    fontWeight: 600
  },

  loginModeRow: {
    display: "flex",
    gap: 8,
    marginBottom: 14
  },

  loginModeButton: {
    flex: 1,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out"
  },

  loginModeButtonActive: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
    transition: "all 0.2s ease-in-out"
  },

  employeeLoginHint: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 12,
    color: "#6b7280",
    textAlign: "left"
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 16,
    borderRadius: 10,
    border: "1.5px solid #cbd5e1",
    marginBottom: 12,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    background: "#fafbfc"
  },

  primaryButton: {
    width: "100%",
    padding: 12,
    fontSize: 16,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 48,
    transition: "background 0.2s, transform 0.1s, box-shadow 0.2s",
    boxShadow: "0 2px 8px rgba(37,99,235,0.18)"
  },

  error: {
    color: "#dc2626",
    marginBottom: 12,
    fontSize: 14
  },

  faqSection: {
    marginTop: 64,
    marginBottom: 40,
    background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    padding: "28px 24px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)"
  },

  faqTitle: {
    margin: "0 0 16px",
    fontSize: "1.6rem",
    color: "#f8fafc",
    letterSpacing: "-0.01em",
    fontWeight: 800
  },

  faqGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10
  },

  faqItem: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 12,
    padding: 12,
    transition: "border-color 0.2s ease, background 0.2s ease"
  },

  faqSummary: {
    cursor: "pointer",
    fontWeight: 700,
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 1.35,
    listStyle: "none",
    position: "relative",
    paddingLeft: "25px",
    transition: "all 0.2s ease-in-out"
  },

  faqAnswer: {
    margin: "10px 0 0",
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 1.6
  },

  contactSection: {
    maxWidth: 600,
    margin: "0 auto",
    marginBottom: 40,
    background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    borderRadius: 20,
    padding: "28px 24px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)",
    backdropFilter: "blur(5px)"
  },

  contactTitle: {
    margin: "0 0 20px",
    fontSize: "1.6rem",
    color: "#f8fafc",
    fontWeight: 800,
    textAlign: "center"
  },

  contactForm: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },

  contactInput: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.24)",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#f1f5f9"
  },

  contactTextarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.24)",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#f1f5f9",
    minHeight: 100,
    resize: "vertical",
    fontFamily: "inherit"
  },

  contactSubmitButton: {
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    minHeight: 48,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease"
  },

  trustSection: {
    marginTop: 64,
    textAlign: "center"
  },

  trustTitle: {
    margin: "0 0 32px",
    fontSize: "1.6rem",
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: "#f8fafc"
  },

  trustGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20
  },

  trustCard: {
    alignItems: "center",
    textAlign: "center"
  },

  trustCheckWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    background: "rgba(74, 222, 128, 0.12)",
    border: "1px solid rgba(74, 222, 128, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 800,
    color: "#4ade80",
    margin: "0 auto"
  },

  trustCardTitle: {
    margin: 0,
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#f1f5f9"
  },

  ctaSection: {
    textAlign: "center",
    padding: "56px 32px",
    background: "linear-gradient(155deg, rgba(37,99,235,0.16) 0%, rgba(10,14,26,0.4) 60%, rgba(10,14,26,0.1) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    borderRadius: 20,
    margin: "64px auto 0",
    maxWidth: 820,
    boxShadow: "0 30px 70px rgba(0, 0, 0, 0.35), 0 0 60px rgba(37, 99, 235, 0.12)",
    position: "relative",
    overflow: "hidden"
  },

  ctaTitle: {
    margin: "0 0 14px",
    fontSize: "2.1rem",
    color: "#f8fafc",
    fontWeight: 800,
    letterSpacing: "-0.01em"
  },

  ctaSubtitle: {
    margin: "0 auto 28px",
    maxWidth: "48ch",
    fontSize: "1.05rem",
    lineHeight: 1.6,
    color: "#cbd5e1"
  },

  ctaButtons: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
    position: "relative",
    zIndex: 1
  },

  ctaButtonPrimary: {
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "#fff",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 48,
    fontSize: 15,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease"
  },

  ctaButtonSecondary: {
    border: "1px solid rgba(148, 163, 184, 0.35)",
    background: "rgba(255, 255, 255, 0.03)",
    color: "#f8fafc",
    borderRadius: 10,
    padding: "14px 26px",
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 48,
    fontSize: 15,
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease"
  },

  footer: {
    marginTop: 64,
    background: "rgba(255, 255, 255, 0.02)",
    borderTop: "1px solid rgba(148, 163, 184, 0.14)",
    padding: "32px 8px 20px",
    color: "#94a3b8"
  },

  footerGrid: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
    gap: 24,
    marginBottom: 24,
    textAlign: "left"
  },

  footerColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },

  footerLogo: {
    fontSize: 17,
    fontWeight: 800,
    color: "#f8fafc"
  },

  footerTagline: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.6,
    color: "#64748b",
    maxWidth: "28ch"
  },

  footerHeading: {
    margin: "0 0 2px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#cbd5e1"
  },

  footerColLink: {
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "color 0.2s ease",
    width: "fit-content"
  },

  footerBottom: {
    display: "flex",
    justifyContent: "center",
    gap: 20,
    flexWrap: "wrap",
    borderTop: "1px solid rgba(148, 163, 184, 0.1)",
    paddingTop: 18,
    marginBottom: 8
  },

  footerLink: {
    color: "#60a5fa",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600
  },

  footerText: {
    fontSize: 12.5,
    color: "#64748b",
    margin: 0,
    textAlign: "center"
  },

  appContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    minHeight: "100vh",
    background: "#f8fafc"
  },

  header: {
    padding: "18px 28px",
    background: "#ffffff",
    color: "#0f172a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 2px 12px rgba(15,23,42,0.04)"
  },

  headerSub: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 600,
    letterSpacing: 0.3
  },

  logoutButton: {
    background: "#ffffff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    padding: "10px 18px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
  },

  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "#f8fafc"
  },

  emptyStateCard: {
    alignSelf: "center",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "14px 16px",
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 3px 10px rgba(0,0,0,0.04)"
  },

  emptyStateTitle: {
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4
  },

  emptyStateText: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 1.5
  },

  userBubble: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "#fff",
    padding: 14,
    borderRadius: "16px 16px 6px 16px",
    maxWidth: "76%",
    boxShadow: "0 10px 22px rgba(37,99,235,0.24)",
    animation: "fadeIn 0.2s"
  },

  aiBubble: {
    alignSelf: "flex-start",
    background: "#ffffff",
    padding: 14,
    borderRadius: "16px 16px 16px 6px",
    maxWidth: "76%",
    whiteSpace: "pre-wrap",
    boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
    border: "1px solid #e2e8f0",
    animation: "fadeIn 0.2s"
  },

  menuItemsWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px dashed #d1d5db"
  },

  menuItemsTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#4b5563",
    marginBottom: 8
  },

  menuInlineText: {
    color: "#1d4ed8"
  },

  menuInlineItemButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    color: "#1d4ed8",
    font: "inherit",
    fontWeight: 700,
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    cursor: "pointer"
  },

  menuItemsGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },

  menuItemButton: {
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#1e3a8a",
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
    transition: "transform 0.15s, box-shadow 0.2s, background 0.2s"
  },

  quickActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: "12px 18px 14px 18px",
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    borderBottom: "1px solid #e2e8f0"
  },

  quickActionButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e40af",
    borderRadius: 10,
    padding: "12px 18px",
    fontSize: 14,
    cursor: "pointer",
    fontWeight: 700,
    transition: "transform 0.15s, box-shadow 0.2s, background 0.2s",
    boxShadow: "0 1px 3px rgba(37,99,235,0.08)"
  },

  inputArea: {
    display: "flex",
    padding: "12px 18px 18px 18px",
    background: "#ffffff",
    boxShadow: "0 -2px 10px rgba(15,23,42,0.04)",
    borderTop: "1px solid #e2e8f0"
  },

  chatInput: {
    flex: 1,
    padding: "14px 16px",
    fontSize: 16,
    borderRadius: 12,
    border: "1.5px solid #cbd5e1",
    marginRight: 12,
    boxSizing: "border-box",
    outline: "none",
    background: "#fafbfc",
    transition: "border-color 0.2s, box-shadow 0.2s"
  },

  sendButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "0 24px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
    minHeight: 48,
    boxShadow: "0 2px 8px rgba(37,99,235,0.18)",
    transition: "background 0.2s, transform 0.1s, box-shadow 0.2s"
  },

  prepPanel: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: 24,
    background: "#f8fafc"
  },

  prepCard: {
    maxWidth: 760,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
    padding: 18
  },

  prepHeaderActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },

  prepProgressWrap: {
    marginBottom: 12
  },

  prepProgressText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 6,
    fontWeight: 600
  },

  prepProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden"
  },

  prepProgressFill: {
    height: "100%",
    background: "#2563eb",
    borderRadius: 999,
    transition: "width 0.25s ease"
  },

  prepHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap"
  },

  prepFiltersRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap"
  },

  prepFilterToggle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    color: "#374151"
  },

  prepSelect: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#fff",
    color: "#111827",
    fontSize: 14,
    minWidth: 170
  },

  prepEmptyState: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: 10,
    padding: 12,
    color: "#475569",
    marginBottom: 12
  },

  prepList: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  prepSectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    margin: "0 0 10px",
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a"
  },

  prepSectionCount: {
    fontWeight: 600,
    color: "#64748b"
  },

  prepItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "14px 14px",
    background: "#f9fafb",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
    cursor: "pointer"
  },

  prepItemBody: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flex: 1,
    minWidth: 0
  },

  prepItemText: {
    color: "#111827",
    lineHeight: 1.45,
    fontSize: 15
  },

  prepMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6
  },

  prepMetaChip: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    border: "1px solid #c7d2fe"
  },

  assignedToMeBadge: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
    padding: "3px 9px",
    borderRadius: 999,
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#ffffff",
    boxShadow: "0 1px 4px rgba(37, 99, 235, 0.35)",
    whiteSpace: "nowrap"
  },

  prepPriorityHigh: {
    background: "#FEE2E2",
    color: "#DC2626",
    border: "1px solid #FECACA"
  },

  prepPriorityMedium: {
    background: "#FEF3C7",
    color: "#D97706",
    border: "1px solid #FDE68A"
  },

  prepPriorityLow: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0"
  },

  prepItemDone: {
    textDecoration: "line-through",
    color: "#6b7280"
  },

  prepTemplateTableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fff"
  },

  prepTemplateTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 620
  },

  prepTemplateTh: {
    textAlign: "left",
    fontSize: 12,
    color: "#4b5563",
    padding: "10px 8px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb"
  },

  prepTemplateTd: {
    padding: 8,
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top"
  },

  prepTemplateInput: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    boxSizing: "border-box"
  },

  prepTemplateSelect: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    boxSizing: "border-box",
    background: "#fff"
  },

  prepDeleteRowButton: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#991b1b",
    borderRadius: 8,
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap"
  },

  recipeBuilderLayout: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 12,
    alignItems: "start"
  },

  recipeTabHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
    flexWrap: "wrap"
  },

  recipeCountBadge: {
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    background: "#eff6ff",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 700
  },

  recipeSidebar: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#f8fafc",
    padding: 10
  },

  recipeList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    maxHeight: 360,
    overflowY: "auto",
    marginBottom: 10
  },

  recipeListButton: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#1f2937",
    borderRadius: 8,
    padding: "8px 10px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600
  },

  recipeListButtonActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
    color: "#1d4ed8"
  },

  recipeListMeta: {
    color: "#6b7280",
    fontWeight: 500
  },

  recipeInactiveTag: {
    color: "#b91c1c",
    fontWeight: 700
  },

  recipeEditor: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fff",
    padding: 12
  },

  recipeEditorActions: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap"
  },

  adminPanel: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    background: "#f8fafc",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden"
  },

  adminTabs: {
    display: "flex",
    gap: 8,
    padding: "16px 24px",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    overflowX: "auto",
    flexShrink: 0
  },

  adminTab: {
    padding: "12px 16px",
    minHeight: 44,
    border: "none",
    background: "transparent",
    color: "#6b7280",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: 8,
    whiteSpace: "nowrap",
    transition: "all 0.2s"
  },

  tabDirtyDot: {
    marginLeft: 8,
    fontSize: 10,
    verticalAlign: "middle"
  },

  adminTabActive: {
    background: "#2563eb",
    color: "#fff"
  },

  adminContent: {
    flex: 1,
    minHeight: 0,
    padding: "24px 32px",
    maxWidth: 960,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 40
  },

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 8,
    marginTop: 16
  },

  helperText: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12
  },

  lastSavedText: {
    margin: "0 0 12px 2px",
    color: "#4b5563",
    fontSize: 13,
    fontWeight: 500
  },

  adminActionBar: {
    position: "sticky",
    bottom: 0,
    zIndex: 3,
    display: "flex",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 6,
    background: "linear-gradient(180deg, rgba(248,250,252,0), #f8fafc 28%)"
  },

  secondaryButton: {
    width: "auto",
    padding: 12,
    fontSize: 15,
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 48,
    transition: "background 0.15s, transform 0.1s"
  },

  destructiveButton: {
    width: "auto",
    padding: 12,
    fontSize: 15,
    background: "#f8fafc",
    color: "#64748b",
    border: "2px solid #e2e8f0",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    minHeight: 48,
    transition: "background 0.15s, transform 0.1s, border-color 0.15s"
  },

  adminMessage: {
    paddingBottom: 12,
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16
  },

  statCard: {
    background: "#fff",
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    textAlign: "center"
  },

  statNumber: {
    fontSize: 36,
    fontWeight: 700,
    color: "#2563eb",
    marginBottom: 8
  },

  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: 500
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },

  modalContent: {
    background: "#fff",
    padding: 32,
    borderRadius: 16,
    maxWidth: 400,
    width: "90%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
  },

  toast: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 2000,
    background: "#059669",
    color: "#fff",
    padding: "11px 14px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    maxWidth: 360
  },

  toastError: {
    background: "#dc2626"
  },

  toastInfo: {
    background: "#1d4ed8"
  }
};