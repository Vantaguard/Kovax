'use server';

import { recordConsent } from '@/services/consent.service';
import { redirect } from 'next/navigation';

export async function acceptAllConsents() {
  try {
    await recordConsent();
    // Redirect happens after successful consent recording
  } catch (error) {
    console.error('Error recording consent:', error);
    return { error: 'Failed to record consent. Please try again.' };
  }
  redirect('/dashboard');
}
