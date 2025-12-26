
import React, { useState, useCallback } from 'react';
import { AssetType, GeneratedAsset } from './types';
import { GeneratorForm } from './components/GeneratorForm';
import { AssetCard } from './components/AssetCard';
import { generateSingleAsset, generatePromptVariations } from './services/geminiService';

const App: React.FC = () => {
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewAsset, setPreviewAsset] = useState<GeneratedAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (basePrompt: string, type: AssetType) => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    
    try {
      // Step 1: Generate variations
      const variations = await generatePromptVariations(basePrompt, type, 20);
      
      const newAssets: GeneratedAsset[] = [];
      // Reducing batch size to 1 to be as conservative as possible with Rate Limits
      const batchSize = 1; 
      
      for (let i = 0; i < variations.length; i += batchSize) {
        const currentBatch = variations.slice(i, i + batchSize);
        
        const batchPromises = currentBatch.map(async (prompt): Promise<GeneratedAsset | null> => {
          try {
            const url = await generateSingleAsset(prompt, type);
            return {
              id: Math.random().toString(36).substr(2, 9),
              url,
              type,
              prompt,
              timestamp: Date.now(),
              isVideo: type === AssetType.GIF
            };
          } catch (err) {
            console.error(`Failed variation: ${prompt}`, err);
            // If we hit a hard 429 even after retries in the service, we might want to stop the whole loop
            if (err?.message?.includes('429')) {
              throw err; 
            }
            return null;
          }
        });

        try {
          const results = await Promise.all(batchPromises);
          const successful = results.filter((r): r is GeneratedAsset => r !== null);
          
          newAssets.push(...successful);
          setAssets((prev) => [...successful, ...prev]);
          setProgress(Math.min(100, Math.round(((i + currentBatch.length) / variations.length) * 100)));
        } catch (batchErr: any) {
          if (batchErr?.message?.includes('429')) {
            throw batchErr; // Stop the loop and show the error to user
          }
        }
        
        // Add a significant delay between requests to respect rate limits (4 seconds)
        if (i + batchSize < variations.length) {
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }

      if (newAssets.length === 0) {
        throw new Error("Could not forge any elements. Service might be busy. Try again in a few moments.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('Requested entity was not found')) {
        setError('API Authentication Error. Re-selecting your API key might help.');
        try {
          await (window as any).aistudio.openSelectKey();
        } catch {}
      } else if (err.message?.includes('429') || err?.status === 'RESOURCE_EXHAUSTED') {
        setError('Rate limit exceeded. The API is temporarily blocking requests. Please wait 1-2 minutes before trying again.');
      } else {
        setError(err.message || 'Failed to forge elements. Please try again.');
      }
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const convertAndDownload = async (asset: GeneratedAsset, format: 'png' | 'jpeg' | 'webp') => {
    if (asset.isVideo) {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = `forge-${asset.id}.mp4`;
      link.click();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = asset.url;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL(`image/${format}`, 0.9);
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `forge-${asset.type.toLowerCase().replace(/\s+/g, '-')}-${asset.id}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  };

  return (
    <div className="min-h-screen canvas-grid py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-4 uppercase tracking-widest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Massive 20x Element Generator
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Canvas</span>
            <span className="text-slate-900">Elements</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Generator</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            From text to image! generate ready-to-use visuals for presentations, posters, and projects with just a few clicks.
          </p>
        </header>

        <GeneratorForm onGenerate={handleGenerate} isGenerating={isGenerating} />

        {isGenerating && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
              <span>Creating your collection... (Batch mode)</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs text-slate-400 mt-2 font-medium">Generating 20 unique elements with rate-limit protection. Please stay on this page.</p>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-semibold flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onPreview={setPreviewAsset} />
          ))}
          
          {assets.length === 0 && !isGenerating && (
            <div className="col-span-full text-center py-24 bg-white/40 border-2 border-dashed border-slate-200 rounded-[2rem]">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Ready to start?</h3>
              <p className="text-slate-500 font-medium">Describe your dream element and we'll craft 20 variations.</p>
            </div>
          )}
        </div>
      </div>

      {previewAsset && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setPreviewAsset(null)}
        >
          <div 
            className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:w-3/5 aspect-square bg-slate-100 flex items-center justify-center relative p-4">
              {previewAsset.isVideo ? (
                <video src={previewAsset.url} className="w-full h-full object-contain rounded-2xl" autoPlay loop muted playsInline />
              ) : (
                <img src={previewAsset.url} alt={previewAsset.prompt} className="w-full h-full object-contain drop-shadow-2xl" />
              )}
              <button 
                onClick={() => setPreviewAsset(null)}
                className="absolute top-4 left-4 bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full transition-all md:hidden"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="md:w-2/5 p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                    {previewAsset.type}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-4 leading-tight">
                  {previewAsset.prompt}
                </h2>
                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Download As</p>
                  
                  {previewAsset.isVideo ? (
                    <button 
                      onClick={() => convertAndDownload(previewAsset, 'png')}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Download MP4
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => convertAndDownload(previewAsset, 'png')}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200"
                      >
                        <span className="flex-1 text-left px-4">Standard PNG</span>
                        <span className="bg-white/20 px-2 py-1 rounded text-[10px]">Best Quality</span>
                      </button>
                      <button 
                        onClick={() => convertAndDownload(previewAsset, 'jpeg')}
                        className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95"
                      >
                        <span className="flex-1 text-left px-4">Compressed JPG</span>
                        <span className="bg-slate-200 px-2 py-1 rounded text-[10px]">Smallest</span>
                      </button>
                      <button 
                        onClick={() => convertAndDownload(previewAsset, 'webp')}
                        className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95"
                      >
                        <span className="flex-1 text-left px-4">Modern WebP</span>
                        <span className="bg-slate-200 px-2 py-1 rounded text-[10px]">Next-Gen</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => setPreviewAsset(null)}
                className="mt-8 text-slate-400 font-bold hover:text-slate-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
