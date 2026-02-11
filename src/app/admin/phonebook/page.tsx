import pool from '@/db';
import type { PhonebookEntry } from '@/types';
import { PhonebookClient } from './PhonebookClient';

export const dynamic = 'force-dynamic';

export default async function PhonebookPage() {
  let entries: PhonebookEntry[] = [];

  try {
    const { rows } = await pool.query<PhonebookEntry>(
      'SELECT * FROM phonebook_entries ORDER BY sort_order ASC, id ASC'
    );
    entries = rows;
  } catch (error) {
    console.error('Failed to load phonebook entries:', error);
  }

  return <PhonebookClient initialEntries={entries} />;
}
