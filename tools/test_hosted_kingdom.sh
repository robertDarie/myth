#!/bin/sh
# Disposable Docker restart/backup smoke test. No public ports or real save paths.
set -eu
image="${1:-thrones-kingdom:0.18-test}"
name="thrones-smoke-$$"
volume="$name-data"
docker_local() { env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
cleanup() { docker_local rm -f "$name" >/dev/null 2>&1 || true; docker_local volume rm "$volume" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM
docker_local volume create "$volume" >/dev/null
docker_local run -d --name "$name" --read-only --cap-drop ALL --security-opt no-new-privileges:true --mount "type=volume,src=$volume,dst=/data" -e THRONES_JOIN_CODE=smoke-only "$image" >/dev/null
ready() { docker_local exec "$name" node --input-type=module -e 'for(let i=0;i<40;i++){try{const r=await fetch("http://127.0.0.1:8080/readyz");if(r.ok)process.exit(0);}catch{}await new Promise(r=>setTimeout(r,100));}process.exit(1);'; }
ready
docker_local exec "$name" node --input-type=module -e '
import assert from "node:assert/strict";import {writeFileSync} from "node:fs";
const base="http://127.0.0.1:8080";
const s=await (await fetch(base+"/join",{method:"POST",body:JSON.stringify({name:"Container Smoke",joinCode:"smoke-only"})})).json();assert.ok(s.token);
writeFileSync("/data/smoke-session.json",JSON.stringify(s),{mode:384});
for(let i=0;i<2;i++){const r=await fetch(base+"/command",{method:"POST",headers:{Authorization:"Bearer "+s.token,"Idempotency-Key":"docker-train-once"},body:JSON.stringify({type:"train"})});assert.equal(r.status,200);}
'
docker_local restart --time 15 "$name" >/dev/null
ready
docker_local exec "$name" node --input-type=module -e '
import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const s=JSON.parse(readFileSync("/data/smoke-session.json")),base="http://127.0.0.1:8080",headers={Authorization:"Bearer "+s.token};
const retry=await fetch(base+"/command",{method:"POST",headers:{...headers,"Idempotency-Key":"docker-train-once"},body:JSON.stringify({type:"train"})});assert.equal(retry.status,200);
const w=await (await fetch(base+"/world",{headers})).json(),p=w.players.find(p=>p.id===s.playerId);assert.equal(p.food>=150,true);assert.equal(p.reserveTroops+p.trainingQueue.reduce((n,j)=>n+j.amount,0),5);console.log("Container restart retained session and paid troop count; retry did not duplicate training.");
'
docker_local exec "$name" node backup.mjs /data/kingdom.sqlite /data/backups/smoke.sqlite
docker_local stop --time 15 "$name" >/dev/null
# A backup contains the old writer lease. Wait out its 30-second safety window
# through a test clock in this disposable restore; production uses real time.
docker_local run --rm --read-only --cap-drop ALL --mount "type=volume,src=$volume,dst=/data" "$image" node --input-type=module -e '
import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {KingdomDatabase} from "./database.mjs";
const s=JSON.parse(readFileSync("/data/smoke-session.json")),db=new KingdomDatabase("/data/backups/smoke.sqlite",{now:()=>Date.now()+31000});
try{const w=db.load();assert.equal(w.authenticate(s.token).name,"Container Smoke");assert.ok(db.receipt((await import("node:crypto")).createHash("sha256").update(s.token+":docker-train-once").digest("hex")));console.log("Online backup restored state and durable receipt.");}finally{db.close();}
'
