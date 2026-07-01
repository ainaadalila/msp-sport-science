import { supabase } from './supabase'
import type { ModulePermissions, UserRole } from '../types'

interface NewUserData {
  full_name: string
  role: UserRole
}

// This file used to hold a Supabase client built with
// VITE_SUPABASE_SERVICE_ROLE_KEY, calling the Auth admin API directly from
// the browser. That key gets inlined into the Vite bundle for ANY VITE_-
// prefixed env var, which meant the full-admin service role key shipped to
// every visitor's browser — bypassing RLS entirely for anyone who opened
// dev tools. See supabase/functions/create-user and delete-user, which now
// do this work server-side instead. This file is just a thin wrapper so
// callers (UserManagementPage.tsx) don't need to change.

export async function createUserAdmin(
  email: string,
  password: string,
  userData: NewUserData,
  modulePermissions: ModulePermissions
) {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: {
      email,
      password,
      full_name: userData.full_name,
      role: userData.role,
      module_permissions: modulePermissions,
    },
  })

  if (error) {
    // supabase-js wraps non-2xx responses in a FunctionsHttpError; the actual
    // { error: string } body from the function is on error.context.
    const message = await extractFunctionErrorMessage(error) ?? error.message
    throw new Error(message)
  }
  if (data?.error) {
    throw new Error(data.error)
  }

  return data as { user: { id: string; email: string } }
}

export async function deleteUserAdmin(userId: string) {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { userId },
  })

  if (error) {
    const message = await extractFunctionErrorMessage(error) ?? error.message
    throw new Error(message)
  }
  if (data?.error) {
    throw new Error(data.error)
  }

  return true
}

// supabase-js (FunctionsHttpError) puts the raw Response on `error.context`
// for non-2xx replies — read the JSON body we returned from the function so
// the UI shows our actual message instead of a generic "non-2xx" error.
async function extractFunctionErrorMessage(error: unknown): Promise<string | null> {
  try {
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      const parsed = await context.json()
      return parsed?.error ?? null
    }
  } catch {
    // fall through to generic message
  }
  return null
}
