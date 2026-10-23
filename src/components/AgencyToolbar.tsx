import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Download, FolderOpen, Upload, Archive, RotateCcw, X } from 'lucide-react';
import { useAgencyWorkspace } from '../useAgencyWorkspace';
import { AgencyImport, csvImport, defaultArchiveName, folderImport, zipImport, matchingCachedEntry } from '../agencyArchive';
import { readCsvFile, templateCsv } from '../agencyCsv';

type Controller = ReturnType<typeof useAgencyWorkspace>;
function download(blob:Blob,name:string) {
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export default function AgencyToolbar({controller:c}:{controller:Controller}) {
  const ja=c.draft.uiLanguage==='ja';
  const [pending,setPending]=useState<AgencyImport|null>(null),[needsFolder,setNeedsFolder]=useState(false),[pendingCsv,setPendingCsv]=useState<string|undefined>();
  const [preferCache,setPreferCache]=useState(true),[localError,setLocalError]=useState(''),[reading,setReading]=useState(false);
  const [query,setQuery]=useState(''),[fileName,setFileName]=useState(defaultArchiveName);
  const [customFileName,setCustomFileName]=useState(false);
  useEffect(()=>{if(!customFileName)setFileName(defaultArchiveName());},[c.entries,customFileName]);
  const file=useRef<HTMLInputElement>(null),folder=useRef<HTMLInputElement>(null);
  const dialog=useRef<HTMLElement>(null);
  useEffect(()=>{if(pending)dialog.current?.querySelector<HTMLButtonElement>('[data-agency-cancel]')?.focus({preventScroll:true});},[pending]);
  const busy=c.busy||reading;
  const error=localError||c.error;
  const overlap=pending?.rows.filter(row=>matchingCachedEntry(pending,row,c.workspace,c.entries)).length||0;
  const canUseCache=!!pending&&overlap===pending.rows.length;
  const list=c.entries.filter(entry=>`${entry.id} ${entry.name}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const active=c.entries.find(entry=>entry.id===c.activeId);
  if(active&&!list.some(entry=>entry.id===active.id))list.unshift(active);
  const index=c.entries.findIndex(entry=>entry.id===c.activeId);
  const read=async(files:FileList|null,isFolder=false)=>{
    if(!files?.length)return;setReading(true);setLocalError('');c.clearError();
    try{
      let plan:AgencyImport;
      if(isFolder){plan=await folderImport(Array.from(files),pendingCsv);setNeedsFolder(false);setPendingCsv(undefined);}
      else if(files[0].name.toLowerCase().endsWith('.zip')){plan=await zipImport(files[0]);setNeedsFolder(false);setPendingCsv(undefined);}
      else{
        if(files[0].size>8*1024*1024)throw new Error('CSV exceeds 8 MB.');
        const text=await readCsvFile(files[0]);plan=csvImport(text,files[0].name.replace(/\.csv$/i,''));
        const references=plan.rows.some(row=>row.dataPath);setNeedsFolder(references);setPendingCsv(references?text:undefined);
      }
      setPending(plan);setPreferCache(true);
    }catch(problem){setLocalError(problem instanceof Error?problem.message:String(problem));}
    finally{setReading(false);if(file.current)file.current.value='';if(folder.current)folder.current.value='';}
  };
  const cancel=()=>{if(busy)return;setPending(null);setPendingCsv(undefined);setNeedsFolder(false);document.querySelector<HTMLButtonElement>('[data-agency-import-button]')?.focus({preventScroll:true});};
  const button='inline-flex items-center justify-center gap-1.5 border border-gray-200 bg-white px-2.5 min-h-8 text-[11px] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default';
  return <div className="hidden lg:block shrink-0 border-b border-gray-200 bg-white" data-agency-toolbar>
    <div className="flex items-center gap-3 px-4 min-h-9">
      <label className="flex items-center gap-2 text-[11px] text-gray-600 cursor-pointer"><input name="agencyMode" type="checkbox" checked={c.enabled} disabled={busy} onChange={event=>void c.toggle(event.target.checked)} aria-expanded={c.enabled} aria-controls="agency-controls" className="accent-black" />{ja?'事務所・一括編集':'Agency / batch editing'}</label>
      {c.enabled&&<span className="text-[10px] text-gray-400 min-w-0 max-w-56 truncate" title={c.workspace?.title}>{c.entries.length} {ja?'名':'models'}{c.workspace?.title?` · ${c.workspace.title}`:''}</span>}
      {c.enabled&&<div className="ml-auto flex gap-2">
        <button className={button} disabled={busy} onClick={()=>download(new Blob([templateCsv(ja)],{type:'text/csv;charset=utf-8'}),'hypeform_models_template.csv')}><Download size={13}/>{ja?'CSVテンプレート':'CSV template'}</button>
        <button data-agency-import-button className={button} disabled={busy} onClick={()=>file.current?.click()}><Upload size={13}/>{ja?'CSV / ZIPを読み込む':'Import CSV / ZIP'}</button>
        <button className={button} disabled={busy} onClick={()=>{setPendingCsv(undefined);folder.current?.click();}}><FolderOpen size={13}/>{ja?'展開フォルダーを開く':'Open extracted folder'}</button>
      </div>}
    </div>
    {c.enabled&&<div id="agency-controls" className="px-4 pb-2 flex flex-wrap items-center gap-2">
      <input type="search" aria-label={ja?'モデルを検索':'Search models'} placeholder={ja?'番号・名前を検索':'Search ID or name'} value={query} onChange={event=>setQuery(event.target.value)} className="border-b border-gray-200 w-40 py-1.5 text-xs" disabled={busy||!c.entries.length}/>
      <button className={button} aria-label={ja?'前のモデル':'Previous model'} title={ja?'前のモデル':'Previous model'} disabled={busy||index<=0} onClick={()=>void c.switchModel(c.entries[index-1].id)}><ArrowLeft size={14}/></button>
      <select aria-label={ja?'編集中のモデル':'Current model'} value={c.activeId||''} disabled={busy||!c.entries.length} onChange={event=>void c.switchModel(event.target.value)} className="min-w-48 max-w-72 border border-gray-200 bg-white text-xs h-8 px-2"><option value="" disabled>{ja?'モデルを選択':'Select model'}</option>{list.map(entry=><option key={entry.id} value={entry.id}>{entry.id} · {entry.name}</option>)}</select>
      <button className={button} aria-label={ja?'次のモデル':'Next model'} title={ja?'次のモデル':'Next model'} disabled={busy||index<0||index>=c.entries.length-1} onClick={()=>void c.switchModel(c.entries[index+1].id)}><ArrowRight size={14}/></button>
      <div className="ml-auto flex items-center gap-2">
        <label className="text-[10px] text-gray-500" htmlFor="agency-zip-name">{ja?'ZIP名':'ZIP name'}</label>
        <input id="agency-zip-name" value={fileName} onChange={event=>{setCustomFileName(true);setFileName(event.target.value);}} className="border-b border-gray-200 w-56 py-1.5 text-xs" disabled={busy}/>
        <button className={button} disabled={busy} title={ja?'現在の日時に戻す':'Use current date/time'} aria-label={ja?'現在の日時に戻す':'Use current date/time'} onClick={()=>{setCustomFileName(false);setFileName(defaultArchiveName());}}><RotateCcw size={13}/></button>
        <button className={button} disabled={busy||!c.entries.length} onClick={async()=>{const blob=await c.exportZip();if(blob){const name=customFileName&&fileName.trim()?fileName.trim():defaultArchiveName();setFileName(name);download(blob,`${name.replace(/\.zip$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')}.zip`);}}}><Archive size={13}/>{ja?'編集ZIPを保存':'Save editing ZIP'}</button>
      </div>
    </div>}
    {c.enabled&&(c.conflict||c.externalWorkspace)&&<div className="px-4 py-2 bg-amber-50 flex items-center gap-3 text-xs text-amber-900"><span>{c.conflict?(ja?'別タブの更新と競合しています。現在の編集は保持しています。':'Another tab updated this model. Your local edits are retained.'):(ja?'別タブでモデル一覧が更新されました。':'Another tab replaced the model list.')}</span><button className={button} disabled={busy} onClick={()=>void c.reloadLatest()}><RotateCcw size={13}/>{ja?'最新版を読み込む':'Load latest'}</button></div>}
    {error&&!(pending&&localError)&&<div role="alert" className="px-4 py-2 text-xs text-red-700 flex items-center gap-2"><span className="break-words">{error}</span><button className="ml-auto p-1" aria-label={ja?'通知を閉じる':'Dismiss notice'} onClick={()=>{setLocalError('');c.clearError();}}><X size={14}/></button></div>}
    <input ref={file} data-agency-file type="file" accept=".csv,.zip,text/csv,application/zip" className="hidden" onChange={event=>void read(event.target.files)}/>
    <input ref={node=>{folder.current=node;node?.setAttribute('webkitdirectory','');}} data-agency-folder type="file" multiple className="hidden" onChange={event=>void read(event.target.files,true)}/>
    {pending&&<div className="fixed inset-0 z-[85] bg-black/40 flex items-center justify-center p-6" onKeyDown={event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}
      if(event.key==='Tab'){
        const controls=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)');
        if(!controls?.length)return;const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    }}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="agency-import-title" className="bg-white border border-gray-200 rounded-lg shadow-lg p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h2 id="agency-import-title" className="font-semibold text-sm mb-3">{ja?'モデル一覧の読み込み':'Import model list'}</h2>
        <p className="text-xs text-gray-600 mb-3">{pending.title} · {pending.rows.length} {ja?'名':'models'}</p>
        <div className="max-h-40 overflow-y-auto border-y border-gray-100 py-2 mb-4 text-xs">{pending.rows.slice(0,100).map(row=><div key={row.id} className="flex gap-3 py-1"><span className="w-12 text-gray-400 shrink-0 break-all">{row.id}</span><span className="min-w-0 break-words">{row.profile.name}</span></div>)}{pending.rows.length>100&&<p>… {pending.rows.length-100}</p>}</div>
        {!!overlap&&<label className="flex gap-2 items-start text-xs mb-4"><input type="checkbox" checked={preferCache} onChange={event=>setPreferCache(event.target.checked)} className="accent-black"/>{ja?`一致する${overlap}名はブラウザーの編集を優先`:`Prefer browser edits for ${overlap} matching models`}</label>}
        {needsFolder&&<div className="mb-4 text-xs text-gray-600"><p className="mb-2">{ja?'写真と調整データの読み込みには、ZIPを展開したフォルダーを選択してください。':'Select the extracted project folder to load photos and editing settings.'}</p><button className={button} disabled={busy} onClick={()=>folder.current?.click()}><FolderOpen size={13}/>{ja?'データのあるフォルダーを選択':'Select project folder'}</button></div>}
        {!!c.entries.length&&<p className="text-xs text-gray-500 mb-4">{ja?'現在のモデル一覧を置き換えます。必要な編集は先にZIPで保存してください。':'This replaces the current list. Save an editing ZIP first if needed.'}</p>}
        {localError&&<p role="alert" className="text-xs text-red-700 mb-3">{localError}</p>}
        <div className="flex justify-end gap-2"><button data-agency-cancel autoFocus className={button} disabled={busy} onClick={cancel}>{ja?'キャンセル':'Cancel'}</button><button className={`${button} !bg-black text-white`} disabled={busy||(needsFolder&&!(preferCache&&canUseCache))} onClick={async()=>{await c.importModels(pending,preferCache);cancel();setPending(null);setPendingCsv(undefined);setNeedsFolder(false);setQuery('');}}>{ja?'読み込む':'Import models'}</button></div>
      </section>
    </div>}
  </div>;
}
