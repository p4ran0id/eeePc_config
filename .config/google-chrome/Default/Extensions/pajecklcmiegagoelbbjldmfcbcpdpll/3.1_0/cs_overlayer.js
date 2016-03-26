
var DolphinShowInfo = function(){
	this.create();
};

/*
var extLocale = {
	'Login Successful':decodeURIComponent('%E7%99%BB%E5%BD%95%E6%88%90%E5%8A%9F'),//登录成功
	'Sending…':decodeURIComponent('%E5%8F%91%E9%80%81%E4%B8%AD...'),//发送中...
	'Selected text sent successfully':decodeURIComponent('%E6%96%87%E6%9C%AC%E5%8F%91%E9%80%81%E6%88%90%E5%8A%9F'),//文本发送成功
	'Page sent successfully':decodeURIComponent('%E7%BD%91%E9%A1%B5%E5%8F%91%E9%80%81%E6%88%90%E5%8A%9F'),//网页发送成功
	'Direction sent successfully':decodeURIComponent('%E8%B7%AF%E7%BA%BF%E5%8F%91%E9%80%81%E6%88%90%E5%8A%9F'),//路线发送成功
	'Image sent successfully':decodeURIComponent('%E5%9B%BE%E7%89%87%E5%8F%91%E9%80%81%E6%88%90%E5%8A%9F'), //图片发送成功
	'App sent successfully':decodeURIComponent('%E5%BA%94%E7%94%A8%E5%8F%91%E9%80%81%E6%88%90%E5%8A%9F'), //应用发送成功
	'Network error,send failed':decodeURIComponent('%E7%BD%91%E7%BB%9C%E9%94%99%E8%AF%AF%EF%BC%8C%E5%8F%91%E9%80%81%E5%A4%B1%E8%B4%A5'), //网络错误，发送失败
	'Send failed!':decodeURIComponent('%E5%8F%91%E9%80%81%E5%A4%B1%E8%B4%A5') //发送失败
};
*/
/*
	window.DOLPHIN_STATUS
	0: offline device alert
	1: already sent
	2: sent fail
	3: not arrive
	4: sending
	5: login success
*/
DolphinShowInfo.prototype = 
{
        create : function()
        {
            var self=this,extendsdiv = document.getElementById('dolphinPushInfo'),icon_path = chrome.extension.getURL('images/ico.png'),tmpDiv,tmpState = window.DOLPHIN_STATUS,tmpText=window.DOLPHIN_STATUS_TEXT||'this for test ,please remove it after success',tmpCss=['dolphinPushToOffline','dolphinPushSuccess','dolphinPushFail','dolphinPushToFail','dolphinPushing','dolphinLoginSuccess'];
            if(extendsdiv){var tmpP = extendsdiv.parentNode;tmpP.removeChild(extendsdiv);}
			var styles = '\
				.wzcsdiv_ld{display:inline-block !important;position:fixed;right:4px;top:4px; border: 1px solid #ccc;padding: 12px 31px 18px 85px; color:#555; background:url('+icon_path+') no-repeat #fff; border-radius:6px; box-shadow: 0 0 28px #ccc;font-weight:600;font-size:20px;font-family:"Segoe UI", Arial, "Microsoft Yahei", Simsun, sans-serif;z-index:9999999;}.dolphinLoginSuccess{background-position:16px -374px;padding-left: 71px;}.dolphinPushSuccess{background-position:16px 6px}.dolphinPushFail{background-position:16px -574px}.dolphinPushToFail{background-position:16px -286px}.dolphinPushToOffline{background-position:18px -473px}.dolphinPushing{background-position:21px -187px;padding-left:70px}.dolphinSoundLogin{background-position:16px -88px},.hide{display:none}\
				';
			
			// add overlay
			if(tmpState==undefined||!(/[0-6]/.test(tmpState))){return ;}
			tmpDiv = '<span id="sonar_login_success_overlay" class="wzcsdiv_ld '+tmpCss[tmpState]+'">'+decodeURIComponent(tmpText)+'</span>';
		 
			// add to DOM
			var overlayFakeContainer = document.createElement('div');
			overlayFakeContainer.id = "dolphinPushInfo";
			overlayFakeContainer.innerHTML = '<style>'+styles+'</style>' + tmpDiv;
			
			if(document.body)
			{
				document.body.appendChild(overlayFakeContainer);			
			}
                
            // animate in
			if(tmpState != 4){
				clearTimeout(this.hideTO);
				this.hideTO = setTimeout(function(){self.hide();}, 2500);
			}
			else
			{
				clearTimeout(this.hideTO);
				this.hideTO = setTimeout(function(){self.hide();}, 6000);
			}
        },
        hide : function()
        {
                var overlay = document.getElementById('dolphinPushInfo');
                overlay.style.visibility = 'hidden';
                overlay.parentNode.removeChild(overlay);
        }
};
var overlay = new DolphinShowInfo();