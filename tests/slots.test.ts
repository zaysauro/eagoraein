import {test} from 'node:test';import assert from 'node:assert/strict';import {generateSlotsFromSession,getAvailableSlots} from '../src/lib/slots';
const day=new Date(2030,0,7);const schedule=[{dayOfWeek:1,startTime:'09:00',endTime:'12:00'}];
test('invalid durations and times terminate safely',()=>{for(const d of [0,-5,NaN,Infinity,4])assert.deepEqual(generateSlotsFromSession('09:00','12:00',d),[]);assert.deepEqual(generateSlotsFromSession('29:00','30:00',30),[])});
test('service slots stay within operating sessions',()=>{const slots=getAvailableSlots(day,schedule,[],[],45);assert.equal(slots.length,4);assert.equal(slots.at(-1)?.endTime,'12:00')});
test('holiday overrides weekly availability',()=>assert.deepEqual(getAvailableSlots(day,schedule,[{date:day,isBlocked:true,startTime:null,endTime:null}],[],30),[]));
test('buffers block both sides of a reservation',()=>{const slots=getAvailableSlots(day,schedule,[],[{startTime:new Date(2030,0,7,10),endTime:new Date(2030,0,7,10,30),bufferTime:15}],30,15);assert.equal(slots.find(s=>s.startTime==='09:30')?.available,false);assert.equal(slots.find(s=>s.startTime==='10:30')?.available,false);assert.equal(slots.find(s=>s.startTime==='11:00')?.available,true)});
test('past date cannot be booked',()=>assert.deepEqual(getAvailableSlots(new Date(2020,0,6),schedule,[],[],30),[]));
