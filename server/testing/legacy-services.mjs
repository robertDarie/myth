import { createGameServer as productionServer } from '../http.mjs';
import { KingdomDatabase as ProductionDatabase } from '../database.mjs';
import { WorldStore as ProductionStore } from '../storage.mjs';
export const createGameServer=(options={})=>productionServer({numericVersion:0,...options});
export class KingdomDatabase extends ProductionDatabase {constructor(path,options={}){super(path,{numericVersion:0,...options});}}
export class WorldStore extends ProductionStore {constructor(path,warn){super(path,warn,0);}}

export { backupKingdom } from '../database.mjs';
import { createRealmHost as productionRealmHost } from '../realms.mjs';
export const createRealmHost=(options)=>productionRealmHost({...options,realms:options.realms.map(spec=>({...spec,numericVersion:0}))});

import { openRealm as productionOpenRealm } from '../realms.mjs';
export const openRealm=spec=>productionOpenRealm({...spec,numericVersion:0});
