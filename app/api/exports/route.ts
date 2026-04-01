/**
 * Export API Route
 * POST - Trigger data export
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import { exportData, type ExportEntityType, type ExportFormat, type ExportFilters } from '@/services/export.service';

export async function POST(request: NextRequest) {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entityType, filters = {}, format = 'csv' } = body;

    if (!entityType || !['interns', 'projects', 'tasks'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format. Use csv or json.' }, { status: 400 });
    }

    const result = await exportData(
      entityType as ExportEntityType,
      filters as ExportFilters,
      format as ExportFormat
    );

    // Return the file as a downloadable response
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Export-Id': result.exportId,
        'X-Record-Count': String(result.recordCount),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to export data' },
      { status: error.statusCode || 500 }
    );
  }
}
