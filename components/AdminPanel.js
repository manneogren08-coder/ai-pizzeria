import React from 'react';

export default function AdminPanel({
  token,
  company,
  companyDetails,
  setCompanyDetails,
  savedCompanyDetails,
  setSavedCompanyDetails,
  lastSavedAt,
  adminTab,
  handleAdminTabChange,
  isTabDirty,
  adminLoading,
  updateCompanyDetails,
  resetCurrentTab,
  fetchCompanyDetails,
  recipeRows,
  setRecipeRows,
  selectedRecipeRow,
  setSelectedRecipeId,
  recipeSearch,
  setRecipeSearch,
  visibleRecipeRows,
  addRecipeRow,
  duplicateRecipeRow,
  removeRecipeRow,
  updateRecipeRow,
  prepTemplateRows,
  updatePrepTemplateRow,
  addPrepTemplateRow,
  removePrepTemplateRow,
  prepTemplateLoading,
  prepTemplateDirty,
  savePrepTemplate,
  toggleCompanyStatus,
  newPassword,
  setNewPassword,
  adminMessage,
  updatePassword
}) {
  const tabs = [
    { id: "info", label: "Företagsinfo", dirty: isTabDirty("info") },
    { id: "menu", label: "Meny & Allergener", dirty: isTabDirty("menu") },
    { id: "recipes", label: "Receptbyggare", dirty: isTabDirty("recipes") },
    { id: "routines", label: "Rutiner & Regler", dirty: isTabDirty("routines") },
    { id: "prep", label: "Prep-mall", dirty: prepTemplateDirty },
    { id: "security", label: "Säkerhet", dirty: false },
    { id: "stats", label: "Statistik", dirty: false }
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 w-full animate-in fade-in duration-300">
      {/* Admin Tabs Bar */}
      <div className="flex gap-2 p-4 md:px-8 bg-white/80 backdrop-blur-xl border-b border-white shadow-sm overflow-x-auto shadow-sm z-10 sticky top-0 hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleAdminTabChange(tab.id)}
            className={`px-5 py-2.5 rounded-2xl whitespace-nowrap text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              adminTab === tab.id
                ? "bg-blue-600 text-white bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/50 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            {tab.label}
            {tab.dirty && (
              <span className={`w-2 h-2 rounded-full ${adminTab === tab.id ? "bg-white animate-pulse" : "bg-blue-500"}`}></span>
            )}
          </button>
        ))}
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-6xl mx-auto w-full pb-20">
          
          {lastSavedAt && (
            <div className="text-right text-xs font-semibold text-slate-400 mb-4 px-2 tracking-wide uppercase">
              Senast uppdaterad: {lastSavedAt.toLocaleString("sv-SE")}
            </div>
          )}

          {/* TAB: INFO */}
          {adminTab === "info" && (
            <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-200/50 rounded-3xl p-8 md:p-12 animate-in zoom-in-[0.98] duration-500">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Företagsinformation</h3>
              <p className="text-slate-500 mb-8">Här kan du ställa in kontaktuppgifter och schema-regler för din AI.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Support E-post</label>
                  <input
                    type="email"
                    placeholder="t.ex. support@restaurang.se"
                    value={companyDetails.support_email || ""}
                    onChange={e => setCompanyDetails({...companyDetails, support_email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Öppettider</label>
                  <textarea
                    placeholder="t.ex. Mån-Fre 10-22"
                    value={companyDetails.opening_hours || ""}
                    onChange={e => setCompanyDetails({...companyDetails, opening_hours: e.target.value})}
                    className="w-full px-4 py-3 min-h-[100px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 resize-y"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Stängningsinformation</label>
                  <textarea
                    placeholder="t.ex. Stängt röda dagar"
                    value={companyDetails.closure_info || ""}
                    onChange={e => setCompanyDetails({...companyDetails, closure_info: e.target.value})}
                    className="w-full px-4 py-3 min-h-[100px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 resize-y"
                  />
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex gap-4 mt-10 pt-6 border-t border-slate-100 sticky bottom-0 bg-white/90 backdrop-blur-md -mx-8 px-8 pb-2">
                <button
                  onClick={resetCurrentTab}
                  disabled={!isTabDirty("info") || adminLoading}
                  className="flex-1 py-3 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors disabled:opacity-50"
                >
                  Återställ
                </button>
                <button
                  onClick={updateCompanyDetails}
                  disabled={!isTabDirty("info") || adminLoading}
                  className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-sm disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  {adminLoading ? "Sparar..." : "Spara ändringar"}
                </button>
              </div>
            </div>
          )}

          {/* TAB: MENU */}
          {adminTab === "menu" && (
            <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-200/50 rounded-3xl p-8 md:p-12 animate-in zoom-in-[0.98] duration-500">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Meny & Allergener</h3>
              <p className="text-slate-500 mb-8">Definiera hela din basmeny samt generella allergenrekommendationer här.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Meny</label>
                  <textarea
                    placeholder="t.ex. Förrätt: Toast Skagen - 145 kr"
                    value={companyDetails.menu || ""}
                    onChange={e => setCompanyDetails({...companyDetails, menu: e.target.value})}
                    className="w-full px-4 py-3 min-h-[180px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 resize-y"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Allergener (övergripande)</label>
                  <textarea
                    placeholder="t.ex. Innehåller gluten, mjölk, nötter"
                    value={companyDetails.allergens || ""}
                    onChange={e => setCompanyDetails({...companyDetails, allergens: e.target.value})}
                    className="w-full px-4 py-3 min-h-[120px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 resize-y"
                  />
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-4">
                  <span className="text-xl">💡</span>
                  <div className="flex flex-col gap-2">
                    <p className="text-blue-800 text-sm">Specifika recept hanteras numera mycket bättre i strukturerade vyn under <strong>Receptbyggare</strong>.</p>
                    <button
                      onClick={() => handleAdminTabChange("recipes")}
                      className="self-start text-sm font-bold bg-white px-4 py-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      Gå till Receptbyggaren →
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-10 pt-6 border-t border-slate-100 sticky bottom-0 bg-white/90 backdrop-blur-md -mx-8 px-8 pb-2">
                <button
                  onClick={resetCurrentTab}
                  disabled={!isTabDirty("menu") || adminLoading}
                  className="flex-1 py-3 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors disabled:opacity-50"
                >
                  Återställ
                </button>
                <button
                  onClick={updateCompanyDetails}
                  disabled={!isTabDirty("menu") || adminLoading}
                  className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-sm disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  {adminLoading ? "Sparar..." : "Spara ändringar"}
                </button>
              </div>
            </div>
          )}

          {/* TAB: RECIPES */}
          {adminTab === "recipes" && (
            <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-200/50 rounded-3xl p-8 md:p-12 animate-in zoom-in-[0.98] duration-500">
              <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 mb-2">
                <h3 className="text-2xl font-bold text-slate-800 m-0">Receptbyggare</h3>
                <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full border border-blue-200 self-start sm:self-auto">
                  {recipeRows.length} recept totalt
                </span>
              </div>
              <p className="text-slate-500 mb-8">Markera en rätt i listan för att redigera den eller skapa en ny.</p>

              <div className="grid lg:grid-cols-[280px_1fr] gap-6">
                {/* Sidebar */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col h-[500px]">
                  <input
                    placeholder="Sök rätt..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    className="w-full px-4 py-2.5 mb-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  />
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {visibleRecipeRows.map((row) => {
                      const isActive = selectedRecipeRow.id === row.id;
                      return (
                        <button
                          key={row.id}
                          onClick={() => setSelectedRecipeId(row.id)}
                          className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 border ${
                            isActive 
                              ? "bg-white border-blue-500 shadow-sm ring-1 ring-blue-500" 
                              : "bg-white/50 border-slate-200 hover:bg-white hover:border-blue-300"
                          }`}
                        >
                          <div className={`font-bold ${isActive ? "text-blue-700" : "text-slate-800"}`}>{row.dish_name || "Namnlös rätt"}</div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                            {row.category && <span>{row.category}</span>}
                            {row.is_active === false && <span className="text-red-600 font-bold bg-red-50 px-1.5 rounded">(Inaktiv)</span>}
                          </div>
                        </button>
                      );
                    })}
                    {visibleRecipeRows.length === 0 && (
                      <div className="text-center text-slate-500 p-4 font-medium text-sm">
                        Ingen rätt matchar sökningen.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={addRecipeRow}
                    disabled={adminLoading}
                    className="w-full mt-4 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-colors disabled:opacity-50"
                  >
                    + Ny rätt
                  </button>
                </div>

                {/* Editor */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 lg:p-8">
                  {selectedRecipeRow ? (
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-4 items-end mb-2 border-b border-slate-100 pb-6">
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">Rättnamn</label>
                          <input
                            value={selectedRecipeRow.dish_name || ""}
                            onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "dish_name", e.target.value)}
                            placeholder="t.ex. Margherita"
                            className="w-full text-xl font-bold px-3 py-2 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={duplicateRecipeRow}
                            disabled={adminLoading}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm"
                          >
                            Duplicera
                          </button>
                          <button
                            onClick={() => removeRecipeRow(selectedRecipeRow.id)}
                            disabled={adminLoading}
                            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg transition-colors border border-red-100 disabled:opacity-50 text-sm"
                          >
                            Ta bort
                          </button>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Kategori</label>
                          <input
                            value={selectedRecipeRow.category || ""}
                            onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "category", e.target.value)}
                            placeholder="t.ex. Förrätt, Pizza, Dessert"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                          <div className="relative">
                            <select
                              value={selectedRecipeRow.is_active === false ? "inactive" : "active"}
                              onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "is_active", e.target.value === "active")}
                              className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium cursor-pointer"
                            >
                              <option value="active">Aktiv (synlig i drift)</option>
                              <option value="inactive">Inaktiv (utkast/pausad)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recipe Details array */}
                      <div className="grid sm:grid-cols-2 gap-6 pt-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-2">Ingredienser (basrecept)</label>
                          <textarea
                            value={selectedRecipeRow.ingredients || ""}
                            onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "ingredients", e.target.value)}
                            placeholder="t.ex.\n40 skivor toastbröd\n300 g smör"
                            className="w-full px-4 py-3 min-h-[120px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 resize-y"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Mise en place</label>
                          <textarea
                            value={selectedRecipeRow.mise || ""}
                            onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "mise", e.target.value)}
                            placeholder="t.ex. Ta fram deg 30 min innan"
                            className="w-full px-4 py-3 min-h-[100px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-y"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Tillagning</label>
                          <textarea
                            value={selectedRecipeRow.cooking || ""}
                            onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "cooking", e.target.value)}
                            placeholder="t.ex. Baka i 3-4 min på 320 grader"
                            className="w-full px-4 py-3 min-h-[100px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-y"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Plating</label>
                          <textarea
                            value={selectedRecipeRow.plating || ""}
                            onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "plating", e.target.value)}
                            placeholder="t.ex. Ringla olivolja, toppa med basilika"
                            className="w-full px-4 py-3 min-h-[80px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-y"
                          />
                        </div>
                        <div className="flex flex-col gap-6">
                            <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Allergener (Rätt)</label>
                            <input
                                value={selectedRecipeRow.allergens || ""}
                                onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "allergens", e.target.value)}
                                placeholder="t.ex. Gluten, mjölk"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"
                            />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Yield</label>
                                <input
                                    value={selectedRecipeRow.yield || ""}
                                    onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "yield", e.target.value)}
                                    placeholder="20 port"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"
                                />
                                </div>
                                <div className="flex-1">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tid</label>
                                <input
                                    value={selectedRecipeRow.time || ""}
                                    onChange={(e) => updateRecipeRow(selectedRecipeRow.id, "time", e.target.value)}
                                    placeholder="6 min"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none"
                                />
                                </div>
                            </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 font-medium">Inget recept markerat</div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100 sticky bottom-0 bg-white/90 backdrop-blur-md -mx-8 px-8 pb-2 z-20">
                <button
                  onClick={resetCurrentTab}
                  disabled={!isTabDirty("recipes") || adminLoading}
                  className="flex-1 py-3 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors disabled:opacity-50"
                >
                  Återställ
                </button>
                <button
                  onClick={updateCompanyDetails}
                  disabled={!isTabDirty("recipes") || adminLoading}
                  className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-sm disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  {adminLoading ? "Sparar..." : "Spara ändringar"}
                </button>
              </div>
            </div>
          )}

          {/* TAB: ROUTINES */}
          {adminTab === "routines" && (
            <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-200/50 rounded-3xl p-8 md:p-12 animate-in zoom-in-[0.98] duration-500">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Rutiner & Regler</h3>
              <p className="text-slate-500 mb-8">Korta punktlistor för öppning, stängning och personalsituationer.</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Generella arbetsrutiner</label>
                  <textarea
                    placeholder="t.ex. Starta kassan, fyll på stationer"
                    value={companyDetails.routines || ""}
                    onChange={e => setCompanyDetails({...companyDetails, routines: e.target.value})}
                    className="w-full px-4 py-3 min-h-[140px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Beteenderegler</label>
                  <textarea
                    placeholder="t.ex. Mobil endast på rast"
                    value={companyDetails.behavior_guidelines || ""}
                    onChange={e => setCompanyDetails({...companyDetails, behavior_guidelines: e.target.value})}
                    className="w-full px-4 py-3 min-h-[140px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Öppningsrutiner</label>
                  <textarea
                    placeholder="t.ex. Ugn 250°, deg ut 30 min innan"
                    value={companyDetails.opening_routine || ""}
                    onChange={e => setCompanyDetails({...companyDetails, opening_routine: e.target.value})}
                    className="w-full px-4 py-3 min-h-[140px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Stängningsrutiner</label>
                  <textarea
                    placeholder="t.ex. Stäng kassan, rengör alla ytor"
                    value={companyDetails.closing_routine || ""}
                    onChange={e => setCompanyDetails({...companyDetails, closing_routine: e.target.value})}
                    className="w-full px-4 py-3 min-h-[140px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Personalroller</label>
                  <textarea
                    placeholder="t.ex. Kassa, kök, servering"
                    value={companyDetails.staff_roles || ""}
                    onChange={e => setCompanyDetails({...companyDetails, staff_roles: e.target.value})}
                    className="w-full px-4 py-3 min-h-[140px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Personalsituationer</label>
                  <textarea
                    placeholder="t.ex. Sen kollega, stress"
                    value={companyDetails.staff_situations || ""}
                    onChange={e => setCompanyDetails({...companyDetails, staff_situations: e.target.value})}
                    className="w-full px-4 py-3 min-h-[140px] bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-y"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-10 pt-6 border-t border-slate-100 sticky bottom-0 bg-white/90 backdrop-blur-md -mx-8 px-8 pb-2">
                <button
                  onClick={resetCurrentTab}
                  disabled={!isTabDirty("routines") || adminLoading}
                  className="flex-1 py-3 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors disabled:opacity-50"
                >
                  Återställ
                </button>
                <button
                  onClick={updateCompanyDetails}
                  disabled={!isTabDirty("routines") || adminLoading}
                  className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-sm disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  {adminLoading ? "Sparar..." : "Spara ändringar"}
                </button>
              </div>
            </div>
          )}

          {/* TAB: PREP TEMPLATE */}
          {adminTab === "prep" && (
            <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-200/50 rounded-3xl p-8 md:p-12 animate-in zoom-in-[0.98] duration-500">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Prep-mall (daglig)</h3>
              <p className="text-slate-500 mb-8">Fyll i en rad per prep-uppgift. Dessa skapas och läggs ut automatiskt varje dag.</p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-x-auto shadow-inner">
                <table className="w-full min-w-[620px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Uppgift</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Prioritet</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Station</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Klar tid</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {prepTemplateRows.map((row, index) => (
                      <tr key={`prep-row-${index}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            value={row.title}
                            onChange={(e) => updatePrepTemplateRow(index, "title", e.target.value)}
                            placeholder="t.ex. Hacka lök"
                            disabled={prepTemplateLoading}
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <select
                              value={row.priority}
                              onChange={(e) => updatePrepTemplateRow(index, "priority", e.target.value)}
                              disabled={prepTemplateLoading}
                              className={`appearance-none w-full px-3 py-2 border rounded-lg outline-none text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-blue-500/10 ${
                                row.priority === "high" ? "bg-red-50 text-red-700 border-red-200" :
                                row.priority === "low" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              <option value="high">Hög</option>
                              <option value="medium">Medel</option>
                              <option value="low">Låg</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 opacity-60">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={row.station}
                            onChange={(e) => updatePrepTemplateRow(index, "station", e.target.value)}
                            placeholder="t.ex. Kök 1"
                            disabled={prepTemplateLoading}
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm uppercase tracking-wide"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={row.due_time}
                            onChange={(e) => updatePrepTemplateRow(index, "due_time", e.target.value)}
                            disabled={prepTemplateLoading}
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 hover:border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-mono tracking-wide"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removePrepTemplateRow(index)}
                            disabled={prepTemplateLoading}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                            title="Ta bort"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addPrepTemplateRow}
                disabled={prepTemplateLoading}
                className="w-full mt-4 py-3 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold border border-slate-200 border-dashed rounded-2xl transition-colors disabled:opacity-50"
              >
                + Lägg till uppgift
              </button>

              <div className="flex gap-4 mt-10 pt-6 border-t border-slate-100 sticky bottom-0 bg-white/90 backdrop-blur-md -mx-8 px-8 pb-2">
                <button
                  onClick={savePrepTemplate}
                  disabled={!prepTemplateDirty || prepTemplateLoading}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-sm disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  {prepTemplateLoading ? "Sparar..." : "Spara mall & Publicera till idag"}
                </button>
              </div>
            </div>
          )}

          {/* TAB: SECURITY */}
          {adminTab === "security" && (
            <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-200/50 rounded-3xl p-8 md:p-12 animate-in zoom-in-[0.98] duration-500">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Säkerhet</h3>
              <p className="text-slate-500 mb-8">Hantera konto-status och lösenord för företaget.</p>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Account Status Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${company.active ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {company.active 
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        }
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Kontostatus</h4>
                      <p className={`text-sm font-semibold ${company.active ? "text-emerald-600" : "text-red-500"}`}>
                        {company.active ? "Aktivt" : "Inaktivt"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mb-6">Om kontot avaktiveras kan varken ledning eller personal logga in. Databasen sparar dock all er konfiguration.</p>
                  
                  <button
                    onClick={toggleCompanyStatus}
                    disabled={adminLoading}
                    className={`w-full py-3 px-4 rounded-2xl font-bold transition-colors disabled:opacity-50 ${
                      company.active 
                        ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200" 
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {company.active ? "Deaktivera företag" : "Aktivera företag"}
                  </button>
                </div>

                {/* Password Update Card */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10"></div>
                  <h4 className="font-bold text-slate-800 text-lg mb-2">Byt lösenord</h4>
                  <p className="text-sm text-slate-500 mb-6">Kom ihåg att meddela samtliga ledare det nya lösenordet.</p>
                  
                  <div className="space-y-4">
                    <input
                      type="password"
                      placeholder="Ange nytt lösenord"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      disabled={adminLoading}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    />

                    {adminMessage && (
                      <div className={`p-3 text-sm font-medium rounded-2xl animate-in fade-in ${adminMessage.includes("✅") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                        {adminMessage}
                      </div>
                    )}

                    <button
                      onClick={updatePassword}
                      disabled={adminLoading || !newPassword}
                      className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-sm disabled:opacity-50"
                    >
                      {adminLoading ? "Uppdaterar..." : "Uppdatera lösenord"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: STATS */}
          {adminTab === "stats" && (
            <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-200/50 rounded-3xl p-8 md:p-12 animate-in zoom-in-[0.98] duration-500">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">Statistik</h3>
                  <p className="text-slate-500">Nyckeltal för din Staffguide.</p>
                </div>
                <button
                  onClick={fetchCompanyDetails}
                  disabled={adminLoading}
                  className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-sm transition-colors border border-blue-100"
                >
                  Uppdatera statistik
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-100 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl md:text-5xl font-extrabold text-blue-600 mb-3">{companyDetails.query_count || 0}</div>
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Frågor ställda</div>
                </div>

                <div className="bg-white border border-slate-100 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl md:text-5xl font-extrabold text-blue-600 mb-3">{company.is_admin ? "Ja" : "Nej"}</div>
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Admin Modus</div>
                </div>

                <div className="bg-white border border-slate-100 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className={`text-3xl md:text-4xl font-extrabold mb-3 ${company.active ? 'text-emerald-500' : 'text-red-500'}`}>
                    {company.active ? "Aktivt" : "Inaktivt"}
                  </div>
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Kontostatus</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
