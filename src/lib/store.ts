'use client'
import { create } from 'zustand'
import type { SessionUser } from './types'

export type ViewKey =
  | 'dashboard' | 'cases' | 'case-detail' | 'reception' | 'organizations'
  | 'users' | 'reports' | 'settings' | 'print' | 'my-cases'

interface AppState {
  user: SessionUser | null
  view: ViewKey
  currentCaseId: string | null
  printCaseId: string | null
  printDraft: boolean
  authChecked: boolean
  refreshKey: number
  setUser: (u: SessionUser | null) => void
  setAuthChecked: (v: boolean) => void
  setView: (v: ViewKey) => void
  openCase: (id: string) => void
  backToCases: () => void
  openPrint: (id: string, draft: boolean) => void
  refresh: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  view: 'dashboard',
  currentCaseId: null,
  printCaseId: null,
  printDraft: false,
  authChecked: false,
  refreshKey: 0,
  setUser: (user) => set({ user }),
  setAuthChecked: (authChecked) => set({ authChecked }),
  setView: (view) => set({ view, currentCaseId: view === 'case-detail' || view === 'print' ? undefined : null }),
  openCase: (id) => set({ view: 'case-detail', currentCaseId: id }),
  backToCases: () => set({ view: 'cases', currentCaseId: null }),
  openPrint: (id, draft) => set({ view: 'print', printCaseId: id, printDraft: draft }),
  refresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}))
