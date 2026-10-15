// Pure display regression; no browser, network, account or database access.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const file=path.resolve(__dirname,'../lib/utils/orderReceipt.ts');
const moduleBox={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:moduleBox.exports,module:moduleBox,Intl,Date});
const {websiteAwb,receiptTransactionDate,canPrintAwbBarcode,needsProcessingConfirmation}=moduleBox.exports;
test('website receipt uses original saleDate, not import createdAt',()=>{
 const r=receiptTransactionDate({platform:'WEBSITE',saleDate:'2026-10-15T07:32:09Z',createdAt:'2026-10-16T00:00:00Z'});
 assert.match(r.value,/15 Oktober 2026/);assert.match(r.value,/14[.:]32/);assert.match(r.value,/WIB/);
});
test('naive legacy times are explicitly WIB',()=>assert.match(receiptTransactionDate({platform:'WEBSITE',saleDate:'2026-10-15 14:32:09'}).value,/14[.:]32/));
test('missing website timestamp never falls back to import time or now',()=>assert.equal(receiptTransactionDate({platform:'WEBSITE',createdAt:'2026-10-16T00:00:00Z'}).value,'Belum tersedia'));
test('legacy fallback clearly labels recording date',()=>assert.equal(receiptTransactionDate({platform:'TOKO',createdAt:'2026-10-15T00:00:00Z'}).label,'Tanggal pencatatan'));
test('AWB parser accepts both courier and internal resi',()=>{
 for(const label of ['Resi','Resi internal toko']) assert.equal(websiteAwb({platform:'WEBSITE',notes:`[Pengiriman Website]\n${label}: AWB227\n[/Pengiriman Website]`}), 'AWB227');
 assert.equal(websiteAwb({platform:'TOKO',notes:'Resi: WRONG'}),'');
});
test('long/unencodable AWBs stay text rather than stretched barcodes',()=>{
 assert.equal(canPrintAwbBarcode('AWB227'),true);assert.equal(canPrintAwbBarcode('X'.repeat(120)),false);assert.equal(canPrintAwbBarcode('resi-\u2713'),false);
});
test('only waiting/approved non-cancel-pending sales ask to process',()=>{
 assert.equal(needsProcessingConfirmation({status:'WAITING_APPROVAL'}),true);assert.equal(needsProcessingConfirmation({status:'APPROVED'}),true);
 for(const status of ['PROCESSED','SETTLED','CANCELLED'])assert.equal(needsProcessingConfirmation({status}),false);
 assert.equal(needsProcessingConfirmation({status:'WAITING_APPROVAL',isCancelPending:true}),false);
});
test('opening/closing print does not directly mutate status',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../app/(dashboard)/sales/process/page.tsx'),'utf8');
 const after=source.slice(source.indexOf('onAfterPrint: () =>'),source.indexOf('const confirmPrinted ='));
 assert.ok(!after.includes('processMutation.mutate'));
 const click=source.slice(source.indexOf('const handlePrintClick ='),source.indexOf('const getStatusBadge ='));
 assert.ok(!click.includes('processMutation.mutate'));
 assert.ok(source.includes('Sudah benar, proses pesanan'));
 assert.ok(source.includes('confirmPrinted();'));
});
