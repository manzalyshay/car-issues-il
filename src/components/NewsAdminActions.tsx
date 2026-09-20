'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';

export default function NewsAdminActions({ newsId }: { newsId: string }) {
  const { isAdmin, session } = useAuth();
  const router = useRouter();

  if (!isAdmin) return null;

  async function handleDelete() {
    if (!confirm('Delete this news article permanently?')) return;
    const token = session?.access_token;
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'delete_news', newsId }),
    });
    router.push('/news');
  }

  return (
    <div style={{ marginTop: 16, padding: '10px 14px', background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>Admin</span>
      <button
        onClick={handleDelete}
        style={{ fontSize: '0.8rem', color: '#fff', background: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 700 }}
      >
        Delete article
      </button>
    </div>
  );
}
