import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter,
  Clock,
  User,
  Settings2,
  Maximize2
} from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, isToday, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Task, Resource, Order } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export const Gantt = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  useEffect(() => {
    const tasksPath = 'tasks';
    const resourcesPath = 'resources';
    const ordersPath = 'orders';

    const tasksQuery = query(collection(db, tasksPath), orderBy('startDate', 'asc'));
    const resourcesQuery = query(collection(db, resourcesPath), orderBy('name', 'asc'));
    const ordersQuery = query(collection(db, ordersPath));

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(taskData);
    }, (error) => handleFirestoreError(error, OperationType.GET, tasksPath));

    const unsubscribeResources = onSnapshot(resourcesQuery, (snapshot) => {
      const resourceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Resource[];
      setResources(resourceData);
    }, (error) => handleFirestoreError(error, OperationType.GET, resourcesPath));

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orderData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(orderData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, ordersPath));

    return () => {
      unsubscribeTasks();
      unsubscribeResources();
      unsubscribeOrders();
    };
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start,
      end: addDays(start, viewMode === 'day' ? 6 : 13),
    });
  }, [currentDate, viewMode]);

  const getDailyLoad = (resourceId: string, day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    
    const dayTasks = tasks.filter(t => t.resourceId === resourceId && (
      (new Date(t.startDate) < dayEnd && new Date(t.endDate) > dayStart)
    ));
    
    let totalMinutes = 0;
    dayTasks.forEach(t => {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      const overlapStart = Math.max(start.getTime(), dayStart.getTime());
      const overlapEnd = Math.min(end.getTime(), dayEnd.getTime());
      totalMinutes += (overlapEnd - overlapStart) / (1000 * 60);
    });
    
    return totalMinutes;
  };

  const getOrderLabel = (ofId: string) => {
    const order = orders.find(o => o.id === ofId);
    return order ? `LOT-${order.lotNumber}` : ofId;
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-[#FF4E00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA]">
      <div className="p-6 bg-white border-b border-[#E4E3E0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#141414]">Planning de Production</h2>
            <p className="text-[#8E9299] text-xs">Visualisez la charge machine et optimisez le planning.</p>
          </div>
          <div className="flex bg-[#F5F5F5] p-1 rounded-xl ml-4">
            <button 
              onClick={() => setViewMode('day')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                viewMode === 'day' ? "bg-white text-[#141414] shadow-sm" : "text-[#8E9299] hover:text-[#141414]"
              )}
            >
              Jour
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                viewMode === 'week' ? "bg-white text-[#141414] shadow-sm" : "text-[#8E9299] hover:text-[#141414]"
              )}
            >
              Semaine
            </button>
          </div>
          <div className="flex items-center gap-2 bg-[#F5F5F5] p-1 rounded-xl">
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'day' ? -7 : -14))}
              className="p-1.5 hover:bg-white rounded-lg transition-all text-[#141414]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold px-2 text-[#141414] min-w-[150px] text-center">
              {format(days[0], 'dd MMM', { locale: fr })} - {format(days[days.length - 1], 'dd MMM yyyy', { locale: fr })}
            </span>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'day' ? 7 : 14))}
              className="p-1.5 hover:bg-white rounded-lg transition-all text-[#141414]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="text-sm font-bold text-[#FF4E00] hover:underline"
          >
            Aujourd'hui
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 bg-white border border-[#E4E3E0] rounded-xl hover:bg-[#F8F9FA] transition-colors">
            <Filter className="w-5 h-5 text-[#141414]" />
          </button>
          <button className="bg-[#FF4E00] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#E64600] transition-all flex items-center gap-2 shadow-lg shadow-[#FF4E00]/20">
            <Plus className="w-5 h-5" /> Nouvelle Tâche
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar for Unplanned LOTs */}
        <div className="w-80 border-r border-[#E4E3E0] bg-white overflow-y-auto hidden lg:block">
          <div className="p-6 border-b border-[#E4E3E0] bg-[#F8F9FA]">
            <h3 className="text-sm font-bold text-[#141414] mb-1">LOTS à planifier</h3>
            <p className="text-[10px] text-[#8E9299] uppercase font-bold tracking-wider">
              {orders.filter(o => o.statut === 'en_attente').length} en attente
            </p>
          </div>
          <div className="p-4 space-y-3">
            {orders.filter(o => o.statut === 'en_attente').map(order => (
              <div key={order.id} className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#E4E3E0] hover:border-[#FF4E00] transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#141414]">LOT-{order.lotNumber}</span>
                  {order.isImperative && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[8px] font-bold rounded-full uppercase">Impératif</span>
                  )}
                </div>
                <div className="text-[10px] text-[#8E9299] mb-3 line-clamp-1">
                  {order.articles?.map(a => `${a.nom} (x${a.quantite})`).join(', ')}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-[#8E9299]">
                    <Clock className="w-3 h-3" />
                    {format(new Date(order.delaiSouhaite), 'dd/MM HH:mm')}
                  </div>
                  <button className="text-[10px] font-bold text-[#FF4E00] opacity-0 group-hover:opacity-100 transition-opacity">
                    Planifier
                  </button>
                </div>
              </div>
            ))}
            {orders.filter(o => o.statut === 'en_attente').length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-[#8E9299]">Aucun lot en attente</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-2xl border border-[#E4E3E0] shadow-sm min-w-[1000px]">
          <div className="flex border-b border-[#E4E3E0] bg-[#F8F9FA]">
            <div className="w-64 p-4 border-r border-[#E4E3E0] font-bold text-xs uppercase tracking-wider text-[#8E9299] shrink-0">
              Ressources
            </div>
            <div className="flex-1 flex">
              {days.map((day, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 p-4 text-center border-r border-[#E4E3E0] last:border-r-0",
                    isToday(day) && "bg-[#FF4E00]/5"
                  )}
                >
                  <div className="text-[10px] uppercase font-bold text-[#8E9299] mb-1">
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={cn(
                    "text-sm font-bold w-8 h-8 flex items-center justify-center mx-auto rounded-full mb-2",
                    isToday(day) ? "bg-[#FF4E00] text-white" : "text-[#141414]"
                  )}>
                    {format(day, 'dd')}
                  </div>
                  {/* Daily Load Summary */}
                  <div className="flex flex-col gap-1">
                    {resources.slice(0, 3).map(r => {
                      const load = getDailyLoad(r.id!, day);
                      const cap = r.mode24h ? 24 * 60 : 8 * 60;
                      const pct = Math.min(100, (load / cap) * 100);
                      return (
                        <div key={r.id} className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              pct > 90 ? "bg-red-500" : pct > 50 ? "bg-orange-500" : "bg-blue-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#E4E3E0]">
            {resources.map((resource) => (
              <div key={resource.id} className="flex group hover:bg-[#F8F9FA] transition-colors min-h-[80px]">
                <div className="w-64 p-4 border-r border-[#E4E3E0] shrink-0 flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#F5F5F5] rounded-lg flex items-center justify-center text-xs font-bold text-[#141414]">
                    {resource.type === 'machine' ? <Clock className="w-4 h-4 text-[#8E9299]" /> : <User className="w-4 h-4 text-[#8E9299]" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#141414]">{resource.name}</div>
                    <div className="text-[10px] text-[#8E9299] uppercase font-bold">{resource.type}</div>
                  </div>
                </div>
                <div className="flex-1 flex relative">
                  {days.map((day, i) => {
                    const loadMinutes = getDailyLoad(resource.id!, day);
                    const capacityMinutes = resource.mode24h ? 24 * 60 : 8 * 60;
                    const freeMinutes = Math.max(0, capacityMinutes - loadMinutes);
                    const loadPercent = Math.min(100, (loadMinutes / capacityMinutes) * 100);
                    
                    return (
                      <div key={i} className="flex-1 border-r border-[#E4E3E0] last:border-r-0 bg-grid-slate-100/[0.03] relative group/cell">
                        {loadPercent > 0 && (
                          <div 
                            className={cn(
                              "absolute bottom-0 left-0 right-0 transition-all opacity-20",
                              loadPercent > 90 ? "bg-red-500" : loadPercent > 50 ? "bg-orange-500" : "bg-blue-500"
                            )}
                            style={{ height: `${loadPercent}%` }}
                          />
                        )}
                        <div className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none z-10">
                          <div className="bg-[#151619] text-white p-2 rounded-lg shadow-xl text-[8px] whitespace-nowrap">
                            <div className="font-bold mb-1">Charge: {Math.round(loadMinutes / 60)}h / {capacityMinutes / 60}h</div>
                            <div className="text-green-400">Libre: {Math.round(freeMinutes / 60)}h {freeMinutes % 60}m</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {tasks
                    .filter(task => task.resourceId === resource.id)
                    .map(task => {
                      const start = new Date(task.startDate);
                      const end = new Date(task.endDate);
                      const firstDay = days[0];
                      const lastDay = days[days.length - 1];

                      if (end < firstDay || start > lastDay) return null;

                      const startOffset = Math.max(0, (start.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24));
                      const duration = (end.getTime() - Math.max(start.getTime(), firstDay.getTime())) / (1000 * 60 * 60 * 24);
                      const width = (duration / days.length) * 100;
                      const left = (startOffset / days.length) * 100;

                      return (
                        <div 
                          key={task.id}
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-12 rounded-xl border border-white shadow-sm cursor-pointer hover:scale-[1.02] transition-transform group/task overflow-hidden",
                            task.status === 'completed' ? "bg-[#10B981]" : 
                            task.status === 'in-progress' ? "bg-[#FF4E00]" : "bg-[#F59E0B]"
                          )}
                          style={{ 
                            left: `${left}%`, 
                            width: `${width}%`,
                            zIndex: 10
                          }}
                        >
                          <div className="p-2 h-full flex flex-col justify-center">
                            <div className="text-[10px] font-bold text-white truncate leading-tight">
                              {getOrderLabel(task.ofId)}
                            </div>
                            <div className="flex items-center gap-1 text-[8px] text-white/80 font-medium">
                              <Clock className="w-2 h-2" />
                              {Math.round((task.prodTime || 0) / 60)}h
                            </div>
                          </div>
                          <div 
                            className="absolute bottom-0 left-0 h-1 bg-white/30" 
                            style={{ width: `${task.progress}%` }} 
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
      
      <div className="p-4 bg-white border-t border-[#E4E3E0] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
            <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Planifié</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF4E00]" />
            <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">En cours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#10B981]" />
            <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Terminé</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-colors text-[#8E9299]">
            <Settings2 className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-colors text-[#8E9299]">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
