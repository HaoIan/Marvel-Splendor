const {test, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const {createClient} = require('@supabase/supabase-js');
const {loadSource} = require('./source-loader.cjs');
const {gameReducer, createInitialState} = loadSource('src/hooks/gameReducer.ts');
const cleanups=[];
const storage=new Map();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},configurable:true});
afterEach(()=>{cleanups.splice(0).forEach(fn=>fn());storage.clear();});
function database(initial) {
    let row={id:'match',game_state:structuredClone(initial)};
    let failNextWrite=false;
    const client=createClient('https://example.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async (input, init)=>{
        const url=new URL(input);
        const method=init?.method??'GET';
        if(method==='PATCH') {
            if(failNextWrite) { failNextWrite=false; return new Response(JSON.stringify({message:'write failed'}),{status:500}); }
            const revisionFilter=url.searchParams.get('game_state->>revision');
            const current=row.game_state.revision;
            const matches=!revisionFilter || (revisionFilter==='is.null' ? current==null : revisionFilter===`eq.${current}`);
            if(!matches) return new Response('[]',{headers:{'Content-Type':'application/json'}});
            row={...row,...JSON.parse(init.body)};
        } else if(method==='POST') row={id:'match',...JSON.parse(init.body)[0]};
        const single=new Headers(init?.headers).get('accept')?.includes('vnd.pgrst.object');
        return new Response(JSON.stringify(single?structuredClone(row):[structuredClone(row)]),{headers:{'Content-Type':'application/json'}});
    }}});
    // Realtime is external; tests control synchronization through explicit fetches.
    client.channel=()=>({on(){return this;},subscribe(){return this;},unsubscribe(){}});
    return {client,get state(){return structuredClone(row.game_state);},failWrite(){failNextWrite=true;}};
}
function player(id) { return {id,name:id}; }
function lobby() {return createInitialState([player('a')],{turnLimitSeconds:0});}
function harness(db,initial) {
    const slots=[];
    let cursor=0, local=initial;
    const react={
        useCallback(fn,deps){const i=cursor++;const prev=slots[i];if(!prev||deps.some((v,n)=>v!==prev.deps[n])) slots[i]={deps,fn};return slots[i].fn;},
        useRef(value){const i=cursor++; return slots[i]??=( {current:value} );},
        useState(value){const i=cursor++; slots[i]??=value;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
        useEffect(fn,deps){const i=cursor++; const prev=slots[i];if(!prev||deps.some((v,n)=>v!==prev.deps[n])) {prev?.cleanup?.();slots[i]={deps,cleanup:fn()};}}
    };
    const {useMultiplayer}=loadSource('src/hooks/useMultiplayer.ts',{'react':react,'../lib/supabase':{supabase:db.client}});
    const dispatch=action=>{local=gameReducer(local,action);};
    cleanups.push(()=>slots.forEach(s=>s?.cleanup?.()));
    return {render(){cursor=0;return useMultiplayer(dispatch,local);},get state(){return local;}};
}
async function connected(db,id) {const h=harness(db,db.state);await h.render().joinGame('match',id,id,id==='a');return h;}

test('online START_GAME displays the exact shuffled state that was persisted',async()=>{
    const db=database(createInitialState([player('a'),player('b')],{turnLimitSeconds:0}));
    const h=await connected(db,'a');
    await h.render().sendAction({type:'START_GAME',players:[player('a'),player('b')],config:{turnLimitSeconds:0}});
    assert.deepEqual(h.state,db.state);
});

test('a stale timeout cannot overwrite a committed move',async()=>{
    const s={...createInitialState([player('a'),player('b')],{turnLimitSeconds:0}),status:'PLAYING',locations:[]};
    const db=database(s), a=await connected(db,'a'), b=await connected(db,'b');
    await a.render().sendAction({type:'RESERVE_CARD',cardId:s.market[1][0].id});
    await b.render().sendAction({type:'PASS_TURN',expectedPlayerIndex:0});
    assert.equal(db.state.players[0].hand.length,1);
    assert.deepEqual(b.state,db.state);
});

test('concurrent lobby joins preserve both players',async()=>{
    const db=database(lobby()), b=harness(db,db.state), c=harness(db,db.state);
    await Promise.all([b.render().joinGame('match','b','b'),c.render().joinGame('match','c','c')]);
    assert.deepEqual(db.state.players.map(p=>p.id).sort(),['a','b','c']);
});

test('lobby joins initialize every token and collection field',async()=>{
    const db=database(lobby()); await connected(db,'b');
    const p=db.state.players[1];
    assert.deepEqual(p.tokens,{red:0,blue:0,yellow:0,purple:0,orange:0,green:0,gray:0});
    assert.deepEqual(p.locations,[]);
    assert.deepEqual(p.nobles,[]);
});

test('new players cannot join a running match, but existing players can reconnect',async()=>{
    const initial={...createInitialState([player('a'),player('b')]),status:'PLAYING'};
    const db=database(initial), outsider=harness(db,initial);
    await outsider.render().joinGame('match','c','c');
    assert.equal(outsider.render().mpState.connectionStatus,'error');
    assert.equal(db.state.players.length,2);
    const reconnected=await connected(db,'b');
    assert.equal(reconnected.render().mpState.connectionStatus,'connected');
});

test('failed writes do not apply a local move',async()=>{
    const initial={...createInitialState([player('a'),player('b')]),status:'PLAYING'};
    const db=database(initial), h=await connected(db,'a');
    const before=h.state;
    db.failWrite();
    await h.render().sendAction({type:'RESERVE_CARD',cardId:initial.market[1][0].id});
    assert.deepEqual(h.state,before);
    assert.equal(db.state.players[0].hand.length,0);
});


test('hosting starts with a complete player and a fresh match', async()=>{
    const old={...lobby(),status:'GAME_OVER',winner:'old',revision:20,finalRound:true};
    const db=database(old), h=harness(db,old);
    await h.render().hostGame('Host','host',90);
    assert.equal(h.render().mpState.connectionStatus,'connected');
    assert.equal(db.state.status,'LOBBY');
    assert.equal(db.state.winner,null);
    assert.equal(db.state.finalRound,undefined);
    assert.equal(db.state.turnDeadline,undefined);
    assert.equal(db.state.config.turnLimitSeconds,90);
    assert.deepEqual(db.state.players[0].tokens,{red:0,blue:0,yellow:0,purple:0,orange:0,green:0,gray:0});
    assert.deepEqual(db.state.players[0].locations,[]);
});

test('concurrent joins cannot exceed the four-player lobby limit',async()=>{
    const db=database(createInitialState([player('a'),player('b'),player('c')]));
    const d=harness(db,db.state),e=harness(db,db.state);
    await Promise.all([d.render().joinGame('match','d','d'),e.render().joinGame('match','e','e')]);
    assert.equal(db.state.players.length,4);
    assert.deepEqual([d.render().mpState.connectionStatus,e.render().mpState.connectionStatus].sort(),['connected','error']);
});

test('a failed lobby write cannot report a phantom player as connected',async()=>{
    const db=database(lobby()),h=harness(db,db.state);
    db.failWrite();
    await h.render().joinGame('match','b','b');
    assert.equal(h.render().mpState.connectionStatus,'error');
    assert.deepEqual(db.state.players.map(p=>p.id),['a']);
});
