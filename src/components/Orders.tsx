import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  X,
  Settings2,
  User,
  ClipboardList,
  Paperclip,
  FileText,
  Download,
  Bell
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, onSnapshot, addDoc, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { Order, Client, ExternalProvider, Resource, Task } from '../types';
import { cn } from '../lib/utils';
import { format, addHours, addMinutes, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../App';

export const Orders = () => {
  const { role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    lotNumber: '',
    numeroCommandeERP: '',
    clientId: '',
    articles: [{ id: '1', nom: '', quantite: 1 }],
    delaiSouhaite: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    isImperative: false,
    statut: 'en_attente',
    secteur: 'ablation',
    posageRequis: false,
    clientConfirme: false,
    prestatairesExternes: [],
    piecesJointes: []
  });

  // Production validation state
  const [prodValidation, setProdValidation] = useState({
    proposedDeadline: '',
    startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    machineTimePerPiece: 0,
    totalHours: 0,
    preparationTime: 0, // In minutes (doesn't block machine)
    setupTime: 0, // In minutes (blocks machine)
    resourceId: '',
    needsPose: false,
    poseDeadline: ''
  });

  useEffect(() => {
    const ordersPath = 'orders';
    const clientsPath = 'clients';
    const resourcesPath = 'resources';
    const tasksPath = 'tasks';

    const unsubscribeOrders = onSnapshot(query(collection(db, ordersPath), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[]);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, ordersPath));

    const unsubscribeClients = onSnapshot(collection(db, clientsPath), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[]);
    }, (error) => handleFirestoreError(error, OperationType.GET, clientsPath));

    const unsubscribeResources = onSnapshot(collection(db, resourcesPath), (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Resource[]);
    }, (error) => handleFirestoreError(error, OperationType.GET, resourcesPath));

    const unsubscribeTasks = onSnapshot(collection(db, tasksPath), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[]);
    }, (error) => handleFirestoreError(error, OperationType.GET, tasksPath));

    return () => {
      unsubscribeOrders();
      unsubscribeClients();
      unsubscribeResources();
      unsubscribeTasks();
    };
  }, []);

  const getMachineLoadForDay = (resourceId: string, dateStr: string) => {
    const date = new Date(dateStr);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
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

  const handleAddOrder = async () => {
    const path = 'orders';
    try {
      await addDoc(collection(db, path), {
        ...newOrder,
        createurId: auth.currentUser?.uid,
        delaiClientInitial: newOrder.delaiSouhaite,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      setNewOrder({
        lotNumber: '',
        numeroCommandeERP: '',
        clientId: '',
        articles: [{ id: '1', nom: '', quantite: 1 }],
        delaiSouhaite: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        isImperative: false,
        statut: 'en_attente',
        secteur: 'ablation',
        posageRequis: false,
        clientConfirme: false,
        prestatairesExternes: [],
        piecesJointes: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleProductionValidate = async (order: Order) => {
    const path = `orders/${order.id}`;
    try {
      const totalPieces = order.articles?.reduce((acc, curr) => acc + curr.quantite, 0) || 0;
      const productionMinutes = prodValidation.machineTimePerPiece > 0 
        ? totalPieces * prodValidation.machineTimePerPiece 
        : (prodValidation.totalHours || 0) * 60;
      
      const machineBlockingMinutes = (prodValidation.setupTime || 0) + productionMinutes;
      // Preparation time doesn't block the machine, but we track it.

      const startDate = new Date(prodValidation.startDate);
      const endDate = addMinutes(startDate, machineBlockingMinutes); // Machine is blocked for setup + production

      const deadlineChanged = prodValidation.proposedDeadline && prodValidation.proposedDeadline !== order.delaiSouhaite;

      await updateDoc(doc(db, 'orders', order.id!), {
        delaiSouhaite: prodValidation.proposedDeadline || order.delaiSouhaite,
        statut: deadlineChanged ? 'a_confirmer' : 'valide',
        posageRequis: prodValidation.needsPose,
        posageDelai: prodValidation.poseDeadline,
        posageStatut: prodValidation.needsPose ? 'en_attente' : undefined,
        validateurId: auth.currentUser?.uid,
        resourceId: prodValidation.resourceId,
        notificationLogistique: deadlineChanged ? `Nouveau délai proposé par la production pour LOT-${order.lotNumber}` : null
      });
      
      // Create planning task
      if (prodValidation.resourceId) {
        const tasksPath = 'tasks';
        await addDoc(collection(db, tasksPath), {
          ofId: order.id,
          resourceId: prodValidation.resourceId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          prepTime: prodValidation.preparationTime,
          prodTime: productionMinutes,
          setupTime: prodValidation.setupTime,
          progress: 0,
          status: 'planned'
        });
      }
      
      setSelectedOrderId(null);
      setProdValidation({
        proposedDeadline: '',
        startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        machineTimePerPiece: 0,
        totalHours: 0,
        preparationTime: 0,
        setupTime: 0,
        resourceId: '',
        needsPose: false,
        poseDeadline: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handlePoseValidate = async (order: Order) => {
    const path = `orders/${order.id}`;
    try {
      await updateDoc(doc(db, 'orders', order.id!), {
        posageStatut: 'valide',
        notificationProduction: `La pose a validé le délai pour le LOT-${order.lotNumber}`
      });
      setSelectedOrderId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'termine': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'en_cours': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'en_attente': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'valide': return <CheckCircle2 className="w-4 h-4 text-purple-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#141414]">Gestion des LOTS</h2>
          <p className="text-[#8E9299] text-sm">Suivez et gérez le cycle de vie de vos lots de production.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" />
            <input 
              type="text" 
              placeholder="Rechercher un LOT..." 
              className="pl-10 pr-4 py-2.5 bg-white border border-[#E4E3E0] rounded-xl text-sm w-64 focus:ring-2 focus:ring-[#FF4E00] transition-all"
            />
          </div>
          <button className="p-2.5 bg-white border border-[#E4E3E0] rounded-xl hover:bg-[#F8F9FA] transition-colors">
            <Filter className="w-5 h-5 text-[#141414]" />
          </button>
          {['admin', 'logistique'].includes(role) && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#151619] text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" /> Nouveau LOT
            </button>
          )}
        </div>
      </div>

      {/* Notifications for Production */}
      {role === 'production' && orders.some(o => o.notificationProduction) && (
        <div className="space-y-2">
          {orders.filter(o => o.notificationProduction).map(order => (
            <div key={order.id} className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{order.notificationProduction}</span>
              </div>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  await updateDoc(doc(db, 'orders', order.id!), { notificationProduction: null });
                }}
                className="text-blue-600 hover:text-blue-800 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Notifications for Logistics */}
      {role === 'logistique' && orders.some(o => o.notificationLogistique) && (
        <div className="space-y-2">
          {orders.filter(o => o.notificationLogistique).map(order => (
            <div key={order.id} className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">{order.notificationLogistique}</span>
              </div>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  await updateDoc(doc(db, 'orders', order.id!), { notificationLogistique: null });
                }}
                className="text-orange-600 hover:text-orange-800 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E4E3E0] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#F8F9FA] text-[#8E9299] text-xs uppercase font-bold">
            <tr>
              <th className="px-6 py-4">LOT / ERP</th>
              <th className="px-6 py-4">Client / Article</th>
              <th className="px-6 py-4">Quantité</th>
              <th className="px-6 py-4">Délai / Impératif</th>
              <th className="px-6 py-4">Statut / Pose</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E3E0]">
            {orders.map((order) => (
              <tr 
                key={order.id} 
                className="hover:bg-[#F8F9FA] transition-colors group cursor-pointer"
                onClick={() => setSelectedOrderId(order.id!)}
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-[#141414]">LOT-{order.lotNumber || order.id?.slice(-5).toUpperCase()}</div>
                  <div className="text-xs font-mono text-[#8E9299]">{order.numeroCommandeERP || 'SANS ERP'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-[#141414]">{clients.find(c => c.id === order.clientId)?.nom || 'Client inconnu'}</div>
                  <div className="text-xs text-[#8E9299]">
                    {order.articles?.length > 1 
                      ? `${order.articles[0].nom} (+${order.articles.length - 1} autres)`
                      : order.articles?.[0]?.nom || 'Aucun article'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#8E9299]" />
                    <span className="text-sm font-bold text-[#141414]">
                      {order.articles?.reduce((acc, curr) => acc + curr.quantite, 0) || 0}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#8E9299]" />
                      <span className="text-sm text-[#141414]">{format(new Date(order.delaiSouhaite), 'dd MMM yyyy', { locale: fr })}</span>
                    </div>
                    {order.isImperative && (
                      <span className="text-[10px] font-bold text-red-600 uppercase mt-1">Impératif</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-2">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold w-fit",
                      order.statut === 'en_cours' ? "bg-blue-50 text-blue-700" :
                      order.statut === 'termine' ? "bg-green-50 text-green-700" :
                      order.statut === 'en_attente' ? "bg-orange-50 text-orange-700" :
                      order.statut === 'valide' ? "bg-purple-50 text-purple-700" :
                      "bg-gray-50 text-gray-700"
                    )}>
                      {getStatusIcon(order.statut)}
                      <span className="capitalize">{order.statut.replace('_', ' ')}</span>
                    </div>
                    {order.posageRequis && (
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-md w-fit",
                        order.posageStatut === 'valide' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      )}>
                        POSE: {order.posageStatut === 'valide' ? 'VALIDÉE' : 'EN ATTENTE'}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-[#8E9299] hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add LOT Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-[#E4E3E0] flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#141414]">Nouveau LOT de Production</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[#F8F9FA] rounded-full transition-colors">
                <X className="w-5 h-5 text-[#8E9299]" />
              </button>
            </div>
            <div className="p-8 grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">N° de LOT</label>
                <input 
                  type="text" 
                  value={newOrder.lotNumber}
                  onChange={(e) => setNewOrder({ ...newOrder, lotNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                  placeholder="Ex: LOT-2024-001"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">N° Commande ERP</label>
                <input 
                  type="text" 
                  value={newOrder.numeroCommandeERP}
                  onChange={(e) => setNewOrder({ ...newOrder, numeroCommandeERP: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                  placeholder="Ex: CMD-78542"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Client</label>
                <select 
                  value={newOrder.clientId}
                  onChange={(e) => setNewOrder({ ...newOrder, clientId: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Articles</label>
                  <button 
                    onClick={() => setNewOrder({
                      ...newOrder,
                      articles: [...(newOrder.articles || []), { id: Date.now().toString(), nom: '', quantite: 1 }]
                    })}
                    className="text-[#FF4E00] text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Ajouter un article
                  </button>
                </div>
                <div className="space-y-3">
                  {newOrder.articles?.map((art, index) => (
                    <div key={art.id} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={art.nom}
                          onChange={(e) => {
                            const newArticles = [...(newOrder.articles || [])];
                            newArticles[index].nom = e.target.value;
                            setNewOrder({ ...newOrder, articles: newArticles });
                          }}
                          className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all text-sm"
                          placeholder="Nom de l'article"
                        />
                      </div>
                      <div className="w-24">
                        <input 
                          type="number" 
                          value={art.quantite}
                          onChange={(e) => {
                            const newArticles = [...(newOrder.articles || [])];
                            newArticles[index].quantite = +e.target.value;
                            setNewOrder({ ...newOrder, articles: newArticles });
                          }}
                          className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all text-sm"
                        />
                      </div>
                      {index > 0 && (
                        <button 
                          onClick={() => {
                            const newArticles = (newOrder.articles || []).filter((_, i) => i !== index);
                            setNewOrder({ ...newOrder, articles: newArticles });
                          }}
                          className="p-3 text-[#8E9299] hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Pièces Jointes</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#F8F9FA] border-2 border-dashed border-[#E4E3E0] rounded-xl cursor-pointer hover:border-[#FF4E00] transition-all group">
                    <Paperclip className="w-4 h-4 text-[#8E9299] group-hover:text-[#FF4E00]" />
                    <span className="text-sm text-[#8E9299] group-hover:text-[#FF4E00]">Ajouter des fichiers</span>
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const newAttachments = files.map(f => ({
                          id: Math.random().toString(36).substr(2, 9),
                          nom: f.name,
                          url: '#', // In a real app, upload to storage and get URL
                          type: f.type,
                          createdAt: new Date().toISOString()
                        }));
                        setNewOrder({
                          ...newOrder,
                          piecesJointes: [...(newOrder.piecesJointes || []), ...newAttachments]
                        });
                      }}
                    />
                  </label>
                </div>
                {newOrder.piecesJointes && newOrder.piecesJointes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newOrder.piecesJointes.map((file, idx) => (
                      <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E4E3E0] rounded-lg text-xs">
                        <FileText className="w-3 h-3 text-[#8E9299]" />
                        <span className="text-[#141414] truncate max-w-[150px]">{file.nom}</span>
                        <button 
                          onClick={() => {
                            const newFiles = newOrder.piecesJointes?.filter((_, i) => i !== idx);
                            setNewOrder({ ...newOrder, piecesJointes: newFiles });
                          }}
                          className="text-[#8E9299] hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Prestataires Externes</label>
                  <button 
                    onClick={() => setNewOrder({
                      ...newOrder,
                      prestatairesExternes: [...(newOrder.prestatairesExternes || []), { nom: '', delai: format(new Date(), "yyyy-MM-dd'T'HH:mm") }]
                    })}
                    className="text-[#FF4E00] text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Ajouter un prestataire
                  </button>
                </div>
                <div className="space-y-3">
                  {newOrder.prestatairesExternes?.map((pre, index) => (
                    <div key={index} className="grid grid-cols-2 gap-3 p-4 bg-[#F8F9FA] rounded-xl border border-[#E4E3E0]">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-[#8E9299] uppercase">Nom du prestataire</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={pre.nom}
                            onChange={(e) => {
                              const newPre = [...(newOrder.prestatairesExternes || [])];
                              newPre[index].nom = e.target.value;
                              setNewOrder({ ...newOrder, prestatairesExternes: newPre });
                            }}
                            className="flex-1 px-3 py-2 bg-white border border-[#E4E3E0] rounded-lg text-sm"
                            placeholder="Ex: Traitement thermique"
                          />
                          <button 
                            onClick={() => {
                              const newPre = (newOrder.prestatairesExternes || []).filter((_, i) => i !== index);
                              setNewOrder({ ...newOrder, prestatairesExternes: newPre });
                            }}
                            className="p-2 text-[#8E9299] hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8E9299] uppercase">Envoi prévu</label>
                        <input 
                          type="datetime-local" 
                          value={pre.envoiPrevu}
                          onChange={(e) => {
                            const newPre = [...(newOrder.prestatairesExternes || [])];
                            newPre[index].envoiPrevu = e.target.value;
                            setNewOrder({ ...newOrder, prestatairesExternes: newPre });
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#E4E3E0] rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8E9299] uppercase">Livraison prévue</label>
                        <input 
                          type="datetime-local" 
                          value={pre.livraisonPrevue}
                          onChange={(e) => {
                            const newPre = [...(newOrder.prestatairesExternes || [])];
                            newPre[index].livraisonPrevue = e.target.value;
                            setNewOrder({ ...newOrder, prestatairesExternes: newPre });
                          }}
                          className="w-full px-3 py-2 bg-white border border-[#E4E3E0] rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Délai souhaité par le client</label>
                <input 
                  type="datetime-local" 
                  value={newOrder.delaiSouhaite}
                  onChange={(e) => setNewOrder({ ...newOrder, delaiSouhaite: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                />
              </div>
              <div className="col-span-2 flex items-center gap-3 p-4 bg-[#F8F9FA] rounded-xl">
                <input 
                  type="checkbox" 
                  id="imperative"
                  checked={newOrder.isImperative}
                  onChange={(e) => setNewOrder({ ...newOrder, isImperative: e.target.checked })}
                  className="w-5 h-5 accent-[#FF4E00]"
                />
                <label htmlFor="imperative" className="text-sm font-bold text-[#141414]">Délai client impératif (bloqué)</label>
              </div>
            </div>
            <div className="p-8 bg-[#F8F9FA] flex gap-4">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-4 text-[#8E9299] font-bold hover:text-[#141414] transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleAddOrder}
                className="flex-1 py-4 bg-[#151619] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl"
              >
                Créer le LOT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details / Validation Modal */}
      {selectedOrderId && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 border-b border-[#E4E3E0] flex items-center justify-between bg-[#F8F9FA]">
              <div>
                <div className="text-xs font-bold text-[#8E9299] uppercase tracking-widest mb-1">Détails du LOT</div>
                <h3 className="text-2xl font-black text-[#141414]">LOT-{selectedOrder.lotNumber || selectedOrder.id?.slice(-5).toUpperCase()}</h3>
              </div>
              <button onClick={() => setSelectedOrderId(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X className="w-6 h-6 text-[#8E9299]" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[70vh] space-y-8">
              {/* Articles & Attachments Grid */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-widest">Articles ({selectedOrder.articles?.length || 0})</h4>
                  <div className="space-y-2">
                    {selectedOrder.articles?.map((art) => (
                      <div key={art.id} className="flex items-center justify-between p-3 bg-[#F8F9FA] rounded-xl border border-[#E4E3E0]">
                        <span className="font-bold text-[#141414]">{art.nom}</span>
                        <span className="px-2 py-1 bg-white rounded-lg text-xs font-bold border border-[#E4E3E0]">x{art.quantite}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-widest">Pièces Jointes ({selectedOrder.piecesJointes?.length || 0})</h4>
                  <div className="space-y-2">
                    {selectedOrder.piecesJointes?.map((file) => (
                      <a 
                        key={file.id} 
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-white border border-[#E4E3E0] rounded-xl hover:border-[#FF4E00] transition-all group"
                      >
                        <div className="p-2 bg-[#F8F9FA] rounded-lg group-hover:bg-[#FF4E00]/10 transition-colors">
                          <FileText className="w-4 h-4 text-[#8E9299] group-hover:text-[#FF4E00]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-[#141414] truncate">{file.nom}</div>
                          <div className="text-[10px] text-[#8E9299]">{format(new Date(file.createdAt), 'dd/MM/yyyy')}</div>
                        </div>
                        <Download className="w-4 h-4 text-[#8E9299] opacity-0 group-hover:opacity-100 transition-all" />
                      </a>
                    ))}
                    {(!selectedOrder.piecesJointes || selectedOrder.piecesJointes.length === 0) && (
                      <div className="text-sm text-[#8E9299] italic p-4 text-center border-2 border-dashed border-[#E4E3E0] rounded-xl">
                        Aucune pièce jointe
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* External Providers Section */}
              {selectedOrder.prestatairesExternes && selectedOrder.prestatairesExternes.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#8E9299] uppercase tracking-widest">Prestataires Externes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedOrder.prestatairesExternes.map((pre, idx) => (
                      <div key={idx} className="p-4 bg-white border border-[#E4E3E0] rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#141414]">{pre.nom}</span>
                          <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg uppercase">Externe</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-[#8E9299] block uppercase">Envoi</span>
                            <span className="font-bold text-[#141414]">{pre.envoiPrevu ? format(new Date(pre.envoiPrevu), 'dd/MM HH:mm') : '-'}</span>
                          </div>
                          <div>
                            <span className="text-[#8E9299] block uppercase">Retour</span>
                            <span className="font-bold text-[#141414]">{pre.livraisonPrevue ? format(new Date(pre.livraisonPrevue), 'dd/MM HH:mm') : '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Production Validation Section */}
              {role === 'production' && selectedOrder.statut === 'en_attente' && (
                <div className="bg-[#FF4E00]/5 p-6 rounded-2xl border border-[#FF4E00]/20 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#FF4E00] flex items-center gap-2">
                      <Settings2 className="w-5 h-5" /> Validation Production
                    </h4>
                    {selectedOrder.isImperative && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase animate-pulse">
                        Délai Impératif
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#8E9299] uppercase">Délai Proposé</label>
                      <input 
                        type="datetime-local" 
                        defaultValue={selectedOrder.delaiSouhaite}
                        className="w-full px-4 py-3 bg-white border border-[#E4E3E0] rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                        onChange={(e) => setProdValidation({ ...prodValidation, proposedDeadline: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#8E9299] uppercase">Date de début prévue</label>
                      <input 
                        type="datetime-local" 
                        value={prodValidation.startDate}
                        className="w-full px-4 py-3 bg-white border border-[#E4E3E0] rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                        onChange={(e) => setProdValidation({ ...prodValidation, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#8E9299] uppercase">Machine / Ressource</label>
                      <select 
                        className="w-full px-4 py-3 bg-white border border-[#E4E3E0] rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                        onChange={(e) => setProdValidation({ ...prodValidation, resourceId: e.target.value })}
                        value={prodValidation.resourceId}
                      >
                        <option value="">Sélectionner une machine</option>
                        {resources.map(r => {
                          const loadMinutes = getMachineLoadForDay(r.id!, prodValidation.startDate);
                          const capacityMinutes = r.mode24h ? 24 * 60 : 8 * 60;
                          const loadPercent = Math.round((loadMinutes / capacityMinutes) * 100);
                          
                          return (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.secteur}) - Charge: {loadPercent}%
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#8E9299] uppercase">Temps machine / pce (min)</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-white border border-[#E4E3E0] rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                        onChange={(e) => setProdValidation({ ...prodValidation, machineTimePerPiece: +e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#8E9299] uppercase">Mise en place (min) - Bloque machine</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-white border border-[#E4E3E0] rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                        onChange={(e) => setProdValidation({ ...prodValidation, setupTime: +e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#8E9299] uppercase">Préparation (min) - Libre</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-white border border-[#E4E3E0] rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                        onChange={(e) => setProdValidation({ ...prodValidation, preparationTime: +e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 flex flex-col justify-end">
                      <div className="p-3 bg-white rounded-xl border border-[#E4E3E0] text-center">
                        <div className="text-[10px] font-bold text-[#8E9299] uppercase">Temps Total Planifié</div>
                        <div className="text-lg font-bold text-[#141414]">
                          {Math.round(((selectedOrder.articles?.reduce((acc, curr) => acc + curr.quantite, 0) || 0) * (prodValidation.machineTimePerPiece || 0) + (prodValidation.setupTime || 0) + (prodValidation.preparationTime || 0)) / 60 * 10) / 10}h
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-6 p-4 bg-white rounded-xl border border-[#E4E3E0]">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="needs-pose"
                          checked={prodValidation.needsPose}
                          onChange={(e) => setProdValidation({ ...prodValidation, needsPose: e.target.checked })}
                          className="w-5 h-5 accent-[#FF4E00]"
                        />
                        <label htmlFor="needs-pose" className="text-sm font-bold text-[#141414]">Besoin de POSE</label>
                      </div>
                      {prodValidation.needsPose && (
                        <div className="flex-1 flex items-center gap-3">
                          <label className="text-xs font-bold text-[#8E9299] uppercase">Délai Pose</label>
                          <input 
                            type="datetime-local" 
                            className="flex-1 px-4 py-2 bg-[#F8F9FA] border-none rounded-lg text-sm"
                            onChange={(e) => setProdValidation({ ...prodValidation, poseDeadline: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleProductionValidate(selectedOrder)}
                    className="w-full py-4 bg-[#FF4E00] text-white rounded-2xl font-bold hover:bg-[#E64600] transition-all shadow-xl"
                  >
                    Valider la planification
                  </button>
                </div>
              )}

              {/* Logistics Confirmation Section */}
              {role === 'logistique' && selectedOrder.statut === 'a_confirmer' && (
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 space-y-6">
                  <h4 className="font-bold text-blue-600 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Confirmation Délai Production
                  </h4>
                  <div className="p-4 bg-white rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-800 mb-2">La production propose un nouveau délai :</p>
                    <div className="text-lg font-bold text-blue-900">
                      {format(new Date(selectedOrder.delaiSouhaite), 'dd MMMM yyyy HH:mm', { locale: fr })}
                    </div>
                    {selectedOrder.isImperative && (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-600 uppercase">
                        <AlertCircle className="w-3 h-3" /> Délai initial était impératif
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={async () => {
                        await updateDoc(doc(db, 'orders', selectedOrder.id!), { 
                          statut: 'valide',
                          clientConfirme: true,
                          notificationProduction: `Délai validé par la logistique pour LOT-${selectedOrder.lotNumber}`
                        });
                        setSelectedOrderId(null);
                      }}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl"
                    >
                      Valider avec le client
                    </button>
                    <button className="flex-1 py-4 bg-white text-blue-600 border border-blue-200 rounded-2xl font-bold hover:bg-blue-100 transition-all">
                      Refuser / Contacter Prod
                    </button>
                  </div>
                </div>
              )}

              {/* Pose Validation Section */}
              {role === 'poseur' && selectedOrder.posageRequis && selectedOrder.posageStatut === 'en_attente' && (
                <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 space-y-6">
                  <h4 className="font-bold text-orange-600 flex items-center gap-2">
                    <User className="w-5 h-5" /> Validation Pose
                  </h4>
                  <p className="text-sm text-orange-800">Délai demandé par la production : <strong>{selectedOrder.posageDelai ? format(new Date(selectedOrder.posageDelai), 'dd MMM yyyy HH:mm', { locale: fr }) : 'Non défini'}</strong></p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handlePoseValidate(selectedOrder)}
                      className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl"
                    >
                      Accepter le délai
                    </button>
                    <button className="flex-1 py-4 bg-white text-orange-600 border border-orange-200 rounded-2xl font-bold hover:bg-orange-100 transition-all">
                      Proposer un autre délai
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
