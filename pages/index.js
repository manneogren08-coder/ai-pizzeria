import AdminPanel from "../components/AdminPanel";
import PrepStation from "../components/PrepStation";
import Chat from "../components/Chat";
import Landing from "../components/Landing";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";

const ADMIN_TABS = ["info", "menu", "recipes", "routines", "prep", "security", "stats"];

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
  if (["high", "hog", "hög", "h"].includes(normalized)) return "high";
  if (["low", "lag", "låg", "l"].includes(normalized)) return "low";
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
    due_time: ""
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
        due_time: normalizeTemplateDueTime(parts[3])
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
      due_time: normalizeTemplateDueTime(row?.due_time)
    }))
    .filter((row) => row.title)
    .map((row) => [row.title, row.priority, row.station, row.due_time].join(" | "))
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
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\$&");
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
      question: "Hur snabbt kommer en ny medarbetare igång?",
      answer: "Ofta samma dag. Lägg in rutiner, recept och allergener i admin så kan personalen fråga AI-guiden direkt i mobilen."
    },
    {
      question: "Fungerar det för både kök och servering?",
      answer: "Ja. Ni kan använda samma konto men olika innehåll: köksrutiner, service-scripts, allergenstöd och öppning/stängning."
    },
    {
      question: "Kan vi styra vad personalen ser?",
      answer: "Ja. Innehållet hämtas från er adminpanel. Uppdaterar ni text där slår det igenom i svaren direkt efter sparning."
    },
    {
      question: "Är sidan bra på iPad och telefon?",
      answer: "Ja. Gränssnittet är byggt mobile-first med tydliga kort, stora klickytor och enkel navigering under service."
    }
  ];

  const [token, setToken] = useState("");
  const [loginMode, setLoginMode] = useState("company");
  const [companyIdentifier, setCompanyIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [company, setCompany] = useState(null);
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
  const [newPassword, setNewPassword] = useState("");
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
  const [recipeRows, setRecipeRows] = useState([emptyRecipeRow()]);
  const [savedRecipeRows, setSavedRecipeRows] = useState([emptyRecipeRow()]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const chatAreaRef = useRef(null);
  const toastTimerRef = useRef(null);
  const skipNextAdminRoutePromptRef = useRef(false);

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
    setCompany(null);
    setToken("");
    setChat([]);
    localStorage.removeItem("token");
    localStorage.removeItem("company");
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

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\$&");


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
    if (!token) return;

    const requestedDate = typeof targetDate === "string" ? targetDate : getTodayDateString();
    setPrepLoading(true);
    setPrepError("");

    try {
      const res = await fetch(`/api/prep/day?date=${encodeURIComponent(requestedDate)}`, {
        headers: {
          "Authorization": `Bearer ${token}`
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
      setPrepTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } catch {
      setPrepError("Kunde inte hämta dagens prep.");
      setPrepTasks([]);
    }

    setPrepLoading(false);
  }, [token]);

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
      setToken(savedToken);
      setCompany(JSON.parse(savedCompany));
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
    if (!showPrep || !token) return;
    fetchPrepTasks(prepDate);
  }, [showPrep, token, prepDate, fetchPrepTasks]);

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
    setError("Skriv in företags-id eller företagsnamn");
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

    setToken(data.token);      
    setCompany(data.company);
    localStorage.setItem("token", data.token);
    localStorage.setItem("company", JSON.stringify(data.company));
  } catch {
    setError("Ett fel uppstod. Försök igen.");
  }

  setLoading(false);
};

  const requestEmployeeCode = async () => {
    if (!companyIdentifier.trim()) {
      setError("Skriv in företags-id eller företagsnamn");
      return;
    }

    if (!password.trim()) {
      setError("Skriv in restaurangens lösenord");
      return;
    }

    if (!employeeEmail.trim()) {
      setError("Skriv in e-post");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employee/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyIdentifier,
          password,
          email: employeeEmail,
          name: employeeName
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Kunde inte skicka kod");
        setLoading(false);
        return;
      }

      const debugHint = data?.debugCode ? ` Testkod: ${data.debugCode}` : "";
      showToast(`Kod skickad till ${employeeEmail}.${debugHint}`, "info");
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    }

    setLoading(false);
  };

  const loginWithEmployeeCode = async () => {
    if (!companyIdentifier.trim()) {
      setError("Skriv in företags-id eller företagsnamn");
      return;
    }

    if (!password.trim()) {
      setError("Skriv in restaurangens lösenord");
      return;
    }

    if (!employeeEmail.trim()) {
      setError("Skriv in e-post");
      return;
    }

    if (!employeeCode.trim()) {
      setError("Skriv in engångskod eller demo");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/employee/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyIdentifier,
          password,
          email: employeeEmail,
          code: employeeCode
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Kunde inte logga in med kod");
        setLoading(false);
        return;
      }

      setToken(data.token);
      setCompany(data.company);
      localStorage.setItem("token", data.token);
      localStorage.setItem("company", JSON.stringify(data.company));
      setEmployeeCode("");
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
  if (!newPassword.trim()) {
    showToast("Skriv in ett nytt lösenord", "error");
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
      body: JSON.stringify({ newPassword })
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
    setNewPassword("");
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

const handlePrepClick = () => {
  const nextShowPrep = !showPrep;
  setShowPrep(nextShowPrep);
  setShowAdmin(false);
  setAdminPasswordPrompt(false);
  syncAdminRoute(false);

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

const filteredPrepTasks = prepTasks.filter((task) => {
  if (prepOnlyOpen && task.is_done) {
    return false;
  }
  if (prepStationFilter !== "all" && String(task.station || "").trim() !== prepStationFilter) {
    return false;
  }
  return true;
});

const visiblePrepTasks = [...filteredPrepTasks].sort((a, b) => {
  if (a.is_done !== b.is_done) {
    return a.is_done ? 1 : -1;
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const aPriority = priorityOrder[String(a.priority || "medium").toLowerCase()] ?? 1;
  const bPriority = priorityOrder[String(b.priority || "medium").toLowerCase()] ?? 1;
  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }

  const aTime = dueTimeSortValue(a.due_time);
  const bTime = dueTimeSortValue(b.due_time);
  if (aTime !== bTime) {
    return aTime - bTime;
  }

  return (a.sort_order || 0) - (b.sort_order || 0);
});

const filteredCompletedPrepCount = visiblePrepTasks.filter((task) => task.is_done).length;
const prepProgressPercent = visiblePrepTasks.length > 0
  ? Math.round((filteredCompletedPrepCount / visiblePrepTasks.length) * 100)
  : 0;

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl relative z-10 text-center max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Laddar...</h2>
          <p className="text-slate-500">Ett ögonblick, vi hämtar din session.</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <Landing
        loginMode={loginMode}
        setLoginMode={setLoginMode}
        companyIdentifier={companyIdentifier}
        setCompanyIdentifier={setCompanyIdentifier}
        password={password}
        setPassword={setPassword}
        employeeEmail={employeeEmail}
        setEmployeeEmail={setEmployeeEmail}
        employeeName={employeeName}
        setEmployeeName={setEmployeeName}
        employeeCode={employeeCode}
        setEmployeeCode={setEmployeeCode}
        error={error}
        setError={setError}
        loading={loading}
        login={login}
        requestEmployeeCode={requestEmployeeCode}
        loginWithEmployeeCode={loginWithEmployeeCode}
        landingFaqs={landingFaqs}
      />
    );
  }

  // APP
  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Toast Notification */}
      {toast.visible && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-5 py-2.5 rounded shadow-lg font-medium text-sm transition-all duration-300 animate-in slide-in-from-top-4 ${
            toast.type === "error" ? "bg-red-500 text-white" :
            toast.type === "info" ? "bg-blue-500 text-white" :
            "bg-slate-900 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center px-6 py-3 bg-white border-b border-slate-200 z-30 shrink-0 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold shrink-0">
            {company?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="m-0 text-base font-bold text-slate-900 tracking-tight">{company?.name}</h2>
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Staffguide</span>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            className={`flex-1 md:flex-none px-4 py-2 rounded font-medium text-sm transition-colors border ${
              showPrep 
                ? "bg-slate-900 text-white border-slate-900" 
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
            onClick={handlePrepClick}
          >
            {showPrep ? "Tillbaka till chatt" : "Dagens prep"}
          </button>
          
          {company?.is_admin && (
            <button
              className={`flex-1 md:flex-none px-4 py-2 rounded font-medium text-sm transition-colors border ${
                showAdmin 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
              onClick={handleAdminClick}
            >
              {showAdmin ? "Tillbaka" : "Admin"}
            </button>
          )}
          
          <button
            className="flex-none px-4 py-2 bg-white hover:bg-red-50 text-red-600 font-medium border border-slate-300 hover:border-red-200 rounded transition-colors text-sm"
            onClick={logout}
          >
            Logga ut
          </button>
        </div>
      </header>

      {/* Admin Password Prompt Overlay */}
      {adminPasswordPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex flex-col justify-center items-center p-6 animate-in fade-in" onClick={closeAdminPasswordPrompt}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Admin-lösenord krävs</h3>
            <p className="text-slate-500 mb-6 text-sm">Ange administratörslösenord för att fortsätta.</p>
            
            <input
              type="password"
              placeholder="Lösenord..."
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !adminLoading && verifyAdminPassword()}
              disabled={adminLoading}
              autoFocus
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-all placeholder:text-slate-400 mb-4 font-mono text-sm"
            />
            
            {adminPasswordError && (
              <p className="text-red-600 text-sm font-medium mb-4">
                {adminPasswordError}
              </p>
            )}
            
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 bg-slate-900 hover:bg-black text-white font-semibold rounded text-sm transition-all disabled:opacity-50"
                onClick={verifyAdminPassword}
                disabled={adminLoading}
              >
                {adminLoading ? "Verifierar..." : "Logga in"}
              </button>
              <button
                className="flex-1 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded text-sm transition-colors disabled:opacity-50"
                onClick={closeAdminPasswordPrompt}
                disabled={adminLoading}
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {showAdmin ? (
        <AdminPanel
          token={token}
          company={company}
          companyDetails={companyDetails}
          setCompanyDetails={setCompanyDetails}
          savedCompanyDetails={savedCompanyDetails}
          setSavedCompanyDetails={setSavedCompanyDetails}
          lastSavedAt={lastSavedAt}
          adminTab={adminTab}
          handleAdminTabChange={handleAdminTabChange}
          isTabDirty={isTabDirty}
          adminLoading={adminLoading}
          updateCompanyDetails={updateCompanyDetails}
          resetCurrentTab={resetCurrentTab}
          fetchCompanyDetails={fetchCompanyDetails}
          recipeRows={recipeRows}
          setRecipeRows={setRecipeRows}
          selectedRecipeRow={selectedRecipeRow}
          setSelectedRecipeId={setSelectedRecipeId}
          recipeSearch={recipeSearch}
          setRecipeSearch={setRecipeSearch}
          visibleRecipeRows={visibleRecipeRows}
          addRecipeRow={addRecipeRow}
          duplicateRecipeRow={duplicateRecipeRow}
          removeRecipeRow={removeRecipeRow}
          updateRecipeRow={updateRecipeRow}
          prepTemplateRows={prepTemplateRows}
          updatePrepTemplateRow={updatePrepTemplateRow}
          addPrepTemplateRow={addPrepTemplateRow}
          removePrepTemplateRow={removePrepTemplateRow}
          prepTemplateLoading={prepTemplateLoading}
          prepTemplateDirty={prepTemplateDirty}
          savePrepTemplate={savePrepTemplate}
          toggleCompanyStatus={toggleCompanyStatus}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          adminMessage={adminMessage}
          updatePassword={updatePassword}
        />
      ) : showPrep ? (
        <PrepStation
          prepDate={prepDate}
          completedPrepCount={completedPrepCount}
          totalPrepCount={prepTasks.length}
          filteredCompletedPrepCount={filteredCompletedPrepCount}
          visiblePrepTasks={visiblePrepTasks}
          setFilteredPrepTasksDone={setFilteredPrepTasksDone}
          prepLoading={prepLoading}
          prepBulkUpdating={prepBulkUpdating}
          fetchPrepTasks={fetchPrepTasks}
          prepProgressPercent={prepProgressPercent}
          prepOnlyOpen={prepOnlyOpen}
          setPrepOnlyOpen={setPrepOnlyOpen}
          prepStationFilter={prepStationFilter}
          setPrepStationFilter={setPrepStationFilter}
          prepStations={prepStations}
          prepError={prepError}
          togglePrepTask={togglePrepTask}
        />
      ) : (
        <Chat
          chat={chat}
          loading={loading}
          question={question}
          setQuestion={setQuestion}
          askAI={askAI}
          quickQuestions={quickQuestions}
        />
      )}
    </div>
  );
}
