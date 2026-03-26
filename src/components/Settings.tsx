import React, { useState } from 'react';
import { 
  Palette, 
  Image as ImageIcon, 
  Layout,
  Save,
  RefreshCcw,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Settings = () => {
  const [primaryColor, setPrimaryColor] = useState('#FF4E00');
  const [themeType, setThemeType] = useState<'modern' | 'classic'>('modern');
  const [isSaving, setIsSaving] = useState(false);

  const colors = [
    { name: 'Orange (Défaut)', value: '#FF4E00' },
    { name: 'Bleu Systech', value: '#3b82f6' },
    { name: 'Vert Production', value: '#10b981' },
    { name: 'Violet Admin', value: '#8b5cf6' },
    { name: 'Noir Industriel', value: '#151619' },
  ];

  const handleSave = () => {
    setIsSaving(true);
    // In a real app, this would update a 'settings' collection in Firestore
    setTimeout(() => {
      setIsSaving(false);
      alert('Paramètres sauvegardés localement pour cette session.');
    }, 1000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#141414]">Paramètres de l'application</h2>
        <p className="text-[#8E9299] text-sm">Personnalisez l'apparence et l'identité de FabrikFlow.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-[#FF4E00]" />
              <h3 className="font-bold text-[#141414]">Identité Visuelle</h3>
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Couleur principale</label>
              <div className="grid grid-cols-5 gap-3">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setPrimaryColor(color.value)}
                    className={cn(
                      "w-10 h-10 rounded-full border-4 transition-all flex items-center justify-center",
                      primaryColor === color.value ? "border-[#E4E3E0] scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {primaryColor === color.value && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Logo de l'entreprise</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#F8F9FA] rounded-2xl border-2 border-dashed border-[#E4E3E0] flex items-center justify-center text-[#8E9299]">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <button className="px-4 py-2 bg-[#F5F5F5] text-[#141414] rounded-xl text-sm font-bold hover:bg-[#E4E3E0] transition-colors">
                  Changer le logo
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-8 border-t border-[#E4E3E0]">
            <div className="flex items-center gap-3">
              <Layout className="w-5 h-5 text-[#FF4E00]" />
              <h3 className="font-bold text-[#141414]">Interface</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setThemeType('modern')}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all text-left space-y-2",
                  themeType === 'modern' ? "border-[#FF4E00] bg-[#FF4E00]/5" : "border-[#E4E3E0] hover:border-[#8E9299]"
                )}
              >
                <div className="font-bold text-sm">Moderne</div>
                <div className="text-[10px] text-[#8E9299]">Interface dense et épurée</div>
              </button>
              <button
                onClick={() => setThemeType('classic')}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all text-left space-y-2",
                  themeType === 'classic' ? "border-[#FF4E00] bg-[#FF4E00]/5" : "border-[#E4E3E0] hover:border-[#8E9299]"
                )}
              >
                <div className="font-bold text-sm">Classique</div>
                <div className="text-[10px] text-[#8E9299]">Boutons larges et contrastés</div>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#151619] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <h3 className="text-lg font-bold mb-4 relative z-10">Aperçu du thème</h3>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: primaryColor }}>F</div>
                <span className="font-bold">FabrikFlow</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full" style={{ backgroundColor: primaryColor, width: '65%' }}></div>
              </div>
              <button className="px-6 py-2 rounded-xl text-sm font-bold" style={{ backgroundColor: primaryColor }}>
                Bouton Action
              </button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: `${primaryColor}20` }}></div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#E4E3E0] shadow-sm">
            <h3 className="font-bold text-[#141414] mb-4">Actions Système</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-[#F8F9FA] rounded-2xl hover:bg-[#F0F0F0] transition-colors group">
                <div className="flex items-center gap-3 text-sm font-bold text-[#141414]">
                  <RefreshCcw className="w-4 h-4 text-[#8E9299] group-hover:rotate-180 transition-transform duration-500" />
                  Réinitialiser les données démo
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button className="px-8 py-4 text-[#8E9299] font-bold hover:text-[#141414] transition-colors">
          Annuler
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-3 px-12 py-4 bg-[#151619] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl disabled:opacity-50"
        >
          {isSaving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Sauvegarder les modifications
        </button>
      </div>
    </div>
  );
};
