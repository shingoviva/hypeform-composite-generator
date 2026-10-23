import Papa from 'papaparse';
import { DEFAULT_STATE } from './demoFixtures';
import { AppState, ProfileData } from './types';

export const CSV_FIELDS = {
  name: 'name', agency: 'agency', contact: 'contact', email: 'email', instagram: 'instagram',
  height_cm: 'height', bust_cm: 'bust', waist_cm: 'waist', hips_cm: 'hips', shoes_cm: 'shoes', hair: 'hair', eyes: 'eyes',
  nationality: 'nationality', residence: 'residence', experience: 'experience', experience2: 'experience2', experience3: 'experience3', experience4: 'experience4',
  show_contact: 'showContact', show_email: 'showEmail', show_instagram: 'showInstagram', show_agency: 'showAgency', show_nationality: 'showNationality', show_residence: 'showResidence', show_experience: 'showExperience'
} as const;
export interface AgencyRow { id: string; profile: ProfileData; dataPath: string; workspaceId: string; updatedAt: string }
export const CSV_COLUMNS = ['model_id', ...Object.keys(CSV_FIELDS), 'app_workspace_id', 'app_data', 'app_updated_at'];
export function blankModel(profile?: ProfileData): AppState {
  const state = structuredClone(DEFAULT_STATE);
  for (const field of Object.values(CSV_FIELDS)) {
    (state.profile as unknown as Record<string, string | boolean>)[field] = field.startsWith('show') ? false : '';
  }
  if (profile) state.profile = { ...state.profile, ...profile };
  return state;
}
function unescapeCell(value: string) { return /^'[\s]*[=+\-@\t\r]/.test(value) ? value.slice(1) : value; }
export function parseAgencyCsv(text: string): AgencyRow[] {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', comments: '#', delimiter: ',', transformHeader: header => header.trim() });
  if (parsed.errors.length) throw new Error(`CSV: ${parsed.errors[0].message} (row ${(parsed.errors[0].row ?? 0) + 2})`);
  if (!parsed.meta.fields?.includes('model_id') || !parsed.meta.fields?.includes('name')) throw new Error('CSV requires model_id and name columns.');
  if (!parsed.data.length || parsed.data.length > 1000) throw new Error('CSV must contain 1–1000 models.');
  const ids = new Set<string>();
  return parsed.data.map((cells, index) => {
    const row = Object.fromEntries(Object.entries(cells).map(([key, value]) => [key, unescapeCell(value ?? '').trim()]));
    const id = row.model_id;
    if (Object.values(row).some(value => value.length > 4000)) throw new Error(`Row ${index + 2}: a field exceeds 4000 characters.`);
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !row.name) throw new Error(`Row ${index + 2}: model_id (letters, numbers, _ or -) and name are required.`);
    if (ids.has(id)) throw new Error(`Duplicate model_id: ${id}`); ids.add(id);
    const profile = blankModel().profile;
    for (const [column, field] of Object.entries(CSV_FIELDS)) {
      const value = row[column] || '';
      if (field.startsWith('show')) {
        if (value && !/^(1|0|true|false|yes|no)$/i.test(value)) throw new Error(`Row ${index + 2}: ${column} must be 1 or 0.`);
        const fallback = field === 'showContact' || field === 'showEmail' || !!row[{ showAgency: 'agency', showInstagram: 'instagram', showNationality: 'nationality', showResidence: 'residence', showExperience: 'experience' }[field] || ''];
        (profile as unknown as Record<string, boolean>)[field] = value ? /^(1|true|yes)$/i.test(value) : fallback;
      } else (profile as unknown as Record<string, string>)[field] = value;
    }
    for (const field of ['height','bust','waist','hips','shoes'] as const) if (profile[field] && (!/^\d+(\.\d+)?$/.test(profile[field]) || Number(profile[field]) > 400)) throw new Error(`Row ${index + 2}: ${field} must be a number in cm.`);
    return { id, profile, dataPath: row.app_data || '', workspaceId: row.app_workspace_id || '', updatedAt: row.app_updated_at || '' };
  });
}
export function makeAgencyCsv(rows: AgencyRow[], notes: string[] = []) {
  const data = rows.map(row => {
    const cells: Record<string, string> = { model_id: row.id, app_workspace_id: row.workspaceId, app_data: row.dataPath, app_updated_at: row.updatedAt };
    for (const [column, field] of Object.entries(CSV_FIELDS)) cells[column] = typeof row.profile[field] === 'boolean' ? (row.profile[field] ? '1' : '0') : String(row.profile[field] ?? '');
    return cells;
  });
  return '\uFEFF' + notes.map(line => `# ${line.replace(/[\r\n]/g, ' ')}\r\n`).join('') + Papa.unparse({ fields: CSV_COLUMNS, data: data.map(row => CSV_COLUMNS.map(column => row[column] || '')) }, { newline: '\r\n', escapeFormulae: /^[\s]*[=+\-@\t\r]/ });
}
export function templateCsv(japanese: boolean) {
  const notes = japanese ? [
    'Hypeform Composite Generator / モデル一括入力テンプレート',
    '下の2名は入力例です。Excelで置き換え・行追加してください。説明行（#）はそのままで構いません。',
    'model_idは重複しない番号または英数字、nameは必須です。サイズはcmの数値、表示設定は1=表示・0=非表示です。',
    'Instagramはaccount・@account・プロフィールURLで入力できます。入力後はCSV UTF-8形式で保存してください。',
    'app_から始まる列はアプリ専用です。テンプレートでは空欄、編集ZIPから出したCSVでは変更しないでください。',
    '編集の再開はZIPをそのまま読み込むか、models.csvを含む展開フォルダーを選択してください。'
  ] : ['Hypeform Composite Generator / Agency template', 'Replace the two examples in Excel and add rows. Lines starting with # are instructions.', 'model_id must be unique (letters, numbers, _ or -). name is required. Sizes are numbers in cm; visibility: 1=show, 0=hide.', 'Instagram accepts account, @account or a profile URL. Save as CSV UTF-8. Do not edit app_ columns.', 'Resume by importing the ZIP directly or selecting its extracted folder containing models.csv.'];
  const sample = (id: string, name: string): AgencyRow => ({ id, profile: { ...blankModel().profile, name, agency: 'VIVA AGENCY', email: 'booking@example.com', instagram: '@example_model', height: '175', bust: '82', waist: '60', hips: '88', shoes: '24.5', hair: 'Black', eyes: 'Brown', showEmail: true, showInstagram: true, showAgency: true }, dataPath: '', workspaceId: '', updatedAt: '' });
  return makeAgencyCsv([sample('1', 'Kate Sanada'), sample('2', 'Alex Morgan')], notes);
}
export async function readCsvFile(file: File) {
  const bytes = await file.arrayBuffer();
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return new TextDecoder('shift_jis', { fatal: true }).decode(bytes); }
}
