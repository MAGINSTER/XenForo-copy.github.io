import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Требуется авторизация.' }, 401)
    const url = Deno.env.get('SUPABASE_URL')
    const publishableKeysRaw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
    const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS')
    const publishableKey = publishableKeysRaw ? JSON.parse(publishableKeysRaw).default : Deno.env.get('SUPABASE_ANON_KEY')
    const secretKey = secretKeysRaw ? JSON.parse(secretKeysRaw).default : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !publishableKey || !secretKey) {
      console.error('Required Supabase function environment variables are missing.')
      return reply({ error: 'Сервис удаления аккаунта временно недоступен.' }, 500)
    }
    const token = authorization.slice('Bearer '.length)
    const userClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    if (userError || !user) return reply({ error: 'Сессия недействительна. Войдите снова.' }, 401)
    const adminClient = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error('Account deletion failed:', deleteError.message)
      return reply({ error: 'Не удалось удалить аккаунт. Попробуйте позже или обратитесь к администратору.' }, 500)
    }
    return reply({ success: true })
  } catch (error) {
    console.error('Unexpected account deletion error:', error)
    return reply({ error: 'Внутренняя ошибка при удалении аккаунта.' }, 500)
  }
})
