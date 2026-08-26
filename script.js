

const graph = {
  "Srirangam": { "Woraiyur": 8, "Thillai Nagar": 6 },
  "Woraiyur": { "Srirangam": 8, "Thillai Nagar": 5, "Cantonment": 4 },
  "Thillai Nagar": { "Woraiyur": 5, "Cantonment": 3, "K.K. Nagar": 4 },
  "Cantonment": { "Woraiyur": 4, "Thillai Nagar": 3, "Tiruchi Junction": 3, "Golden Rock": 5 },
  "K.K. Nagar": { "Thillai Nagar": 4, "BHEL Township": 7 },
  "Golden Rock": { "Cantonment": 5, "BHEL Township": 5 },
  "BHEL Township": { "Golden Rock": 5, "Manikandam": 8 },
  "Manikandam": { "BHEL Township": 8, "Tiruverumbur": 6 },
  "Tiruverumbur": { "Manikandam": 6, "Thuvakudi": 5 },
  "Thuvakudi": { "Tiruverumbur": 5, "Airport": 6 },
  "Airport": { "Thuvakudi": 6, "Cantonment": 5 },
  "Tiruchi Junction": { "Cantonment": 3, "Airport": 5 }
};

// ---------- Locations ----------
const locations = [
  { name: "Srirangam", x: 150, y: 100 },
  { name: "Woraiyur", x: 280, y: 200 },
  { name: "Thillai Nagar", x: 380, y: 150 },
  { name: "Cantonment", x: 520, y: 250 },
  { name: "K.K. Nagar", x: 400, y: 300 },
  { name: "Golden Rock", x: 680, y: 300 },
  { name: "BHEL Township", x: 820, y: 350 },
  { name: "Manikandam", x: 900, y: 420 },
  { name: "Tiruverumbur", x: 780, y: 500 },
  { name: "Thuvakudi", x: 650, y: 550 },
  { name: "Airport", x: 520, y: 500 },
  { name: "Tiruchi Junction", x: 480, y: 350 }
];

const locationMap = {};
locations.forEach(l => locationMap[l.name] = [l.x, l.y]);

// ---------- Trie ----------
class TrieNode { constructor() { this.children = {}; this.words = []; } }
class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(word) {
    const lw = word.toLowerCase(); 
    let node = this.root;
    for (const ch of lw) {
      if (!node.children[ch]) 
      node.children[ch] = new TrieNode();
      node = node.children[ch];
      if (!node.words.includes(word)) node.words.push(word);
    }
    if (!this.root.words.includes(word)) this.root.words.push(word);
  }
  search(prefix) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }
    return node.words.slice(0, 10);
  }
}
const trie = new Trie();
locations.forEach(l => trie.insert(l.name));

// ---------- Ambulances ----------
const ambulances = [];
const startPoints = ["Srirangam", "Thillai Nagar", "Golden Rock", "BHEL Township"];
for (let i = 0; i < 4; i++) {
  const s = startPoints[i]; 
  const pos = locationMap[s];
  ambulances.push({
    id: i + 1, name: `Ambulance ${i + 1}`, location: s, coords: [...pos],
    available: true, eta: 0, patient: null
  });
}

// ---------- KD-Tree ----------
class KDNode { constructor(point, ambulance, axis, left=null,right=null)
  {this.point=point;this.ambulance=ambulance;this.axis=axis;this.left=left;this.right=right;}
 }
