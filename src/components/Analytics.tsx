import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const data = [
  { name: 'Lun', load: 85 },
  { name: 'Mar', load: 92 },
  { name: 'Mer', load: 78 },
  { name: 'Jeu', load: 95 },
  { name: 'Ven', load: 88 },
  { name: 'Sam', load: 45 },
  { name: 'Dim', load: 30 },
];

const statusData = [
  { name: 'En cours', value: 12, color: '#3b82f6' },
  { name: 'Terminé', value: 45, color: '#10b981' },
  { name: 'À valider', value: 8, color: '#f59e0b' },
  { name: 'Retard', value: 3, color: '#ef4444' },
];

export const Analytics = () => {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#141414]">Analyses & Performance</h2>
          <p className="text-[#8E9299] text-sm">Suivez le taux d'occupation et l'efficacité de votre atelier.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-[#E4E3E0] shadow-sm">
          <h3 className="text-lg font-bold text-[#141414] mb-8">Taux d'occupation hebdomadaire (%)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F1" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8E9299', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8E9299', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: '#F8F9FA' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="load" fill="#FF4E00" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-[#E4E3E0] shadow-sm">
          <h3 className="text-lg font-bold text-[#141414] mb-8">Répartition des statuts OF</h3>
          <div className="h-[300px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4 pr-8">
              {statusData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">{item.name}</span>
                    <span className="text-sm font-bold text-[#141414]">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#151619] p-8 rounded-2xl text-white shadow-xl">
          <span className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-2">Efficience Globale (OEE)</span>
          <div className="text-4xl font-bold mb-4">84.2%</div>
          <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
            <TrendingUp className="w-4 h-4" /> +2.4% vs mois dernier
          </div>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-[#E4E3E0] shadow-sm">
          <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wider block mb-2">Temps d'arrêt moyen</span>
          <div className="text-4xl font-bold text-[#141414] mb-4">12m</div>
          <div className="flex items-center gap-2 text-red-500 text-sm font-bold">
            <TrendingDown className="w-4 h-4" /> +5m vs hier
          </div>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-[#E4E3E0] shadow-sm">
          <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wider block mb-2">Pièces produites (24h)</span>
          <div className="text-4xl font-bold text-[#141414] mb-4">1,240</div>
          <div className="flex items-center gap-2 text-green-500 text-sm font-bold">
            <TrendingUp className="w-4 h-4" /> +120 vs hier
          </div>
        </div>
      </div>
    </div>
  );
};
