var tya=function(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b};var tyb=function(a){this.u=a};tyb.prototype.toString=function(){return this.u};var ty=function(a){return ty.s(a)};ty.s=function(a){return a+"_"};ty.S=function(){throw Error("xid.literal must not be used in COMPILED mode.");};ty.object=function(a){if(a&&a.constructor&&a.constructor.toString()===Object.toString()){var b={},c;for(c in a)a.hasOwnProperty(c)&&(b[ty.s(c)]=a[c]);return b}throw Error("xid.object must be called with an object literal.");};ty.v=!0;ty.w=function(a){return a};ty.R=function(){return"a_"!=ty("a")};new tyb(ty("goog.ui.ActivityMonitor"));new tyb(ty("fava.app.AppLifetimeService"));new tyb(ty("fava.base.AsyncOperationServices"));new tyb(ty("fava.net.BrowserChannelServices"));new tyb(ty("fava.canvas.CanvasService"));new tyb(ty("fava.canvas.CanvasConfiguration"));new tyb(ty("fava.diagnostics.CsiService"));new tyb(ty("fava.data.DataServices"));new tyb(ty("fava.data.DataStoreUpdaterService"));new tyb(ty("fava.locale.DateTimeFormatService"));new tyb(ty("fava.debug.DeobfuscationService"));new tyb(ty("fava.diagnostics.Diagnostics"));
new tyb(ty("fava.component.DomServices"));new tyb(ty("fava.app.DragDropService"));new tyb(ty("fava.browser.ExportService"));new tyb(ty("fava.layout.FixedLayoutHelper"));new tyb(ty("fava.gbar.GbarService"));new tyb(ty("fava.gloader.GoogleLoaderService"));new tyb(ty("fava.controls.help.HelpOverlayService"));new tyb(ty("fava.view.HistoryInterface"));new tyb(ty("fava.view.HistoryManager"));new tyb(ty("fava.view.HistoryRegistry"));new tyb(ty("fava.identity.IdentityService"));new tyb(ty("fava.browser.IeCutCopyHandle"));
new tyb(ty("fava.diagnostics.Impressions"));new tyb(ty("fava.browser.KeyboardShortcutHandler"));new tyb(ty("fava.browser.KeyboardShortcutRegistry"));new tyb(ty("fava.controls.mole.MoleManager"));new tyb(ty("fava.app.NavBarService"));new tyb(ty("fava.view.NavigationServices"));new tyb(ty("fava.net.NetworkDiagnosticsService"));new tyb(ty("fava.app.NotificationService"));new tyb(ty("fava.request.OauthService"));new tyb(ty("fava.net.OfflineServices"));new tyb(ty("fava.modules.PrefetchService"));new tyb(ty("fava.controls.RelativeDateControl"));
new tyb(ty("fava.request.RequestService"));new tyb(ty("fava.base.Scheduler"));new tyb(ty("fava.net.ServerErrorService"));new tyb(ty("fava.dom.SoyRenderer"));new tyb(ty("fava.dom.SoyRendererConfig"));new tyb(ty("fava.app.TitleBar"));new tyb(ty("fava.controls.Toast"));new tyb(ty("fava.app.UserActionService"));new tyb(ty("fava.browser.ViewportServices"));new tyb(ty("fava.diagnostics.ViewDiagnostics"));new tyb(ty("fava.view.ViewManagerInterface"));new tyb(ty("fava.view.ViewRegistry"));new tyb(ty("fava.browser.WindowService"));
new tyb(ty("fava.browser.WindowOpenerUtil"));new tyb(ty("fava.app.WindowWidget"));new tyb(ty("fava.request.XsrfService"));new tyb("a");var tye=function(){this.g={b:"a",o:null,i:tyc};this.j={b:"a",o:null,i:tyd}},tyf=function(a){if(!a)throw Error();},tyc=function(a,b){return a+"_"+b+".css"},tyd=function(a,b){return a+"_"+b+".js"};tye.prototype.load=function(){if(tyg(this.g)){var a=this.g.i(tyh(),tyi()),b=document.createElement("link");b.rel="stylesheet";b.type="text/css";b.href=a;document.head.appendChild(b)}tyg(this.j)&&(a=this.j.i(tyh(),tyi()),b=document.createElement("script"),b.src=a,document.body.appendChild(b))};
var tyj=/(.+)\.html/,tyh=function(){var a=window.location.pathname.substr(1),a="_generated_background_page.html"==a?"background":a.match(tyj)[1],b=/^[\s\xa0]*$/;tyf("string"==typeof a&&!b.test(a));return a},tyi=function(){return"ltr"==chrome.i18n.getMessage("@@bidi_dir")?"ltr":"rtl"},tyg=function(a){if("a"==a.b)return!0;if("n"==a.b)return!1;tyf("s"==a.b);tyf("array"==tya(a.o));var b=tyh();return 0<=a.o.indexOf(b)};-1!=(Array.prototype.indexOf?function(a,b,c){return Array.prototype.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if("string"==typeof a)return"string"==typeof b&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1})(["miniplayer.html","settings.html"],this.location.pathname.substr(1))&&("rtl"==("rtl"==chrome.i18n.getMessage("@@bidi_dir")?"rtl":"ltr")?this.document.documentElement.setAttribute("dir","rtl"):this.document.documentElement.setAttribute("dir",
"ltr"));var tyk=new tye;tyk.g.i=function(a,b){return"ltr"==b?"css_compiled.css":"css_compiled_rtl.css"};tyk.g.b="s";tyk.g.o=["miniplayer","settings"];tyk.j.i=function(){return"main.js"};tyk.j.b="s";tyk.j.o=["miniplayer","settings"];tyk.load();
