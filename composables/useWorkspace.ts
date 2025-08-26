import type { Database } from '../types/supabase'
import { useSupabase } from './useSupabase'

type Workspace = Database['public']['Tables']['workspaces']['Row']
type Document = Database['public']['Tables']['documents']['Row']

interface Block {
  id: string
  type: string
  content: string
  position: number
}

export const useWorkspace = () => {
  const supabase = useSupabase()

  const createWorkspace = async (name: string): Promise<Workspace> => {
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name })
      .select()
      .single()

    if (error) throw error
    return data
  }

  const getWorkspaces = async (): Promise<Workspace[]> => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  const createDocument = async (workspaceId: string, title: string = 'Untitled', blocks: Block[] = []): Promise<Document> => {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        workspace_id: workspaceId,
        title,
        blocks: JSON.stringify(blocks)
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  const saveDocument = async (documentId: string, blocks: Block[]): Promise<void> => {
    const { error } = await supabase
      .from('documents')
      .update({
        blocks: JSON.stringify(blocks),
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (error) throw error
  }

  const getDocument = async (documentId: string): Promise<Document | null> => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  }

  const getDocuments = async (workspaceId: string): Promise<Document[]> => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  return {
    createWorkspace,
    getWorkspaces,
    createDocument,
    saveDocument,
    getDocument,
    getDocuments
  }
}