function buildKDTree(points, depth=0)
{ if(!points.length) return null; 
  const axis=depth%2; 
  points.sort((a,b)=>a.point[axis]-b.point[axis]); 
  const mid=Math.floor(points.length/2); 
  return new KDNode(points[mid].point, points[mid].ambulance, axis, buildKDTree(points.slice(0,mid), depth+1), buildKDTree(points.slice(mid+1), depth+1)); 
}
function distance2(p1,p2)
{
  return (p1[0]-p2[0])**2+(p1[1]-p2[1])**2;
}
function nearestKD(node,target,best={dist:Infinity,amb:null})
{
  if(!node)return best;
  const d=distance2(node.point,target);
  if(d<best.dist && node.ambulance.available) 
    best={dist:d,amb:node.ambulance};
  const axis=node.axis; 
  const diff=target[axis]-node.point[axis];
   const [near,far]=diff<0?[node.left,node.right]:[node.right,node.left];
    best=nearestKD(near,target,best); 
    if(diff*diff<best.dist) best=nearestKD(far,target,best);
     return best;
}
function buildKDTreeFromAmbulances()
{ 
  return buildKDTree(ambulances.map(a=>({point:[...a.coords],ambulance:a}))); 
}

// ---------- Priority Queue ----------
const priorityQueue = [];

// ---------- Canvas ----------
const canvas=document.getElementById("mapCanvas"); 
const ctx=canvas.getContext("2d"); 
ctx.font="14px Inter, Arial";

// ---------- Draw map ----------
function drawMap(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.lineWidth=2; ctx.strokeStyle="#d1d5db";
  for(const u in graph)
     for(const v in graph[u]) 
    { const A=locationMap[u],B=locationMap[v]; 
      ctx.beginPath();ctx.moveTo(A[0],A[1]);
      ctx.lineTo(B[0],B[1]);ctx.stroke(); 
    }
  locations.forEach(l=>{ ctx.beginPath(); ctx.fillStyle="#0f172a"; ctx.arc(l.x,l.y,6,0,Math.PI*2); ctx.fill(); ctx.fillStyle="black"; ctx.fillText(l.name,l.x+10,l.y+5); });
  ambulances.forEach(a=>{ ctx.beginPath(); ctx.fillStyle=a.available?"#10b981":"#ef4444"; ctx.rect(a.coords[0]-9,a.coords[1]-9,18,18); ctx.fill(); ctx.fillStyle="#fff"; ctx.fillText(a.id,a.coords[0]-3,a.coords[1]+5); });
}

// ---------- Dijkstra ----------
function shortestPath(graphObj,start,end){
  const dist={},prev={},visited={};
  for(const n in graphObj) dist[n]=Infinity; 
  dist[start]=0;
  while(true){
    let closest=null;
    for(const n in dist) 
      if(!visited[n]&&(closest===null||dist[n]<dist[closest])) 
        closest=n;
    if(closest===null||closest===end) break;
    visited[closest]=true;
    for(const nb in graphObj[closest])
      { 
        const d=dist[closest]+graphObj[closest][nb]; 
        if(d<dist[nb])
          {
            dist[nb]=d; 
            prev[nb]=closest;
        }
       }
  }
  const path=[]; let u=end; if(dist[end]===Infinity) return {distance:Infinity,path:[]};
  while(u){ path.unshift(u); u=prev[u]; }
  return {distance:dist[end], path};
}

// ---------- Queue helpers ----------
function enqueuePriority(patient){
  let added=false;
  for(let i=0;i<priorityQueue.length;i++){
    if(patient.severity>priorityQueue[i].severity){ priorityQueue.splice(i,0,patient); added=true; break; }
  }
  if(!added) priorityQueue.push(patient);
  renderQueue();
}

