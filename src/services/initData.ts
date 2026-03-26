import { db } from '../firebase';
import { collection, getDocs, addDoc, query, limit } from 'firebase/firestore';

export const initializeData = async () => {
  const clientsRef = collection(db, 'clients');
  const resourcesRef = collection(db, 'resources');
  
  const clientsSnap = await getDocs(query(clientsRef, limit(1)));
  if (clientsSnap.empty) {
    console.log('Initializing default data...');
    
    // Add Clients
    const c1 = await addDoc(clientsRef, { nom: 'MedTech SA', npa: '1000', ville: 'Lausanne' });
    const c2 = await addDoc(clientsRef, { nom: 'AeroTech SA', npa: '1200', ville: 'Genève' });
    
    // Add Resources
    await addDoc(resourcesRef, { name: 'Ablation 1', secteur: 'ablation', actif: true, mode24h: false, type: 'machine' });
    await addDoc(resourcesRef, { name: 'Ablation 2', secteur: 'ablation', actif: true, mode24h: true, type: 'machine' });
    await addDoc(resourcesRef, { name: 'Tour CNC 1', secteur: 'decolletage', actif: true, mode24h: false, type: 'machine' });
    
    // Add some Orders
    const ordersRef = collection(db, 'orders');
    await addDoc(ordersRef, {
      numeroCommandeERP: 'CMD-78542',
      clientId: c1.id,
      article: 'Implant Ti-X100',
      nombrePieces: 50,
      delaiSouhaite: new Date(Date.now() + 5 * 86400000).toISOString(),
      statut: 'en_cours',
      secteur: 'ablation',
      posageRequis: true,
      clientConfirme: true
    });
  }
};
