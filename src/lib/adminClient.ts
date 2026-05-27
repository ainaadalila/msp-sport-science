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

export async function deleteUserAdmin(userId: string) {
  try {
    console.log('1. Deleting related physio slots...')
    const { error: slotError } = await adminDb.from('physio_slots').delete().eq('physiotherapist_id', userId)
    if (slotError) {
      console.error('Physio slot delete error:', slotError)
      throw new Error(`Failed to delete physio slots: ${slotError.message}`)
    }
    console.log('2. Physio slots deleted')

    console.log('3. Deleting related coach programs...')
    const { error: programError } = await adminDb.from('sc_programs').delete().eq('coach_id', userId)
    if (programError) {
      console.error('Coach program delete error:', programError)
      throw new Error(`Failed to delete coach programs: ${programError.message}`)
    }
    console.log('4. Coach programs deleted')

    console.log('5. Deleting supplement requests requested by user...')
    const { error: requestError } = await adminDb.from('supplement_requests').delete().eq('requested_by', userId)
    if (requestError) {
      console.error('Supplement request delete error:', requestError)
      throw new Error(`Failed to delete supplement requests: ${requestError.message}`)
    }
    console.log('6. Supplement requests deleted')

    console.log('7. Clearing user references in supplement requests (coordinator, reviewer, supporter)...')
    const { error: suppClearError } = await adminDb.from('supplement_requests')
      .update({ coordinator_id: null, reviewed_by: null, supporter_id: null })
      .or(`coordinator_id.eq.${userId},reviewed_by.eq.${userId},supporter_id.eq.${userId}`)
    if (suppClearError) {
      console.error('Supplement request clear error:', suppClearError)
      throw new Error(`Failed to clear supplement request references: ${suppClearError.message}`)
    }
    console.log('8. Supplement request references cleared')

    console.log('9. Clearing user references in audit logs...')
    const { error: auditClearError } = await adminDb.from('audit_logs').update({ user_id: null }).eq('user_id', userId)
    if (auditClearError) {
      console.error('Audit log clear error:', auditClearError)
      throw new Error(`Failed to clear audit log references: ${auditClearError.message}`)
    }
    console.log('10. Audit log references cleared')

    console.log('11. Deleting profile from database...')
    const { error: profileError } = await adminDb.from('profiles').delete().eq('id', userId)
    if (profileError) {
      console.error('Profile delete error:', profileError)
      throw new Error(`Failed to delete profile: ${profileError.message}`)
    }
    console.log('12. Profile deleted successfully')

    console.log('13. Disabling auth user...')
    const updateResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey || '',
        'Authorization': `Bearer ${serviceRoleKey || ''}`,
      },
      body: JSON.stringify({ user_metadata: { deleted_at: new Date().toISOString() } }),
    })

    if (!updateResponse.ok) {
      const error = await updateResponse.json()
      console.error('Auth API update error:', error)
      // Don't throw - profile is already deleted, this is optional
      console.log('Auth user update failed, but profile was deleted successfully')
    } else {
      console.log('14. Auth user marked as deleted')
    }

    return true
  } catch (err) {
    console.error('Error in deleteUserAdmin:', err)
    throw err
  }
}
