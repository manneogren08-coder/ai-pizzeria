import React, { useEffect, useRef } from "react";

export default function Chat({
  chat,
  loading,
  question,
  setQuestion,
  askAI,
  quickQuestions
}) {
  const chatAreaRef = useRef(null);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chat, loading]);

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\$&");

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
        return <span key={`msg-${msgIndex}-text-${partIndex}`}>{part}</span>;
      }

      return (
        <button
          key={`msg-${msgIndex}-menu-${matchingItem}-${partIndex}`}
          type="button"
          onClick={() => askAI(`Vad är receptet för ${matchingItem}?`)}
          disabled={loading}
          className="inline font-semibold text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-600 underline-offset-2 transition-all cursor-pointer bg-transparent border-none p-0 focus:outline-none"
        >
          {part}
        </button>
      );
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative">
      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 scroll-smooth" 
        ref={chatAreaRef}
      >
        {chat.length === 0 && !loading && (
          <div className="m-auto text-center max-w-md bg-white p-8 rounded-lg shadow-sm border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Hej, hur kan jag hjälpa dig?</h2>
            <p className="text-slate-500">
              Välj en snabbfråga nedan eller skriv en egen fråga till guiden. Prova att fråga om ett recept, en allergen eller en rutin.
            </p>
          </div>
        )}

        {chat.map((msg, i) => (
          <div
            key={i}
            className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] rounded-lg p-4 shadow-sm ${
                msg.from === "user"
                  ? "bg-blue-600 text-white rounded-br-sm shadow-sm"
                  : "bg-white text-slate-800 rounded-bl-sm border border-slate-200"
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.from === "ai" ? renderAiTextWithClickableMenuItems(msg, i) : msg.text}
              </div>
              
              {msg.from === "ai" && Array.isArray(msg.menuItems) && msg.menuItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100/10 border-dashed text-xs font-medium text-slate-400">
                  Tryck på en markerad rätt för recept
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start w-full animate-in fade-in">
            <div className="bg-white rounded-lg rounded-bl-sm p-4 border border-slate-200 shadow-sm flex gap-1.5 items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 md:p-6 shadow-sm z-10 w-full">
        {chat.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {quickQuestions.map((q) => (
              <button
                key={q.key}
                disabled={loading}
                onClick={() => askAI(q.prompt, { quickActionKey: q.key })}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 border border-blue-100"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 relative">
          <input
            className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-md px-5 py-4 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
            placeholder="Klicka för att skriva fråga..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                askAI();
              }
            }}
            disabled={loading}
            autoComplete="off"
          />
          <button
            onClick={() => askAI()}
            disabled={loading || !question.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-6 font-bold shadow-md shadow-sm transition-all disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center min-w-[100px]"
          >
            Skicka
          </button>
        </div>
      </div>
    </div>
  );
}
