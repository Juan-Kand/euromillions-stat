// Vérificateur EuroMillions STAT : contrôle que index.html est à jour et valide.
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const err=[];
const m=html.match(/const RAW=`([\s\S]*?)`;/);
if(!m){console.error('RAW introuvable');process.exit(1)}
const lines=m[1].trim().split('\n');
const re=/^\d{4}-\d{2}-\d{2} (\d+ ){4}\d+ \| \d+ \d+( \| \d+ [GR])?$/;
let prev='';
for(const l of lines){
  if(!re.test(l.trim()))err.push('Ligne invalide : '+l);
  const d=l.slice(0,10); if(d<=prev)err.push('Ordre/doublon : '+d); prev=d;
  const dow=new Date(d+'T12:00:00Z').getUTCDay(); if(dow!==2&&dow!==5)err.push('Pas un mardi/vendredi : '+d);
}
try{const s=html.match(/<script>([\s\S]*?)<\/script>/g).map(x=>x.replace(/<\/?script>/g,'')).join('\n');new Function(s)}catch(e){err.push('JS invalide : '+e.message)}
// Dernier tirage attendu (Paris) : mardi/vendredi, publié après 23h30 + marge
const now=new Date();
const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
let d=new Date(Date.UTC(+p.year,+p.month-1,+p.day,12));
const hm=+p.hour*60+ +p.minute;
if(hm<23*60+59)d.setUTCDate(d.getUTCDate()-1); // tirage du jour pas encore attendu
// laisse 12 h de grâce : on exige le tirage de la veille au plus tard
while(![2,5].includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()-1);
const expected=d.toISOString().slice(0,10);
const last=prev;
console.log('Dernier tirage dans index.html :',last,'| attendu au moins :',expected);
if(last<expected)err.push(`Site pas à jour : dernier tirage ${last}, attendu ${expected}`);
if(err.length){console.error(err.join('\n'));process.exit(1)}
console.log('OK');
