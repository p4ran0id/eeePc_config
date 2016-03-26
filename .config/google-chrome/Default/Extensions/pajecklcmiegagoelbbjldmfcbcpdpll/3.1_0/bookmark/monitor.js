chrome.bookmarks.onCreated.addListener(	createCallback );

function createCallback(id, createInfo) {
	if(CommInfo.is_login) {
		chrome.bookmarks.getChildren(createInfo.parentId, function(nodes){
			findDuplication = false;
			duplicates=[];
			for(var idx in nodes)
			{
				if(nodes[idx].id != createInfo.id && nodes[idx].title == createInfo.title && nodes[idx].url == createInfo.url)
				{
					findDuplication = true;
					duplicates.push(nodes[idx].id);
					//break;
				}
			}
			
			if(findDuplication)
			{
				print_msg("Detect duplicate bookmark:"+createInfo.title+",id="+createInfo.id+",num="+duplicates.length);
				//delete this one, no need to sync.
				bookmarks = BookmarkSyncStorage.load();
				hasDolphinCreated = false;
				bookmarkId = 0;
				for(var idx in duplicates)
				{
					bookmarkId = duplicates[idx];
					if(bookmarks[bookmarkId] && bookmarks[bookmarkId].hasOwnProperty('dc'))
					{
						hasDolphinCreated = true;
						break;
					}
				}
				if(hasDolphinCreated)
				{
					if(bookmarks[bookmarkId].dc)
					{
						print_msg("Has Dolphin Created and delete this one.");
						deleteBookmark(bookmarks[bookmarkId]);
						bookmarks[bookmarkId].id=createInfo.id;
						bookmarks[bookmarkId].dc = 0;
						bookmarks[createInfo.id] = bookmarks[bookmarkId];
						delete bookmarks[bookmarkId];
						BookmarkSyncStorage.save(bookmarks);				
					}
					else
					{
						print_msg("Just delete this one.");
						deleteBookmark(createInfo);
					}
				}
				else
				{
					print_msg("Wait chrome to delete this.");
					deleteBookmark(createInfo);
				}
			}
			else
			{
				//No duplicate bookmark detect. so ,add this node to localStorage.
				print_msg("Detect NO duplicate bookmark:"+createInfo.title+",id="+createInfo.id);
				var idx = createInfo.index;
				var data_json = BookmarkSyncStorage.load();
				var node = createInfo;
				var time = get_utc();
				data_json[node.id] = {
					id:node.id, 
					pid:node.parentId, 
					folder:node.url == null ? 1 : 0,
					title:node.title,
					url: node.url,
					order: time + idx,
					state:BookmarkSyncState.CREATE		
				};
				ensure_order(createInfo, data_json);	
				//sync start
				print_msg("[Bookmark monitor]detect bookmark create.");
				autoSync();	
			}
		});	
	}
}

/*
	Ensure bookmark order info.
	Because order is marked as timestamp, so need check ts is correct.(Stupid Design)
	Note: The reason of while loop to find a node is that some duplicate bookmark does not 
		  save in localStorage. 
*/
function ensure_order(nodeInfo, data_json, parent)
{
	print_msg("begin ensure_order!!!");
	if(parent)
	{
		print_msg("[BookmarkSync] Ensure order Has Parent.");
		order_process(parent, nodeInfo, data_json);
	}
	else
	{
		print_msg("[BookmarkSync] Ensure order No Parent.");
		//calculate order info.
		chrome.bookmarks.getSubTree(nodeInfo.parentId, function(pNode){
			order_process(pNode[0], nodeInfo, data_json);
			BookmarkSyncStorage.save(data_json);
		});
	}
}

function order_process(pNode, nodeInfo, data_json)
{
	var len = pNode.children.length;
	var node = nodeInfo;
	var idx = nodeInfo.index;
	//if insert in head.(This may not happen but to prevent.)
	if(idx == 0 && len > 1)
	{
		var find = false;
		while(++idx < len)
		{
			var cid = pNode.children[idx].id;
			if(data_json[cid])
			{
				find = true;
				data_json[node.id].order = data_json[cid].order - 20;
				break;
			}
		}	

		if(find == false)
		{
			print_msg("[BookmarkSync] localStorage data may wrong[1]."+node.title);
		}
	}
	else //if insert in middle. Because user may replicate a bookmark manually, but code should not run here.
	{
		var f_order = 0;
		var b_order = 0;

		//find front node.
		while(--idx >= 0)
		{
			var cid = pNode.children[idx].id;
			if(data_json[cid])
			{
				//data_json[node.id].order = data_json[cid] - 20;
				f_order = data_json[cid].order;
				break;
			}
		}

		//find back node.
		idx = nodeInfo.index;
		while(++idx < len)
		{
			var cid = pNode.children[idx].id;
			if(data_json[cid])
			{
				b_order = data_json[cid].order;
				break;
			}
		}
	
		if(f_order > 0 && b_order > 0 && f_order <= b_order)
		{
			data_json[node.id].order = f_order + (b_order - f_order)/2;
		}
		else
		{	
			print_msg("[BookmarkSync], localStorage data may wrong[2].");	
		}
	}
}


