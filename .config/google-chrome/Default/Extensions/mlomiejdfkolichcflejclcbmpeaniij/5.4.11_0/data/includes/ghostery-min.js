/*!
 * Ghostery for Chrome
 * http://www.ghostery.com/
 *
 * Copyright 2014 Ghostery, Inc. All rights reserved.
 * See https://www.ghostery.com/eula for license.
 */
(function(){function e(){for(var e="";32>e.length;)e+=Math.random().toString(36).replace(/[^A-Za-z]/g,"");return e}function t(e){return E.createElement(e)}function n(){return t("br")}function o(e){for(var t=1;arguments.length>t;t++)e.appendChild(arguments[t])}function a(e,n){var o=t("script"),a=L.top.document.documentElement;e?o.src=e:o.textContent=n,a.insertBefore(o,a.firstChild)}function r(){var e=t("style"),n=" !important;",a="padding:0;margin:0;font:13px Arial,Helvetica;text-transform:none;font-size: 100%;vertical-align:baseline;line-height:normal;color:#fff;position:static;";e.innerHTML="@-webkit-keyframes pop"+g+" {"+"50% {"+"-webkit-transform:scale(1.2);"+"}"+"100% {"+"-webkit-transform:scale(1);"+"}"+"}"+"@keyframes pop"+g+" {"+"50% {"+"-webkit-transform:scale(1.2);"+"transform:scale(1.2);"+"}"+"100% {"+"-webkit-transform:scale(1);"+"transform:scale(1);"+"}"+"}"+"#"+g+"{"+a+"border:solid 2px #fff"+n+"box-sizing:content-box"+n+"color:#fff"+n+"display:block"+n+"height:auto"+n+"margin:0"+n+"opacity:0.9"+n+"padding:7px 10px"+n+"position:fixed"+n+"visibility:visible"+n+"width:auto"+n+"z-index:2147483647"+n+"-webkit-border-radius:5px"+n+"-webkit-box-shadow:0px 0px 20px #000"+n+"-webkit-box-sizing:content-box"+n+"}"+"."+g+"-blocked{"+a+"color:#AAA"+n+"display:inline"+n+"text-decoration:line-through"+n+"}"+"#"+g+" br{display:block"+n+a+"}"+"#"+g+" span{background:transparent"+n+a+"}"+"#"+g+" div{"+a+"border:0"+n+"margin:0"+n+"padding:0"+n+"width:auto"+n+"letter-spacing:normal"+n+"font:13px Arial,Helvetica"+n+"text-align:left"+n+"text-shadow:none"+n+"text-transform:none"+n+"word-spacing:normal"+n+"}"+"#"+g+" a{"+a+"font-weight:normal"+n+"background:none"+n+"text-decoration:underline"+n+"color:#fff"+n+"}"+"a#"+g+"-gear{"+a+"text-decoration:none"+n+"position:absolute"+n+"display:none"+n+"font-size:20px"+n+"width:20px"+n+"height:20px"+n+"line-height:20px"+n+"text-align:center"+n+"background-color:rgba(255,255,255,.8)"+n+"background-image:url("+chrome.extension.getURL("data/images/gear.svg")+")"+n+"background-size:16px 16px"+n+"background-position:center center"+n+"background-repeat:no-repeat"+n+"text-decoration:none"+n+"}"+"a#"+g+"-gear:hover{"+"-webkit-animation-name:pop"+g+n+"animation-name:pop"+g+n+"-webkit-animation-duration:0.3s"+n+"animation-duration:0.3s"+n+"}"+"#"+g+":hover #"+g+"-gear{"+"text-decoration:none"+n+"display:inline-block"+n+"}"+"@media print{#"+g+"{display:none"+n+"}}",o(E.getElementsByTagName("head")[0],e)}function i(e){var t=E.getElementById(g);t&&t.parentNode.removeChild(t),clearTimeout(h),e&&(m=!0)}function s(e,n){var a=t("a");return a.style.color="#fff",a.style.textDecoration="underline",a.style.border="none",a.href=e||"#",e&&(a.target="_blank"),o(a,E.createTextNode(n)),a}function l(e,n){var a=t("span");return n&&(a.className=n),o(a,E.createTextNode(e)),a}function d(e,n){var a=t("div");return a.id=g,a.style.setProperty(n&&"left"==n.pos_x?"left":"right","20px","important"),a.style.setProperty(n&&"bottom"==n.pos_y?"bottom":"top","15px","important"),a.style.setProperty("background","showBugs"==e?"#330033":"#777","important"),E.getElementsByTagName("body")[0]?o(E.body,a):o(E.getElementsByTagName("html")[0],a),"showBugs"==e&&(a.style.cursor="pointer",a.addEventListener("click",function(e){i(!0),e.preventDefault()}),a.addEventListener("mouseenter",function(e){clearTimeout(h),h=!1,e.preventDefault()}),a.addEventListener("mouseleave",function(e){h=setTimeout(i,1e3*n.timeout),e.preventDefault()})),a}function p(e,a,r,p){"showBugs"!=e&&i();var u,f,m=t("div");if(m.style.setProperty("background","showBugs"==e?"#330033":"#777","important"),"showCMPMessage"==e)o(m,l(p.campaign.Message),n()),f=s(p.campaign.Link,p.campaign.LinkText),f.addEventListener("click",function(){i(),P("dismissCMPMessage")}),o(m,n(),f),f=s(!1,"Dismiss"),f.addEventListener("click",function(e){i(),P("dismissCMPMessage"),e.preventDefault()}),o(m,n(),n(),f);else if("showBugs"==e){o(m,c(r));for(var b=0;a.length>b;b++)o(m,l(a[b].name,a[b].blocked?g+"-blocked":""),n())}else{if("showUpdateAlert"!=e){var y=s("",v.notification_upgrade);y.addEventListener("click",function(e){P("openReleaseBlog"),i(),e.preventDefault()}),o(m,y)}("showWalkthroughAlert"==e||"showUpdateAlert"==e)&&("showUpdateAlert"==e?(o(m,l(v.notification_update)),f=s("",v.notification_update_link)):(o(m,n(),n(),l(v.notification_reminder1),n(),l(v.notification_reminder2)),f=s("",v.notification_reminder_link)),f.addEventListener("click",function(t){P("showUpdateAlert"==e?"showNewTrackers":"openWalkthrough"),t.preventDefault()}),o(m,n(),n(),f)),f=s(!1,v.dismiss),f.addEventListener("click",function(e){i(),e.preventDefault()}),o(m,n(),n(),f)}u=E.getElementById(g),u||(u=d(e,r)),"showBugs"==e?u.title=x.alert_bubble_tooltip:"showCMPMessage"==e&&u.style.setProperty("max-width","300px","important"),u.innerHTML="",o(u,m),clearTimeout(h),r&&r.timeout&&h&&(h=setTimeout(i,1e3*r.timeout))}function c(e){var n=t("a");return n.innerHTML="&nbsp;",n.href="#",n.id=g+"-gear",n.title=x.alert_bubble_gear_tooltip,n.style.setProperty(e&&"left"==e.pos_x?"left":"right","0","important"),n.style.setProperty(e&&"bottom"==e.pos_y?"bottom":"top","0","important"),n.style.setProperty("border-"+(e&&"bottom"==e.pos_y?"top":"bottom")+"-"+(e&&"left"==e.pos_x?"right":"left")+"-radius","3px","important"),n.style.setProperty("border-"+(e&&"bottom"==e.pos_y?"bottom":"top")+"-"+(e&&"left"==e.pos_x?"left":"right")+"-radius","3px","important"),n.addEventListener("click",function(e){P("showPurpleBoxOptions"),e.preventDefault()}),n}function u(e,t,n){e.addEventListener("load",function(){var o=e.contentDocument;o.documentElement.innerHTML=n,t.button?(e.style.width="30px",e.style.height="19px",e.style.border="0px"):(e.style.width="100%",e.style.border="1px solid #ccc",e.style.height="80px"),t.frameColor&&(e.style.background=t.frameColor),o.getElementById("action-once").addEventListener("click",function(e){P("processC2P",{action:"once",app_ids:t.allow}),e.preventDefault()},!0),t.button||o.getElementById("action-always").addEventListener("click",function(e){P("processC2P",{action:"always",app_ids:t.allow}),e.preventDefault()},!0)},!1)}function f(e,n,a){n.forEach(function(e,n){for(var r=E.querySelectorAll(e.ele),i=0,s=r.length;s>i;i++){var l=r[i];if(e.attach&&"parentNode"==e.attach){if(l.parentNode&&"BODY"!=l.parentNode.nodeName&&"HEAD"!=l.parentNode.nodeName){var d=t("div");l.parentNode.replaceChild(d,l),l=d}}else l.textContent="";l.style.display="block";var p=t("iframe");u(p,e,a[n]),o(l,p)}})}var m=!1,g=e(),h=9999,b={},y=!1,x={},v={},w=!1,k=chrome.extension,_=chrome.runtime,E=document,L=window,M=_&&_.onMessage||k.onMessage,B={},P=function(e,t){return(_&&_.sendMessage||k.sendMessage)({name:e,message:t})};M.addListener(function(e,t,n){if(!t.tab||0===t.tab.url.indexOf(k.getURL(""))){var o=["show","showUpgradeAlert","showWalkthroughAlert","showUpdateAlert","showCMPMessage"],i=e.name,s=e.message;"c2p"==i&&(b[s.app_id]=[s.app_id,s.data,s.html],"complete"==E.readyState&&f.apply(this,b[s.app_id])),-1!=o.indexOf(i)?(y||(y=!0,r()),"showCMPMessage"==i?(B=s.data,m||(p(i,null,null,{campaign:B[0]}),w=!0)):"show"==i?(x=s.translations,w||m||p("showBugs",s.bugs,s.alert_cfg)):(v=s.translations,p(i),w=!0)):"surrogate"==i?a(null,s.surrogate):"reload"==i&&E.location.reload(),n({})}}),L.addEventListener("load",function(){for(var e in b)f.apply(this,b[e])},!1),P("pageInjected")})();