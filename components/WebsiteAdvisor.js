import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { askAdvisor } from "../lib/websiteAdvisor/api";

const GREETING = "Hej! 👋 Berätta gärna kort om ert företag och vad ni vill att hemsidan ska göra, så hjälper jag er hitta rätt nivå.";

const TIER_LABELS = {
  START: "Start",
  MODERN: "Modern",
  SIGNATURE: "Signature"
};

const THINKING_MESSAGES = ["Tänker...", "Väger in vad ni behöver..."];
const THINKING_INTERVAL_MS = 1400;

function createMessage(role, content, extra) {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, content, ...extra };
}

export default function WebsiteAdvisor() {
  const [messages, setMessages] = useState(() => [createMessage("assistant", GREETING)]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMessage, setErrorMessage] = useState("");
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, THINKING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || status === "loading") return;

    const userMessage = createMessage("user", trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setStatus("loading");
    setErrorMessage("");

    const outcome = await askAdvisor(nextMessages.map(({ role, content }) => ({ role, content })));

    if (!outcome.ok) {
      setErrorMessage(outcome.message);
      setStatus("error");
      return;
    }

    const { result } = outcome;
    if (result.action === "recommend") {
      setMessages((prev) => [
        ...prev,
        createMessage("assistant", result.message, { recommendation: { tier: result.tier, reasons: result.reasons } })
      ]);
    } else {
      setMessages((prev) => [...prev, createMessage("assistant", result.message)]);
    }
    setStatus("idle");
  };

  return (
    <div style={styles.widget} className="advisorWidget">
      <div style={styles.window}>
        <div ref={listRef} style={styles.messageList} className="advisorMessageList">
          {messages.map((m) => (
            <div key={m.id} style={m.role === "user" ? styles.bubbleUser : styles.bubbleAiWrap}>
              {m.role === "assistant" && !m.recommendation && (
                <div style={styles.bubbleAi}>{m.content}</div>
              )}
              {m.role === "user" && m.content}

              {m.recommendation && (
                <div style={styles.recommendationCard} className="advisorRecommendationCard">
                  <span style={styles.recommendationEyebrow}>Vår rekommendation</span>
                  <span style={styles.recommendationBadge}>{TIER_LABELS[m.recommendation.tier] || m.recommendation.tier}</span>
                  <p style={styles.recommendationMessage}>{m.content}</p>
                  <ul style={styles.recommendationReasons}>
                    {m.recommendation.reasons.map((reason, i) => (
                      <li key={i} style={styles.recommendationReasonItem}>
                        <span style={styles.recommendationReasonBullet}>✓</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <p style={styles.recommendationCta}>Vill ni att vi tar fram ett förslag?</p>
                  {/* Plain "/#contact-section" navigation, matching the
                      same pattern this page's own contact CTAs already
                      use - works regardless of which page this widget is
                      rendered on, unlike the earlier same-page-only
                      scrollToSection() call this replaced. */}
                  <Link
                    href="/#contact-section"
                    style={{ ...styles.recommendationCtaButton, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    className="advisorCtaButton"
                  >
                    Kontakta Effexo
                  </Link>
                </div>
              )}
            </div>
          ))}

          {status === "loading" && (
            <div style={styles.bubbleAiWrap}>
              <div style={styles.bubbleAi}>
                <span className="advisorTyping" style={styles.typingRow}>
                  <span style={styles.typingText}>{THINKING_MESSAGES[thinkingIndex]}</span>
                  <span className="advisorTypingDots">
                    <span className="advisorDot" />
                    <span className="advisorDot" />
                    <span className="advisorDot" />
                  </span>
                </span>
              </div>
            </div>
          )}

          {status === "error" && (
            <div style={styles.bubbleAiWrap}>
              <div style={styles.errorBubble}>{errorMessage}</div>
            </div>
          )}
        </div>

        <form style={styles.inputRow} className="advisorInputRow" onSubmit={handleSend}>
          <input
            style={styles.input}
            className="advisorInputField"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv om ert företag och vad ni behöver..."
            disabled={status === "loading"}
            maxLength={800}
          />
          <button
            type="submit"
            style={styles.sendButton}
            className="advisorSendButton"
            disabled={status === "loading" || !input.trim()}
            aria-label="Skicka"
          >
            ➜
          </button>
        </form>
      </div>

      <style jsx>{`
        .advisorDot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #93c5fd;
          display: inline-block;
          margin-left: 2px;
          animation: advisorBlink 1s infinite alternate;
        }
        .advisorDot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .advisorDot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes advisorBlink {
          from {
            opacity: 0.25;
          }
          to {
            opacity: 1;
          }
        }
        .advisorInputField:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        }
        .advisorSendButton:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }
        .advisorSendButton:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .advisorCtaButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
        }
        .advisorMessageList {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
        }
        .advisorMessageList::-webkit-scrollbar {
          width: 6px;
        }
        .advisorMessageList::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 999px;
        }

        @media (max-width: 640px) {
          .advisorWidget {
            padding: 0 !important;
          }
          .advisorMessageList {
            min-height: 260px !important;
            max-height: 360px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  widget: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "0 4px"
  },
  window: {
    background: "linear-gradient(155deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: 20,
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
    backdropFilter: "blur(6px)"
  },
  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "22px 20px",
    minHeight: 320,
    maxHeight: 460,
    overflowY: "auto"
  },
  bubbleUser: {
    alignSelf: "flex-end",
    maxWidth: "78%",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#f8fafc",
    padding: "11px 15px",
    borderRadius: "14px 14px 4px 14px",
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 600
  },
  bubbleAiWrap: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    display: "flex",
    flexDirection: "column"
  },
  bubbleAi: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    color: "#e2e8f0",
    padding: "11px 15px",
    borderRadius: "14px 14px 14px 4px",
    fontSize: 14,
    lineHeight: 1.55
  },
  errorBubble: {
    background: "rgba(220, 38, 38, 0.1)",
    border: "1px solid rgba(248, 113, 113, 0.35)",
    color: "#fca5a5",
    padding: "11px 15px",
    borderRadius: "14px 14px 14px 4px",
    fontSize: 13.5,
    lineHeight: 1.5
  },
  typingRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4
  },
  typingText: {
    color: "#94a3b8",
    fontSize: 13.5
  },
  recommendationCard: {
    marginTop: 4,
    background: "linear-gradient(155deg, rgba(37,99,235,0.14) 0%, rgba(255,255,255,0.03) 100%)",
    border: "1px solid rgba(59, 130, 246, 0.32)",
    borderRadius: 16,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: "0 16px 34px rgba(0, 0, 0, 0.28)"
  },
  recommendationEyebrow: {
    fontSize: 11.5,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#93c5fd"
  },
  recommendationBadge: {
    alignSelf: "flex-start",
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: "0.03em",
    color: "#f8fafc",
    background: "rgba(37, 99, 235, 0.22)",
    border: "1px solid rgba(59, 130, 246, 0.45)",
    borderRadius: 999,
    padding: "5px 16px"
  },
  recommendationMessage: {
    margin: "2px 0 0",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#e2e8f0"
  },
  recommendationReasons: {
    margin: "2px 0 0",
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: 5
  },
  recommendationReasonItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    fontSize: 13,
    lineHeight: 1.5,
    color: "#cbd5e1"
  },
  recommendationReasonBullet: {
    flexShrink: 0,
    color: "#4ade80",
    fontWeight: 700,
    fontSize: 12,
    lineHeight: 1.6
  },
  recommendationCta: {
    margin: "8px 0 0",
    fontSize: 13.5,
    fontWeight: 600,
    color: "#f1f5f9"
  },
  recommendationCtaButton: {
    alignSelf: "flex-start",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    borderRadius: 10,
    padding: "11px 22px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease"
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 16px",
    borderTop: "1px solid rgba(148, 163, 184, 0.14)",
    background: "rgba(255, 255, 255, 0.02)"
  },
  input: {
    flex: 1,
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 999,
    padding: "12px 16px",
    fontSize: 14,
    color: "#f1f5f9",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease"
  },
  sendButton: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: "50%",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.15s ease, box-shadow 0.15s ease"
  }
};
