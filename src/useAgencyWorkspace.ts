import { useEffect, useRef, useState } from 'react';
import { DEFAULT_STATE, getInitialAppState } from './demoFixtures';
import { Draft, loadDraft, saveDraft, serializeDraft, imageUrls, forgetDraftAssets } from './draftStorage';
import { AgencyConflict, AgencyEntry, AgencyWorkspace, discardStaging, loadModel, modelKey, readEntries, readModel, readWorkspace, writeModel, writeWorkspace } from './agencyStorage';
import { AgencyImport, exportAgencyZip, matchingCachedEntry } from './agencyArchive';
import { blankModel } from './agencyCsv';

const desktop = () => window.matchMedia('(min-width:1024px)').matches;
const preferredLanguage = (fallback:'en'|'ja') => {
  try{const value=localStorage.getItem('hypeform-ui-language');return value==='en'||value==='ja'?value:fallback;}catch{return fallback;}
};
const release = (draft:Draft|null) => { if(draft){forgetDraftAssets(draft);for(const url of new Set(imageUrls(draft.state)))if(url?.startsWith('blob:'))URL.revokeObjectURL(url);} };
const remember = (workspace:AgencyWorkspace,id:string) => {try{sessionStorage.setItem(`hypeform-active:${workspace.id}`,id);}catch{}}
const remembered = (workspace:AgencyWorkspace) => {try{return sessionStorage.getItem(`hypeform-active:${workspace.id}`);}catch{return null;}}

