
import React from 'react';
import { GeneratedAsset } from '../types';

interface AssetCardProps {
  asset: GeneratedAsset;
  onPreview: (asset: GeneratedAsset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onPreview }) => {
  return (
    <div 
      onClick={() => onPreview(asset)}
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-zoom-in"
    >
      <div className="aspect-square w-full bg-slate-50 flex items-center justify-center overflow-hidden">
        {asset.isVideo ? (
          <video 
            src={asset.url} 
            className="w-full h-full object-cover" 
            autoPlay 
            loop 
            muted 
            playsInline
          />
        ) : (
          <img 
            src={asset.url} 
            alt={asset.prompt} 
            loading="lazy"
            className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-700 ease-out"
          />
        )}
        
        {/* Quick action overlay */}
        <div className="absolute inset-0 bg-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform font-bold text-indigo-600 text-xs">
            Open Details
          </div>
        </div>
      </div>
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
            {asset.type}
          </span>
          <div className="flex gap-1">
             <div className="w-1 h-1 rounded-full bg-slate-300"></div>
             <div className="w-1 h-1 rounded-full bg-slate-300"></div>
             <div className="w-1 h-1 rounded-full bg-slate-300"></div>
          </div>
        </div>
        <p className="text-xs text-slate-600 font-bold line-clamp-2 leading-relaxed">
          {asset.prompt}
        </p>
      </div>
    </div>
  );
};
