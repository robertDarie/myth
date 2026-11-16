"""Collect published base building costs/times. No gameplay writes or hidden-formula inference.

Only numeric facts are retained. Prerequisites, power semantics, modifiers and
version provenance still require separate verification; raw pages are not published.
"""
import csv
import hashlib
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "research/parity/audits/full-rok-audit"
BASE = "https://app.rokstats.online"

class Tables(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.links=[]; self.row=None; self.cell=None
    def handle_starttag(self, tag, attrs):
        if tag == "tr": self.row=[]
        if tag in {"td","th"} and self.row is not None: self.cell=[]
        if tag == "a": self.links.extend(value for key,value in attrs if key == "href")
    def handle_data(self, data):
        if self.cell is not None: self.cell.append(data)
    def handle_endtag(self, tag):
        if tag in {"td","th"} and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split())); self.cell=None
        if tag == "tr" and self.row is not None:
            self.rows.append(self.row); self.row=None

def get(url):
    request=urllib.request.Request(url,headers={"User-Agent":"ThronesOfMythReferenceAudit/1.0"})
    with urllib.request.urlopen(request,timeout=30) as response: raw=response.read()
    parser=Tables(); parser.feed(raw.decode("utf-8"))
    return parser, hashlib.sha256(raw).hexdigest()

def seconds(value):
    pieces=re.findall(r"(\d+)\s*([dhms])",value)
    assert pieces, f"Unrecognized timer {value!r}"
    return sum(int(number)*{"d":86400,"h":3600,"m":60,"s":1}[unit] for number,unit in pieces)

index,_=get(BASE+"/buildings/")
links=sorted({link.split("?")[0] for link in index.links if re.fullmatch(r"/buildings/[a-z0-9-]+/?(?:\?.*)?",link)})
assert len(links)>=20, "Building index did not expose the expected category links"
records=[];access=[]
for link in links:
    url=BASE+link
    try:
        table,digest=get(url)
        candidates=[row for row in table.rows if len(row)>=7 and row[0].isdigit() and 1<=int(row[0])<=25]
        assert len(candidates)==25, f"Expected25 level rows, got{len(candidates)}"
        slug=link.strip('/').split('/')[-1]
        for row in candidates:
            record={"building":slug,"level":int(row[0])}
            for column,name in enumerate(["food","wood","stone","gold"],1):
                text=row[column].replace(',','').replace(' ','')
                record[name]=0 if text in {"—","-",""} else int(text)
            record["base_seconds"]=seconds(row[5])
            record.update({"source_url":url,"checked":"2026-11-16","reference_class":"VERIFIED",
              "reference_build":"UNKNOWN","mode":"Seasonal facility applicability requires review" if any(k in slug for k in ['crystal','heliamber']) else "Published building category; mode eligibility unverified",
              "limitations":"Single secondary client-derived table; prerequisites, special materials and speed/help modifiers not certified"})
            records.append(record)
        access.append({"url":url,"status":"READ","sha256":digest,"levels":len(candidates)})
        print(json.dumps({"building":slug,"levels":25}),flush=True)
    except Exception as error:
        access.append({"url":url,"status":"UNAVAILABLE","error":str(error)})
        print(json.dumps(access[-1]),flush=True)
assert records, "No usable numeric reference rows"
with (OUT/'building-reference.csv').open('w',encoding='utf-8',newline='') as stream:
    writer=csv.DictWriter(stream,fieldnames=list(records[0]));writer.writeheader();writer.writerows(records)
(OUT/'building-source-access.json').write_text(json.dumps(access,indent=2)+'\n',encoding='utf-8')
print(json.dumps({"building_categories":len({r['building'] for r in records}),"level_rows":len(records),"failed_sources":sum(r['status']!='READ' for r in access)}))
