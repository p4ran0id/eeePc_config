/*for get extra bookmarks*/
GetBookmarks = function(){

}

GetBookmarks.prototype = {
     lock: false,
     num_limit:20,
     call_back: null,
     all_types:{
       mobile: 1,
       firefox: 128,
       chrome: 64,
     },
     /*     get diff platform bookmark flag
               @param {string}type
               @return {int}
     */
     _getType: function(type){
               switch(type){
                    case 'desktop': // refining desktop to firefox or chrome
                         if(/\sChrome/.test(navigator.userAgent)){
                                   return {key:'firefox', value: this.all_types.firefox};
                         }
                         if(/\sFirefox/.test(navigator.userAgent)){
                                   return {key:'chrome', value: this.all_types.chrome};
                         }
                    break;
                    case 'mobile':
                             return {key:'mobile', value: this.all_types.mobile};
                    break;
                    default:
                    break;
               }
               return null;
     },
     /* update last sync time
		@param null
		@return null
     */
     _updateSyncTime: function(){
     	this.lastSync = get_utc();
     }
     ,
     /* treat error method
               @param {string}err
               @return null
     */
     _err: function(err){
           //console.log(err);
           this.lock = false;
           if(this.call_back){
                this.call_back(null);
           }
     },
     /*     get data from server
               @params {dict|{state:'example',trunk:'example'}}apis, {dict|{token:'',type:{key:'',value:''},exclueDel:false}}datas
               @return {dict}
     */
     _getData: function(apis, datas){
     	try{
	     	if(!apis.hasOwnProperty('state') || !apis.hasOwnProperty('trunk') || !datas.hasOwnProperty('token') || !datas.hasOwnProperty('type')){
	                return false;
	       }
	        var self = this,
	        	local_sid = apis.state,
	          	DataCollec = {update:[], delte:[]},
	           	trunkParam = {
	                token: datas.token,
	                after_sid: local_sid,
	                limit: self.num_limit,
	                type: datas.type.value,
	                no_deleted: local_sid == 0 ? 1 : 0,
	            };
	        var ajax_param = { 
	        	method: 'post',
	        	url: apis.trunk,
	        	timeout: 15000,
	     		data: urlencode(trunkParam),
	     		success: function(resp){
	         		try{
	         			if(resp.status != 0){
	                        self._err('invalid trunk response!');
	                        return ;
	                    }
	                    self._updateSyncTime();
	                    DataCollec.update = DataCollec.update.concat(resp.data.updated_objs);
	                    DataCollec.delte = DataCollec.delte.concat(resp.data.deleted_ids);
	                    if(resp.data.chunk_latest_sid < resp.data.latest_sid){ //没拿完，断续拉
	                        trunkParam.after_sid = resp.data.chunk_latest_sid; 
	                        ajax_param.data = urlencode(trunkParam);
	                        jQuery.ajax(ajax_param);
	                    }else{  //拿完后执行回调
	                        //this.last_sid[datas.type.key] = resp.data.latest_sid; //更新最大的sid
	                        CommInfo.after_sid(datas.type.key + '_bookmark', resp.data.latest_sid);
	                        self.call_back(DataCollec);
	                    }
	               }catch(err){
	               		self._err('run error!'+err);
						return ;
	               }
	        	},
	        	error: self._err.bind(self)
	    	}
	        jQuery.ajax(ajax_param);
	       return true;
     	}catch(err){
     		this._err(err);
     	}
     },
     /* get update from server
               @params {string}type, {function}call_back
               @return null
     */
     sync: function(type, sid, call_back){
       try{
       		var self = this;
     		if(self.lock && (get_utc() - self.lastSync) < 60000){
           		return ;
           	}
           	self._updateSyncTime();
           	after_sid = CommInfo.after_sid();
           	var tmp_type = self._getType(type);
           	var local_sid = after_sid[tmp_type.key+'_bookmark'];
           	if(local_sid >= sid){
           		return ;
           	}
           self.lock = true;
           self.call_back = function(data){
           			self.lock = false;
                    if(data === null){
                             call_back(type, null);
                    }else{
                             var result = {update:[]};
                             data.update.forEach(function(item){
                                       result.update.push({
                                                pid: item.pid,
                                                id:item._id, 
                                                title: item.payload.title, 
                                                url: item.payload.url, 
                                                folder: item.folder, 
                                                order: item.order
                                       });
                             });
                             result.dele_ids = data.delte;
                             call_back(type, result);
                    }
           }
           self._getData({state: after_sid[tmp_type.key+'_bookmark'], trunk: API.sync_getchunk()}, {token: CommInfo.token, type: tmp_type});
       }catch(err){
       		console.log(err);
            self.lock = false;
       }
     }
}

