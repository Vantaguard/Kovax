'use client';

import DynamicProfileForm from '@/components/dashboard/DynamicProfileForm';
import { saveDynamicProfileValues } from '@/app/(dashboard)/dashboard/interns/actions';

interface InternDynamicFieldsProps {
  fields: any[];
  profileId: string;
  readOnly?: boolean;
}

export default function InternDynamicFields({ fields, profileId, readOnly = false }: InternDynamicFieldsProps) {
  const handleSave = async (
    pid: string,
    values: Record<string, string | null>
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await saveDynamicProfileValues(pid, values);
    return result;
  };

  return (
    <DynamicProfileForm
      fields={fields}
      profileId={profileId}
      onSave={handleSave}
      readOnly={readOnly}
    />
  );
}
