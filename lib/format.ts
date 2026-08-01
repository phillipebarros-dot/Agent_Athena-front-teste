/** Formatadores pt-BR compartilhados. */

export function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function fmtNum(n?: number | string | null): string {
  if (n == null || n === '') return '0';
  const v = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(v)) return String(n);
  return v.toLocaleString('pt-BR');
}

export function initials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return '?';
  const base = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0].replace(/[._-]/g, ' ') : nameOrEmail;
  const parts = base.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || base.slice(0, 2).toUpperCase();
}

export function shortName(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return '';
  const base = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0].replace(/[._-]/g, ' ') : nameOrEmail;
  return base.split(/\s+/).slice(0, 2).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

/** Exporta um array de objetos para um arquivo CSV. */
export function downloadCSV(data: any[], filename: string) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((obj) =>
    headers.map((h) => {
      let val = obj[h];
      if (val === null || val === undefined) val = '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\\n') || str.includes('"') ? `"${str}"` : str;
    }).join(',')
  );
  
  const csvContent = [headers.join(','), ...rows].join('\\n');
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
