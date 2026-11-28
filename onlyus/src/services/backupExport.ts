import JSZip from 'jszip';
import type { AppStore } from '@/stores/useAppStore';

export async function exportCoupleDataToZip(store: AppStore): Promise<void> {
  const zip = new JSZip();

  const exportPayload = {
    exportDate: new Date().toISOString(),
    appVersion: '2.0.0',
    profiles: store.profiles,
    world: store.world,
    settings: store.settings,
    messagesCount: store.messages.length,
    messages: store.messages.map((m) => ({
      id: m.id,
      sender: m.sender_id === store.profiles.me.id ? store.profiles.me.display_name : store.profiles.partner.display_name,
      kind: m.kind,
      body: m.body,
      media: m.media ? { type: m.media.type, url: m.media.url } : null,
      reactions: m.reactions,
      createdAt: m.created_at,
    })),
    callsCount: store.calls.length,
    calls: store.calls,
    notifications: store.notifications,
  };

  zip.file('onlyus-couple-data.json', JSON.stringify(exportPayload, null, 2));

  // Also include a human-readable summary text file
  const readmeText = `ONLYUS v2 Couple Backup Archive
=================================
Exported on: ${new Date().toLocaleString()}
Partners: ${store.profiles.me.display_name} & ${store.profiles.partner.display_name}
Days Together: ${store.world.streakDays || 1}
Total Messages: ${store.messages.length}
Total Calls: ${store.calls.length}
Memories & Moments: ${store.world.memories?.length || 0}

This backup contains your love story, messages, and memories safely preserved.
`;

  zip.file('README.txt', readmeText);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onlyus-backup-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
