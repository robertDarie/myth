import { World as ProductionWorld, GameError } from '../world.mjs';
// Explicit old-balance fixtures. Production numeric acceptance imports World directly.
export class World extends ProductionWorld {
  static fromSave(data,options={}) {
    const copy=structuredClone(data);if(copy?.world&&copy.world.numericVersion===undefined){copy.world.numericVersion=0;for(const p of copy.world.players??[])p.numericVersion=0;}
    return ProductionWorld.fromSave(copy,options);
  }
  constructor(options={}) { super({numericVersion:0,...options}); }
}
export { GameError };
