const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./source-loader.cjs');
const { gameReducer, createInitialState } = loadSource('src/hooks/gameReducer.ts');
const tokens = values => ({red:0,blue:0,yellow:0,purple:0,orange:0,green:0,gray:0,...values});
function state() {
    return {...createInitialState([{id:'a',name:'A'}, {id:'b',name:'B'}], {turnLimitSeconds:60}), status:'PLAYING', locations:[]};
}

test('main actions cannot bypass a required location choice', () => {
    const s = state();
    s.locations = [1,2].map(n => ({id:`loc${n}`,name:`Location ${n}`,requirements:{},points:3,image:''}));
    const pending = gameReducer(s, {type:'TAKE_TOKENS',tokens:tokens({red:1})});
    assert.equal(pending.currentPlayerIndex,0);
    assert.equal(pending.pendingLocationSelection.length,2);
    for (const action of [
        {type:'TAKE_TOKENS',tokens:tokens({blue:1})},
        {type:'RESERVE_CARD',cardId:pending.market[1][0].id},
        {type:'RECRUIT_CARD',cardId:pending.market[1][0].id},
        {type:'END_TURN'}
    ]) assert.strictEqual(gameReducer(pending,action), pending, action.type);
    const finished = gameReducer(pending,{type:'SELECT_LOCATION',locationId:'loc1'});
    assert.equal(finished.currentPlayerIndex,1);
    assert.equal(finished.players[0].points,3);
    assert.equal(finished.pendingLocationSelection,undefined);
});

test('END_TURN uses the same five-color winning requirement as normal actions', () => {
    const s = state();
    s.currentPlayerIndex=1;
    s.players[1].points=16;
    s.players[1].tokens.green=1;
    const ended = gameReducer(s,{type:'END_TURN'});
    assert.equal(ended.status,'PLAYING');
    assert.equal(ended.finalRound,undefined);
    assert.ok(ended.turnDeadline >= Date.now()+59000);
});

test('END_TURN honors the Avengers tiebreak and stops the timer', () => {
    const s=state();
    s.currentPlayerIndex=1;
    s.finalRound=true;
    s.players.forEach(p=>{p.points=16;});
    s.avengersTileOwnerId='b';
    const ended=gameReducer(s,{type:'END_TURN'});
    assert.equal(ended.winner,'B');
    assert.equal(ended.status,'GAME_OVER');
    assert.equal(ended.turnDeadline,undefined);
});

test('recruitment pays discounted colors first and uses shields only for the shortfall', () => {
    const s=state();
    s.players[0].tableau=[{id:'discount',tier:1,points:0,bonus:'red',cost:{}}];
    s.players[0].tokens=tokens({red:1,blue:1,gray:2});
    s.market[1]=[{id:'target',tier:1,points:2,bonus:'blue',cost:{red:3,blue:2}}];
    const next=gameReducer(s,{type:'RECRUIT_CARD',cardId:'target'});
    assert.deepEqual(next.players[0].tokens,tokens({}));
    assert.equal(next.players[0].points,2);
    assert.equal(next.tokens.red,s.tokens.red+1);
    assert.equal(next.tokens.blue,s.tokens.blue+1);
    assert.equal(next.tokens.gray,s.tokens.gray+2);
    const poor=state();
    poor.market[1]=s.market[1];
    assert.strictEqual(gameReducer(poor,{type:'RECRUIT_CARD',cardId:'target'}),poor);
});

test('card artwork imports resolve with exact filename casing', () => {
    const filename=path.resolve(__dirname,'../src/data/cards.ts');
    const source=fs.readFileSync(filename,'utf8');
    for(const [,relative] of source.matchAll(/from ['"]([^'"]+\.(?:jpg|png|webp))['"]/g)) {
        const full=path.resolve(path.dirname(filename),relative);
        assert.ok(fs.readdirSync(path.dirname(full)).includes(path.basename(full)),relative);
    }
});
