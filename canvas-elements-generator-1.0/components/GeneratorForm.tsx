
import React, { useState, useEffect } from 'react';
import { AssetType } from '../types';

interface GeneratorFormProps {
  onGenerate: (prompt: string, type: AssetType) => void;
  isGenerating: boolean;
}

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onGenerate, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType>(AssetType.STICKER);
  
  // ✅ Added state for click limit
  const [clicks, setClicks] = useState(0);

  // ✅ Reset clicks daily
  useEffect(() => {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem("last_date");

    if (lastDate !== today) {
      localStorage.setItem("daily_clicks", "0");
      localStorage.setItem("last_date", today);
      setClicks(0);
    } else {
      setClicks(parseInt(localStorage.getItem("daily_clicks") || "0"));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    // ✅ Check 3-click/day limit
    if (clicks >= 3) {
      alert("You have reached your 3 free generations for today. Come back tomorrow!");
      return;
    }

    // Call existing generate function
    onGenerate(prompt, selectedType);

    // Update click counter
    const newClicks = clicks + 1;
    localStorage.setItem("daily_clicks", newClicks.toString());
    setClicks(newClicks);
  };

  const types = Object.values(AssetType);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-slate-200 p-6 md:p-8 mb-12 sticky top-4 z-40 max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-6">
          <div className="relative group">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Try "Cats laughing in black and white"'
              className="w-full pl-6 pr-44 py-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400 font-bold text-xl outline-none"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className={`absolute right-2 top-2 bottom-2 px-8 rounded-2xl font-black text-white transition-all flex items-center gap-3 shadow-lg ${
                isGenerating || !prompt.trim() 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-br from-indigo-600 to-violet-700 hover:shadow-indigo-200 active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Forging...
                </>
              ) : (
                <>
                  Create
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                  selectedType === type
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* ✅ Click counter display */}
          <p className="text-sm text-slate-500 mt-2">Clicks used today: {clicks}/3</p>
        </div>
      </form>
    </div>
  );
};
