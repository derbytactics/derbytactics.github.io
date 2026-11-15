import { useSyncExternalStore } from 'react';
import { getAccount, subscribeAccount } from './api';

export function useAccount() {
  return useSyncExternalStore(subscribeAccount, getAccount, getAccount);
}
