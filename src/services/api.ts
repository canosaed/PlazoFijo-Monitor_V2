import type { FixedDeposit, InvestmentEvent, BackupData } from '../types';

const API_BASE_URL = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return result.data;
}

export async function getAllDeposits(includeDemo: boolean = true): Promise<FixedDeposit[]> {
  return fetchJson<FixedDeposit[]>(`${API_BASE_URL}/deposits?includeDemo=${includeDemo}`);
}

export async function getDepositById(id: string): Promise<FixedDeposit | undefined> {
  try {
    return await fetchJson<FixedDeposit>(`${API_BASE_URL}/deposits/${id}`);
  } catch {
    return undefined;
  }
}

export async function saveDeposit(deposit: FixedDeposit, eventDescription?: string): Promise<FixedDeposit> {
  return fetchJson<FixedDeposit>(`${API_BASE_URL}/deposits`, {
    method: 'POST',
    body: JSON.stringify({ deposit, eventDescription }),
  });
}

export async function confirmCollectionApi(
  depositId: string,
  collectedInterest: number,
  collectedCapital: number,
  closeInvestment: boolean
): Promise<FixedDeposit> {
  return fetchJson<FixedDeposit>(`${API_BASE_URL}/deposits/${depositId}/confirm-collection`, {
    method: 'POST',
    body: JSON.stringify({ collectedInterest, collectedCapital, closeInvestment }),
  });
}

export async function renewDepositApi(
  oldDepositId: string,
  newCapital: number,
  newTna: number,
  newDays: number,
  newStartDate: string,
  autoRenewal: boolean
): Promise<{ oldDeposit: FixedDeposit; newDeposit: FixedDeposit }> {
  return fetchJson<{ oldDeposit: FixedDeposit; newDeposit: FixedDeposit }>(
    `${API_BASE_URL}/deposits/${oldDepositId}/renew`,
    {
      method: 'POST',
      body: JSON.stringify({ newCapital, newTna, newDays, newStartDate, autoRenewal }),
    }
  );
}

export async function deleteDeposit(id: string): Promise<void> {
  await fetchJson<{ message: string }>(`${API_BASE_URL}/deposits/${id}`, {
    method: 'DELETE',
  });
}

export async function clearAllData(includeReal: boolean = false): Promise<void> {
  await fetchJson<{ message: string }>(`${API_BASE_URL}/clear-data`, {
    method: 'POST',
    body: JSON.stringify({ includeReal }),
  });
}

export async function getAllEvents(depositId?: string): Promise<InvestmentEvent[]> {
  const query = depositId ? `?depositId=${depositId}` : '';
  return fetchJson<InvestmentEvent[]>(`${API_BASE_URL}/events${query}`);
}

export async function exportBackupJSON(): Promise<BackupData> {
  return fetchJson<BackupData>(`${API_BASE_URL}/backup`);
}

export async function restoreBackupJSON(data: BackupData): Promise<{ importedDeposits: number; importedEvents: number }> {
  return fetchJson<{ importedDeposits: number; importedEvents: number }>(`${API_BASE_URL}/backup/restore`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function importDepositsApi(deposits: FixedDeposit[], fileName?: string): Promise<{ importedCount: number; errorsCount: number }> {
  return fetchJson<{ importedCount: number; errorsCount: number }>(`${API_BASE_URL}/import`, {
    method: 'POST',
    body: JSON.stringify({ deposits, fileName }),
  });
}

export async function migrateIndexedDbDataApi(deposits: FixedDeposit[], events: InvestmentEvent[]): Promise<void> {
  await fetchJson<{ message: string }>(`${API_BASE_URL}/migrate-indexeddb`, {
    method: 'POST',
    body: JSON.stringify({ deposits, events }),
  });
}
