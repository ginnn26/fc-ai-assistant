import {ListeningClock,dayKey} from './core.mjs';
// This adapter is not installed on FC yet. Same-origin HTML media only; no guessed window-open timers.
export function attachMediaCollector({media,track,onProgress,now=()=>performance.now(),date=()=>new Date(),every=30000,setTimer=setInterval,clearTimer=clearInterval}){
 if(!media||!track?.course||!track?.unit||typeof onProgress!=='function')throw Error('Real media, catalog identity and callback required');
 const clock=new ListeningClock(),id=crypto.randomUUID(),day=dayKey(date());let disposed=false,lastSent=0;
 const sample=()=>clock.sample({wall:now(),position:media.currentTime,paused:media.paused,seeking:media.seeking,rate:media.playbackRate});
 const flush=()=>{sample();if(clock.seconds>lastSent){lastSent=clock.seconds;onProgress({...track,id,day,seconds:Math.floor(clock.seconds),source:'player'});}};
 const reset=()=>clock.reset();const events={timeupdate:sample,playing:reset,pause:flush,ended:flush,seeking:reset,seeked:reset,ratechange:reset};
 for(const [name,fn]of Object.entries(events))media.addEventListener(name,fn);
 const timer=setTimer(flush,every);return{flush,dispose(){if(disposed)return;disposed=true;flush();clearTimer(timer);for(const [name,fn]of Object.entries(events))media.removeEventListener(name,fn);},get seconds(){return clock.seconds;}};
}
