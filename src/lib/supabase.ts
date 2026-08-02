import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

/**
 * Cliente de Supabase. Si faltan las variables de entorno, la app muestra
 * la pantalla de configuración en lugar de romperse.
 */
export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anonKey!)
  : (null as unknown as SupabaseClient)
