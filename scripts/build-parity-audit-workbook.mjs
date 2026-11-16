// Requires bundled @oai/artifact-tool linked at ignored work/task3/node_modules.
// Run scripts/prepare-parity-workbook.py first. Does not modify gameplay.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const runtime=createRequire(resolve('work/task3/authoring-runtime.cjs'));
const {FileBlob,SpreadsheetFile}=await import(pathToFileURL(runtime.resolve('@oai/artifact-tool')).href);
const directory='research/parity/audits/full-rok-audit';
const path=`${directory}/RoK_vs_Thrones_of_Myth_Master_Parity_Audit.xlsx`;
const workbook=await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const initial=JSON.parse(await fs.readFile(`${directory}/matrix.json`,'utf8'));
const comparison=workbook.worksheets.getItem('Numerical comparison');
const comparisonColumns=comparison.getRange('A1:Q1').values[0];
comparison.getRangeByIndexes(1,0,initial.length,comparisonColumns.length).values=initial.map(row=>comparisonColumns.map(key=>row[key]===''?null:row[key]));
const payload=JSON.parse(await fs.readFile('work/task3/workbook-data.json','utf8'));
for(const [index,table]of payload.entries()){
 let sheet;try{sheet=workbook.worksheets.getItem(table.sheet);}catch{}
 if(!sheet)sheet=workbook.worksheets.add(table.sheet);
 const rows=[table.columns,...table.rows];
 sheet.getRangeByIndexes(0,0,rows.length,table.columns.length).values=rows;
 const range=sheet.getRangeByIndexes(0,0,rows.length,table.columns.length);
 range.format={font:{name:'Arial',size:10},rowHeight:48,wrapText:true,verticalAlignment:'center',columnWidth:26};
 sheet.getRangeByIndexes(0,0,rows.length,1).format.columnWidth=45;
 if(table.sheet==='Feature Inventory'){
  range.format.rowHeight=64;
  sheet.getRangeByIndexes(0,4,rows.length,1).format.columnWidth=80;
  sheet.getRangeByIndexes(0,5,rows.length,3).format.columnWidth=65;
 }
 if(table.sheet==='Register Reconciliation'){
  range.format.rowHeight=80;
  sheet.getRangeByIndexes(0,4,rows.length,2).format.columnWidth=100;
 }
 sheet.getRangeByIndexes(0,0,1,table.columns.length).format={fill:'#243247',font:{name:'Arial',color:'#FFFFFF',bold:true},rowHeight:42};
 if(!sheet.tables.items.length)sheet.tables.add(range,true,`AuditScope${index}`);
 sheet.freezePanes.freezeRows(1);sheet.freezePanes.freezeColumns(1);sheet.showGridLines=false;
 const png=await workbook.render({sheetName:table.sheet,range:`A1:${String.fromCharCode(64+Math.min(table.columns.length,5))}5`,scale:1,format:'png'});
 await fs.writeFile(`work/task3/scope-${index}.png`,new Uint8Array(await png.arrayBuffer()));
}
const summary=workbook.worksheets.getItem('Audit status');
summary.getRange('B2').values=[['AUDIT RESULTS; REFERENCE GAPS OPEN']];
summary.getRange('B3').values=[['384d023030fa42922f62ed56175147e48b75fb4e']];
summary.getRange('B5').values=[['17 subsystems; separate inventory, references and progression evidence']];
summary.getRange('B7').formulas=[[`=COUNTIF('Numerical comparison'!J2:J${initial.length+1},"VERIFIED")+COUNTIF('Numerical comparison'!J2:J${initial.length+1},"CORROBORATED")`]];
summary.getRange('B11').values=[['No full parity certification; current live RoK build UNKNOWN']];
summary.getRange('A12').values=[['Native / remote']];
summary.getRange('B16').values=[['Review corrections and unresolved evidence before implementation.']];
summary.getRange('A19:B25').values=[['Behavior groups',124],['Exported numeric fields',1859],['Published building level rows',650],['City reference comparison rows',150],['Legal progression milestones',6],['Production simulation','Online first hour; offline city catch-up thereafter'],['Complete parity verdict','NOT CERTIFIED']];
summary.getRange('A19:B25').format={font:{name:'Arial',size:10},wrapText:true,rowHeight:36};
workbook.recalculate();
console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:20},maxChars:1000})).ndjson);
const png=await workbook.render({sheetName:'Audit status',range:'A1:B25',scale:1,format:'png'});
await fs.writeFile('work/task3/audit-overview-final.png',new Uint8Array(await png.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(workbook)).save(path);
console.log(JSON.stringify({extendedSheets:payload.length,exported:path}));
