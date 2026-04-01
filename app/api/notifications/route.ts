/**
 * Notifications API Route
 * GET  - Fetch user notifications + stats
 * POST - Mark notification(s) as read
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthContext } from '@/lib/phase6/auth-context';
import {
  getUserNotifications,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
} from '@/services/notification.service';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getNotificationStats(ctx.userId);
      return NextResponse.json(stats);
    }

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const unreadOnly = searchParams.get('unread') === 'true';

    const notifications = await getUserNotifications(ctx.userId, { limit, unreadOnly });
    const stats = await getNotificationStats(ctx.userId);

    return NextResponse.json({ notifications, stats });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getServerAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notificationId } = body;

    if (action === 'mark_all_read') {
      const success = await markAllAsRead(ctx.userId);
      return NextResponse.json({ success });
    }

    if (action === 'mark_read' && notificationId) {
      const success = await markAsRead(notificationId);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update notification' },
      { status: error.statusCode || 500 }
    );
  }
}
