export interface Client {
  id?: string;
  nom: string;
  npa: string;
  ville: string;
  email?: string;
  telephone?: string;
}

export interface Resource {
  id?: string;
  name: string;
  secteur: 'ablation' | 'decolletage' | 'decoupe' | 'soudage';
  actif: boolean;
  mode24h: boolean;
  type: 'machine' | 'operator';
}

export interface ExternalProvider {
  id?: string;
  nom: string;
  delai?: string;
  envoiPrevu?: string;
  livraisonPrevue?: string;
}

export interface OrderArticle {
  id: string;
  nom: string;
  quantite: number;
}

export interface Attachment {
  id: string;
  nom: string;
  url: string;
  type: string;
  createdAt: string;
}

export interface Order {
  id?: string;
  lotNumber: string;
  numeroCommandeERP: string;
  clientId: string;
  articles: OrderArticle[];
  delaiClientInitial: string;
  delaiSouhaite: string;
  isImperative: boolean;
  statut: 'brouillon' | 'en_attente' | 'a_confirmer' | 'valide' | 'en_cours' | 'termine' | 'cloture';
  secteur: string;
  createurId: string;
  validateurId?: string;
  notes?: string;
  
  // Attachments
  piecesJointes?: Attachment[];
  
  // Pose details
  posageRequis: boolean;
  posageStatut?: 'en_attente' | 'valide' | 'refuse';
  posageDelai?: string;
  
  // External providers
  prestatairesExternes?: ExternalProvider[];
  
  // Notifications
  notificationProduction?: string | null;
  notificationLogistique?: string | null;
  notificationPose?: string | null;
  
  clientConfirme: boolean;
  createdAt: string;
  mandatPose?: string;
}

export interface Task {
  id?: string;
  ofId: string;
  resourceId: string;
  startDate: string;
  endDate: string;
  prepTime?: number;
  prodTime?: number;
  bufferTime?: number;
  status?: string;
  progress: number;
}

export interface Notification {
  id?: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  ofId?: string;
  targetRole?: string;
}
