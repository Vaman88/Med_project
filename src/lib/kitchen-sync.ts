import { browserCloud } from './cloud';
import { guestKitchenSchema } from './guest-kitchen';
import type { z } from 'zod';

export type SavedKitchen = z.infer<typeof guestKitchenSchema>;

async function ownAccount(expectedUserId: string) {
  const client = browserCloud();
  const { data, error } = await client.auth.getUser();
  if (error || data.user?.id !== expectedUserId) throw new Error('Your session changed. Sign in again before saving or loading.');
  return client;
}

export async function saveKitchenOnline(userId: string, kitchen: unknown): Promise<void> {
  const validated = guestKitchenSchema.safeParse(kitchen);
  if (!validated.success) throw new Error('Check your pantry and household settings before saving.');
  const client = await ownAccount(userId);
  const { error } = await client.from('kitchen_saves').upsert({ user_id: userId, kitchen: validated.data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error('Your kitchen could not be saved online. Please try again. Your current pantry is still open.');
}

export async function loadKitchenOnline(userId: string): Promise<SavedKitchen | null> {
  const client = await ownAccount(userId);
  const { data, error } = await client.from('kitchen_saves').select('kitchen').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('Your saved kitchen could not be loaded. Please try again.');
  if (!data) return null;
  const validated = guestKitchenSchema.safeParse(data.kitchen);
  if (!validated.success) throw new Error('This saved kitchen could not be read. Your current pantry has not been changed.');
  return validated.data;
}
