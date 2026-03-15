import React from 'react';

export default function PrepStation({
  prepDate,
  completedPrepCount,
  totalPrepCount,
  filteredCompletedPrepCount,
  visiblePrepTasks,
  setFilteredPrepTasksDone,
  prepLoading,
  prepBulkUpdating,
  fetchPrepTasks,
  prepProgressPercent,
  prepOnlyOpen,
  setPrepOnlyOpen,
  prepStationFilter,
  setPrepStationFilter,
  prepStations,
  prepError,
  togglePrepTask
}) {

  const getPriorityStyle = (priority) => {
    const p = String(priority || "medium").toLowerCase();
    if (p === "high") return "bg-red-50 text-red-700 border-red-200";
    if (p === "low") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const getPriorityLabel = (priority) => {
    const p = String(priority || "medium").toLowerCase();
    if (p === "high") return "Hög";
    if (p === "low") return "Låg";
    return "Medel";
  };

  return (
    <div className="flex bg-slate-50 relative animate-in fade-in slide-in-from-bottom-4 duration-300 flex-1 overflow-y-auto w-full p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header section with glassmorphism */}
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Dagens Prep</h2>
              <div className="flex items-center gap-3 text-slate-500 font-medium">
                <span className="flex items-center gap-1.5"><svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{prepDate}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span>{completedPrepCount} av {totalPrepCount} avklarade</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setFilteredPrepTasksDone(true)}
                disabled={prepLoading || prepBulkUpdating || visiblePrepTasks.length === 0}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Markera synliga klara
              </button>
              <button 
                onClick={() => fetchPrepTasks(prepDate)}
                disabled={prepLoading || prepBulkUpdating}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {prepLoading ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></span> Laddar...</>
                ) : "Uppdatera"}
              </button>
            </div>
          </div>

          <div className="bg-slate-100/50 rounded-2xl p-4 md:p-5 border border-slate-200/50">
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Progress</span>
              <span className="text-sm font-bold text-blue-600">{prepProgressPercent}%</span>
            </div>
            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${prepProgressPercent}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 px-2">
          <label className="flex items-center gap-3 cursor-pointer group w-full sm:w-auto">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={prepOnlyOpen}
                onChange={(e) => setPrepOnlyOpen(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Dölj avklarade</span>
          </label>

          <div className="relative w-full sm:w-auto">
            <select 
              value={prepStationFilter}
              onChange={(e) => setPrepStationFilter(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all cursor-pointer"
            >
              <option value="all">Fokusera station: Alla</option>
              {prepStations.map((station) => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        {prepError && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium mb-6 animate-in fade-in">
            {prepError}
          </div>
        )}

        {!prepError && !prepLoading && totalPrepCount === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📝</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Inga prep-uppgifter för idag</h3>
            <p className="text-slate-500">Be chefen lägga in en prep-mall i admin-panelen för att komma igång.</p>
          </div>
        )}

        <div className="grid gap-3">
          {visiblePrepTasks.map((task) => (
            <label 
              key={task.id} 
              className={`group relative flex items-start gap-4 p-5 md:p-6 bg-white rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                task.is_done 
                  ? "border-slate-200 opacity-60 bg-slate-50" 
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <div className="relative pt-0.5 z-10">
                <input
                  type="checkbox"
                  checked={!!task.is_done}
                  onChange={(e) => togglePrepTask(task.id, e.target.checked)}
                  disabled={prepLoading}
                  className={`w-6 h-6 rounded-lg transition-all duration-200 cursor-pointer ${
                    task.is_done ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300 bg-white group-hover:border-blue-400 text-transparent"
                  } appearance-none border-2 flex items-center justify-center checked:bg-blue-500 checked:border-blue-500 relative`}
                />
                <svg className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-opacity duration-200 ${task.is_done ? "opacity-100 text-white" : "opacity-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="flex-1 min-w-0 z-10">
                <span className={`block text-base md:text-lg font-bold transition-all duration-200 mb-3 ${
                  task.is_done ? "text-slate-500 line-through decoration-slate-300" : "text-slate-800"
                }`}>
                  {task.title}
                </span>

                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${getPriorityStyle(task.priority)}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                  
                  {task.station && (
                    <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {task.station}
                    </span>
                  )}
                  
                  {task.due_time && (
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${
                      task.is_done ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      Klar {task.due_time}
                    </span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
