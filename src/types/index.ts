export type DepositType = 'TRADICIONAL_TF' | 'UVA' | 'PRECANCELABLE' | 'OTRO';

export type DepositStatus = 
  | 'VIGENTE' 
  | 'PROXIMO_A_VENCER' 
  | 'VENCIDO_PENDIENTE' 
  | 'RENOVADO' 
  | 'CERRADO' 
  | 'CANCELADO';

export interface FixedDeposit {
  id: string;
  bank: string;
  description: string;
  type: DepositType;
  capital: number; // ARS
  startDate: string; // ISO format YYYY-MM-DD
  endDate: string; // ISO format YYYY-MM-DD
  days: number;
  tna: number; // e.g. 37.5
  tea?: number | null;
  estimatedInterest: number;
  reportedInterest?: number | null;
  collectedInterest?: number | null;
  estimatedTotalAmount: number;
  reportedTotalAmount?: number | null;
  collectedCapital?: number | null;
  autoRenewal: boolean;
  status: DepositStatus;
  previousId?: string | null;
  nextId?: string | null;
  notes?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EventType = 
  | 'ALTA' 
  | 'MODIFICACION' 
  | 'VENCIMIENTO' 
  | 'CONFIRMACION_COBRO' 
  | 'CONFIRMACION_CAPITAL' 
  | 'RENOVACION' 
  | 'CIERRE' 
  | 'CANCELACION';

export interface InvestmentEvent {
  id: string;
  depositId: string;
  timestamp: string; // ISO format
  type: EventType;
  description: string;
  amounts?: {
    capital?: number | null;
    interest?: number | null;
    total?: number | null;
  };
  metadata?: Record<string, any>;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  deposits: FixedDeposit[];
  events: InvestmentEvent[];
  settings?: Record<string, any>;
}

export interface FinancialSummary {
  totalActiveCapital: number;
  totalPendingInterest: number;
  totalEstimatedAtMaturity: number;
  activeCount: number;
  upcomingMaturities7dCount: number;
  upcomingMaturities15dCount: number;
  upcomingMaturities30dCount: number;
  pendingConfirmationCount: number;
  weightedAverageTna: number;
}
