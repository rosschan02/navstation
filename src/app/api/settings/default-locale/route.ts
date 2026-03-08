import { NextResponse } from 'next/server';
import { getConfiguredDefaultLocale } from '@/lib/i18n/content';

export const dynamic = 'force-dynamic';

export async function GET() {
  const defaultLocale = await getConfiguredDefaultLocale();
  return NextResponse.json({ default_locale: defaultLocale });
}
