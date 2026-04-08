'use client';

import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types/auth';
import { PartyDetailView } from '@/modules/parties/PartyDetailView';

export default function PartyDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  if (!id) {
    return (
      <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
        <div className="min-h-screen bg-slate-50 p-6 text-center text-slate-600">Invalid party.</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
      <PartyDetailView mode="page" partyId={id} />
    </ProtectedRoute>
  );
}
