local = null;

BookmarkInfo = {
		deletes:[],
		updates:[],
		latest_sid:0,
		ongoing:0,
		treeRoot:null,
		lastSyncTime:0,
};

BookmarkSyncCtrl = {
	timeIntervalId:null	
};

syncBtnStat={1:'doing',0:''};

BookmarkSyncCtrl.setSyncStatus = function(stat)
{
	BookmarkInfo.ongoing = stat;
	if(stat == 1)
	{
		set_sync_ico();
	}	
	else if (stat == 0)
	{
		set_normal_ico();
	}
	if(CommInfo.popup_id != null)
	{
		CommInfo.popup_id.setPaneStatus('disaSyncBookMark', stat==1 ? 'add' : 'remove');	
	}
}

BookmarkSyncCtrl.setBookmarkIntervalSyncStatus = function(enable)
{
	if (BookmarkSyncCtrl.timeIntervalId)
	{
		clearInterval(BookmarkSyncCtrl.timeIntervalId);
		BookmarkSyncCtrl.timeIntervalId = null;
	}	

	if(enable)
	{
		//10 min
		sync_interval = localStorage['DolphinBrowserSyncInterval'];
		if(!sync_interval)
		{
			sync_interval = 1000*60*10;
		}
		BookmarkSyncCtrl.timeIntervalId = setInterval(BookmarkSyncCtrl.sync, sync_interval);
	}
}

BookmarkSyncCtrl.sync = function(sid) {
	if(!CommInfo.is_login)
	{
		return;
	}
	BookmarkSyncCtrl.setBookmarkIntervalSyncStatus(true);
	print_msg('[BookmarkSync] Start...');
	if(sid != null) {
		var sid_local = CommInfo.after_sid();
		if(sid_local.bookmark >= sid) {
			print_msg("[BookmarkSync] local sid is greater than push sid, no need to sync.");
			return;
		}	
	}
	
	//Check last sync time, because sync may have been interrupted when something error happen.
	//If the time inverval exceeds the threshold(Now, it is 1 min), reset the ongoing flag, and sync can go on,
	//otherwise, you have no choice but to reboot browser.
	if(BookmarkInfo.ongoing == 1){
		if((get_utc()/1000 - BookmarkInfo.lastSyncTime) > 60)
		{
			//BookmarkInfo.ongoing == 0;
			print_msg('ignore ongoing sync bookmark!')
			BookmarkSyncCtrl.setSyncStatus(0);
		}
	}
	
	//If there's no other sync process ongoing, start one. 
	if(BookmarkInfo.ongoing == 0) {
		//Check bookmark enable or not.
		var setting = CommInfo.get_setting();
		if(setting.bookmark) {
			//BookmarkInfo.ongoing = 1;
			BookmarkSyncCtrl.setSyncStatus(1);
			var time_current = get_utc()/1000;
			BookmarkInfo.lastSyncTime = time_current;
			if(localStorage['DolphinBrowserBookmark'] == null) {
				//If this is the first time to sync, init local bookmark data.
				BookmarkSyncStorage.init(BookmarkSyncStorage.syncLocalPreprocess, SYNC_state);
			}
			else
			{
				BookmarkSyncStorage.syncLocalPreprocess(SYNC_state);
			}			

			/*
			chrome.bookmarks.onCreated.removeListener(	createCallback );
			chrome.bookmarks.create({parentId:'1', title:'', url: 'http://test.probe.com'}, function(node){
				chrome.bookmarks.onCreated.addListener(	createCallback );
				//chrome.bookmarks.onRemoved.removeListener(removeCallback);
				if(node)
				{
					chrome.bookmarks.remove(node.id, function(){
						//chrome.bookmarks.onRemoved.addListener(removeCallback);
						setTimeout(function(){
							if(localStorage['DolphinBrowserBookmark'] == null) {
								//If this is the first time to sync, init local bookmark data.
								BookmarkSyncStorage.init(BookmarkSyncStorage.syncLocalPreprocess, SYNC_state);
							}
							else
							{
								BookmarkSyncStorage.syncLocalPreprocess(SYNC_state);
							}							
						},2000);
					});				
				}
				else
				{
					BookmarkSyncCtrl.setSyncStatus(0);
					print_msg('create error.');
				}
			});
			*/
		}
	}	
};

BookmarkSyncCtrl.clear = function() {
	BookmarkInfo.deletes = [];
	BookmarkInfo.updates = [];
	BookmarkInfo.latest_sid = 0;
	BookmarkInfo.ongoing = 0;
	BookmarkInfo.treeRoot = null;
	local = null;
	merge_clear();
	BookmarkSyncCtrl.setBookmarkIntervalSyncStatus(false);	
}