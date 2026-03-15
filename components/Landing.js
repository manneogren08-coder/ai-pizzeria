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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans overflow-hidden">
      
      {/* Left Area - Dynamic Premium Visuals */}
      <div className="lg:w-5/12 xl:w-1/2 relative flex flex-col justify-between p-8 lg:p-16 overflow-hidden bg-slate-900 text-white min-h-[50vh] lg:min-h-screen shadow-2xl z-10">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[140%] h-[60%] bg-gradient-to-br from-blue-600/40 to-indigo-600/10 blur-3xl transform -rotate-12 animate-pulse [animation-duration:8s]"></div>
          <div className="absolute -bottom-[20%] -right-[10%] w-[120%] h-[70%] bg-gradient-to-tl from-cyan-500/30 to-blue-800/20 blur-3xl transform rotate-12 animate-pulse [animation-duration:12s] [animation-delay:2s]"></div>
          
          {/* Grid Pattern overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgMTBoNDBNMTAgMHY0ME0wIDIwaDQwTTIwIDB2NDBNMCAzMGg0ME0zMCAwdjQwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-50 mix-blend-overlay"></div>
        </div>

        {/* Branding & Mission */}
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-xl text-blue-600 flex items-center justify-center font-black text-xl shadow-lg shadow-white/20">
              S
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white drop-shadow-sm">Staffguide</span>
          </div>

          <div className="mt-auto mb-16 lg:mb-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 font-bold text-sm tracking-widest uppercase mb-6 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              AI-driven Restaurangscen
            </div>
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tighter leading-[1.1] mb-8 drop-shadow-lg">
              Perfekt service.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Varje gång.</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-300 leading-relaxed max-w-xl font-medium">
              Eliminera osäkerhet i matsalen och köket. Ge din personal blixtsnabb tillgång till exakta recept, allergener och rutiner direkt i mobilen eller iPaden under pågående service.
            </p>
          </div>

          {/* Feature floating cards (Dekoration) */}
          <div className="hidden lg:flex flex-col gap-4 relative mt-auto">
            <div className="absolute -right-12 bottom-20 w-80 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl transform rotate-[-4deg] animate-in slide-in-from-bottom-10 fade-in duration-700 [animation-delay:300ms]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center">✓</div>
                <div className="text-sm font-bold text-white">Allergener säkrade</div>
              </div>
              <div className="h-2 w-3/4 bg-white/20 rounded-full mt-2"></div>
              <div className="h-2 w-1/2 bg-white/10 rounded-full mt-2"></div>
            </div>
            
            <div className="absolute right-4 bottom-0 w-72 bg-gradient-to-br from-blue-600/40 to-indigo-600/40 backdrop-blur-xl border border-blue-400/30 p-4 rounded-2xl shadow-2xl transform rotate-[2deg] animate-in slide-in-from-bottom-10 fade-in duration-700 [animation-delay:600ms]">
              <div className="flex justify-between items-center">
                <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">Dagens Prep</div>
                <div className="text-xs font-bold bg-blue-500/30 text-white px-2 py-1 rounded">100%</div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 w-full bg-blue-900/50 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-blue-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Area - Login UI */}
      <div className="lg:w-7/12 xl:w-1/2 flex items-center justify-center p-6 lg:p-16 relative bg-slate-50">
        
        {/* Subtle decorative elements for right side */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-200/50 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-lg z-10 animate-in fade-in slide-in-from-right-8 duration-700">
          
          <div className="bg-white p-8 lg:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 relative">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Välkommen in</h2>
            <p className="text-slate-500 text-sm font-medium mb-8">Välj hur du vill ansluta till din arbetsplats plattform.</p>

            {/* Login Tabs */}
            <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-8 border border-slate-200/50 relative">
              <button
                className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 z-10 ${loginMode === "company" ? "text-blue-700" : "text-slate-500 hover:text-slate-800"}`}
                onClick={() => {
                  setLoginMode("company");
                  setError("");
                }}
                disabled={loading}
              >
                Företag / Admin
              </button>
              <button
                className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 z-10 ${loginMode === "employee" ? "text-blue-700" : "text-slate-500 hover:text-slate-800"}`}
                onClick={() => {
                  setLoginMode("employee");
                  setError("");
                }}
                disabled={loading}
              >
                Personal
              </button>
              
              {/* Sliding Indicator */}
              <div 
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-white rounded-xl shadow-md border border-slate-200/30 transition-transform duration-300 ease-out z-0 left-1.5 ${loginMode === "employee" ? "translate-x-full" : "translate-x-0"}`}
              ></div>
            </div>

            {/* Login Forms */}
            <div className="space-y-5">
              {loginMode === "company" && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 ml-1">Företags-ID</label>
                  <input
                    type="text"
                    placeholder="t.ex. 1234 eller namnet"
                    value={companyIdentifier}
                    onChange={e => setCompanyIdentifier(e.target.value)}
                    disabled={loading}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-base font-semibold text-slate-800 shadow-inner"
                  />
                </div>
              )}

              <div className="animate-in fade-in zoom-in-95 duration-200">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 ml-1">Lösenord</label>
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
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-base font-semibold text-slate-800 shadow-inner"
                />
              </div>

              {loginMode === "employee" && (
                <div className="space-y-5 pt-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-4 my-2">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">För ny enhet</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 ml-1">Din E-post</label>
                    <input
                      type="text"
                      placeholder="namn@restaurang.se"
                      value={employeeEmail}
                      onChange={e => setEmployeeEmail(e.target.value)}
                      disabled={loading}
                      className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-base font-semibold text-slate-800 shadow-inner"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 ml-1">Namn <span className="text-slate-400 font-normal lowercase">(Valfritt)</span></label>
                      <input
                        type="text"
                        placeholder="Förnamn"
                        value={employeeName}
                        onChange={e => setEmployeeName(e.target.value)}
                        disabled={loading}
                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-base font-semibold text-slate-800 shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 ml-1">Engångskod</label>
                      <input
                        type="text"
                        placeholder="XXXXXX"
                        value={employeeCode}
                        onChange={e => setEmployeeCode(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !loading && loginWithEmployeeCode()}
                        disabled={loading}
                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-base font-bold text-center tracking-widest text-slate-800 font-mono shadow-inner"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={requestEmployeeCode}
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 rounded-2xl font-bold transition-all hover:border-slate-300 hover:shadow-sm disabled:opacity-50 text-sm flex items-center justify-center gap-2 group"
                  >
                    <span>Skicka engångskod till e-post</span>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </button>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-3 animate-in shake">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">!</div>
                  {error}
                </div>
              )}

              <button
                onClick={loginMode === "company" ? login : loginWithEmployeeCode}
                disabled={loading}
                className="w-full py-4 mt-8 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-extrabold text-lg transition-all shadow-xl shadow-slate-900/20 hover:shadow-blue-600/30 disabled:opacity-70 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? "Vänta..." : (loginMode === "company" ? "Fortsätt som Admin" : "Logga in som Personal")}
              </button>
            </div>
          </div>

          {/* Mini FAQ below login */}
          <div className="mt-8 px-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Vanliga frågor</h3>
            <div className="grid grid-cols-1 gap-4">
              {landingFaqs.slice(0, 2).map((item) => (
                <div key={item.question} className="bg-white/50 border border-slate-200/60 p-4 rounded-xl backdrop-blur-sm">
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{item.question}</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
