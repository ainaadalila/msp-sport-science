import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Client for inserting into profiles table
const adminDb = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function createUserAdmin(
  email: string,
  password: string,
  userData: Record<string, any>,
  modulePermissions: Record<string, any>
) {
  try {
    console.log('1. Creating auth user...')
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey || '',
        'Authorization': `Bearer ${serviceRoleKey || ''}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: userData,
      }),
    })

    if (!authResponse.ok) {
      const error = await authResponse.json()
      console.error('Auth API error response:', error)
      throw new Error(error.message || `Failed to create auth user: ${authResponse.statusText}`)
    }

    const authUser = await authResponse.json()
    console.log('2. Auth user response:', authUser)
    const userId = authUser.user?.id || authUser.id
    console.log('3. User ID:', userId)

    // Create profile row
    console.log('4. Creating profile...')
    const { error: profileError } = await adminDb.from('profiles').insert({
      id: userId,
      full_name: userData.full_name || 'User',
      role: userData.role,
      module_permissions: modulePermissions,
      created_at: new Date().toISOString(),
    })

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    console.log('5. Profile created successfully')
    return authUser
  } catch (err) {
    console.error('Error in createUserAdmin:', err)
    throw err
  }
}
