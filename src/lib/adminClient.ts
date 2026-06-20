import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

console.log('[adminClient] URL loaded:', !!supabaseUrl)
console.log('[adminClient] Service role key loaded:', !!serviceRoleKey)
console.log('[adminClient] Key length:', serviceRoleKey?.length ?? 0)

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
    console.log('[createUserAdmin] Using key length:', serviceRoleKey?.length ?? 0)
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
    console.log('[createUserAdmin] Response status:', authResponse.status)

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

export async function deleteUserAdmin(userId: string) {
  // Deleting the auth user triggers:
  // 1. Profile auto-deleted (profiles_id_fkey ON DELETE CASCADE)
  // 2. All recorded_by/created_by references nullified (ON DELETE SET NULL via migration)
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'apikey': serviceRoleKey || '',
      'Authorization': `Bearer ${serviceRoleKey || ''}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to delete user: ${response.statusText}`)
  }

  return true
}
