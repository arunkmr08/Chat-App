import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * UI State Store
 * Manages client-side UI state (sidebar, panels, etc.)
 */

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Source Manager Panel
  sourcePanelOpen: boolean
  toggleSourcePanel: () => void
  setSourcePanelOpen: (open: boolean) => void

  // New Chat Dialog
  newChatDialogOpen: boolean
  setNewChatDialogOpen: (open: boolean) => void

  // Network Status
  isOnline: boolean
  setIsOnline: (online: boolean) => void

  // Active Chat
  activeChatId: number | null
  setActiveChatId: (id: number | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Source Panel
      sourcePanelOpen: false,
      toggleSourcePanel: () => set((state) => ({ sourcePanelOpen: !state.sourcePanelOpen })),
      setSourcePanelOpen: (open) => set({ sourcePanelOpen: open }),

      // New Chat Dialog
      newChatDialogOpen: false,
      setNewChatDialogOpen: (open) => set({ newChatDialogOpen: open }),

      // Network Status
      isOnline: navigator.onLine,
      setIsOnline: (online) => set({ isOnline: online }),

      // Active Chat
      activeChatId: null,
      setActiveChatId: (id) => set({ activeChatId: id }),
    }),
    {
      name: 'zoai-ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sourcePanelOpen: state.sourcePanelOpen,
        activeChatId: state.activeChatId,
      }),
    }
  )
)

// Initialize network status listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useUIStore.getState().setIsOnline(true))
  window.addEventListener('offline', () => useUIStore.getState().setIsOnline(false))
}
