import type { Api } from '../types'
import { createDemoApi } from './demo'
import { createLiveApi } from './live'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Mit gesetzten VITE_SUPABASE_*-Variablen läuft die Seite gegen Supabase, sonst im Demo-Modus. */
export const api: Api = url && key ? createLiveApi(url, key) : createDemoApi()
