/*! Copyright 2009-2016 Evernote Corporation. All rights reserved. */
function UsageMetrics(a,b,c,d,e,f,g){"use strict";function h(){var a=new Date,b=Math.floor(a.getMinutes()/n)*n;return a.setMinutes(b),a.setSeconds(0),a.setMilliseconds(0),Math.round(a.getTime()/1e3)}function i(a){var b=h();return p>=b?void(a&&a()):(q[b]=!0,void j(a))}function j(a){if(!navigator.onLine)return void(a&&a());var b=0,c=0;for(var d in q){var e=parseInt(d);b++,e>c&&(c=e)}b>0?k(b,c,a):a&&a()}function k(h,i,j){function k(a){if(a){q=[],i>p&&(p=i);var b=Persistent.get("uploaded");b||(b={}),b[n.userId]=a.uploaded,Persistent.set("uploaded",b);var c=Persistent.get("savedAuthInfo"),d=Persistent.get("shownNearQuotaUpsell"),e=Persistent.get("shownSpeedbump");c&&c.userInfo&&c.userInfo[n.userId]&&c.userInfo[n.userId].monthEnd&&c.userInfo[n.userId].monthEnd<new Date&&(c.userInfo[n.userId].monthEnd+=2592e6,d||(d={}),delete d[n.userId],Persistent.set("shownNearQuotaUpsell",d),e||(e={}),delete e[n.userId],Persistent.set("shownSpeedbump",e)),Persistent.set("savedAuthInfo",c);var h=Persistent.get("userLastUpdated")||0,k=Persistent.get("googleConnection");(!k||!k[n.userId]||k[n.userId].version<o||new Date>=k[n.userId].expires||a.userLastUpdated>h||a.userLastUpdated>k[n.userId].lastQueried)&&extension.createUtilityClient(n.shardId).getOAuthCredential(n.authenticationToken,OAUTH_CREDENTIAL_SERVICE_GOOGLE_CONNECT,function(a){var b=Persistent.get("googleConnection");b||(b={}),b[auth.getCurrentUser()]={lastQueried:new Date-0,connected:!0,expires:a.expires,version:o},Persistent.set("googleConnection",b)},function(a){if("EDAMNotFoundException"===a.__proto__.name&&"OAuthCredential"===a.identifier||"EDAMUserException"===a.__proto__.name&&a.code===EDAMErrorCode.DATA_CONFLICT){var b=Persistent.get("googleConnection");b||(b={}),b[auth.getCurrentUser()]={lastQueried:new Date-0,connected:!1,version:o},Persistent.set("googleConnection",b)}else log.error(a)}),a.userLastUpdated>h&&(Persistent.set("userLastUpdated",a.userLastUpdated),f.apply(null,g))}j&&j()}function l(){r.client.NoteStore.getSyncStateWithMetrics(k,n.authenticationToken,{sessions:h})}function m(b){n=b,n&&n.authenticationToken?(r=new JsonRpc(null,["NoteStore.getSyncStateWithMetrics"],a,c,d,e),r.initWithAuthToken(n.authenticationToken,l)):(log.warn("Tried to send UsageMetrics, but not logged in."),j&&j())}var n,r;b(m)}function l(){var a={};a.lastSent=p,a.activityBlocks={};for(var b in q)a.activityBlocks[b]=q[b];return a}function m(a){try{p=a.lastSent,q=a.activityBlocks}catch(b){p=0,q={},log.warn("Failed to import saved UsageMetrics from JSON object.")}}var n=15,o=2,p=0,q={};this.recordActivity=i,this.send=j,this.getJson=l,this.importFromJson=m,Object.preventExtensions(this)}function UsageMetricsManager(a,b,c,d,e,f,g){function h(){try{var h=Persistent.get("usageMetrics");for(var i in h)k[i]=new UsageMetrics(a,b,c,d,e,f,g),k[i].importFromJson(h[i])}catch(j){log.warn("Failure restoring usage metrics. Setting blank."),k={}}}function i(){var a={};for(var b in k)a[b]=k[b].getJson();Persistent.set("usageMetrics",a)}function j(){function h(h){var l=Persistent.get("lastActiveTimes");l||(l={});var m=h?h.userId:"unauthed";if(l[m]||(l[m]={count:0}),l.unauthed||(l.unauthed={count:0}),l[m].time=(new Date).getTime(),l.unauthed.time=l[m].time,Persistent.set("lastActiveTimes",l),h&&(j=h.username),j){var n=k[j];n||(n=new UsageMetrics(a,b,c,d,e,f,g),k[j]=n),n.recordActivity(i)}}var j="";b(h)}var k={};h(),this.recordActivity=j,Object.preventExtensions(this)}Object.preventExtensions(UsageMetrics),Object.preventExtensions(UsageMetricsManager);