import {attachMediaCollector} from './player-collector.mjs';

export const FC_ORIGIN='https://frequencies-clinic.learnworlds.com';
export function protectedTrackUrl(track){
 if(!/^[a-z0-9_-]+$/i.test(track?.course||'')||!/^[a-f0-9]{24}$/i.test(track?.unit||''))throw Error('曲目资料不完整');
 const url=new URL('/path-player',FC_ORIGIN);url.searchParams.set('courseid',track.course);url.searchParams.set('unit',track.unit);return url.href;
}
export function matchesTrack(href,track){try{const u=new URL(href);return u.origin===FC_ORIGIN&&u.pathname==='/path-player'&&u.searchParams.get('courseid')===track.course&&(u.searchParams.get('unit')||'').replace(/Unit$/,'')===track.unit;}catch{return false;}}
// Read only the selected, protected native activity. A login/denial page is never playback.
export function activityMedia(frame,track){
 try{if(!matchesTrack(frame.contentWindow.location.href,track))return null;const doc=frame.contentDocument;const inner=doc?.querySelector('#playerFrame');if(!inner)return null;const activity=inner.contentDocument;if(!activity)return null;return activity.querySelector('video,audio');}catch{return null;}
}
export function watchNativePlayer({frame,track,onProgress,onStatus=()=>{},setTimer=setInterval,clearTimer=clearInterval,collector=attachMediaCollector}){
 let media=null,bound=null,stopped=false;
 function inspect(){if(stopped)return;const next=activityMedia(frame,track);if(next===media)return;if(bound){bound.dispose();bound=null;}media=next;if(next){bound=collector({media:next,track,onProgress});onStatus('已连接实际播放器；只有声音正在播放的时长才会记录。');}else onStatus('等待会员播放器。请在下方点击播放；如果没有权限，请先确认 FC 登录和会员方案。');}
 frame.addEventListener('load',inspect);const timer=setTimer(inspect,1000);inspect();
 return{flush(){bound?.flush();},stop(){if(stopped)return;stopped=true;clearTimer(timer);frame.removeEventListener('load',inspect);bound?.dispose();bound=null;media=null;}};
}
