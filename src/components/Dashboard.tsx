import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { Order, Task } from '../types';
import { cn } from '../lib/utils';

export const Dashboard = () => {
  const [stats, setStats] = useState({
    activeOrders: 0,
    pendingValidation: 0,
    completedToday: 0,
    machineLoad: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ordersPath = 'orders';
    const q = query(collection(db, ordersPath), limit(5));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      setRecentOrders(orders);
      
      // Calculate stats (in a real app, these might be pre-calculated or use more complex queries)
      setStats({
        activeOrders: orders.filter(o => o.statut === 'en_cours').length,
        pendingValidation: orders.filter(o => o.statut === 'en_attente').length,
        completedToday: orders.filter(o => o.statut === 'termine').length,
        machineLoad: 75 // Mock for now
      });
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, ordersPath));

    return () => unsubscribe();
  }, []);

  const statCards = [
    { label: 'OF en cours', value: stats.activeOrders, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'À valider', value: stats.pendingValidation, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Terminés aujourd\'hui', value: stats.completedToday, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Charge machine', value: `${stats.machineLoad}%`, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-[#E4E3E0] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-[#141414]">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E4E3E0] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#E4E3E0] flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#141414]">Ordres de Fabrication récents</h3>
            <button className="text-sm font-bold text-[#FF4E00] hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8F9FA] text-[#8E9299] text-xs uppercase font-bold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Article</th>
                  <th className="px-6 py-4">Quantité</th>
                  <th className="px-6 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E3E0]">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-[#141414]">{order.id?.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-[#141414] font-medium">
                      {order.articles?.length > 1 
                        ? `${order.articles[0].nom} (+${order.articles.length - 1})`
                        : order.articles?.[0]?.nom || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#8E9299]">
                      {order.articles?.reduce((acc, curr) => acc + curr.quantite, 0) || 0} pcs
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        order.statut === 'en_cours' ? "bg-blue-100 text-blue-700" :
                        order.statut === 'termine' ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-700"
                      )}>
                        {order.statut}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[#8E9299]">Aucun ordre récent</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#151619] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Alerte Production</h3>
            <p className="text-white/60 text-sm mb-6">Surcharge détectée sur le secteur Ablation Laser pour la semaine 14.</p>
            <div className="space-y-4">
              <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/40">Ablation 1</span>
                  <span className="text-xs font-bold">92%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF4E00] w-[92%]"></div>
                </div>
              </div>
              <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/40">Découpe Laser</span>
                  <span className="text-xs font-bold">85%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[85%]"></div>
                </div>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-[#FF4E00] rounded-xl font-bold hover:bg-[#E64600] transition-colors">
              Optimiser le planning
            </button>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#FF4E00]/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};