function deleteBookmark(node)
{
	//chrome.bookmarks.onRemoved.removeListener(removeCallback);
	//chrome.bookmarks.onMoved.removeListener(moveCallback);
	if(node.url)
	{
		chrome.bookmarks.remove(node.id, function(){
			//chrome.bookmarks.onRemoved.addListener(removeCallback);
			//chrome.bookmarks.onMoved.addListener(moveCallback);
		});
	}
	else
	{
		chrome.bookmarks.removeTree(node.id, function(){
			//chrome.bookmarks.onRemoved.addListener(removeCallback);
			//chrome.bookmarks.onMoved.addListener(moveCallback);
		});
	}	
	
}

chrome.bookmarks.onChanged.addListener(changeCallback);

function changeCallback(id, changeInfo){
		if(BookmarkInfo.ongoing == 0 && CommInfo.is_login) {
			//sync start
			print_msg("detect bookmark change.");
			autoSync();
			//BookmarkSyncCtrl.sync();
		}	
}

/*
	{
		'index':0,
		'oldindex':1,
		'oldParentId':"20",
		'parentId':"20"
	}
*/
chrome.bookmarks.onMoved.addListener(moveCallback);

function moveCallback(id, moveInfo) {
	if(CommInfo.is_login)
	{
		//if(BookmarkInfo.ongoing == 0 && CommInfo.is_login) {
		var bk_data = BookmarkSyncStorage.load();
		if(bk_data.hasOwnProperty(id))
		{
			if(moveInfo.oldParentId != moveInfo.parentId){
				bk_data[id].pid = moveInfo.parentId;
			}
			
			//mark it's parent to dirty and state to MOVE
			//bk_data[moveInfo.parentId].dirty=1;
			bk_data[id].state = BookmarkSyncState.MOVE;
			moveInfo.id = id;
			ensure_order(moveInfo, bk_data);		
			//BookmarkSyncStorage.save(bk_data);
			print_msg('move bookmarks'+id);
		}
	}
	//sync start
	print_msg("[BookMark monitor]detect bookmark move.");
	autoSync();
	//BookmarkSyncCtrl.sync();
	//}	
}

chrome.bookmarks.onRemoved.addListener(removeCallback);

function removeCallback(id, removeInfo) {
	print_msg("[BookMark monitor]detect bookmark remove."+removeInfo.title+"cid="+removeInfo.id);
	//sync start
	autoSync();
	//BookmarkSyncCtrl.sync();			
}

/*
 	reorderInfo is a list of id of children.
 */
chrome.bookmarks.onChildrenReordered.addListener(reorderCallback);

function reorderCallback(id, reorderInfo) {
	if(BookmarkInfo.ongoing == 0 && CommInfo.is_login) {
		//sync start
		
		if(reorderInfo){
			var bk_data = BookmarkSyncStorage.load();
			bk_data[id].dirty = 2;
			BookmarkSyncStorage.save(bk_data);
			print_msg('children reorder bookmarks'+id);
			print_msg("detect bookmark children reorder.");
			//autoSync();
		}
	}	
}
function autoSync(is_start){
	if(!is_start){
		print_msg('[Bookmark monitor] start sync timer 10')
		if(CommInfo.autoSyncTimer)
			clearTimeout(CommInfo.autoSyncTimer);
		CommInfo.autoSyncTimer = setTimeout(arguments.callee.bind(this, true), 10000);
		return;
	}
	var pc_devs = CommInfo.get_pc_devs_online();
	if(pc_devs && pc_devs.length > 0){
		print_msg('[Bookmark monitor]more than one pc device, disable autoSync bookmark!');
		return ;
	}
	print_msg('[Bookmark monitor] autoSync start!')
	BookmarkSyncCtrl.sync();
}	