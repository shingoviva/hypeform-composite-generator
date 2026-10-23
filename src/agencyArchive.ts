import { Zip, ZipPassThrough, unzipSync, strToU8, strFromU8 } from 'fflate';
import { AgencyRow, blankModel, makeAgencyCsv, parseAgencyCsv, readCsvFile } from './agencyCsv';
import { AgencyEntry, AgencyWorkspace, modelKey, readModel } from './agencyStorage';
import { Draft, StoredDraft, imageUrls, replaceUrls, serializeDraft } from './draftStorage';
import { AppState, ProfileData } from './types';
import { SECOND_PAGE_IDS } from './secondPage';
import { NAME_FONTS } from './nameTypography';

export const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
const IMAGE_IDS = ['main','sub1','sub2','sub3','sub4',...SECOND_PAGE_IDS];
export interface AgencyImport {
  title: string;
  rows: AgencyRow[];
  workspaceId?: string;
  load: (row: AgencyRow) => Promise<StoredDraft>;
}
export function matchingCachedEntry(plan: AgencyImport, row: AgencyRow, workspace: AgencyWorkspace | null, entries: AgencyEntry[]) {
  if (!workspace || (plan.workspaceId && plan.workspaceId !== workspace.id)) return undefined;
  const candidate = entries.find(entry => entry.id === row.id);
  if (!candidate) return undefined;
  const name = row.profile.name.trim().toLocaleLowerCase();
  return plan.workspaceId || [candidate.name, candidate.sourceProfile.name].some(value => value.trim().toLocaleLowerCase() === name) ? candidate : undefined;
}
function safePath(path: string) {
  if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').some(part => part === '..' || part === '.' || !part) || path.includes(':')) throw new Error(`Unsafe project path: ${path}`);
  return path;
}
const fields: (keyof ProfileData)[] = ['name','nameFont','nameSize','nameSpacing','nameItalic','nameAtBottom','contact','showContact','email','showEmail','instagram','showInstagram','agency','showAgency','height','bust','waist','hips','shoes','hair','eyes','nationality','showNationality','residence','showResidence','experience','experience2','experience3','experience4','showExperience'];
function validateState(value: unknown): AppState {
  if (!value || typeof value !== 'object') throw new Error('Invalid project state');
  const input = value as AppState;
  if (!input.profile || !input.images || !input.watermark) throw new Error('Incomplete project state');
  const state = blankModel();
  for (const field of fields) {
    const v = input.profile[field];
    if (v === undefined) continue;
    const kind = field.startsWith('show') || ['nameItalic','nameAtBottom'].includes(field) ? 'boolean' : ['nameSize','nameSpacing'].includes(field) ? 'number' : 'string';
    if (typeof v !== kind || (typeof v === 'number' && !Number.isFinite(v)) || (typeof v === 'string' && v.length > 4000)) throw new Error(`Invalid profile field: ${field}`);
    (state.profile as unknown as Record<string, unknown>)[field] = v;
  }
  if (state.profile.nameFont && !NAME_FONTS.some(font => font.family === state.profile.nameFont)) throw new Error('Unsupported name font');
  const numeric = (value: unknown, min: number, max: number, fallback: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('Invalid numeric project setting');
    return value;
  };
  if(input.profile.nameSize!==undefined)state.profile.nameSize = numeric(input.profile.nameSize,32,84,52);
  if(input.profile.nameSpacing!==undefined)state.profile.nameSpacing = numeric(input.profile.nameSpacing,0,1,0);
  state.compositeMargin = numeric(input.compositeMargin,16,80,28);
  state.instagram = { margin:numeric(input.instagram?.margin,24,100,32),gap:numeric(input.instagram?.gap,16,40,24) };
  state.secondPageEnabled = !!input.secondPageEnabled;
  const w = input.watermark;
  if (!['text','image'].includes(w.type) || typeof w.text !== 'string' || w.text.length > 4000 || !NAME_FONTS.some(font => font.family === w.font)) throw new Error('Invalid watermark settings');
  state.watermark = { enabled:!!w.enabled,type:w.type,text:w.text,font:w.font,imageUrl:typeof w.imageUrl === 'string' ? w.imageUrl : null,opacity:numeric(w.opacity,0,100,50),size:numeric(w.size,40,140,100),textSize:numeric(w.textSize,16,38,31),textSpacing:w.textSpacing===undefined?undefined:numeric(w.textSpacing,0,1,0),textItalic:!!w.textItalic };
  for (const id of IMAGE_IDS) {
    const image = input.images[id];
    if (!image) { if (state.secondPageEnabled && id.startsWith('page2-')) state.images[id] = {id,originalUrl:null,croppedUrl:null}; continue; }
    state.images[id] = { id,originalUrl:typeof image.originalUrl === 'string' ? image.originalUrl : null,croppedUrl:typeof image.croppedUrl === 'string' ? image.croppedUrl : null,fitMode:image.fitMode === 'contain' ? 'contain' : 'cover',exposure:numeric(image.exposure,-1,1,0),vibrance:numeric(image.vibrance,-50,50,0),zoom:numeric(image.zoom,1,3,1) };
    if (image.crop) state.images[id].crop = {x:numeric(image.crop.x,-1e7,1e7,0),y:numeric(image.crop.y,-1e7,1e7,0)};
    if (image.cropArea) state.images[id].cropArea = { x:numeric(image.cropArea.x,0,1e7,0),y:numeric(image.cropArea.y,0,1e7,0),width:numeric(image.cropArea.width,0,1e7,0),height:numeric(image.cropArea.height,0,1e7,0) };
  }
  return state;
}
export function csvImport(text: string, title: string): AgencyImport {
  const rows = parseAgencyCsv(text);
  const ids = new Set(rows.map(row => row.workspaceId).filter(Boolean));
  if (ids.size > 1) throw new Error('CSV contains multiple workspace IDs.');
  return { title,rows,workspaceId:[...ids][0],load:async row => serializeDraft({state:blankModel(row.profile),uiLanguage:'en',highResolution:false}) };
}
async function fileImport(files: Map<string, Blob>, title: string, csvText?: string): Promise<AgencyImport> {
  const csv = files.get('models.csv');
  if (!csvText && !csv) throw new Error('models.csv was not found in the selected folder.');
  const plan = csvImport(csvText ?? await readCsvFile(new File([csv!],'models.csv')), title);
  plan.load = async row => {
    if (!row.dataPath) return serializeDraft({state:blankModel(row.profile),uiLanguage:'en',highResolution:false});
    if (!/^data\/models\/[a-zA-Z0-9_-]+\.json$/.test(safePath(row.dataPath))) throw new Error(`Invalid model data path: ${row.dataPath}`);
    const json = files.get(row.dataPath);
    if (!json || json.size > 2 * 1024 * 1024) throw new Error(`Model data missing or too large: ${row.dataPath}`);
    const document = JSON.parse(await json.text());
    if (document.version !== 1) throw new Error('Unsupported project version');
    const state = validateState(document.state);
    state.profile = { ...state.profile, ...row.profile, nameFont:state.profile.nameFont,nameSize:state.profile.nameSize,nameSpacing:state.profile.nameSpacing,nameItalic:state.profile.nameItalic,nameAtBottom:state.profile.nameAtBottom };
    const references = new Map<string, string>(); const assets: StoredDraft['assets'] = {};
    for (const path of imageUrls(state)) {
      if (!path || references.has(path)) continue;
      if (!/^data\/assets\/[a-f0-9]{64}\.[a-z0-9]+$/.test(safePath(path))) throw new Error(`Invalid image path: ${path}`);
      const file = files.get(path), type = document.assets?.[path]?.type;
      if (!file || file.size > 64 * 1024 * 1024 || typeof type !== 'string' || !/^image\/[a-zA-Z0-9.+-]+$/.test(type)) throw new Error(`Photo missing or invalid: ${path}`);
      const bytes=await file.arrayBuffer();
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      if(path.split('/').pop()!.split('.')[0]!==hash)throw new Error(`Photo integrity check failed: ${path}`);
      const reference = `asset:${references.size}`;references.set(path,reference);assets[reference] = {bytes,type};
    }
    return {version:1,state:replaceUrls(state,url=>url ? references.get(url)! : null),assets,uiLanguage:document.uiLanguage === 'ja' ? 'ja' : 'en',highResolution:!!document.highResolution};
  };
  return plan;
}
export async function folderImport(selected: File[], csvText?: string): Promise<AgencyImport> {
  if (selected.length > 20000 || selected.reduce((sum,file)=>sum+file.size,0) > MAX_ARCHIVE_BYTES) throw new Error('Folder exceeds the 512 MB project limit.');
  const csvFile = selected.find(file => file.name === 'models.csv');
  const rootPath = csvFile?.webkitRelativePath.split('/').slice(0,-1).join('/') ?? selected[0]?.webkitRelativePath.split('/')[0];
  if (!rootPath) throw new Error('Select the extracted project folder.');
  const files = new Map<string,Blob>();
  for (const file of selected) {
    const relative = file.webkitRelativePath.slice(rootPath.length + 1);
    if (file.webkitRelativePath.startsWith(rootPath + '/') && relative) files.set(safePath(relative),file);
  }
  return fileImport(files, rootPath.split('/').pop() || 'Agency', csvText);
}
export async function zipImport(file: File): Promise<AgencyImport> {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error('ZIP exceeds the 512 MB project limit.');
  let total=0,count=0;
  const unpacked=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:entry=>{
    safePath(entry.name.replace(/\/$/,''));
    total+=entry.originalSize;count++;
    if (!Number.isFinite(total)||total>MAX_ARCHIVE_BYTES||entry.originalSize>64*1024*1024||count>20000) throw new Error('ZIP exceeds safe extraction limits.');
    return !entry.name.endsWith('/');
  }});
  const paths=Object.keys(unpacked);const csvPath=paths.includes('models.csv') ? 'models.csv' : paths.find(path=>path.endsWith('/models.csv'));
  if (!csvPath) throw new Error('models.csv was not found in the ZIP.');
  const prefix=csvPath.slice(0,-'models.csv'.length);const files=new Map<string,Blob>();
  for(const path of paths)if(path.startsWith(prefix))files.set(path.slice(prefix.length),new Blob([unpacked[path]]));
  return fileImport(files,file.name.replace(/\.zip$/i,''),strFromU8(unpacked[csvPath]));
}
export function defaultArchiveName() {
  const now=new Date();const pad=(n:number)=>String(n).padStart(2,'0');
  return `hypeform_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
export async function exportAgencyZip(workspace: AgencyWorkspace, entries: AgencyEntry[], override: {id:string;draft:Draft} | null, progress:(current:number,total:number)=>void) {
  const chunks: BlobPart[]=[];let failure:Error|null=null,total=0;
  const zip=new Zip((error,data)=>{if(error)failure=error;else chunks.push(data as Uint8Array<ArrayBuffer>);});
  const add=(path:string,bytes:Uint8Array)=>{
    total+=bytes.byteLength;if(total>MAX_ARCHIVE_BYTES)throw new Error('Project exceeds 512 MB. Export smaller model groups.');
    const file=new ZipPassThrough(path);zip.add(file);file.push(bytes,true);if(failure)throw failure;
  };
  const included=new Set<string>();const rows:AgencyRow[]=[];
  try {
    for(const [index,entry] of entries.entries()) {
      const saved=override?.id===entry.id?null:await readModel(modelKey(workspace,entry.id));
      const draft=saved?saved.draft:await serializeDraft(override!.draft);
      const paths=new Map<string,string>();const assets:Record<string,{type:string}>={};
      for(const [reference,asset] of Object.entries(draft.assets)) {
        const digest=await crypto.subtle.digest('SHA-256',asset.bytes);
        const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
        const extension=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg','image/avif':'avif'} as Record<string,string>)[asset.type] || 'bin';
        const path=`data/assets/${hash}.${extension}`;paths.set(reference,path);assets[path]={type:asset.type};
        if(!included.has(path)){add(path,new Uint8Array(asset.bytes));included.add(path);}
      }
      const path=`data/models/${entry.id}.json`;
      add(path,strToU8(JSON.stringify({version:1,state:replaceUrls(draft.state,url=>url ? paths.get(url)! : null),assets,uiLanguage:draft.uiLanguage,highResolution:draft.highResolution})));
      rows.push({id:entry.id,profile:draft.state.profile,dataPath:path,workspaceId:workspace.id,updatedAt:saved?saved.entry.updatedAt:new Date().toISOString()});
      progress(index+1,entries.length);await new Promise(resolve=>setTimeout(resolve,0));
    }
    add('models.csv',strToU8(makeAgencyCsv(rows)));
    add('README.txt',strToU8('Hypeform Composite Generator\n\n再開: ZIPをそのままアプリに読み込むか、展開フォルダーを選択してください。\nmodels.csvはExcelで編集可能です。app_列とdataフォルダーは変更しないでください。\n写真・調整・レイアウトはdata内に保存されています。フォルダー全体を一緒に保管してください。\n\nResume: import this ZIP directly, or select the extracted folder.\nEdit models.csv in Excel (CSV UTF-8); keep app_ columns and the data folder intact.\nImages and editing settings are stored in data. Keep the whole folder together.\n'));
    zip.end();if(failure)throw failure;return new Blob(chunks,{type:'application/zip'});
  } catch(error){zip.terminate();throw error;}
}
