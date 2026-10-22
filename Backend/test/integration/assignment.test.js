const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ObjectId } = require('mongodb');
const config = require('../../src/config/database');
const app = require('../../src/app');
test('assignment API enforces resolution, persists, filters, handles legacy records and concurrency', async () => {
 let db, server;
 const marker='Fictional assignment '+randomUUID();
 try {
  db=await config.connectDatabase();
  server=await new Promise(resolve=>{ const s=app.listen(0,'127.0.0.1',()=>resolve(s)); });
  const root='http://127.0.0.1:'+server.address().port+'/api';
  const request=(path,method='GET',body)=>fetch(root+path,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  const roster=await (await request('/engineers')).json();
  assert.ok(roster.engineers.includes('Alex Morgan'));
  const created=await request('/issues','POST',{clientName:marker,title:'Assignment test',description:'Temporary fictional test',priority:'High'});
  assert.equal(created.status,201);
  const issue=(await created.json()).issue;
  const path='/issues/'+issue._id;
  assert.equal(issue.assignedEngineer,'');
  let response=await request(path,'PATCH',{status:'Resolved'});
  assert.equal(response.status,400); assert.ok((await response.json()).errors.assignedEngineer);
  assert.equal((await (await request(path)).json()).issue.status,'Open');
  assert.equal((await request(path,'PATCH',{assignedEngineer:'Unknown'})).status,400);
  response=await request(path,'PATCH',{assignedEngineer:'Alex Morgan',status:'Resolved'});
  assert.equal(response.status,200);
  let saved=(await response.json()).issue;
  assert.equal(saved.assignedEngineer,'Alex Morgan'); assert.equal(saved.reportedAt,issue.reportedAt);
  saved=(await (await request(path)).json()).issue;
  assert.equal(saved.status,'Resolved'); assert.equal(saved.assignedEngineer,'Alex Morgan');
  assert.equal((await request(path,'PATCH',{assignedEngineer:''})).status,400);
  const list=async(engineer,status)=>{
   const q=new URLSearchParams({search:marker,priority:'High',status,assignedEngineer:engineer});
   const r=await request('/issues?'+q); assert.equal(r.status,200); return (await r.json()).issues;
  };
  assert.equal((await list('Alex Morgan','Resolved')).length,1);
  assert.equal((await list('Priya Shah','Resolved')).length,0);
  assert.equal((await request(path,'PATCH',{assignedEngineer:'Priya Shah'})).status,200);
  assert.equal((await list('Priya Shah','Resolved')).length,1);
  assert.equal((await request(path,'PATCH',{status:'Open',assignedEngineer:''})).status,200);
  assert.equal((await list('Unassigned','Open')).length,1);
  // Existing documents without the new field remain readable and filterable.
  await db.collection('issues').updateOne({_id:new ObjectId(issue._id)},{$unset:{assignedEngineer:''}});
  assert.equal((await list('Unassigned','Open')).length,1);
  assert.equal((await (await request(path)).json()).issue.assignedEngineer,'');
  assert.equal((await request(path,'PATCH',{status:'Resolved'})).status,400);
  for(let iteration=0;iteration<4;iteration++) {
   assert.equal((await request(path,'PATCH',{status:'Open',assignedEngineer:'Alex Morgan'})).status,200);
   const results=await Promise.all([request(path,'PATCH',{status:'Resolved'}),request(path,'PATCH',{assignedEngineer:''})]);
   assert.ok(results.every(r=>[200,400,409].includes(r.status)));
   const final=(await (await request(path)).json()).issue;
   assert.ok(final.status!=='Resolved' || !!final.assignedEngineer);
  }
  assert.equal((await request('/issues?assignedEngineer=Unknown')).status,400);
  assert.equal((await request(path,'DELETE')).status,204);
  assert.equal((await request(path)).status,404);
 } finally {
  try { if(server) await new Promise(resolve=>server.close(resolve)); if(db) await db.collection('issues').deleteMany({clientName:marker}); }
  finally { await config.closeDatabase(); }
 }
});