/*
	Common information structure for a user.
*/
var mainPaneObj = function(){
	//this._int().apply(this, arguments);
	this._renderBookmark();
	this.get_mobile_bookmark = new GetBookmarks();
	this.get_desktop_bookmark = new GetBookmarks();
}
mainPaneObj.prototype = {
	_parent: null,
	_createNode: function(name){
		return document.createElement(name);
	},
	_get_favico: null,
	_Parent:null,
	_pushSend:null,
	//_deviceChange: false,
	_baseDeviceTree: {
		lock: false,
		main: null,
		nodes: {},
	},
	_baseTabTree: {
		lock: false,
		lastOpen: null,
		main: null,
		nodes: {}
	},
	_baseBookmarkTree: {
		//state: 'loading',
		lock: false,
		listPid: null,
		notEmptyFolder: false,
		main: null,
		cateWrap: null,
		bookmarkMain: null,
		bookmarkItemHead: null,
		bookmarkHolder: null,
		bookmarkArrow: null
	},
	_deviceClass:{
		item: 'deviceItem',
		inner: 'deviceItemInner',
		info:'deviceInfo',
		name: 'deviceName',
		deviceTime: 'deviceTime',
		shortcut: 'deviceShorcut',
		online: '_on',
	},
	_tabClass: {
		deviceItem: 'syncListItem',
		deviceTit: 'itemTitle',
		deviceTabs: 'itemHolder',
		deviceOpen: ' open',
		deviceClose: '',
		arrow: 'tabArrow',
	},
	_bookmarkClass: {
		type: 'bookmarkType',
		title: 'bookmarkTitle',
		item: 'bookmarkItem',
		itemHead: 'bookmarkItemHead',
		holder: 'bookmarkHolder',
		arrow: 'bookmarkArrow',
		folder: 'bookmarkFolder',
		folderHead: 'bookmarkFolderHead',
		link: 'bookmarkLink',
	},
	_intTab: function(datas){
		var self = this;
		self._baseTabTree.main = self._createNode('div');
		//离线tabs
		var offTemp;
		offTemp = self._orginizeTabDevice('Received Tabs','receivedTabs');
		offTemp.tabs.innerHTML = self._orginizeReceivedTabs(CommInfo.offlineMsg);
		if(CommInfo.offlineMsg && CommInfo.offlineMsg.length >0){
			offTemp.main.className += self._tabClass.deviceOpen;
		}
		offTemp.time.innerText = '';
        offTemp.main.id = offTemp.title.id = 'receivedTabs';
		self._baseTabTree.main.appendChild(offTemp.main);

		datas.forEach(function(device){
			var tmp, 
                index;
			device = device.data;
            index = device.dev_id
			tmp = self._orginizeTabDevice(device.name, self.judgeDeviceType(device.dev_type));
			tmp.tabs.innerHTML = self._orginizeTabs(device.data);
			tmp.main.id = tmp.title.id = index;
			self._baseTabTree.main.appendChild(tmp.main);
			tmp.mounted = true;
			self._baseTabTree.nodes[index] = tmp;
		});
		//self._baseTabTree.lastOpen = self._baseTabTree.nodes[0];
		//self._baseTabTree.nodes[0].main.className += self._tabClass.deviceOpen;
		//self._baseTabTree.main.addEventListener('click', self._handleClick.bind(this, 'tab'), true);
	},
	_intDevice: function(datas, shortcut){
		var self = this;
		self._baseDeviceTree.main = self._createNode('div');
		datas.forEach(function(device){
			var tmp, index;
			index = device.did;
			tmp = self._orginizeDevice(device.did, device.deviceName, device.category, device.state, shortcut[device.did], device.offTime);
			self._baseDeviceTree.main.appendChild(tmp.main);
			tmp.mounted = true;
			self._baseDeviceTree.nodes[index] = tmp;
		});
		//self._baseDeviceTree.main.addEventListener('click', self._handleClick.bind(this, 'device'), true);
	},
	iniBookMarks: function(){
		this._organizedData = {};
		this._rawData = {
			'': {
				title : 'Firefox Bookmarks',
				pid : '-1',
				id : ''
			},
			'-1':{
				title : 'Firefox Bookmarks',
				pid : '-2',
				id : '-1'
			}
		};
		this._mobileOrganizedData = {};
		this._mobileRawData = {
			'': {
				title : 'Mobile Bookmarks',
				pid : '-1',
				id : ''
			},
			'-1': {
				title : 'Mobile Bookmarks',
				pid : '-2',
				id : '-1'
			}
		};
		this._curBookmarkType = 'desktop';
		this._curFolder = '';
	},
	_renderBookmark: function(){
		var self = this;

		var cateWrap = self._createNode('div'),
			deskCateSpan = self._createNode('span'),
			mobileCateSpan = self._createNode('span'),
			bookmarkArrow = self._createNode('span'),
			bookmarkMain = self._createNode('div'),
			bookmarkItemHeadSpan = self._createNode('span'),
			bookmarkHolderSpan = self._createNode('span');

		cateWrap.className = 'cateWrap';
		deskCateSpan.className = 'deskCate';
		mobileCateSpan.className = 'mobileCate';
		deskCateSpan.innerText = 'Firefox Bookmarks';
		mobileCateSpan.innerText = 'Mobile Bookmarks';
		cateWrap.appendChild(deskCateSpan);
		cateWrap.appendChild(mobileCateSpan);

		bookmarkMain.className = 'bookmarkMain';
		bookmarkItemHeadSpan.className = 'bookmarkItemHead';
		bookmarkHolderSpan.className = 'bookmarkHolder';
		bookmarkArrow.className = 'bookmarkArrow';
		bookmarkMain.appendChild(bookmarkItemHeadSpan);
		bookmarkMain.appendChild(bookmarkHolderSpan);
		bookmarkMain.appendChild(bookmarkArrow);

		self._baseBookmarkTree.cateWrap = cateWrap;
		self._baseBookmarkTree.bookmarkMain = bookmarkMain;
		self._baseBookmarkTree.bookmarkItemHead = bookmarkItemHeadSpan;
		self._baseBookmarkTree.bookmarkHolder = bookmarkHolderSpan;
		self._baseBookmarkTree.bookmarkArrow = bookmarkArrow;


		self._baseBookmarkTree.main = self._createNode('div');
		self._baseBookmarkTree.main.appendChild(cateWrap);
		self._baseBookmarkTree.main.appendChild(bookmarkMain);

		//self._baseBookmarkTree.main.addEventListener('click', self._handleClick.bind(this, 'Bookmark'), true);
	},
	_orginizeTabs: function(datas) {
		var self = this;
		return datas.map(function(item){
			return [
				'<a class="itemLink" href="',
				item.url,
				'" target="_blank"><img src="',
				self._get_favico(item.url),
				'"/>',
				item.title,
				'</a>',
			].join('')
		}).join('');
	},
	_orginizeReceivedTabs: function(datas){
		var self = this;
		return datas.map(function(tmpItem){
			return [
				'<a class="itemLink" href="',
				tmpItem.push_data.url,
				'" target="_blank"><img src="',
				self._get_favico(tmpItem.push_data.url),
				'"/>',
				tmpItem.push_data.title,
				'</a>',
			].join('')
		}).join('');
	},
	_orginizeTabDevice: function(name, type){
		var self = this;
		var tmp;
		tmp = {};
		tmp.main = this._createNode('div');
		tmp.title = this._createNode('span');
		tmp.name = this._createNode('span');
		tmp.time = this._createNode('span');
		tmp.tabs = this._createNode('span');
		tmp.arrow = this._createNode('span');
		tmp.main.className = this._tabClass.deviceItem;
		tmp.title.className = this._tabClass.deviceTit + ' '+type;
		tmp.name.className = 'titleName';
		tmp.time.className = 'titleTime';
		tmp.tabs.className = this._tabClass.deviceTabs;
		tmp.arrow.className = this._tabClass.arrow;
		tmp.name.innerText = name;
		tmp.time.innerText = CommInfo.getCurTime();
		tmp.title.appendChild(tmp.name);
		tmp.title.appendChild(tmp.time);
		tmp.main.appendChild(tmp.title);
		tmp.main.appendChild(tmp.tabs);
		tmp.main.appendChild(tmp.arrow);
		return tmp;
	},
	_orginizeDevice: function(id, name, type, state, shortcut, offTime){
		var tmp;
		tmp = {};
		tmp.main = this._createNode('div');
		tmp.a = this._createNode('a');
		tmp.title = this._createNode('span');
		tmp.shortcut = this._createNode('span');
		tmp.info = this._createNode('span');
		tmp.time = this._createNode('span');

		tmp.main.className = this._deviceClass.item;
		tmp.a.className = this._deviceClass.inner +' '+type + (state == 1? this._deviceClass.online:'');
		tmp.info.className = this._deviceClass.info;
		tmp.title.className = this._deviceClass.name;
		tmp.time.className = this._deviceClass.deviceTime;
		tmp.shortcut.className = this._deviceClass.shortcut;
		tmp.a.id = tmp.main.id = id;
		tmp.title.innerText = name;
		tmp.shortcut.innerText = (shortcut&&shortcut.join('+')) || '';
		tmp.time.innerText = (state == 1? 'Online':('Offline '+ CommInfo.getCurTime(offTime)));
		tmp.info.appendChild(tmp.title);
		tmp.info.appendChild(tmp.time);
		tmp.a.appendChild(tmp.info);
		tmp.a.appendChild(tmp.shortcut);
		tmp.main.appendChild(tmp.a);
		return tmp;
	},
	_hideBookmarkOutter: function(){
		var self = this;
		self._baseBookmarkTree.cateWrap.style.display = 'none';
		self._baseBookmarkTree.bookmarkMain.style.display = 'block';
		self._baseBookmarkTree.bookmarkItemHead.style.display = 'block';
		self._baseBookmarkTree.bookmarkArrow.style.display = 'block';
	},
	_showBookmarkOutter: function(){
		var self = this;
		self._baseBookmarkTree.cateWrap.style.display = 'block';
		self._baseBookmarkTree.bookmarkMain.style.display = 'none';
		self._baseBookmarkTree.bookmarkItemHead.style.display = 'none';
		self._baseBookmarkTree.bookmarkArrow.style.display = 'none';
	},
	_sortOrganizedData: function(array, data, type){
		var self = this;
		var rawArray = [];
		var sortedOrganizedArray = [];

		for(var i=0, l=array.length;i<l;i++){
			rawArray[i] = data[array[i]];
		}

		rawArray.sort(self.sortBy('order', type));

		for(var j=0, len=rawArray.length;j<len;j++){
			sortedOrganizedArray[j] = rawArray[j].id; 
		}

		return sortedOrganizedArray;
		
	},
	_updateCurFolder: function(curId){

		var self = this,
			rawData = self._curBookmarkType == 'mobile' ? self._mobileRawData : self._rawData,
			orangizedData = self._curBookmarkType == 'mobile' ? self._mobileOrganizedData : self._organizedData,
			title = self._baseBookmarkTree.bookmarkItemHead,
			content = self._baseBookmarkTree.bookmarkHolder;
		if(rawData == null && !rawData.hasOwnProperty(curId)){
			return;
		}
		var	curItem = rawData[curId],
			curItemList = orangizedData[curId],
			contentHtml = '',
			listHtml = '',
			listItem;


		title.innerHTML =  curItem.title;
		title.setAttribute('data-id', curId);
		title.setAttribute('data-pid', curItem.pid);
		title.setAttribute('data-folder', curItem.folder);

		curItemList = self._sortOrganizedData(curItemList, rawData, self._curBookmarkType)
		// curItemList.sort(self.by(rawData));

		for(var i=0,l=curItemList.length; i<l; i++){
			listItem = rawData[curItemList[i]];

			if(listItem.folder === 1){
				//如果是文件夹
				listHtml = '<span class="bookmarkFolder" data-id="'+listItem.id+'" data-pid="'+ listItem.pid +'" data-folder="'+listItem.folder+'"><span class="bookmarkFolderHead">'+listItem.title+'</span></span>';
			}else{
				//如果是书签
				listHtml = '<a class="bookmarkLink" href="'+listItem.url+'" target="_blank"><img src="'+self._get_favico(listItem.url)+'">'+listItem.title+'</a>';
			}
			contentHtml += listHtml;
		}
		content.innerHTML = contentHtml;
	},
	_handleClick: function(type, e){
		var target, t_node, self, curId;
		self = this;
		target = e.target;
		curId = 0;
		switch(type){
			case 'Tab':
				// alert("tab click")
				//如果点在右侧arrow上的处理
				if(!this._baseTabTree.lock && target.className == 'tabArrow'){
					target = target.parentNode.childNodes[0]; 
				}
				//如果点击在titleName titleTime
				if(target.className == 'titleName' || target.className == 'titleTime'){
					target = target.parentNode;
				}
				//单独处理received tabs
				if(!this._baseTabTree.lock && target.className.indexOf('receivedTabs') != -1 ){
					this._baseTabTree.lock = true;
					if(target.parentNode.className.indexOf('open') != -1){
						target.parentNode.className = this._tabClass.deviceItem + this._tabClass.deviceClose;
					}else{
						target.parentNode.className = this._tabClass.deviceItem + this._tabClass.deviceOpen;
					}
					this._baseTabTree.lock = false;
					break;
				}
				if(!this._baseTabTree.lock && (target.className.indexOf('itemTitle') != -1 )){
					this._baseTabTree.lock = true;
					t_node = this._baseTabTree.nodes[target.id];
					if(this._baseTabTree.lastOpen && this._baseTabTree.lastOpen.title.id == target.id){
						t_node.main.className = this._tabClass.deviceItem + this._tabClass.deviceClose;
						this._baseTabTree.lastOpen = null;
					}else{
						if(this._baseTabTree.lastOpen){
							this._baseTabTree.lastOpen.main.className = this._tabClass.deviceItem + this._tabClass.deviceClose;
						}
						t_node.main.className = this._tabClass.deviceItem + this._tabClass.deviceOpen;
						this._baseTabTree.lastOpen = t_node;
					}
					this._baseTabTree.lock = false;
				}
			break;
			case 'Device':
				if(self._hasClass(target, 'deviceName') || self._hasClass(target, 'deviceTime')){
					target = target.parentNode;
				}
				if(/\bdeviceInfo\b|\bdeviceItemInner\b|\bdeviceShorcut\b|\bdeviceItem\b/.test(target.className)){
					tmpNode = target.parentNode;
					if(self._Parent.popup_id){
						self._Parent.popup_id.close();
					}
					self._pushSend(tmpNode.id,null);
				}
			break;
			case 'Bookmark':
				if(self._hasClass(target, 'bookmarkLink')){
					return ;
				}
				self._baseBookmarkTree.bookmarkHolder.innerHTML = '';
				if(self._hasClass(target, 'deskCate')){
					//如果点击的是桌面tab
					// if(self._rawData == null || self._rawData.length == '0'){
					// 	return;
					// }
					curId = '';
					self._curBookmarkType = 'desktop';
				}else if(self._hasClass(target, 'mobileCate')){
					// if(self._mobileRawData == null || self._mobileRawData.length == '0'){
					// 	return;
					// }
					curId = '';
					self._curBookmarkType = 'mobile'
				}else if(self._hasClass(target.parentNode, 'bookmarkFolder')){
					curId = target.parentNode.getAttribute('data-id');
				}else if(self._hasClass(target, 'bookmarkItemHead') || self._hasClass(target, 'bookmarkArrow')){
					if(self._hasClass(target, 'bookmarkArrow')){
						//如果点击在返回箭头上
						target = target.parentNode.firstChild;
					}
					//如果点击返回按钮
					curId = target.getAttribute('data-pid');
					if(target.getAttribute('data-id') == ''){
						//将要后退到初始化的页面
						self._showBookmarkOutter();
						return;
					}
				}
				self._curFolder = curId;
				self._hideBookmarkOutter();
				self._updateCurFolder(curId);

				e.stopPropagation();
				e.preventDefault();
				return false;
			break;
			default:
		}
	},
	syncBookMark: function(type, sid){
		this['get_'+type+'_bookmark'].sync(type, sid, this._updateBookMark.bind(this));
	},
	_updateBookMark: function(type, data){
		if(!type || !data){
			return ;
		}
		var self = this, curRawData, curOrganizedData,
			//addItems = [],
			updateItems = [];
		//self._log(data);
		//移除添加的value：none;
		//delete self._rawData['length'];

		if(type == 'desktop'){
			curRawData = self._rawData;
			curOrganizedData = self._organizedData;
		}else{
			curRawData = self._mobileRawData;
			curOrganizedData = self._mobileOrganizedData;
		}
		// if(curRawData.hasOwnProperty('length')){
		// 	delete curRawData['length'];
		// }

		var delElement = function(obj, ele){
			if(Object.prototype.toString.call(obj) == '[object Array]'){
				//如果是数组
				var index = obj.indexOf(ele);
				if(index !== -1){
					obj.splice(index, 1);
				}
			}else{
				if(Object.keys(obj).indexOf(ele) != -1){
					delete obj[ele];
				}
			}

			return obj;
		};

		var updateOrganizeItem = function(pid, id){
			if(curOrganizedData[pid]){
				curOrganizedData[pid].push(id);
			}else{
				curOrganizedData[pid] = [id];
			}
		}

		//删除
		if(data.dele_ids && data.dele_ids.length != 0){
			for(var i=0, l=data.dele_ids.length; i<l; i++){
				var pid, delId, originData, idValue, pidValue;
				delId = data.dele_ids[i];
				if(curRawData.hasOwnProperty(delId)){
					originData = curRawData[delId]; //当前要delete元素的原始数据
					pid = originData.pid;
					pidValue = curOrganizedData[pid] || []; //当前要delete元素的子元素数组

					delElement(pidValue, delId);
					delElement(curOrganizedData, delId);
					delElement(curRawData, delId);
				}
			}
		}

		//新增,修改
		if(data.update && data.update.length != 0){
			for(var j=0, len=data.update.length; j<len; j++){
				var updateEle = data.update[j];
				if(curRawData[updateEle.id] == undefined){
					//addItems.push(updateEle);

					curRawData[updateEle.id] = updateEle; //添加到原始数据中
					if(updateEle.folder == 1){
						curOrganizedData[updateEle.id] = [];
					}
					updateOrganizeItem(updateEle.pid, updateEle.id);
				}else{
					updateItems.push(data.update[j]);
				}
			}

			//更新数据
			for(var z=0, leng=updateItems.length; z<leng; z++){
				var updateItem = updateItems[z],
					originalItem = curRawData[updateItem.id],
					originalPid = originalItem.pid;

				if(originalPid != updateItem.pid){
					//更换了pid，也就是挪动了位置
					delElement(curOrganizedData[originalPid], updateItem.id);
					updateOrganizeItem(updateItem.pid, updateItem.id);
				}
				curRawData[updateItem.id] = updateItem;
			}
		}

		self._updateCurFolder(self._curFolder);
	},
	changeDevices: function(datas, shortcuts){
		if(!this._baseDeviceTree.main){
			this._intDevice(datas, shortcuts);
			return ;
		}
		var self = this,
			//index_list = {},
			nodes = self._baseDeviceTree.nodes,
			mainNode = self._baseDeviceTree.main,
			child_nodes = null,
			i = null,
			j = null,
			c_len = 0,
			n_len = 0,
			tmp = null;
		try{
			datas.forEach(function(device){
				var index, tmp;
				index = device.did;
				tmp = nodes[index];
				if(tmp){
					tmp.title.innerText = device.deviceName;
					tmp.shortcut.innerText = index in shortcuts ? shortcuts[index].join('+'):'';
					if(device.state==1 && tmp.a.className.indexOf(self._deviceClass.online) == -1){
						tmp.a.className = tmp.a.className+self._deviceClass.online;
                        tmp.time.innerText = 'Online';
					}else if(device.state==0 && tmp.a.className.indexOf(self._deviceClass.online)!=-1){
						tmp.a.className = tmp.a.className.replace(self._deviceClass.online, '');
                        tmp.time.innerText = 'Offline '+ (CommInfo.getCurTime(device.offTime) || "");
					}

				}else{
					tmp = self._orginizeDevice(device.did, device.deviceName, device.category, device.state, shortcuts[index], device.offTime);
					self._baseDeviceTree.nodes[index] = tmp;
				}
				//if(!tmp.mounted){
				//	self._baseDeviceTree.main.appendChild(tmp.main);
				//	tmp.mounted = true;
				//}
				//index_list[index] = true;
			});
			//self._log(index_list);
			//self._log('[pane obj] remove start')
			child_nodes = mainNode.childNodes;
			i=j=0;
			c_len = child_nodes.length;
			n_len = datas.length;
			while(i<c_len && j<n_len){
				tmp = datas[j].did;
				if(tmp != child_nodes[i].id){
					self._removeChild(mainNode, nodes[tmp].main);
					mainNode.insertBefore(nodes[tmp].main, child_nodes[i]);
				}
                i++;
				j++;
			}
			c_len = mainNode.childElementCount;
			if(c_len > n_len){
				child_nodes = mainNode.childNodes;
				for(i=n_len; i<c_len; i++){
					mainNode.removeChild(child_nodes[i]);
				}
			}else if(c_len < n_len){
				child_nodes = mainNode.childNodes;
				for(i=c_len; i<n_len; i++){
					self._baseDeviceTree.main.appendChild(nodes[datas[i].did].main);
				}
			}
		}catch(err){
			self._log('[change devices]:')
			self._log(err)
			self._intDevice(datas, shortcuts);
		}
	},
	changeTabs: function(datas){
		if(!this._baseTabTree.main){
			this._intTab(datas);
			return ;
		}
		var self = this, 
			index_list = {},
			nodes = self._baseTabTree.nodes,
			mainNode = this._baseTabTree.main,
			i=null;
		try{
			datas.forEach(function(device){
				var tmp,
                    index;
				device = device.data;
                index = device.dev_id;
				tmp = nodes[index];
				if(tmp){
					tmp.tabs.innerHTML = self._orginizeTabs(device.data);
					tmp.name.innerText = device.name;
				}else{
					tmp = self._orginizeTabDevice(device.name, self.judgeDeviceType(device.dev_type))
					tmp.tabs.innerHTML = self._orginizeTabs(device.data);
					tmp.main.id = tmp.title.id = index;
					nodes[index] = tmp;
				}
				if(!tmp.mounted){
					mainNode.appendChild(tmp.main);
					tmp.mounted = true;
				}
				index_list[index] = true;
			});
			child_nodes = mainNode.childNodes;
			//child_nodes = mainNode.childNodes;
			i=j=0;
			c_len = child_nodes.length;
			n_len = datas.length;
			while(i<c_len && j<n_len){
				tmp = datas[j].data.dev_id;
				if(child_nodes[i].id === 'receivedTabs'){
					i++;
					continue;
				}
				if(tmp != child_nodes[i].id){
					self._removeChild(mainNode, nodes[tmp].main);
					mainNode.insertBefore(nodes[tmp].main, child_nodes[i]);
				}
                i++;
				j++;
			}
			c_len = mainNode.childElementCount;
			n_len++;
			if(c_len > n_len){
				child_nodes = mainNode.childNodes;
				for(i=n_len; i<c_len; i++){
					mainNode.removeChild(child_nodes[i]);
				}
			}else if(c_len < n_len){
				child_nodes = mainNode.childNodes;
				for(i=c_len; i<n_len; i++){
					mainNode.appendChild(nodes[datas[i].did].main);
				}
			}
		}catch(err){
			this._intTab(datas);
		}
	},
	remount: function(parent, type, hadListen){
		var tmp = this['_base'+type+'Tree'];
		if(!hadListen){
			parent.addEventListener('click', this._handleClick.bind(this, type), true);
		}
		CommInfo.popup_id['mount'+type] = true;
		parent.innerHTML = '';
		parent.appendChild(tmp.main);
	},
	// 判断cloud tabs中的设备类型，返回一个classname
	judgeDeviceType: function(dev_type){
		switch(dev_type){
			case 0:		return '_phone'; 	break;
			case 1:		return '_pad'; 		break;
			case 2: 	return '_pc'; 		break;	
			default:	return '_phone';	break;	
		}
	},
	sortBy: function(name, type){
	    return function(o, p){
	        var a, b;
	            a = o[name]
	            b = p[name];
	        if(a < b){	        	
	        	return (type =='desktop')?-1:1;        	
	        }else if(a > b){
	        	return (type =='desktop')?1:-1;
	        }else{
	        	return 0;
	        }
	    }
	},
	_removeChild: function(parent, child) {
		if(parent.hasOwnProperty('hasChildNodes')){
			if(parent.hasChildNodes(child)){
				parent.removeChild(child);
			}
		}else{
			try{
				parent.removeChild(child);
			}catch(err){
				this._log(err);
			}
		}
	},
	_hasClass : function(elem, value){
		if(!elem){
			return false;
		}
		var className = " " + value + " ";
		var classNames = " "+elem.className+" ";
		if(elem.nodeType === 1){
			if(classNames.indexOf(className)>=0){
				return true;
			}
			
		}
		return false;
	},
    clear :function(){
        CommInfo.latest_sid = null;
    }
}

