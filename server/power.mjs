import { armyList } from './progression.mjs';
export function powerOf(p) {
  const ready=p.reserveTroops*5+p.reserveMythic*25;
  const deployed=armyList(p).reduce((sum,a)=>sum+a.troops*5+a.mythic*25,0);
  const city=p.cityLevel*100+Object.values(p.buildings).reduce((sum,rank)=>sum+rank*30,0);
  const research=Object.values(p.technologies).reduce((sum,rank)=>sum+rank*40,0);
  const heroes=p.ownedCommanders.map(id=>p.heroRecords[id]??{xp:0,stars:1,skills:[1,0,0,0]}).reduce((sum,h)=>sum+Math.min(h.stars*10,1+Math.floor(h.xp/100))*10+h.stars*20+h.skills.reduce((n,v)=>n+v*5,0),0);
  return {city,research,heroes,ready,deployed,total:city+research+heroes+ready+deployed};
}
export function rankings(w) {
  const players=[...w.players.values()].map(p=>({id:p.id,name:p.name,civilization:p.civilization,allianceId:p.allianceId,power:powerOf(p).total}));
  const alliances=[...w.alliances.values()].map(a=>({id:a.id,name:a.name,power:players.filter(p=>p.allianceId===a.id).reduce((sum,p)=>sum+p.power,0)}));
  const order=(a,b)=>b.power-a.power||a.id.localeCompare(b.id,'en');
  return {players:players.sort(order),alliances:alliances.sort(order),policy:'Permanent city/research/heroes plus ready/deployed troops. Wounded and queued troops, wealth and inventory are excluded. Power is not a battle prediction.'};
}