export function useAgencyWorkspace() {
  const [draft,setDraft] = useState<Draft>(()=>({state:getInitialAppState(),uiLanguage:preferredLanguage('en'),highResolution:false}));
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false);
  const [saveStatus,setSaveStatus]=useState<'saving'|'saved'|'unavailable'>('saving');
  const [workspace,setWorkspace]=useState<AgencyWorkspace|null>(null),[entries,setEntries]=useState<AgencyEntry[]>([]);
  const [enabled,setEnabled]=useState(false),[activeId,setActiveId]=useState<string|null>(null);
  const [editorVersion,setEditorVersion]=useState(0),[error,setError]=useState(''),[conflict,setConflict]=useState(false);
  const [externalWorkspace,setExternalWorkspace]=useState(false),[progress,setProgress]=useState('');
  const draftRef=useRef(draft),workspaceRef=useRef(workspace),activeRef=useRef<AgencyEntry|null>(null);
  const dirty=useRef(false),queue=useRef<Promise<unknown>>(Promise.resolve()),channel=useRef<BroadcastChannel|null>(null);
  const busyRef=useRef(false),conflictRef=useRef(false);
  const tabId=useRef(crypto.randomUUID());
  draftRef.current=draft;workspaceRef.current=workspace;busyRef.current=busy;conflictRef.current=conflict;
  const ja=()=>draftRef.current.uiLanguage==='ja';
  const report=(problem:unknown)=>{
    if(problem instanceof AgencyConflict){setConflict(true);conflictRef.current=true;setError(ja()?'別のタブでこのモデルが更新されています。現在の編集は保持されています。ZIPへ退避するか、最新版を読み込んでください。':'This model changed in another tab. Your edits are retained. Save a ZIP copy or load the latest version.');}
    else setError(`${ja()?'処理できませんでした':'Operation failed'}: ${problem instanceof Error?problem.message:String(problem)}`);
  };
  const broadcast=(message:Record<string,unknown>)=>{
    const payload={...message,tabId:tabId.current,time:Date.now()};channel.current?.postMessage(payload);
    try{localStorage.setItem('hypeform-agency-update',JSON.stringify(payload));}catch{}
  };
  const refreshEntries=async()=>{if(workspaceRef.current)setEntries(await readEntries(workspaceRef.current));};

  useEffect(()=>{
    let active=true;
    (async()=>{
      let individual:Draft|null=null;
      try {
        individual=await loadDraft();
        if(individual)individual={...individual,uiLanguage:preferredLanguage(individual.uiLanguage)};
        const saved=desktop()?await readWorkspace().catch(()=>null):null;
        if(saved){
          const list=await readEntries(saved);if(!active){release(individual);return;}
          setWorkspace(saved);workspaceRef.current=saved;setEntries(list);setEnabled(saved.enabled);
          if(saved.enabled&&list.length){
            const entry=list.find(entry=>entry.id===remembered(saved))||list[0];
            const model=await loadModel(entry.key);
            model.draft.uiLanguage=preferredLanguage(model.draft.uiLanguage);
            if(!active){release(individual);release(model.draft);return;}
            release(individual);individual=null;setDraft(model.draft);draftRef.current=model.draft;activeRef.current=model.entry;setActiveId(entry.id);
          }else if(individual){setDraft(individual);draftRef.current=individual;}
        }else if(individual&&active){setDraft(individual);draftRef.current=individual;}
        if(active)setSaveStatus('saved');
      } catch(problem){console.warn('Draft restore unavailable',problem);if(active){if(individual){setDraft(individual);draftRef.current=individual;}setSaveStatus('unavailable');}}
      finally{if(active){if(!individual&&!activeRef.current){dirty.current=true;setSaveStatus('saving');}setReady(true);}else release(individual);}
    })();
    return()=>{active=false;};
  },[]);
  useEffect(()=>{if(ready)try{localStorage.setItem('hypeform-ui-language',draft.uiLanguage);}catch{}},[ready,draft.uiLanguage]);

  const updateDraft=(change:(previous:Draft)=>Draft)=>{
    dirty.current=true;setDraft(previous=>change(previous));
  };
  const saveNow=()=>{
    const snapshot=draftRef.current,entry=activeRef.current;
    if(conflictRef.current)return Promise.reject(new AgencyConflict());
    const prepared=entry?serializeDraft(snapshot):null;void prepared?.catch(()=>{});
    setSaveStatus('saving');
    const operation=queue.current.catch(()=>{}).then(async()=>{
      if(entry){
        const current=activeRef.current?.key===entry.key?activeRef.current:entry;
        const next=await writeModel({...current,updatedAt:new Date().toISOString()},await prepared!,current.revision);
        if(activeRef.current?.key===entry.key)activeRef.current=next;
        await refreshEntries();broadcast({collection:entry.collection,modelId:entry.id,revision:next.revision});
      }else await saveDraft(snapshot);
      if(draftRef.current===snapshot){dirty.current=false;setSaveStatus('saved');setError('');}
    });
    queue.current=operation;
    return operation.catch(problem=>{setSaveStatus('unavailable');report(problem);throw problem;});
  };
  useEffect(()=>{
    if(!ready||busy||conflict)return;
    const timer=window.setTimeout(()=>{if(dirty.current||saveStatus==='saving')void saveNow().catch(()=>{});},350);
    const flush=()=>{window.clearTimeout(timer);if(dirty.current)void saveNow().catch(()=>{});};
    const hidden=()=>{if(document.visibilityState==='hidden')flush();};
    window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
    return()=>{window.clearTimeout(timer);window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);};
  },[draft,ready,busy,conflict,activeId]);

  const adopt=(next:Draft,entry:AgencyEntry|null)=>{
    next={...next,uiLanguage:draftRef.current.uiLanguage};
    forgetDraftAssets(draftRef.current);
    activeRef.current=entry;draftRef.current=next;dirty.current=false;
    setDraft(next);setActiveId(entry?.id??null);setConflict(false);conflictRef.current=false;setError('');setSaveStatus('saved');setEditorVersion(version=>version+1);
  };
  useEffect(()=>{
    if(!ready)return;
    let alive=true;
    const receive=async(message:{tabId?:string;collection?:string;modelId?:string;revision?:number})=>{
      if(message.tabId===tabId.current||!workspaceRef.current)return;
      try{
        if(message.collection!==workspaceRef.current.collection){const latest=await readWorkspace();if(alive&&latest?.collection!==workspaceRef.current.collection)setExternalWorkspace(true);return;}
        const list=await readEntries(workspaceRef.current);if(!alive)return;setEntries(list);
        const current=activeRef.current;
        if(!current||current.id!==message.modelId)return;
        const latest=list.find(entry=>entry.id===current.id);
        if(!latest||latest.revision<=current.revision)return;
        if(dirty.current||busyRef.current||document.querySelector('.cropper-modal-overlay')){report(new AgencyConflict());return;}
        const saved=await loadModel(current.key);
        if(!alive){release(saved.draft);return;}
        if(dirty.current||busyRef.current||document.querySelector('.cropper-modal-overlay')){release(saved.draft);report(new AgencyConflict());return;}
        if(activeRef.current?.key!==current.key||saved.entry.revision<=activeRef.current.revision){release(saved.draft);return;}
        adopt(saved.draft,saved.entry);
      }catch(problem){if(alive)report(problem);}
    };
    const listener=(event:MessageEvent)=>{void receive(event.data);};
    const storage=(event:StorageEvent)=>{if(event.key==='hypeform-agency-update'&&event.newValue)try{void receive(JSON.parse(event.newValue));}catch{}};
    if('BroadcastChannel'in window){channel.current=new BroadcastChannel('hypeform-agency');channel.current.addEventListener('message',listener);}
    window.addEventListener('storage',storage);
    const focus=()=>{const current=activeRef.current;if(current)void receive({collection:current.collection,modelId:current.id});};
    window.addEventListener('focus',focus);
    return()=>{alive=false;channel.current?.close();channel.current=null;window.removeEventListener('storage',storage);window.removeEventListener('focus',focus);};
  },[ready]);

  const run=async(action:()=>Promise<void>)=>{
    if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
    try{await action();}catch(problem){report(problem);}finally{busyRef.current=false;setBusy(false);setProgress('');}
  };
  const flush=async()=>{await queue.current.catch(()=>{});if(dirty.current)await saveNow();};
  const toggle=(value:boolean)=>run(async()=>{
    const previousEnabled=enabled;setEnabled(value);
    try {
    await flush();
    let current=workspaceRef.current;
    if(value){
      if(!current){current={version:1,id:crypto.randomUUID(),collection:crypto.randomUUID(),title:'Agency',enabled:true,modelIds:[]};}
      current={...current,enabled:true};await writeWorkspace(current);setWorkspace(current);workspaceRef.current=current;setEnabled(true);
      const list=await readEntries(current);setEntries(list);
      if(list.length){const entry=list.find(entry=>entry.id===remembered(current!))||list[0];const saved=await loadModel(entry.key);adopt(saved.draft,saved.entry);}
    }else{
      const individual=await loadDraft();
      if(current){current={...current,enabled:false};await writeWorkspace(current);setWorkspace(current);workspaceRef.current=current;}
      setEnabled(false);adopt(individual||{state:getInitialAppState(),uiLanguage:draftRef.current.uiLanguage,highResolution:false},null);
    }
    }catch(problem){setEnabled(previousEnabled);throw problem;}
  });
  const switchModel=(id:string)=>run(async()=>{
    if(id===activeRef.current?.id||!workspaceRef.current)return;
    await flush();const saved=await loadModel(modelKey(workspaceRef.current,id));remember(workspaceRef.current,id);adopt(saved.draft,saved.entry);
  });
  const importModels=(plan:AgencyImport,preferCache:boolean)=>run(async()=>{
    await flush();
    const previous=workspaceRef.current,oldEntries=previous?await readEntries(previous):[];
    const current:AgencyWorkspace={version:1,id:plan.workspaceId||crypto.randomUUID(),collection:crypto.randomUUID(),title:plan.title,enabled:true,modelIds:plan.rows.map(row=>row.id)};
    const staged:string[]=[];let importedDraft:Draft|null=null;let committed=false;
    try{
      for(const [index,row] of plan.rows.entries()){
        setProgress(`${index+1} / ${plan.rows.length}`);
        const cached=matchingCachedEntry(plan,row,previous,oldEntries);
        const stored=preferCache&&cached&&previous?(await readModel(cached.key)).draft:await plan.load(row);
        const entry:AgencyEntry={key:modelKey(current,row.id),collection:current.collection,id:row.id,name:stored.state.profile.name,updatedAt:preferCache&&cached?cached.updatedAt:row.updatedAt||new Date().toISOString(),revision:0,sourceProfile:row.profile};
        await writeModel(entry,stored);staged.push(entry.key);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      const saved=await loadModel(modelKey(current,current.modelIds[0]));
      importedDraft=saved.draft;const list=await readEntries(current);
      await writeWorkspace(current);committed=true;workspaceRef.current=current;setWorkspace(current);setEnabled(true);setEntries(list);remember(current,current.modelIds[0]);adopt(saved.draft,saved.entry);setExternalWorkspace(false);broadcast({collection:current.collection});
    }catch(problem){if(!committed){release(importedDraft);await discardStaging(staged).catch(()=>{});}throw problem;}
  });
  const reloadLatest=()=>run(async()=>{
    if(dirty.current&&!window.confirm(ja()?'このタブの未保存の編集を破棄して、最新版を読み込みますか？先にZIPへ退避できます。':'Discard this tab’s unsaved edits and load the latest version? You can save a ZIP copy first.'))return;
    await queue.current.catch(()=>{});
    if(externalWorkspace){const latest=await readWorkspace();if(!latest)return;workspaceRef.current=latest;setWorkspace(latest);const list=await readEntries(latest);setEntries(list);const saved=await loadModel(list[0].key);adopt(saved.draft,saved.entry);setExternalWorkspace(false);setEnabled(true);}
    else if(activeRef.current){const saved=await loadModel(activeRef.current.key);adopt(saved.draft,saved.entry);}
  });
  const exportZip=async():Promise<Blob|null>=>{
    if(!workspaceRef.current?.modelIds.length||busyRef.current)return null;
    let output:Blob|null=null;
    await run(async()=>{
      await queue.current.catch(()=>{});
      const current=workspaceRef.current!;const list=await readEntries(current);
      output=await exportAgencyZip(current,list,activeRef.current?{id:activeRef.current.id,draft:draftRef.current}:null,(index,total)=>setProgress(`${index} / ${total}`));
    });return output;
  };
  const reset=()=>run(async()=>{
    const entry=activeRef.current;
    const message=entry?(ja()?'このモデルの編集をCSV取り込み時の状態へ戻します。写真と調整は削除されます。他のモデルは変更されません。よろしいですか？':'Reset this model to its imported CSV profile and remove its photos and adjustments? Other models are unchanged.'):(ja()?'写真・プロフィール・ウォーターマークを含むすべての個人用設定をリセットします。よろしいですか？':'Reset all personal photos, profile information and settings?');
    if(!window.confirm(message))return;
    if(conflictRef.current)throw new AgencyConflict();
    await queue.current.catch(()=>{});
    const next={state:entry?blankModel(entry.sourceProfile):structuredClone(DEFAULT_STATE),uiLanguage:entry?draftRef.current.uiLanguage:'en' as const,highResolution:false};
    draftRef.current=next;setDraft(next);dirty.current=true;await saveNow();setEditorVersion(version=>version+1);
  });
  return {draft,ready,busy,saveStatus,editorVersion,workspace,entries,enabled,activeId,error,conflict,externalWorkspace,progress,updateDraft,toggle,switchModel,importModels,reloadLatest,exportZip,reset,clearError:()=>setError('')};
}
