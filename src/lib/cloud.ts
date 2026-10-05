import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const cloudConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
let browserClient: SupabaseClient | null = null;

export function browserCloud(): SupabaseClient {
  if (!cloudConfigured) throw new Error('A Supabase project is not configured.');
  browserClient ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return browserClient;
}

export async function requestCloud(request: Request): Promise<{ client: SupabaseClient; userId: string }> {
  if (!cloudConfigured) throw new Error('A Supabase project is not configured.');
  const header = request.headers.get('authorization') ?? '';
  const token = /^Bearer (.+)$/i.exec(header)?.[1];
  if (!token) throw new Error('Sign in as a caregiver to save food settings.');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error('Your session has expired. Sign in again.');
  return { client, userId: data.user.id };
}