// ---------- Render UI ----------
function renderQueue(){ const ul=document.getElementById("priorityQueueList"); ul.innerHTML=""; priorityQueue.forEach(p=>{ const li=document.createElement("li"); li.textContent=`${p.name} — ${p.location} (${p.severity===5?"Critical":p.severity>=3?"High":"Normal"})`; li.style.color=p.severity>=4?"#b91c1c":p.severity>=3?"#d97706":"#065f46"; ul.appendChild(li); }); }
function updateLists(){
  const availEl=document.getElementById("availableList");
   const busyEl=document.getElementById("busyList"); 
   availEl.innerHTML=""; 
   busyEl.innerHTML="";
  const available=ambulances.filter(a=>a.available);
   const busy=ambulances.filter(a=>!a.available);
  document.getElementById("total").textContent=ambulances.length;
  document.getElementById("available").textContent=available.length;
  document.getElementById("busy").textContent=busy.length;
  available.forEach(a=>{ const li=document.createElement("li"); li.textContent=`${a.name} — at ${a.location}`; availEl.appendChild(li); });
  busy.forEach(a=>{ const li=document.createElement("li"); li.textContent=`${a.name} → ${a.patient?a.patient.name:"patient"} @ ${a.patient?a.patient.location:a.location} (ETA: ${a.eta} min)`; busyEl.appendChild(li); });
}

// ---------- Suggestions ----------
function showSuggestions(){
  const input=document.getElementById("patientLocation");
   const box=document.getElementById("suggestions");
    box.innerHTML=""; 
    const val=input.value.trim(); 
    if(!val) return;
  const matches=trie.search(val); 
  const uniq=[...new Set(matches)];
  uniq.slice(0,8).forEach(name=>{ const div=document.createElement("div");
     div.textContent=name;
     div.onclick=()=>{ input.value=name; box.innerHTML=""; }; 
     box.appendChild(div); });
}

// ---------- Assign & Dispatch ----------
function assignPatient(){
  const patientName=document.getElementById("patientName").value.trim();
  const location=document.getElementById("patientLocation").value.trim();
  const severity=parseInt(document.getElementById("criticality").value);
  if(!patientName){ alert("Enter patient name"); return; }
  if(!location||!graph[location]){ alert("Enter/choose a valid location"); return; }

  const patient={name:patientName, location, severity};
  enqueuePriority(patient);
  alert(`${patient.name} assigned to priority queue. Click Dispatch to send ambulance.`);
}

function dispatchPatients(){
  if(!priorityQueue.length){ alert("No patients in priority queue."); return; }
  attemptDispatch();
}

function attemptDispatch(){
  if(!priorityQueue.length) return;
  const patient=priorityQueue[0];
  const kdRoot=buildKDTreeFromAmbulances();
  const targetCoords=locationMap[patient.location];
  const nearest=nearestKD(kdRoot,targetCoords);
  if(!nearest||!nearest.amb){ alert("No available ambulances currently. Please wait."); return; }

  const amb=nearest.amb;
  priorityQueue.shift();
  amb.available=false; amb.patient=patient;

  const route=shortestPath(graph,amb.location,patient.location);
  const totalKm=route.distance;
  const speedKmPerMin=0.6;
  const etaMin=Math.max(1,Math.ceil(totalKm/speedKmPerMin));
  amb.eta=etaMin;

  updateLists();
  renderQueue();
  animateAmbulanceAlongRoute(amb, route.path, etaMin);
}

// ---------- Animate ambulance ----------
async function animateAmbulanceAlongRoute(amb,path,etaMin){
  for(let i=0;i<path.length-1;i++){
    const a=locationMap[path[i]];
     const b=locationMap[path[i+1]];
    const steps=30;
    for(let s=1;s<=steps;s++){
      amb.coords[0]=a[0]+((b[0]-a[0])*s)/steps;
      amb.coords[1]=a[1]+((b[1]-a[1])*s)/steps;
      amb.eta=Math.max(0,Math.ceil((path.length-1-i-s/steps)/0.6));
      drawMap();
       updateLists();
        await sleep(100);
    }
  }
  amb.location=amb.patient.location;
   amb.coords=[...locationMap[amb.location]];
  amb.available=true; 
  amb.patient=null; 
  amb.eta=0;
  drawMap(); 
  updateLists();
  setTimeout(attemptDispatch,200);
}

// ---------- Helpers ----------
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// ---------- Initial rendering ----------
drawMap();
 updateLists();
 renderQueue();
