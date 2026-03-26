import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Activity,
  Power,
  Settings2,
  X
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Resource } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../App';

export const Resources = () => {
  const { role } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResource, setNewResource] = useState<Partial<Resource>>({
    name: '',
    secteur: 'ablation',
    actif: true,
    mode24h: false,
    type: 'machine'
  });

  useEffect(() => {
    const path = 'resources';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Resource[];
      setResources(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => unsubscribe();
  }, []);

  const handleAddResource = async () => {
    const path = 'resources';
    try {
      await addDoc(collection(db, path), newResource);
      setShowAddModal(false);
      setNewResource({ name: '', secteur: 'ablation', actif: true, mode24h: false, type: 'machine' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const toggleStatus = async (resource: Resource) => {
    const path = `resources/${resource.id}`;
    try {
      await updateDoc(doc(db, 'resources', resource.id!), { actif: !resource.actif });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#141414]">Ressources</h2>
          <p className="text-[#8E9299] text-sm">Gérez vos machines et opérateurs de production.</p>
        </div>
        {['admin', 'production'].includes(role) && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF4E00] text-white rounded-xl font-bold hover:bg-[#E64600] transition-all shadow-lg shadow-[#FF4E00]/20"
          >
            <Plus className="w-5 h-5" /> Ajouter une ressource
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => (
          <div key={resource.id} className="bg-white rounded-2xl border border-[#E4E3E0] shadow-sm overflow-hidden group">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    resource.actif ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  )}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#141414]">{resource.name}</h3>
                    <span className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">{resource.secteur}</span>
                  </div>
                </div>
                <button className="p-2 text-[#8E9299] hover:bg-[#F8F9FA] rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#F8F9FA] p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-[#8E9299] uppercase block mb-1">Type</span>
                  <span className="text-sm font-bold text-[#141414] capitalize">{resource.type}</span>
                </div>
                <div className="bg-[#F8F9FA] p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-[#8E9299] uppercase block mb-1">Mode</span>
                  <span className="text-sm font-bold text-[#141414]">{resource.mode24h ? '24h/24' : 'Standard'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E4E3E0]">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", resource.actif ? "bg-green-500" : "bg-red-500")}></div>
                  <span className="text-sm font-medium text-[#141414]">{resource.actif ? 'Opérationnel' : 'Arrêt'}</span>
                </div>
                <button 
                  onClick={() => toggleStatus(resource)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    resource.actif ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                  )}
                >
                  <Power className="w-4 h-4" /> {resource.actif ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-[#E4E3E0] flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#141414]">Nouvelle Ressource</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[#F8F9FA] rounded-full transition-colors">
                <X className="w-5 h-5 text-[#8E9299]" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Nom de la ressource</label>
                <input 
                  type="text" 
                  value={newResource.name}
                  onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                  placeholder="Ex: Ablation 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Secteur</label>
                  <select 
                    value={newResource.secteur}
                    onChange={(e) => setNewResource({ ...newResource, secteur: e.target.value as any })}
                    className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                  >
                    <option value="ablation">Ablation</option>
                    <option value="decolletage">Décolletage</option>
                    <option value="decoupe">Découpe</option>
                    <option value="soudage">Soudage</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Type</label>
                  <select 
                    value={newResource.type}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                  >
                    <option value="machine">Machine</option>
                    <option value="operator">Opérateur</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl">
                <div className="flex items-center gap-3">
                  <Settings2 className="w-5 h-5 text-[#8E9299]" />
                  <span className="text-sm font-bold text-[#141414]">Mode 24h/24</span>
                </div>
                <button 
                  onClick={() => setNewResource({ ...newResource, mode24h: !newResource.mode24h })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    newResource.mode24h ? "bg-[#FF4E00]" : "bg-[#E4E3E0]"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    newResource.mode24h ? "left-7" : "left-1"
                  )}></div>
                </button>
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
                onClick={handleAddResource}
                className="flex-1 py-4 bg-[#151619] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl"
              >
                Créer la ressource
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
