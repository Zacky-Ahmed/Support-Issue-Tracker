const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ObjectId } = require('mongodb');
const dbConfig = require('../../src/config/database');
const app = require('../../src/app');
test('full CRUD, literal search, combined filters, overdue and HTTP errors', async () => {
 let db,server;
 const marker='Fictional workflow '+randomUUID();
 try {
  db=await dbConfig.connectDatabase();
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base='http://127.0.0.1:'+server.address().port+'/api/issues';
  const request=(path='',method='GET',body)=>fetch(base+path,{method, ...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  const create=async(title,priority)=>{
   const response=await request('','POST',{clientName:marker,title,description:'Fictional automated test',priority});
   assert.equal(response.status,201); return (await response.json()).issue;
  };
  const first=await create('Payment [test].* '+marker,'High');
  const second=await create('Other '+marker,'Low');
  const list=async(query)=>{const response=await request('?'+new URLSearchParams(query)); assert.equal(response.status,200);return (await response.json()).issues;};
  assert.equal((await list({search:marker.toUpperCase()})).length,2);
  assert.equal((await list({search:'Payment [test].* '+marker})).length,1);
  assert.equal((await list({search:marker,priority:'High',status:'Open'})).length,1);
  assert.equal((await list({search:marker,priority:'High',status:'Resolved'})).length,0);
  assert.equal((await list({search:'no-match-'+randomUUID()})).length,0);
  const oldDate=new Date(Date.now()-25*60*60*1000);
  await db.collection('issues').updateOne({_id:new ObjectId(first._id)},{$set:{reportedAt:oldDate}});
  let response=await request('/'+first._id);
  assert.equal(response.status,200);
  assert.equal((await response.json()).issue.isOverdue,true);
  for (const status of ['In Progress','Resolved','Open']) {
   response=await request('/'+first._id,'PATCH',{status,title:'Updated '+marker});
   assert.equal(response.status,200);
   const issue=(await response.json()).issue;
   assert.equal(issue.status,status);
   assert.equal(issue.isOverdue,status!=='Resolved');
   assert.equal(issue.reportedAt,oldDate.toISOString());
   assert.equal(issue._id,first._id);
  }
  response=await request('/'+first._id,'PATCH',{priority:'Low'});
  assert.equal((await response.json()).issue.isOverdue,false);
  const persisted=(await (await request('/'+first._id)).json()).issue;
  assert.equal(persisted.title,'Updated '+marker);
  assert.equal(persisted.priority,'Low');
  const ordered=await list({search:marker});
  assert.equal(ordered[0]._id,second._id);
  for(const method of ['GET','PATCH','DELETE']) {
   assert.equal((await request('/bad-id',method,method==='PATCH'?{status:'Open'}:undefined)).status,400);
   assert.equal((await request('/'+new ObjectId(),method,method==='PATCH'?{status:'Open'}:undefined)).status,404);
  }
  for(const body of [{},{status:'Invalid'},{reportedAt:new Date().toISOString()},{_id:second._id}]) assert.equal((await request('/'+first._id,'PATCH',body)).status,400);
  assert.equal((await request('?status=Invalid')).status,400);
  assert.equal((await request('?search=a&search=b')).status,400);
  assert.equal((await fetch(base+'/'+first._id,{method:'PATCH',body:'text'})).status,415);
  response=await request('/'+first._id,'DELETE');
  assert.equal(response.status,204);
  assert.equal(await response.text(),'');
  assert.equal((await request('/'+first._id)).status,404);
  assert.equal((await request('/'+first._id,'DELETE')).status,404);
  assert.equal((await list({search:marker})).length,1);
 } finally {
  try {
   if(server) await new Promise(resolve=>server.close(resolve));
   if(db) { await db.collection('issues').deleteMany({clientName:marker}); assert.equal(await db.collection('issues').countDocuments({clientName:marker}),0); }
  } finally {await dbConfig.closeDatabase();}
 }
});
