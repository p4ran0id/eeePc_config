//sync font end
SyncFontEnd = function() {
	this.init();
}
SyncFontEnd.prototype = {
	init: function() {
		var self = this,
			pageKind = document.body.id, //body id 指示当前显示页面
			comMatch = {
				login: 'loginInit',
				mainPane: 'mainPaneInit',
				set: 'setPaneInit'
			}; //各页面初始化函数
		self.bg = chrome.extension && chrome.extension.getBackgroundPage && chrome.extension.getBackgroundPage();
		self.addEvent(window, 'selectstart', function(e) {
			e.preventDefault();
			return false;
		}); //禁止滑选
		if (pageKind) {
			self[comMatch[pageKind]]();
		} else {
			self.mainPaneInit();
		}
		//self.loginInit();
		//self.mainPaneInit();
		//self.setPaneInit();
	},
	loginInit: function() { //登陆处理逻辑
		var self = this,
			mainBox = this.$('mainAreaOut'),
			accountBox = this.$('dolphinAccount'),
			hitIntBox = this.$('hitInBox'),
			respErrBox = this.$('showLoginErr'),
			loadCover = this.$('loadCover'),
			loginBtn = this.$('loginBtn'),
			accountElems = {},
			accountError = '',
			i = 0,
			errorTypes = ['email', 'password', 'passworderror'],
			inputSets = {
				'email': [
					'Email', [
						[1, /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/],
					],
					['@gmail.com', '@hotmail.com', '@yahoo.com', '@msn.com']
				],
				'password': [
					'Password', [
						[0, /[^\!\@\#\$\%\^\&\*\(\)_+-=\[\]\{\}\\;\|\':\",.<>\/?0-9a-zA-Z]/g],
						[0, /^.{0,5}$/]
					]
				]
			};

		for (i in inputSets) { //初始化登陆变量及email hitin参数
			accountElems[i] = {
				'node': self.$('input[name="' + i + '"]', 'querySelectorAll')[0],
				'placeholder': inputSets[i][0],
				'regex': inputSets[i][1],
				'value': ''
			};
			if (inputSets[i][2]) {
				accountElems[i].node.addEventListener('input', accountEventHandle.bind(this, 'change'), true);
				accountElems[i].hotInt = []
				var hotins = inputSets[i][2];
				for (var j in hotins) {
					var tmpHotin = document.createElement('div');
					tmpHotin.id = hotins[j];
					tmpHotin.className = 'hitInItem';
					tmpHotin.innerText = hotins[j];
					hitIntBox.appendChild(tmpHotin);
					accountElems[i].hotInt.push({
						'node': tmpHotin,
						'text': hotins[j]
					})
				}
			}
		}
		accountElems['email'].node.focus();
		//if(!navigator.onLine){showErr('netOffline');}
		mainBox.addEventListener('click', accountEventHandle.bind(this, 'outerClick'), false);
		['mousedown', 'click', 'keydown', 'focus', 'blur'].forEach(function(item) {
			accountBox.addEventListener(item, accountEventHandle.bind(self, item), true);
		}); // 监听海豚帐号登陆表单内事件

		function accountEventHandle(types, e) {
			var targetElem = e.target;
			e.stopPropagation();
			switch (types) {
				case 'mousedown':
					if (/hitInItem/.test(targetElem.className)) {
						accountElems['email'].node.value = accountElems['email'].node.value + targetElem.id;
					}
					break;
				case 'outerClick':
					if (targetElem.tagName.toLowerCase() == 'b') { //为正确捕获三方登陆点击hack
						targetElem = targetElem.parentNode;
					}
					var tmpId = targetElem.id;

					if (tmpId == 'backBtn') {
						setErrFlag('none');
						mainBox.className = mainBox.className.replace('dolphinLoginBox', '');
						self.bg.track_event({
							category: 'general',
							action: 'login',
							label: 'account',
							value: 1
						});
						return;
					}
					if (tmpId == 'dolphinLogin') {
						mainBox.className += ' dolphinLoginBox';
						return;
					}
					if (/(\bfacebook\b)|(\bgoogle\b)/.test(tmpId)) {
						self.bg.thirdParty_login(tmpId, window); //第三方登陆
					}
					break;
				case 'click':
					if (targetElem.id == 'loginBtn') {
						if (accountError in errorTypes) { //错误检查
							return;
						}
						for (i in accountElems) {
							if (accountElems[i].value == '') { //非空检查
								setErrFlag(i);
								return;
							}
						}
						startLogin(accountElems.email.value, accountElems.password.value);
						return;
					}
					if (/wrongInfoStyle (email|password)/.test(targetElem.className)) { //点击错误提示对应input获得焦点
						try {
							accountElems[RegExp.$1].node.focus();
						} catch (err) {
							console.error(err);
						}
						return;
					}
					break;
				case 'focus':
					var tmpName = targetElem.name,
						tmpElem = accountElems[tmpName];

					if (tmpElem) {
						if (accountError == 'email' && tmpName == 'password') { // email输入不合法，password不能获取焦点
							accountElems.email.node.focus();
							return;
						}
						targetElem.className = targetElem.className + ' focus';
						targetElem.setAttribute('placeholder', '')
						if (accountError != '') {
							setErrFlag('none');
						}
						if (tmpElem.hotInt && tmpElem.hotInt.length > 0 && targetElem.value && targetElem.value.indexOf('@') == -1) {
							hitIntBox.style.display = 'block';
						}
					}
					break;
				case 'blur':
					var tmpName = targetElem.name,
						tmpElem = accountElems[tmpName],
						tmpValue,
						tmpValid = true;
					targetElem.className = 'accountInput';
					if (tmpElem && !(accountError == 'email' && tmpName == 'password')) {
						targetElem.setAttribute('placeholder', tmpElem.placeholder);
						tmpValue = targetElem.value;
						tmpValid = tmpElem.regex.every(function(item) { // 输入正则检验（email,password）
							return item[0] ? item[1].test(tmpValue) : !(item[1].test(tmpValue)); //为适配正则某些情况匹配正确，某些情况匹配错误hack
						});
						if (!tmpValid) {
							setErrFlag(tmpName);
						}
						tmpElem.value = tmpValue;
					}
					if (tmpElem.hotInt && tmpElem.hotInt.length > 0) {
						hitIntBox.style.display = 'none';
					}
					break;
				case 'keydown':
					if (e.keyCode == 13) { //把回车当tab用，烂！
						e.preventDefault();
						e.stopPropagation();
						targetElem.blur();
						if (accountBox.getAttribute('error') == 'none') {
							if (targetElem.name == 'password') {
								loginBtn.click();
							} else {
								accountElems.password.node.focus();
							}
						}
					}
					break;
				case 'change':
					if (targetElem.value && targetElem.value.indexOf('@') == -1) { //hitin逻辑
						var tmpName = targetElem.name,
							tmpElem = accountElems[tmpName];
						if (tmpElem.hotInt && tmpElem.hotInt.length > 0) {
							hitIntBox.style.display = 'block';
							tmpElem.hotInt.forEach(function(item) {
								item.node.innerText = targetElem.value + item.text;
							});
						}

					} else if (hitIntBox.style.display != 'none') {
						hitIntBox.style.display = 'none';
					}

					break;
				default:
			}
		}

		function setErrFlag(err_flag) {
			accountError = err_flag;
			accountBox.setAttribute('error', err_flag);
		}

		function startLogin(userName, userPw) { //开始登陆
			showloging(true);
			self.bg.dolphin_login(userName, userPw, showloging, function(errInfo) {
				setErrFlag('passworderror');
				respErrBox.innerText = errInfo;
			}, window);
		}

		function showloging(method) { //正在登陆 遮罩
			loadCover.style.display = method ? 'block' : 'none';
		}
	},
	mountTab: false,
	mountBookmark: false,
	mountDevice: false,
	mainPaneInit: function() { //主面板处理逻辑
		var self = this,
			paneNode = this.$('mainPaneOuter'),
			notify = {
				box: this.$('notifyBox'),
				text: this.$('notifyText'),
				timer: null,
			},
			contentBoxs = {
				'syncList': this.$('tabBox'),
				'deviceList': this.$('deviceBox'),
				'bookmarkList': this.$('bookmarkBox')
			},
			mountDevice = false,
			mountTab = false,
			mountBookmark = false,
			disabledPush = false,
			currentStauts = 'loading',
			curPage = 'device',
			debug = true,
			enableViewOther = false;
		self.showNotify = function(text) {
			if (text) {
				notify.text.innerText = text;
				if (notify.timer) {
					clearTimeout(notify.timer);
				}
				notify.timer = setTimeout(function() {
					notify.box.style.display = 'none';
				}, 3000);
				notify.box.style.display = 'block';
			}
		}
		self.updatePaneStatus = function(type, reserve) {
			if ((!reserve && curPage != type) || (reserve && curPage == type))
				return;
			self.setPaneStatus('loading');
			if (reserve) {
				curPage = type;
			}
			if (curPage == 'device') {
				dispDevices();
			} else if (curPage == 'tab') {
				//mountTab = true;
				dispTabs();
			} else if (curPage == 'bookmark') {
				// mountBookmark = true;
				dispBookmarks();
			}
		}

		self.setPaneStatus = function(status, extra) {

			switch (extra) {
				case 'add':
					currentStatus = paneNode.className + ' ' + status;
					break;
				case 'remove':
					currentStatus = paneNode.className.replace(status, '')
					break;
				default:
					currentStatus = status;
					break;
			}
			paneNode.className = currentStatus;
		}

		if (!window.navigator.onLine) {
			self.setPaneStatus('notNet');
			return;
		}
		if (!self.bg.CommInfo.is_login) {
			chrome.browserAction.setPopup({
				popup: 'index.html'
			});
			self.close();
			return;
		}
		if (self.bg.CommInfo.popup_id) {
			self.bg.print_msg('close page')
			self.bg.CommInfo.popup_id.close();
			setTimeout(function() {
				self.bg.CommInfo.popup_id = self;
			}, 500)
		}
		self.bg.CommInfo.popup_id = self;
		self.setPaneStatus('loading');
		lastStatus = 'loading';

		this.addEvent(this.$('headerArea'), 'click', mainEventHolder.bind(this, 'headArea'));
		this.addEvent(this.$(['#gotoSet', '#showUserInfo']), 'click', mainEventHolder.bind(this, 'setting'));
		self.addEvent(window, 'unload', function() {
			self.bg.CommInfo.popup_id = null;
		});

        // 检测是否连接成功，若未连接成功则尝试连接，此操作在每次点击插件图标且未连接成功时触发
        if (!self.bg.pusher.isConnect()) {
            self.bg.pusher.login();
        }
		if (self.bg.pusher != null && self.bg.pusher.isConnect() == true) {
			chrome.tabs.query({
				highlighted: true,
				windowId: chrome.windows.WINDOW_ID_CURRENT
			}, function(tabs) { //判断是否是无意义的tab
				tab = tabs[0];
				if ((tab && (tab.url.indexOf("http://") == -1 && tab.url.indexOf("https://") == -1))) {
					disabledPush = true;
					self.setPaneStatus('errDisaPush');
				} else {
					dispDevices();
				}
			});
		}

		function mainEventHolder(type, e) {
			var target = e.target,
				tmp;
			switch (type) {
				case 'headArea':
					switch (target.id) {
						case 'tab':
						case 'device':
						case 'bookmark':
							tabSelected(target);
							self.updatePaneStatus(target.id, true);
							break;
						case 'syncBookmark':
							if (currentStatus.indexOf('disaSyncBoookMark') == -1) {
								self.bg.sync_control(['bookmark']);
								if (!self.bg.GetPushDevicesSorted() || self.bg.GetPushDevicesSorted().length == 0) {
									self.bg.pushReConnect(true);
								}
							}

							break;
						case 'reflash':
							self.bg.pushReConnect(true);
							break;
					}
					break;
				case 'setting':
					self.bg.open_userinfo_page();
					self.close();
					break;
				default:
					break;
			}
		}

		function tabSelected(target) {
			for (var i = 0; i < 3; i++) {
				self.removeClass(self.$('tabArea').getElementsByTagName('a')[i], 'selected');
			}
			target.className += " selected";
		}

		function dispDevices() {
			var datas;
			datas = self.bg.GetPushDevicesSorted();
			curPage = 'device';
			if (disabledPush) {
				self.setPaneStatus('errDisaPush');
				return;
			}
			if (!datas || datas.length == 0) {
				self.setPaneStatus('errNoDevice');
				return;
			}
			if (self.bg.CommInfo.fontNodes) {
				//self.bg.print_msg('ui!!!! device!!!!')
				try {
					self.bg.CommInfo.fontNodes.remount(contentBoxs.deviceList, 'Device', self.mountDevice);
				} catch (err) {
					self.bg.CommInfo.reflash_pane('device');
					return;
				}
				if (!self.mountDevice) {
					self.mountDevice = true;
				}
				self.setPaneStatus('showDevice');
			}
		}

		function dispTabs() {
			var set_conf,
				tab_list,
				datas;
			curPage = 'tab'
			set_conf = self.bg.CommInfo.get_setting();
			datas = self.bg.CommInfo.tab_sync_list_sorted();
			if (set_conf && set_conf['tab'] == false) {
				self.setPaneStatus('errDisaSync');
				return;
			}
			if ((!datas || datas.length == 0) && (!self.bg.CommInfo.offlineMsg || self.bg.CommInfo.offlineMsg.length == 0)) {
				self.setPaneStatus('errNoTab');
				return;
			}
			if (self.bg.CommInfo.fontNodes) {
				//self.bg.print_msg('ui!!!! tab!!!!')
				try {
					self.bg.CommInfo.fontNodes.remount(contentBoxs.syncList, 'Tab', self.mountTab);
				} catch (err) {
					self.bg.CommInfo.reflash_pane('tab');
					return;
				}

				if (!self.mountTab) {
					self.mountTab = true;
				}
				self.setPaneStatus('showTab');
			}
		}

		function dispBookmarks() {
			curPage = 'bookmark';
			// self.bg.CommInfo.fontNodes.changeBookmarks();
			//bookmark数据读取here
			if (self.bg.CommInfo.fontNodes) {
				self.bg.CommInfo.fontNodes.remount(contentBoxs.bookmarkList, 'Bookmark', self.mountBookmark);
				self.mountBookmark = true;
				self.setPaneStatus('showBookmark');
				// if(!mountBookmark){
				// 	self.bg.CommInfo.reflash_pane('bookmark');//初始化数据，只需拿一边数据
				// }
				// try{

				// }catch(err){
				// 	return;
				// }

				// self.mountBookmark = true;
				// if(self.bg.CommInfo.fontNodes._rawData == null && self.bg.CommInfo.fontNodes._mobileRawData == null){
				// 	self.setPaneStatus('loading');
				// }else{
				// 	
				// }

			}
		}

	},
	setPaneInit: function() { //设置页面处理逻辑
		var self = this,
			outerHolder, ShortCutList = {}, currentInput = null,
			trackCode = {
				bookmark: ['bookmarkson', 'bookmarksoff'],
				tab: ['tabson', 'tabsoff'],
				dolphinBtn: ['dolphinbutton', 'dolphinbutton'],
				pcName: 'namechange',
				shortCut: 'shortcutset'
			};
		addListen();

		function addListen() { //监听事件
			if (!(mainHolder = self.$('setOuter'))) {
				window.setTimeout(addListen, 500);
				return;
			} // 判断页面是否加载完成
			self.reflashDeviceName = function(tmpName) {
				self.$('pcName').value = tmpName;
			}
			self.shortCutInit = function() {
				var self = this,
					data = self.bg.GetPushDevicesSorted(),
					tmpShortCutList = (self.bg.CommInfo.get_device_shortcut && self.bg.CommInfo.get_device_shortcut());
				ShortCutList = {};
				if (data.length > 0) {
					var tmpNode = self.$('shortCutHolder'),
						tmpHtml = [],
						tmpKeys;
					tmpHtml.push('<span class="helpInfo">Click the box below to edit your shortcut</span>');
					for (var i = 0, len = data.length; i < len; i++) {
						tmpKeys = (tmpShortCutList && tmpShortCutList[data[i].did]) ? (tmpShortCutList[data[i].did].join('+')) : "";
						ShortCutList[data[i].did] = tmpKeys; //保存已经用快捷键 控制重复
						tmpHtml.push('<div class="shortCutItem ' + data[i].category + '"><span class="deviceName">' + (data[i].deviceName && data[i].deviceName.replace(/%20/, ' ')) + '</span><span class="shortCutKeys" id="' + data[i].did + '">' + tmpKeys + '</span><span class="deleBtn"></span></div>');
					}
					tmpNode.innerHTML = tmpHtml.join('');
				} else {
					var tmpNode = self.$('shortCutHolder');
					tmpNode.innerHTML = '<div class="noDevice">No devices connected!</div>';
				}
			}
			self.bg.CommInfo.infoPage_id = self;
			self.addEvent(self.$('cancle'), 'click', function() {
				comfirmBox(false)
			}); //logout 退出按键
			self.addEvent(self.$('yes'), 'click', function() {
				window.close();
				self.bg.logout();
			}) //logout 确定按键
			self.addEvent(mainHolder, 'click', function(e) {
				handleClick(e)
			});
			self.addEvent(document, 'keydown', function(e) {
				getKeys(e)
			}); //捕获用户按键
			self.addEvent(self.$('pcName'), 'focus', function() {
				if (this.parentNode.className.indexOf('reName') == -1) {
					this.parentNode.className += " reName";
				}
				this.setAttribute('oldvalue', this.value)
			}); //rename PC name 
			self.addEvent(self.$('pcName'), 'blur', function() {
				var tmpName = this.parentNode.className;
				this.parentNode.className = tmpName.replace(' reName', '');
				if (this.value != '' && self.bg.dev_rename) {
					self.bg.dev_rename(null, this.value, null);
					self.bg.track_event({
						category: 'general',
						action: 'setting',
						label: trackCode['pcName'],
						value: 1
					});
				} else {
					this.value = this.getAttribute('oldvalue')
				};
			});
			self.addEvent(window, 'unload', function() {
				self.bg.CommInfo.infoPage_id = null;
				saveSetting('both')
			}); //退出时再保存一次
			self.addEvent(self.$('gotoAdvance'), 'click', gotoAdvance);
			showSetInfo(); //显示帐号相关信息
		}

		function showSetInfo() {
			var checkBoxs, localSetting;
			//self.$('nickName').innerHTML = self.bg.CommInfo.nick_name; // 显示 用户名
			//self.$('userName').innerHTML = self.bg.CommInfo.email||self.bg.CommInfo.user_name; //帐号 
			self.$('userName').innerHTML = self.bg.CommInfo.nick_name; //帐号 
			self.$('accountKind').innerHTML = self.bg.CommInfo.login_typeName; //帐号类型
			self.$('pcName').value = self.bg.get_devicename(); //当前设备名称
			localSetting = self.bg.CommInfo.get_setting(); //获取本地缓存中的设置，
			if (localSetting) { //显示check 设置
				checkBoxs = self.$('.formCheck', 'querySelectorAll');
				if (checkBoxs.length >= 3) {
					if (localSetting['bookmark']) {
						checkBoxs[0].className += ' checked';
						checkBoxs[0].childNodes[0].checked = true
					}
					if (localSetting['tab']) {
						checkBoxs[1].className += ' checked';
						checkBoxs[1].childNodes[0].checked = true
					}
					if (localSetting['button']) {
						checkBoxs[2].className += ' checked';
						checkBoxs[2].childNodes[0].checked = true
					}
				}
			}
			//设置快捷键之前状态
			self.shortCutInit();
		}

		function saveSetting(kind) { //保存设置 用kind可分开保存 避免无用的保存
			if (kind != 'saveShort') { //保存 本地设置
				var checkBoxs = self.$('.formCheck', 'querySelectorAll'),
					settings;
				settings = {
					bookmark: checkBoxs[0].childNodes[0].checked,
					tab: checkBoxs[1].childNodes[0].checked,
					button: checkBoxs[2].childNodes[0].checked
				}
				self.bg.CommInfo.save_setting(settings);
			}
			if (kind != 'saveCheck') { //保存快捷键
				var shortCutNList = self.$('.shortCutKeys', 'querySelectorAll'),
					tmpObj = {};
				for (i = 0, len = shortCutNList.length; i < len; i++) {
					if (shortCutNList[i].className.indexOf('input') != -1) {
						continue;
					}
					tmpObj[shortCutNList[i].id] = shortCutNList[i].innerHTML.split('+');
				}
				(self.bg.CommInfo.save_device_shortcut && self.bg.CommInfo.save_device_shortcut(tmpObj));
			}
		}

		function shortCutExitCurrent() { //退出快捷键编辑状态
			var tmpClass = currentInput.className;
			currentInput.className = tmpClass.replace(' input', '');
			tmpClass = currentInput.parentNode.className;
			currentInput.parentNode.className = tmpClass.replace(' inputState', '');
		}

		function comfirmBox(isShow) { //logout 对话框
			self.$('showCover').style.display = isShow ? 'block' : 'none';
			self.$('showConfirm').style.display = isShow ? 'block' : 'none';
		}

		function handleClick(e) { //页面大部分点击逻辑控制
			var tmpId = e.target.id,
				tmpN = e.target;
			if (tmpId == 'logout') { //点logout
				comfirmBox(true);
				return;
			}
			if (tmpN.className == "deleBtn") {
				var tmpP = tmpN.previousSibling;
				tmpP.innerHTML = '';
				ShortCutList[tmpP.id] = "";
				saveSetting('saveShort')
			} //点 小X
			if (tmpN.className == 'formCheck') {
				tmpN.className += ' checked';
				tmpN.childNodes[0].checked = true;
				saveSetting('saveCheck');
				self.bg.track_event({
					category: 'general',
					action: 'setting',
					label: trackCode[tmpN.childNodes[0].id][0],
					value: 1
				});
				return;
			} //选择框加钩
			if (tmpN.className == 'formCheck checked') {
				tmpN.className = 'formCheck';
				tmpN.childNodes[0].checked = false;
				saveSetting('saveCheck');
				self.bg.track_event({
					category: 'general',
					action: 'setting',
					label: trackCode[tmpN.childNodes[0].id][1],
					value: 1
				});
				return;
			} //选择框去钩
			if (tmpN.className == 'shortCutKeys') {
				if (currentInput) {
					shortCutExitCurrent();
					currentInput.innerHTML = currentInput.getAttribute('oldvalue');
				}
				tmpN.setAttribute('oldvalue', tmpN.innerHTML);
				tmpN.className += ' input';
				tmpN.parentNode.className += ' inputState';
				currentInput = tmpN;
				self.bg.track_event({
					category: 'general',
					action: 'setting',
					label: trackCode['shortCut'],
					value: 1
				});
				return;
			} //点击编辑快捷键
			if (currentInput) {
				shortCutExitCurrent();
				currentInput.innerHTML = currentInput.getAttribute('oldvalue');
				currentInput = null;
			}
		}

		function getKeys(e) {
			var keys = [],
				tmpShort;
			if (e.target.id == 'pcName') { //pcName rename 回车退出
				if (e.keyCode == 13) {
					e.target.blur();
				}
				if (e.keyCode == 8) {
					return;
				}
				if (e.target.value.replace(/[^\x00-\xff]/g, "**").length >= 20) {
					e.preventDefault();
				}
				return;
			}
			e.preventDefault();
			if (!currentInput) {
				return;
			} //无快捷键输入框选中退出

			if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) { //有前缀键按下，显示 但不保存 无前缀键 不予响应
				if (e.metaKey) {
					keys.push('Cmd');
				}
				if (e.shiftKey) {
					keys.push('Shift');
				}
				if (e.ctrlKey) {
					keys.push('Ctrl');
				}
				if (e.altKey) {
					keys.push('Alt');
				}
				if (e.which) {
					keys.push(String.fromCharCode(e.which));
				}
				ShortCutList[currentInput.id] = "";
				keys = keys.join('+');
				tmpShort = JSON.stringify(ShortCutList);
				currentInput.innerHTML = keys;
				var tmpCode = e.keyCode; //获取当前按下
				if ((47 < tmpCode && tmpCode < 58) || (64 < tmpCode && tmpCode < 91)) { //当有非前缀键按下时判断是否重复 否保存 并退出编辑 是重复 提示重复 回复原值
					if (tmpShort.indexOf('"' + keys + '"') == -1) {
						ShortCutList[currentInput.id] = keys;
						shortCutExitCurrent();
						currentInput.setAttribute('oldvalue', currentInput.innerHTML)
						currentInput = null;
						saveSetting('saveShort');
					} else {
						alert('The shortcut has already existed, please choose another one.');
						var oldValue = currentInput.getAttribute('oldvalue');
						currentInput.innerHTML = oldValue;
						ShortCutList[currentInput.id] = oldValue;
					}
				}
			}
		}

		function gotoAdvance() {
			var tempForm = document.createElement("form");

			tempForm.id = "tempForm1";

			tempForm.method = "post";
			var manage_domain = 'https://sen.dolphin-browser.com';
			if (self.bg.CommInfo.region_domain != null) {
				manage_domain = self.bg.CommInfo.region_domain;
			}
			tempForm.action = manage_domain + '/manage';

			tempForm.target = '_blank';



			var hideInput = document.createElement("input");

			hideInput.type = "hidden";

			hideInput.name = "token";

			hideInput.value = self.bg.CommInfo.token;
			tempForm.appendChild(hideInput);

			//tempForm.attachEvent("onsubmit",function(){ openWindow(name); });  

			document.body.appendChild(tempForm);

			tempForm.submit();

			document.body.removeChild(tempForm);
		}
	},
	sync_bookmark: function() {},
	reflashDeviceName: function() {},
	shortCutInit: function() {},
	reflashPage: function() {},
	addEvent: function(tDom, eType, Func, other) {
		if (!(tDom && eType && Func)) {
			return null;
		}
		other = (other == undefined) ? true : other;
		if (tDom.length > 1) {
			for (var i = 0, len = tDom.length; i < len; i++) {
				tDom[i].addEventListener(eType, Func, other)
			}
			return;
		}
		tDom.addEventListener(eType, Func, other);
	},
	close: function() {
		window.close();
	},
	//对class的处理方法
	addClass: function(elem, value) {
		if (!elem) {
			return false;
		}
		var classNames = value.split(" ");
		if (elem.nodeType === 1) {
			if (!elem.className && classNames.length === 1) {
				elem.className = value;
			} else {
				var setClass = " " + elem.className + " ";
				for (var c = 0, cl = classNames.length; c < cl; c++) {
					if (!~setClass.indexOf(" " + classNames[c] + " ")) {
						setClass += classNames[c] + " ";
					}
				}
				elem.className = setClass.replace(/^\s+|\s+$/g, "");
			}
		}
	},
	removeClass: function(elem, value) {
		if (!elem) {
			return false;
		}
		//这里只能一次remove一个class，后续如有需要还可以扩展
		var classNames = elem.className.split(" ");
		if (elem.nodeType === 1) {
			for (var i = 0, l = classNames.length; i < l; i++) {
				if (classNames[i] == value) {
					classNames[i] = "";
				}
			}
		}
		elem.className = classNames.join(" ").trim();
	},
	hasClass: function(elem, value) {
		if (!elem) {
			return false;
		}
		var className = " " + value + " ";
		var classNames = " " + elem.className + " ";
		if (elem.nodeType === 1) {
			if (classNames.indexOf(className) >= 0) {
				return true;
			}

		}
		return false;
	},
	$: function(id, kind) { //kind 用于自定义获取方法
		if (kind) {
			return document[kind](id);
		}
		return (Object.prototype.toString.call(id) == '[object Array]') ? document.querySelectorAll(id.join(',')) : ((typeof id == 'string') ? document.getElementById(id) : null);
	}
}
var demo = new SyncFontEnd();
