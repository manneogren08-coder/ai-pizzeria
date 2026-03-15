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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 px-6 lg:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded text-white flex items-center justify-center font-bold text-lg">
            S
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">Staffguide</span>
        </div>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-24 grid lg:grid-cols-2 gap-16 items-start">
        
        {/* Left Side: Hero Text */}
        <section className="flex flex-col gap-8 lg:pr-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
              Ge personalen rätt svar direkt under service.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
              Samla rutiner, recept och allergener i en enkel plattform. Mindre frågor i köket, snabbare onboarding och tryggare svar för gästen.
            </p>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">✓</div>
              <p className="text-slate-700 font-medium">Hitta meny och recept på sekunder</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">✓</div>
              <p className="text-slate-700 font-medium">Säkrare svar kring allergener</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">✓</div>
              <p className="text-slate-700 font-medium">Optimerat för padda och mobil i driften</p>
            </div>
          </div>
        </section>

        {/* Right Side: Login Card */}
        <section className="w-full max-w-md lg:ml-auto">
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Logga in</h2>
            <p className="text-slate-500 text-sm mb-6">Välj inloggningssätt för att komma åt plattformen.</p>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-lg mb-6 border border-slate-200">
              <button
                className={`flex-1 py-1.5 px-3 text-sm font-semibold rounded-md transition-colors ${loginMode === "company" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                onClick={() => {
                  setLoginMode("company");
                  setError("");
                }}
                disabled={loading}
              >
                Restaurang (Admin)
              </button>
              <button
                className={`flex-1 py-1.5 px-3 text-sm font-semibold rounded-md transition-colors ${loginMode === "employee" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                onClick={() => {
                  setLoginMode("employee");
                  setError("");
                }}
                disabled={loading}
              >
                Personal
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              {loginMode === "company" && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Företags-ID</label>
                  <input
                    type="text"
                    placeholder="t.ex. 1234 eller Pizzabutiken"
                    value={companyIdentifier}
                    onChange={e => setCompanyIdentifier(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Lösenord</label>
                <input
                  type="password"
                  placeholder="Skriv lösenord..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== "Enter" || loading) return;
                    if (loginMode === "company") login();
                    else loginWithEmployeeCode();
                  }}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                />
              </div>

              {loginMode === "employee" && (
                <div className="space-y-4 pt-2">
                  <div className="h-px bg-slate-200 w-full mb-4"></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">E-post</label>
                    <input
                      type="text"
                      placeholder="din.epost@exempel.se"
                      value={employeeEmail}
                      onChange={e => setEmployeeEmail(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Namn (Krävs första gången)</label>
                    <input
                      type="text"
                      placeholder="t.ex. Anna"
                      value={employeeName}
                      onChange={e => setEmployeeName(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Engångskod</label>
                    <input
                      type="text"
                      placeholder="XXXXXX (eller 'demo')"
                      value={employeeCode}
                      onChange={e => setEmployeeCode(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !loading && loginWithEmployeeCode()}
                      disabled={loading}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm font-medium font-mono"
                    />
                  </div>
                  
                  <button
                    onClick={requestEmployeeCode}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? "Skickar kod..." : "Be om engångskod via e-post"}
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={loginMode === "company" ? login : loginWithEmployeeCode}
                disabled={loading}
                className="w-full py-3 px-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors disabled:opacity-70 text-sm"
              >
                {loading ? "Vänligen vänta..." : (loginMode === "company" ? "Logga in som admin" : "Logga in som personal")}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Footer / FAQs */}
      <section className="w-full bg-white border-t border-slate-200 py-12 lg:py-16 mt-auto">
        <div className="max-w-4xl mx-auto px-6">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Vanliga frågor</h3>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
            {landingFaqs.map((item) => (
              <div key={item.question}>
                <h4 className="font-semibold text-slate-800 text-sm mb-1">{item.question}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
