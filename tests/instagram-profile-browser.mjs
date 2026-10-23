const {webkit,chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import fs from 'node:fs/promises';
for(const engine of [webkit,chromium]){
 const browser=await engine.launch({headless:true,...(engine===chromium&&process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  await fs.mkdir('tmp',{recursive:true});
  const page=await browser.newPage({viewport:{width:1700,height:1000}});await page.goto((process.env.APP_TEST_URL||'http://127.0.0.1:8126/')+'?demo=kate');await page.locator('input[name="instagram"]').fill('https://www.instagram.com/kate.sanada/');await page.locator('input[name="showInstagram"]').check();await page.locator('input[name="secondPageEnabled"]').check();await page.waitForTimeout(700);
  for(const account of ['kate.sanada','@kate.sanada','https://www.instagram.com/kate.sanada/?hl=en','instagram.com/kate.sanada/']){
   await page.locator('input[name="instagram"]').fill(account);
   await page.waitForTimeout(80);
   if((await page.locator('#composite-canvas [data-social="instagram"]').textContent())!=='INSTAGRAM: @kate.sanada')throw Error('Account normalization failed: '+account);
  }
  await page.locator('input[name="showAgency"]').uncheck();
  if((await page.locator('#composite-canvas').textContent()).includes('REPRESENTED BY:'))throw Error('Hidden agency still displayed');
  if(!(await page.locator('input[name="agency"]').inputValue()))throw Error('Agency value lost on hide');
  await page.waitForTimeout(700);await page.reload();
  if(await page.locator('input[name="showAgency"]').isChecked())throw Error('Agency visibility not restored');
  await page.locator('input[name="showAgency"]').check();await page.waitForTimeout(700);
  if(!(await page.locator('#composite-canvas').textContent()).includes('REPRESENTED BY:'))throw Error('Agency not restored on show');
  const result=await page.evaluate(async()=>{
   const {loadDraft}=await import('/src/draftStorage.ts');const {NAME_FONTS}=await import('/src/nameTypography.ts');const {layoutInstagram}=await import('/src/instagramLayout.ts');const {layoutSecondPageInstagram}=await import('/src/secondPageInstagram.ts');const {renderComposite}=await import('/src/exportComposite.ts');
   const {state}=await loadDraft();let checks=0;
   const {parseAgencyCsv,makeAgencyCsv,blankModel}=await import('/src/agencyCsv.ts');
   const legacy=parseAgencyCsv('model_id,name,agency,instagram\n1,Test,Agency,kate.sanada')[0];
   if(!legacy.profile.showAgency||!legacy.profile.showInstagram)throw Error('Legacy CSV visibility migration');
   legacy.profile.showAgency=false;
   if(parseAgencyCsv(makeAgencyCsv([legacy]))[0].profile.showAgency!==false)throw Error('Hidden agency CSV roundtrip');
   if(blankModel().profile.showAgency!==false)throw Error('New blank agency visible');
   for(const font of NAME_FONTS)for(const bottom of [true,false])for(const side of ['left','right'])for(const id of ['composite-canvas','composite-canvas-page2']){
    const copy=document.getElementById(id).cloneNode(true);copy.id='social-check';copy.style.transform='none';document.body.append(copy);
    const next={...state,profile:{...state.profile,nameFont:font.family,nameAtBottom:bottom}};
    if(id.endsWith('page2'))layoutSecondPageInstagram(copy,next,side,30);else layoutInstagram(copy,next,side);
    const social=copy.querySelector('[data-social="instagram"]'),name=copy.querySelector('[data-composite="name"]');
    if(!social||!social.textContent.includes('@kate.sanada'))throw Error('Social missing from '+id+' '+side);
    if(parseFloat(getComputedStyle(name).fontSize)<14)throw Error('Model name shrunk too far '+font.name+' '+id+' '+side);
    const band=name.parentElement.getBoundingClientRect(),text=social.getBoundingClientRect();
    if(text.bottom>band.bottom+1||text.top<band.top-1)throw Error('Social outside name band '+font.name+' '+id+' '+side+' '+JSON.stringify({band:band.toJSON(),text:text.toJSON()}));
    checks++;copy.remove();
   }
   const canvas=await renderComposite(document.getElementById('composite-canvas-page2'),state,false,'jpeg','right',30);return{checks,data:canvas.toDataURL('image/jpeg',.97)};
  });
  await fs.writeFile(`tmp/model-instagram-${engine.name()}.jpg`,Buffer.from(result.data.split(',')[1],'base64'));
  await page.locator('input[name="showInstagram"]').uncheck();if(await page.locator('#composite-canvas [data-social="instagram"]').count())throw Error('Social visibility toggle failed');
  console.log(engine.name(),result.checks,'font/position/page/split combinations retain social within name band; hide toggle passed');
 }finally{await browser.close();}
}
