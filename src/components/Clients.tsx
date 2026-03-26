import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  User,
  Mail,
  Phone,
  MapPin,
  X,
  Trash2,
  Edit2
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Client } from '../types';
import { cn } from '../lib/utils';

export const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    nom: '',
    npa: '',
    ville: '',
    email: '',
    telephone: ''
  });

  useEffect(() => {
    const path = 'clients';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Client[];
      setClients(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => unsubscribe();
  }, []);

  const handleSaveClient = async () => {
    const path = 'clients';
    try {
      if (editingClient) {
        await updateDoc(doc(db, path, editingClient.id!), newClient);
      } else {
        await addDoc(collection(db, path), newClient);
      }
      setShowAddModal(false);
      setEditingClient(null);
      setNewClient({ nom: '', npa: '', ville: '', email: '', telephone: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    const path = `clients/${id}`;
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#141414]">Gestion des Clients</h2>
          <p className="text-[#8E9299] text-sm">Gérez votre base de données clients.</p>
        </div>
        <button 
          onClick={() => {
            setEditingClient(null);
            setNewClient({ nom: '', npa: '', ville: '', email: '', telephone: '' });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF4E00] text-white rounded-xl font-bold hover:bg-[#E64600] transition-all shadow-lg shadow-[#FF4E00]/20"
        >
          <Plus className="w-5 h-5" /> Ajouter un client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div key={client.id} className="bg-white rounded-2xl border border-[#E4E3E0] shadow-sm overflow-hidden group">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F8F9FA] rounded-xl flex items-center justify-center text-[#FF4E00]">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#141414]">{client.nom}</h3>
                    <div className="flex items-center gap-1 text-xs text-[#8E9299] font-medium uppercase tracking-wider">
                      <MapPin className="w-3 h-3" /> {client.npa} {client.ville}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingClient(client);
                      setNewClient(client);
                      setShowAddModal(true);
                    }}
                    className="p-2 text-[#8E9299] hover:bg-[#F8F9FA] hover:text-[#FF4E00] rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(client.id!)}
                    className="p-2 text-[#8E9299] hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-[#141414]">
                  <Mail className="w-4 h-4 text-[#8E9299]" />
                  <span>{client.email || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#141414]">
                  <Phone className="w-4 h-4 text-[#8E9299]" />
                  <span>{client.telephone || 'Non renseigné'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-[#E4E3E0] flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#141414]">{editingClient ? 'Modifier le client' : 'Nouveau Client'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[#F8F9FA] rounded-full transition-colors">
                <X className="w-5 h-5 text-[#8E9299]" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Nom de l'entreprise</label>
                <input 
                  type="text" 
                  value={newClient.nom}
                  onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                  placeholder="Ex: MedTech SA"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">NPA</label>
                  <input 
                    type="text" 
                    value={newClient.npa}
                    onChange={(e) => setNewClient({ ...newClient, npa: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                    placeholder="1000"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Ville</label>
                  <input 
                    type="text" 
                    value={newClient.ville}
                    onChange={(e) => setNewClient({ ...newClient, ville: e.target.value })}
                    className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                    placeholder="Lausanne"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Email</label>
                <input 
                  type="email" 
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                  placeholder="contact@client.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#8E9299] uppercase tracking-wider">Téléphone</label>
                <input 
                  type="text" 
                  value={newClient.telephone}
                  onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F8F9FA] border-none rounded-xl focus:ring-2 focus:ring-[#FF4E00] transition-all"
                  placeholder="+41 21 000 00 00"
                />
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
                onClick={handleSaveClient}
                className="flex-1 py-4 bg-[#151619] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-xl"
              >
                {editingClient ? 'Mettre à jour' : 'Créer le client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