var CommInfo = {
	client_version:"chrome_en_2.0_1",
	first_login:false,
	sync_first:true,
	infoPage_id: null,
	popup_id:null,
	login_win_id:null,
	logining:false,
	//used to monitor third-party login result redirect url change. 
	auth_tab_id:null,
	//user auth token
	token:null,
	user_id:null,
	user_name:'',
	nick_name:'',
	//0:dolphin,other:third-party account.
	login_type:0,
	login_typeName:'dolphin',
	//login status.
	is_login:false,
	//context menua id,
	context_menu_id:null,
	context_image_menu_id:null,
	context_select_menu_id:null,
	//use to cancel 1min sync 
	sync_time_id:null,
	//sonar word.
	sonar_cmd:'Go Dolphin',
	menuid_map:{},
	delete_tabs:[],
	delete_bookmarks:[],
	//current tab obj,used for tab push
	cur_tab:null,
	//current tab obj list,used for tab sync
	cur_tab_list:[],
	//user device list, used for tab push
	device_list:[],
	//offline message
	offlineMsg: [],
	last_sid: null,
	check_login: function(){
		var user_login_info = localStorage['DolphinBrowserUserLoginInfo'];
		if(user_login_info != null && user_login_info != '')
		{
			var login_info = JSON.parse(user_login_info);
			CommInfo.user_name = login_info.user_name;
			CommInfo.nick_name = login_info.nick_name;
			CommInfo.email = login_info.email;
			CommInfo.token = login_info.token;
			CommInfo.login_type = login_info.login_type;
			CommInfo.login_typeName = login_info.login_typeName;
			CommInfo.is_login = true;
			CommInfo.sync_first  =true;	
			CommInfo.region_domain = login_info.region_domain;
			CommInfo.push_domain = login_info.push_domain;
			CommInfo.user_id = login_info.user_id;
			chrome.browserAction.setPopup({popup:'mainPane.html'}) 
		}
	},
	get_mobile_devs: function() {
		var devs = [];
		for(var id in CommInfo.device_list) {
			if(CommInfo.device_list[id].category != 'pc') {
				devs.push(CommInfo.device_list[id]);
			}
		}
		return devs;
	},
    getCurTime: function(timestamp){
		var now = typeof(timestamp)==='number' ? new Date(timestamp) : new Date();
		var year = now.getFullYear();
		var month = now.getMonth()+1;
		var date = now.getDate();
		var hour = now.getHours();
		var min = now.getMinutes();

		if(hour<10){
			hour = '0' + hour;
		}
		if(min<10){
			min = '0' + min;
		}

		var timeString = year + '-' + month + '-' + date + ' ' + hour + ':' + min;
		return timeString;
	},
	get_pc_devs_online: function(){
		return CommInfo.device_list.filter(function(item){
			return item.category == 'pc' && item.state == 1;
		})
	},
	get_setting: function() {
		/*
		 return example: {bookmark:true,tab:true, button:true} 
		 */
		
		var setting  = localStorage['DolphinBrowserSetting'];
		if(setting == null || setting == '' || setting == '{}') {
			var setting = {bookmark:true,tab:true,button:true};
			var user_setting = {};
			user_setting[CommInfo.user_name] = setting;
			localStorage['DolphinBrowserSetting']= JSON.stringify(user_setting);
			return setting;
		}
		var setting_json = JSON.parse(setting);
		if(setting_json[CommInfo.user_name] == null){
			setting_json[CommInfo.user_name] = {bookmark:true,tab:true,button:true};
			localStorage['DolphinBrowserSetting'] = JSON.stringify(setting_json);
		}
		return setting_json[CommInfo.user_name];
	},
	save_setting: function(setting){
		/*
		 	setting format: {bookmark:true,tab:true, button:true} 
		 */
		var settings  = localStorage.getItem('DolphinBrowserSetting');
		if(settings == null || settings == '' || settings == '{}') {
			var user_setting = {};
			user_setting[CommInfo.user_name] = setting;
			localStorage['DolphinBrowserSetting']= JSON.stringify(user_setting);
		}
		else{
			var setting_json = JSON.parse(settings);
			setting_json[CommInfo.user_name] = setting;
			localStorage['DolphinBrowserSetting'] = JSON.stringify(setting_json);
		}
		
		//call push server.
		var sync_items = [];
		if(setting.tab) {
			sync_items.push('tab');
		}
		if(setting.bookmark) {
			sync_items.push('mobile_bookmark');
			sync_items.push('desktop_bookmark');
		}
		changeSyncListener(sync_items);
	},
	get_device_shortcut: function() {
		var shortcuts = localStorage['DolphinBrowserPushShortcuts'];
		if(shortcuts == null || shortcuts == '') {
			var keys={};
			return keys;
		}
		else{
			var data  = JSON.parse(shortcuts);
			return data;
		}
	},
	init_fontnode: function(){
		if(!CommInfo.fontNodes){
			CommInfo.fontNodes = new mainPaneObj();
			CommInfo.fontNodes._get_favico = get_favico;
			CommInfo.fontNodes._pushSend = pushSend;
			CommInfo.fontNodes._Parent = CommInfo;
			CommInfo.fontNodes._log = print_msg;
		}
		CommInfo.fontNodes.iniBookMarks();
		CommInfo.after_sid('mobile_bookmark', 0);
		CommInfo.after_sid('firefox_bookmark', 0);
	},
	reflash_pane: function(type){ //
		try{
			switch(type){
				case 'tab':
					CommInfo.fontNodes.changeTabs(CommInfo.tab_sync_list_sorted());
				break;
				case 'device':
					CommInfo.fontNodes.changeDevices(GetPushDevicesSorted(), CommInfo.get_device_shortcut());
				break;
				case 'bookmark':
					CommInfo.fontNodes.initBookMark('desktop');//不能同时获取两个数据
					return;
				break;
				default:
				break;
			}
		}catch(err){
			print_msg(err);
		}
		if(CommInfo.popup_id){
			CommInfo.popup_id.updatePaneStatus(type);
		}
	},
	save_device_shortcut: function(dev_shortcuts){
		/*
		  shortcuts format:
		   {
		  	'dev1':['ctrl','alt','x'],
		  	'dev2':['shift','y'],
		  }
		*/
		var shortcuts = dev_shortcuts;
		localStorage['DolphinBrowserPushShortcuts'] = JSON.stringify(shortcuts);
		this.reflash_pane('device');
	},
	bookmark_sync_list:[],
	//other device push tab list
	tab_push_list:function(){
		var pushs = localStorage.getItem('DolphinBrowserPushTabs');
		//if no pushs,return a blank list.
		if(pushs == null || pushs == '')
		{
			return [];
		}
		else
		{
			var data = JSON.parse(pushs);
			if(CommInfo.user_name != null && data[CommInfo.user_name])
			{
				return data[CommInfo.user_name];
			}
			else
			{
				return [];
			}
		}
	},
	save_push_tabs:function(tabs)
	{
		var push_save = localStorage.getItem('DolphinBrowserPushTabs');
		if(push_save != null && push_save != '')
		{
			var push_save_json = JSON.parse(push_save);
		}
		else
		{
			var push_save_json = {};
		}
		push_save_json[CommInfo.user_name] = tabs;
		localStorage['DolphinBrowserPushTabs']  = JSON.stringify(push_save_json);
	},
	//other device sync tab list
	tab_sync_list:function(){
		var tabs = localStorage.getItem('DolphinBrowserSyncTabs');
		if(tabs == null || tabs =='')
		{
			return {};
		}
		else
		{
			var data = JSON.parse(tabs);
			return data;
		}
	},
	tab_sync_list_sorted:function(){
		var sync_list = CommInfo.tab_sync_list();
		var sorted_list = [];
		for(var key in sync_list)
		{
			sorted_list.push({id:key, data:sync_list[key]});
		}
		if(sorted_list.length > 0)
		{
			sorted_list.sort(function(a,b){return parseInt(b.data.sid) - parseInt(a.data.sid);});
		}	
		return sorted_list;
	},
	tab_sync_list_remove:function(id){
		var sync_list = CommInfo.tab_sync_list();
		if(sync_list.hasOwnProperty(id))
		{
			delete sync_list[id];
			localStorage['DolphinBrowserSyncTabs'] = JSON.stringify(sync_list);
		}
	},
	get_all_devices:function()
	{
		//clear the devices
		var all_devices={};
		
		//merge sync and push device according device_id
		var sync_devices = CommInfo.tab_sync_list();
		var push_devices = CommInfo.device_list;
		
		for(var idx in push_devices)
		{
			var dev_id;
			
			var colon_idx = push_devices[idx].did.indexOf(':');
			if(colon_idx != -1)
			{
				dev_id = push_devices[idx].did.substring(0,colon_idx);
			}
			else
			{
				//this condition should not occur,just for safe.
				dev_id = push_devices[idx].did;
			}
						
			var info = {category:push_devices[idx].category, deviceName:push_devices[idx].deviceName};			
			all_devices[dev_id]=info;
		}
		
		for(var idx in sync_devices)
		{
			var dev_id = sync_devices[idx].dev_id;
			if(all_devices.hasOwnProperty(dev_id))
			{
				continue;
			}
			else
			{
				var info = {deviceName:sync_devices[idx].name};
				if(sync_devices[idx].hasOwnProperty('dev_type'))
				{
					switch(sync_devices[idx].dev_type)
					{
						case 0:		info.category = 'phone'; 	break;
						case 1:		info.category = 'pad'; 		break;
						case 2: 	info.category = 'pc'; 		break;	
						default:	info.category = 'phone';	break;	
					}
				}
				else
				{
					info.category='phone';
				}
				
				all_devices[dev_id]=info;
			}
		}	
		
		return all_devices;
	},
	//save after sid, used for sync operation
	after_sid:function(type, sid){
		if(!CommInfo.is_login){
			return null;
		}
		if(!CommInfo.latest_sid){
			try{
				var tmpAfterSid=  JSON.parse(localStorage.getItem('DolphinBrowserAfterSid'));
				if(tmpAfterSid && tmpAfterSid.hasOwnProperty(CommInfo.user_name) && tmpAfterSid[CommInfo.user_name]){
					CommInfo.latest_sid = tmpAfterSid[CommInfo.user_name];
					CommInfo.latest_sid['mobile_bookmark'] = 0;
					CommInfo.latest_sid['firefox_bookmark'] = 0;
				}
				CommInfo.latest_sid = tmpAfterSid;
			}catch(err){
				print_msg(err);
			}
			if(!CommInfo.latest_sid){
				CommInfo.latest_sid =  {tab:0, bookmark:0, history:0, mobile_bookmark:0, firefox_bookmark: 0};
				localStorage.setItem('DolphinBrowserAfterSid', JSON.stringify(CommInfo.latest_sid));
			}
		}
		if(type && sid != null){
			CommInfo.latest_sid[type] = sid;
			localStorage.setItem('DolphinBrowserAfterSid', JSON.stringify(CommInfo.latest_sid));
		}
		return CommInfo.latest_sid;
	},
	get_tab_change_setting:function(){
		var setting = localStorage['DolphinBrowserAccountChange'];
		if(setting != null)
		{
			var setting_json = JSON.parse(setting);
			var setting_usr = setting_json[CommInfo.user_name];
			if(setting_usr != null)
			{
				return setting_usr;
			}
		}
		return null;	
	},
	save_tab_change_setting:function(setting){
		var setting_str = localStorage['DolphinBrowserAccountChange'];
		var setting_json = {};
		if(setting_str != null)
		{
			var setting_json = JSON.parse(setting_str);
		}
		setting_json[CommInfo.user_name] = setting;
		localStorage['DolphinBrowserAccountChange'] = JSON.stringify(setting_json);
	},
	clear: function() {	
	},
	clickTarget:null
};



/*
	Third party api name.
*/
var ThirdParty = {
	'google':'google',
	'facebook':'facebook',
	'sinaweibo':'sinaweibo',
	'QQ':'qq'
};

var MAX_URL_LENGTH = 2048;
var MAX_TITLE_LENGTH = 1000;

/*
	0: offline device alert
	1: already sent
	2: sent fail
	3: not arrive
	4: sending
	5: login success
*/

function GEN_INJECT_SCRIPT(status, text)
{
	script='';
	script+='window.DOLPHIN_STATUS='+status;
	script+=';window.DOLPHIN_STATUS_TEXT="'+encodeURIComponent(text)+'";';
	return script;
}

var INJECT_STATUS={
		OFFLINE_SENT:"0",
		ALREADY_SENT:"1",
		SEND_FAIL:"2",
		ARRIVE_FAIL:"3",
		SENDING:"4",
		LOGIN:"5",
};

CommInfo.check_login();