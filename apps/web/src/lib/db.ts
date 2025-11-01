import Dexie, { Table } from 'dexie'

/**
 * Offline Database using Dexie (IndexedDB wrapper)
 * Stores local copies of data for offline access
 */

export interface LocalChat {
  id: number
  title: string
  group: string
  created_at: string
  updated_at: string
  synced: boolean
}

export interface LocalMessage {
  id: number
  chat_id: number
  role: 'user' | 'assistant'
  content: string
  final_answer?: string
  citations?: any[]
  created_at: string
  synced: boolean
}

export interface LocalSource {
  id: number
  chat_id: number
  type: string
  url?: string
  file_name?: string
  status: string
  created_at: string
  synced: boolean
}

export interface PendingAction {
  id?: number
  type: 'create_chat' | 'send_message' | 'add_source' | 'upload_file'
  data: any
  created_at: string
  retries: number
  last_error?: string
}

class ZoAIDatabase extends Dexie {
  chats!: Table<LocalChat, number>
  messages!: Table<LocalMessage, number>
  sources!: Table<LocalSource, number>
  pendingActions!: Table<PendingAction, number>

  constructor() {
    super('ZoAIDatabase')

    this.version(1).stores({
      chats: 'id, group, created_at, synced',
      messages: 'id, chat_id, created_at, synced',
      sources: 'id, chat_id, status, synced',
      pendingActions: '++id, type, created_at',
    })
  }

  /**
   * Clear all data (for logout)
   */
  async clearAll() {
    await this.chats.clear()
    await this.messages.clear()
    await this.sources.clear()
    await this.pendingActions.clear()
  }

  /**
   * Get unsynced data count
   */
  async getUnsyncedCount() {
    const chats = await this.chats.where('synced').equals(false).count()
    const messages = await this.messages.where('synced').equals(false).count()
    const sources = await this.sources.where('synced').equals(false).count()
    const pending = await this.pendingActions.count()

    return { chats, messages, sources, pending, total: chats + messages + sources + pending }
  }
}

export const db = new ZoAIDatabase()

/**
 * Sync local database with server
 */
export async function syncWithServer() {
  // TODO: Implement sync logic
  // 1. Push pending actions to server
  // 2. Pull latest data from server
  // 3. Resolve conflicts (server wins)
  // 4. Mark synced data
  console.log('[Sync] Syncing with server...')
}

/**
 * Add pending action to queue
 */
export async function queueAction(type: PendingAction['type'], data: any) {
  await db.pendingActions.add({
    type,
    data,
    created_at: new Date().toISOString(),
    retries: 0,
  })
}
