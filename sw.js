if(!self.define){let e,i={};const s=(s,n)=>(s=new URL(s+".js",n).href,i[s]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=s,e.onload=i,document.head.appendChild(e)}else e=s,importScripts(s),i()})).then((()=>{let e=i[s];if(!e)throw new Error(`Module ${s} didn’t register its module`);return e})));self.define=(n,r)=>{const t=e||("document"in self?document.currentScript.src:"")||location.href;if(i[t])return;let o={};const d=e=>s(e,t),c={module:{uri:t},exports:o,require:d};i[t]=Promise.all(n.map((e=>c[e]||d(e)))).then((e=>(r(...e),o)))}}define(["./workbox-fa446783"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/index-0d305acf.css",revision:null},{url:"assets/index-175db34e.js",revision:null},{url:"index.html",revision:"941ab91436e0223cf3c270c1ae9ca8c2"},{url:"popout.html",revision:"0fb061dbac9f6f0c94f41a51bca6c3c2"},{url:"registerSW.js",revision:"0c51d2f38853d7ef3d2db4a37319a147"},{url:"manifest.webmanifest",revision:"d05262efe64da6fd3308d7b9ef10dd36"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))}));
