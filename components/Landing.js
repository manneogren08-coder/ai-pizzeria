import React from 'react';

export default function Landing({
  loginMode,
  setLoginMode,
  companyIdentifier,
  setCompanyIdentifier,
  password,
  setPassword,
  employeeEmail,
  setEmployeeEmail,
  employeeName,
  setEmployeeName,
  employeeCode,
  setEmployeeCode,
  error,
  setError,
  loading,
  login,
  requestEmployeeCode,
  loginWithEmployeeCode,
  landingFaqs
}) {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center">
      {/* Premium background effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="z-10 w-full max-w-6xl mx-auto px-6 py-12 lg:py-24 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Side: Hero Text & Value Props */}
        <section className="flex flex-col gap-8">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100/80 text-blue-800 text-sm font-bold tracking-wider mb-6 border border-blue-200 shadow-sm backdrop-blur-sm">
              STAFFGUIDE
            </span>
            <h1 className="text-4xl lg:text-5xl/tight font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
              Ge personalen rätt svar <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">direkt under service</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl">
              Samla rutiner, recept och allergener i en enkel AI-guide. Mindre frågor i köket, snabbare onboarding och tryggare allergensvar.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 mt-2">
            <span className="px-5 py-2.5 rounded-full bg-white border border-blue-100 text-blue-700 text-sm font-semibold shadow-sm hover:shadow-md transition-shadow">🍽 Meny + recept i realtid</span>
            <span className="px-5 py-2.5 rounded-full bg-white border border-blue-100 text-blue-700 text-sm font-semibold shadow-sm hover:shadow-md transition-shadow">🛡 Säkrare svar om allergener</span>
            <span className="px-5 py-2.5 rounded-full bg-white border border-blue-100 text-blue-700 text-sm font-semibold shadow-sm hover:shadow-md transition-shadow">📱 Byggt för iPad och mobil</span>
          </div>

          <div className="mt-6 p-6 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <p className="text-sm font-bold tracking-widest uppercase text-blue-600 mb-4">Dagens prep-status</p>
            <ul className="space-y-3 text-slate-700 text-sm md:text-base">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center">✓</div>
                Degjäsning kontrollerad 09:00
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center">✓</div>
                Allergenlista verifierad inför lunch
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse">↻</div>
                Specialsås uppdaterad i receptbanken
              </li>
            </ul>
          </div>
        </section>

        {/* Right Side: Login Card */}
        <section className="w-full max-w-md mx-auto relative group perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 rounded-3xl blur-xl transform group-hover:scale-105 transition-transform duration-500"></div>
          
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl relative z-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Intern personalguide</h2>
            <p className="text-slate-500 mb-8">Välj inloggningssätt för att fortsätta</p>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100/80 rounded-xl mb-8 border border-slate-200/60">
              <button
                className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${loginMode === "company" ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
                onClick={() => {
                  setLoginMode("company");
                  setError("");
                }}
                disabled={loading}
              >
                Företag
              </button>
              <button
                className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${loginMode === "employee" ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
                onClick={() => {
                  setLoginMode("employee");
                  setError("");
                }}
                disabled={loading}
              >
                Anställd
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              {loginMode === "company" && (
                <input
                  type="text"
                  placeholder="Företags-id eller företagsnamn"
                  value={companyIdentifier}
                  onChange={e => setCompanyIdentifier(e.target.value)}
                  disabled={loading}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                />
              )}

              <input
                type="password"
                placeholder="Restaurangens lösenord"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key !== "Enter" || loading) return;
                  if (loginMode === "company") login();
                  else loginWithEmployeeCode();
                }}
                disabled={loading}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              />

              {loginMode === "employee" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <input
                    type="text"
                    placeholder="Din e-post"
                    value={employeeEmail}
                    onChange={e => setEmployeeEmail(e.target.value)}
                    disabled={loading}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Namn (valfritt vid första kodbegäran)"
                    value={employeeName}
                    onChange={e => setEmployeeName(e.target.value)}
                    disabled={loading}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Engångskod eller demo"
                    value={employeeCode}
                    onChange={e => setEmployeeCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !loading && loginWithEmployeeCode()}
                    disabled={loading}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-mono tracking-wider"
                  />
                  <p className="text-xs text-slate-500 px-1">
                    Obs: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">demo</code> fungerar endast lokalt i development.
                  </p>
                  
                  <button
                    onClick={requestEmployeeCode}
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    {loading ? "Skickar kod..." : "Skicka engångskod till e-post"}
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm animate-in fade-in">
                  {error}
                </div>
              )}

              <button
                onClick={loginMode === "company" ? login : loginWithEmployeeCode}
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:transform-none"
              >
                {loading ? "Loggar in..." : (loginMode === "company" ? "Logga in" : "Logga in med kod")}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* FAQs */}
      <section className="w-full max-w-4xl mx-auto px-6 pb-24 z-10">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 lg:p-10 border border-white/50 shadow-xl shadow-slate-200/50">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Vanliga frågor</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {landingFaqs.map((item) => (
              <details key={item.question} className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer text-slate-800 font-semibold hover:text-blue-600 transition-colors list-none">
                  {item.question}
                  <span className="transition group-open:rotate-180 text-blue-500">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                  </span>
                </summary>
                <p className="text-slate-600 mt-4 leading-relaxed animate-in fade-in slide-in-from-top-2">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
