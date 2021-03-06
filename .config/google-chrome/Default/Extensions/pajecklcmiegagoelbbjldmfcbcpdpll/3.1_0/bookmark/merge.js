
var merge_buffer={
	node_stack:	[],
	node_delete:[],
	node_local_shade:[],
	node_local_ids:{},
	node_order:[]
};

var sync_buffer={
	node_stack_create:[],
	node_stack_update:[]
	
};

function merge_clear() {
	merge_buffer.node_stack = [];
	merge_buffer.node_delete = [];
	merge_buffer.node_local_shade = [];
	merge_buffer.node_local_ids = {};
	merge_buffer.node_order = [];
	sync_buffer.node_stack_create = [];
	sync_buffer.node_stack_update = [];
}

/*
 	Sort server list in merge oder, algorithm complexity is O(n) 
 	Params:
 		-server_list: key/value dict, key is server id.
 	Return:
 		-tmp_queue: sorted queue for later process.
 	Simple test data:
 		var server_list = {
 			'1':{pid:2},
 			'2':{pid:3},
 			'5':{pid:4},
 			'4':{pid:100},
 			'10':{pid:0}
 		}
 	Tag:
 		Test passed.
 */
function sort_node(server_list){
	var tmp_stack=[];
	var tmp_queue=[];
	var node = null;

	for(var idx in server_list){
		node = server_list[idx];
		tmp_stack.splice(0, tmp_stack.length);
		
		/*
		 	if this node has not been processed.
		 */
		while(!node.hasOwnProperty('order_st')) {
			
			//label this node has been processed, and push it to temp stack buffer.
			node.order_st = 1;
			//print_msg("id:"+tmp_id);
			tmp_stack.push(node);
			
			//process it's parent node if exist in server_list
			if(server_list.hasOwnProperty(node.pid)) {
				node = server_list[node.pid];
			}
			else { 
				break;
			}
		}
		
		//insert into queue.
		while(tmp_stack.length > 0) {
			tmp_queue.push(tmp_stack.pop());
		}
		
		//free temp stack buffer.
		tmp_stack.splice(0, tmp_stack.length);
		
	}
	
	return tmp_queue.reverse();
}

/*
	Sort local list in sync oder, algorithm complexity is O(n) 
	Params:
		-local_list: key/value dict, key is server id.
	Return:
		-tmp_queue: sorted queue for later process.
	Simple test data:
		var local_list = {
			'1':{pid:2},
			'2':{pid:3},
			'5':{pid:4},
			'4':{pid:100},
			'10':{pid:0}
		}
	Tag:
		Test passed.
*/
function sort_node_local_bak(local_list){
	var tmp_stack=[];
	var tmp_queue=[];
	var node = null;
	
		for(var idx in local_list){
		node = local_list[idx];
		
		if(node.state == BookmarkSyncState.SYNCED)
			continue;

		tmp_stack.splice(0, tmp_stack.length);
		
		/*
		 	if this node has not been processed.
		 */
		while(!node.hasOwnProperty('order_st')){
			
			//label this node has been processed, and push it to temp stack buffer.
			node.order_st = 1;
			//print_msg("id:"+tmp_id);
			tmp_stack.push(node);
			
			//process it's parent node if exist in server_list
			if(local_list.hasOwnProperty(node.pid) && local_list[node.pid].state != BookmarkSyncState.SYNCED)
			{
				node = local_list[node.pid];
			}
			else
			{
				break;
			}
		}
		
		//insert into queue.
		while(tmp_stack.length > 0) {
			tmp_queue.push(tmp_stack.pop());
		}
		
		//free temp stack buffer.
		tmp_stack.splice(0, tmp_stack.length);
	}
	
	return tmp_queue.reverse();
}

function sort_node_local(local_list, tree_root){

	var tmp_queue=[{layer:0, node:tree_root}];
	var output = [];
	
	while(tmp_queue.length > 0) {
		
		//get a node from queue head
		var item = tmp_queue[0];
		var node = item.node;
		//remove the node from queue head
		tmp_queue.splice(0, 1);
				
		//if(local_list.hasOwnProperty(node.id) && local_list[node.id].state != BookmarkSyncState.SYNCED){
		if(local_list.hasOwnProperty(node.id)){
			local_list[node.id].layer = item.layer;			
			output.push(local_list[node.id]);
		}

		//insert children of this node to queue tail.
		if(node.children && node.children.length > 0) {
			for(var idx in node.children ) {
				tmp_queue.push({layer:item.layer+1,node:node.children[idx]});
			}			
		}
	}
	
	//����ظ�
	var output_len = 0;
	for(output_len = 0; output_len < output.length; output_len++)
	{
		if((output[output_len].sid == null || output[output_len].state == BookmarkSyncState.CREATE) && output[output_len].url != null)
		{
			var t_len = output_len - 1;
			var find = false;
			while(t_len > 0 && output[t_len].pid == output[output_len].pid)
			{
				if(output[t_len].title == output[output_len].title && output[t_len].url == output[output_len].url)
				{
					if(output[t_len].state == BookmarkSyncState.SYNCED)
					{
						find = true;
						break;
					}					
				}
				t_len--;
			}
			
			//ensure only one duplicate bookmark upload to server.Check duplicates and delete from output.
			t_len = output_len + 1;
			while(t_len < output.length && output[t_len].pid == output[output_len].pid)
			{
				if(output[t_len].title == output[output_len].title && output[t_len].url == output[output_len].url)
				{
					if(output[t_len].state == BookmarkSyncState.SYNCED)
					{
						find = true;
						//break;
					}
					else
					{
						output.splice(t_len, 1);
						t_len--;
					}					
				}
				t_len++;
			}
			
			if(find)
			{
				output.splice(output_len, 1);
				output_len--;
			}
		}
	}
	//print_msg("find synced item");
	//print_msg(output);
	for(output_len = 0; output_len < output.length; output_len++)
	{
		if(output[output_len].state == BookmarkSyncState.SYNCED)
		{
			output.splice(output_len, 1);	
			output_len--;
		}
	}
	
	return output.reverse();
}


/*
 	Merge control module, this function will merge node based on sorted node list.
 	Params:
	-server_list: key/value dict, key is server id.
 */
bookmark_merge_ctrl = function(){
	
	//if local bookmark has not been loaded, load it to memory.
	if(local != null){
		local = null;
	}	
	local = BookmarkSyncStorage.load();
	//format server data.
	var server_list = pre_process_server();
	
	//sort server data to certain merge order.
	merge_buffer.node_stack = sort_node(server_list);
	
	//start merge, this is merge entry.
	merge_node();	
}

/*
 	Merge single node, this function like a chain node.
 */
function merge_node(){
	if(merge_buffer.node_stack.length > 0){
		var node = merge_buffer.node_stack.pop();
		var local_node = local_find_node_by_sid(node.id, local);
		
		//if find by server id 
		if(local_node != null) {
			//print_msg("Bookmark Found in Local List: [SID]=["+node.id+"], [TITLE]=["+ node.title +"],"+"[URL]=["+node.url+"]");
			var already_call_chain = 0;
			
			//Do move operation if current node pid change. 
			var local_parent_node = local_find_node_by_sid(node.pid, local);
			var hasApply = false;
			if(local_parent_node && local_parent_node.id != local_node.pid) {
				hasApply = true;
				//print_msg("Bookmark Parent Change: [SID]=["+node.id+"], [TITLE]=["+ node.title +"],"+"[URL]=["+node.url+"],"+"[OLD_SPID]=["+local_parent_node.sid+"],[NEW_SPID]=["+node.pid+"]");
				var tmp_pid = local_parent_node.id;
				var tmp_id = local_node.id;
				local[tmp_id].pid = tmp_pid;
				
				//one node may have several operations, but chain can only be called once, if one operation has call chain
				//the other node can not call.
				already_call_chain  = 1;
				
				//Chrome move API
				//node order may change.
				local_node.order = node.order;
				var index = get_index(local_parent_node.id, node.order, local, local_node.id);
				chrome.bookmarks.getSubTree(tmp_pid, function(nodes){
					if(index > nodes[0].children.length)
					{
						index = nodes[0].children.length;
					}
					else if(index < 0)
					{
						index = 0;
					}

					chrome.bookmarks.onMoved.removeListener(moveCallback);
					chrome.bookmarks.move(tmp_id, {parentId:tmp_pid, index:index}, function(result){
						if(chrome.bookmarks.onMoved.hasListener(moveCallback) == false)
						{
							chrome.bookmarks.onMoved.addListener(moveCallback);					
						}
						//call chain
						if(result)
						{
							merge_node();
						}
						else
						{
							BookmarkSyncCtrl.setSyncStatus(0);
							print_msg("move error");
						}
					});					
				});
			}
			
			//Do update operation if current node url/title change
			
			if(local[local_node.id].title != node.title || local[local_node.id].url != node.url) {
				hasApply = true;
				print_msg('[BookmarkMerge] update sid='+node.id)
				//print_msg("Bookmark Title Or Url Change: [SID]=["+node.id+"], [OLD_TITLE]=["+ node.title +"],"+"[OLD_URL]=["+node.url+"],[NEW_TITLE]=["+local[local_node.id].title+"], [NEW_URL]=["+local[local_node.id].url+"]");
				var changes={};
				local[local_node.id].title = node.title;
				changes.title = node.title;
				if(node.folder == 0){
					changes.url = node.url;
				}
				
				if(already_call_chain == 0){						
					//Chrome update API
					already_call_chain = 1;
					chrome.bookmarks.update(local_node.id, changes, function(result){
						//call chain
						if(result)
						{	
							merge_node();
						}
						else
						{
							BookmarkSyncCtrl.setSyncStatus(0);
							print_msg("update error");
						}
					});
				}
				else{
					
					chrome.bookmarks.update(local_node.id, changes, function(result){
						if(!result)
						{
							BookmarkSyncCtrl.setSyncStatus(0);
							print_msg("update error");							
						}
					});
				}
			}
			
			if(local[local_node.id].order != node.order) {
				hasApply = true;
				print_msg("[BookmarkMerge] change order, sid=" + node.id)
				//print_msg("Bookmark Order Change: [SID]=["+node.id+"], [TITLE]=["+ node.title +"],"+"[URL]=["+node.url+"], [OLD_ORDER]=["+local[local_node.id].order+"],[NEW_ORDER]=["+node.order+"]");
				local_node.order = node.order;

				if(local_parent_node && local_parent_node.id){
					var index = get_index(local_parent_node.id, node.order, local, local_node.id);
					chrome.bookmarks.getSubTree(local_parent_node.id, function(nodes){
						var idx = 0;
						//get real order.
						var curr_index = -1;
						for( idx = 0; idx < nodes[0].children.length; idx++)
						{
							if(nodes[0].children[idx].id == local_node.id)
							{
								curr_index = nodes[0].children[idx].index;	
								break;						
							}
						}

						//bug fix. chrome is so bad.
						/*if(curr_index != -1)
						{
							if(index > 0)
							{
								var distant = curr_index - index;
								if(  distant == 1 || distant == -1)
								{
									index -= distant;
								}
							}	
						}*/
						
						if(index > nodes[0].children.length)
						{
							index = nodes[0].children.length;
						}
						else if(index < 0)
						{
							index = 0;
						}

						if(already_call_chain == 0){
							chrome.bookmarks.onMoved.removeListener(moveCallback);
							chrome.bookmarks.move(local_node.id, {index:index}, function(result){
								if(chrome.bookmarks.onMoved.hasListener(moveCallback) == false)
								{
									chrome.bookmarks.onMoved.addListener(moveCallback);					
								}
								//call chain
								if(result)
								{
									merge_node();							
								}
								else
								{
									BookmarkSyncCtrl.setSyncStatus(0);
									print_msg("move error");
								}
							});				
						}
						else {
							chrome.bookmarks.onMoved.removeListener(moveCallback);
							chrome.bookmarks.move(local_node.id, {index:index}, function(result){
								if(chrome.bookmarks.onMoved.hasListener(moveCallback) == false)
								{
									chrome.bookmarks.onMoved.addListener(moveCallback);					
								}
								if(!result)
								{
									BookmarkSyncCtrl.setSyncStatus(0);
									print_msg("move error");
								}
							});
						}	
					});	
				}					
			}
			
			if(hasApply == false)
			{
				merge_node();
			}
		}
		else{
			
			if(node.pid == '')
			{
				print_msg('[BookmarkMerge] top Bookmark sid='+node.id)
				//print_msg("Top Bookmark: [SID]=["+node.id+"], [TITLE]=["+ node.title +"],"+"[URL]=["+node.url+"]");
				local_node=local[node.cid];
				if(local_node != null){
					local_node.sid = node.id;
					local[local_node.id].state = BookmarkSyncState.SYNCED;
				}
				
				merge_node();
			}
			else
			{
				/*
				 	if code run into here, all nodes should have a parent in local list,
				 	otherwise, this node will be filtered out.
				 	For example:
				 		Chrome A has a folder named 'mobile' in root folder, but Chrome B 
				 		has no folder named 'mobile' in root folder, if the sync process
				 		occurred at Chrome B, 'mobile' folder has no permission to create in
				 		root folder, so, all children of 'mobile ' should not be created. 
				 */
				//find by title or url in it's sibling node list.
				var tmp_pid = '0';
				var tmp_pnode = local_find_node_by_sid(node.pid, local);
				
				/*
				 	if node has parent in local list, do merge, otherwise continue process
				 	next node.
				 */
				if (tmp_pnode != null){
					//tmp_pid = local_find_node_by_sid(node.pid, local).id;
					tmp_pid = tmp_pnode.id;			
					//folder
					if (node.folder) {		
						local_node = local_find_node({title:node.title, pid:tmp_pid, folder: 1},local);
					}
					else {
						local_node = local_find_node({title:node.title,url:node.url, pid:tmp_pid},local);
					}
					
					//merge
					if(local_node) {
						print_msg("Bookmark Local Exists And Merged: [SID]=["+node.id+"]");
						local_node.sid = node.id;
						local_node.order = node.order;
						local_node.state = BookmarkSyncState.SYNCED;
						//order may incorrect, so, order process should be invoked after all sync finish.
						merge_node();
					}
					else
					{
						print_msg("Bookmark Local Not Exists And Insert: [SID]=["+node.id+"]");
						
						//print_msg("CAUSE:");
						//insert
						//var pid = local_find_node_by_sid(node.pid, local).id;
						var insert_info = {title:node.title, parentId:tmp_pid};
						if(node.folder == 0){
							insert_info.url = node.url;
						}
						var index = get_index(tmp_pid, node.order, local, -1);
						insert_info.index = index;
						
						//Chrome API
						chrome.bookmarks.onCreated.removeListener( createCallback );
						chrome.bookmarks.create(insert_info, function(result){
							if(chrome.bookmarks.onCreated.hasListener(createCallback) == false)
							{
								chrome.bookmarks.onCreated.addListener( createCallback );								
							}
							if(result){
								//save to local list.
								local[result.id] = {
									id:result.id, 
									pid:result.parentId, 
									sid:node.id, 
									folder:node.folder,
									title:node.title,
									url:node.url,
									order:node.order,
									state:BookmarkSyncState.SYNCED,
									dc:1
								};
								merge_node();						
							}
							else{
								BookmarkSyncCtrl.setSyncStatus(0);
								print_msg("create bookmark error, merge break!!!!!!!");
								//merge_node();
							}
						});	
					}
				}
				else{
					print_msg('[BookmarkMerge]can\' find parent, ignore! sid=' + node.id+'&pid='+node.pid);
					//continue to merge.
					merge_node();
				}
			}
		}
	}
	else
	{
		//if merge complete[move,update,create], start delete operation.
		merge_delete();		
	}
}

/*
	Get index of a node 
*/
function get_index(pid, order, local_list, id) {
	var index = 0;
	try {
		for(var idx in local_list) {
			//no delete node order, otherwise, order may out of bounds.
			if(local_list[idx].id != id && local_list[idx].pid == pid && local_list[idx].state != BookmarkSyncState.REMOVE) {
				if(local_list[idx].order <= order) {
					index += 1;
				}
			}
		}	
	}
	catch(e) {
		print_msg(e.message);
	}
	
	return index;
	//return index > 2? index - 2 : 0;
}

/*
 	Find a node according it's id.
 	Params:
 		-id: server id.
 		-server: server update objects list.
 */
function server_find_node_by_id(id, server){
	for(var idx in server){
		if(server[idx]._id == id){
			return server[idx];
		}
	}
	return null;
}
	
/*
 	Find a node according it's server id.
 	Params:
 		-sid: server id
 		-local: local bookmark object list.
 */
function local_find_node_by_sid(sid, local) {
	for(var idx in local) {
		if(local[idx].sid == sid) {
			return local[idx];
		}
	}
	return null;
}

/*
 	Find a node according several conditions.
 	Params:
 		-condit: key/value dict
 		-local: local bookmark object list.
 */
function local_find_node(condit, local) {
	for(var idx in local) {
		var match = true;
		
		for(var key in condit) {
			match = false;
			if(typeof(condit[key]) == 'string' && typeof(local[idx][key]) == 'string')
			{
				match = condit[key].replace(/\s/g, '') == local[idx][key].replace(/\s/g, '');
			}
			else
			{
				match = condit[key] == local[idx][key];
			}
			if(match == false)
			{
				print_msg("MisMatch:"+key + "," + condit[key]+","+ local[idx][key]);
				break;
			}
			//if(condit[key] != local[idx][key]) {
			//	print_msg("MisMatch:"+key + "," + condit[key]+","+ local[idx][key]);
			//	match = false;
			//	break;
		}
		
		if(match){
			return local[idx];  
		}
	}
	
	return null;
}

/*
 	Delete all objects, this function may not delete completely, but later we 
 	can visit local list once again, and delete the remain nodes.
 */
function merge_delete() {
	
	merge_buffer.node_delete = BookmarkInfo.deletes;
	var delete_objects = merge_buffer.node_delete;
	
	if(delete_objects.length > 0) {
		//according sid get local id and remove it
		var delete_sid = delete_objects.pop();
		var delete_obj = local_find_node_by_sid(delete_sid, local);
		
		if(delete_obj)
		{
			if(local[delete_obj.id].folder == 0) {
				print_msg("Bookmark Leaf Delete: [SID]=["+delete_sid+"], [CID]=["+ delete_obj.id +"]");	
				//Chrome remove leaf node API(this also can remove empty folder)
				//chrome.bookmarks.onRemoved.removeListener( removeCallback );
				chrome.bookmarks.remove(delete_obj.id, function(){
					//chrome.bookmarks.onRemoved.addListener( removeCallback );
					//call once again.
					merge_delete();
				});
			}
			else
			{
				print_msg("Bookmark Folder Delete: [SID]=["+delete_sid+"], [CID]=["+ delete_obj.id +"]");	
				//Chrome remove tree node API
				chrome.bookmarks.removeTree(delete_obj.id, function(){
					//call once again.
					merge_delete();
				});
			}
			delete local[delete_obj.id];
		}
		else{
			print_msg('delete, no such node');
			merge_delete();
		}
	}
	else {
		//more delete operation.
		delete_complete();
	}
}

/*
 	Clear remain node in local list.
 */
function delete_complete(){
	
	//clear list
	merge_buffer.node_local_shade.splice(0, merge_buffer.node_local_shade.length);
	
	//ids
	for(var idx in local){
		if(local[idx].state != BookmarkSyncState.REMOVE)
			merge_buffer.node_local_shade.push(idx);	
	}
	delete_onebyone();
}

function delete_onebyone() {
	if(merge_buffer.node_local_shade.length > 0) {
		var id = merge_buffer.node_local_shade.pop();		
		chrome.bookmarks.get(id, function(results){
			if(results == null) {
				delete local[id];
			}
			delete_onebyone();
		});	
	}
	else {
		BookmarkSyncStorage.save(local);
		//start local sync.
		pre_process_local();	
	}
}

function pre_process_server(){
	var objs = BookmarkInfo.updates;
	var server = {};
	for (var idx in objs) {
		var obj = objs[idx];
		var id = obj._id;
		server[id] = {
			id:id,
			pid:obj.pid,
			order:obj.order,
			folder:obj.folder,
			title:obj.payload.title,
			url:obj.payload.url,
			cid:obj.cid
		};
	}
	return server;
}

pre_process_local = function(){
	bookmark_sync_ctrl();
}

function bookmark_sync_ctrl(){
	local = BookmarkSyncStorage.load();
	BookmarkInfo.latest_sid = -1;
	//sync_buffer.node_stack = sort_node_local(local);
	var nodes = sort_node_local(local, BookmarkInfo.treeRoot);
	//split nodes into 2 category, which create and update.
	//clear remain nodes.
	if(sync_buffer.node_stack_create != null && sync_buffer.node_stack_create.length > 0) {
		sync_buffer.node_stack_create.splice(0,sync_buffer.node_stack_create.length);	
	}
	else if(sync_buffer.node_stack_create == null) {
		sync_buffer.node_stack_create = [];
	}
	
	if(sync_buffer.node_stack_update != null && sync_buffer.node_stack_update.length > 0)
	{
		sync_buffer.node_stack_update.splice(0,sync_buffer.node_stack_update.length);	
	}
	else if(sync_buffer.node_stack_update == null) {
		sync_buffer.node_stack_update = [];
	}
		
	for(var idx = 0; idx < nodes.length; idx++) {
		var node = nodes[idx];
		if(node.sid == null || node.state == BookmarkSyncState.CREATE) {			
			print_msg("[Upload] create:"+node.title);
			sync_buffer.node_stack_create.push(node);			
		}
		else {
			print_msg("[Upload] update:"+node.title);
			sync_buffer.node_stack_update.push(node);
		}
	}
	
	//delete node
	for(var id in local) {
		if (local[id].state == BookmarkSyncState.REMOVE) {
			if (local[id].sid != null) {
				print_msg("[Upload] delete id:"+id+" sid:"+local[id].sid);
				sync_buffer.node_stack_update.push(local[id]);
			}
		}
	}
	sync_node_create();
}

sync_node_create = function() {
	var node_stack = sync_buffer.node_stack_create;
	var datas = [];
	if(node_stack.length > 0) {
		var node = null;
		var last_node = null;
		var num = 0;
		
		while(num < 20 && node_stack.length > 0) {
			
			//get a node from create stack;
			node = node_stack.pop();
			
			//check whether in same layer, if not, break.
			
			if(datas.length > 0) {
				if(last_node.layer != node.layer) {
					node_stack.push(node);
					break;
				}
			}
			var data = {
					_id: node.sid,
					pid: (node.pid == 0) ? '' : (local[node.pid] == null ? '' : local[node.pid].sid),
					type:64, 
					cid: node.id,
					folder: node.folder,
					order: node.order, 
					deleted: 0,
					payload: {
						title: node.title,
						url: node.url
					}
			};
			num += 1;
			if(last_node == null) {
				last_node = node;
			}
			datas.push(data);
		}
		//call create api
		SYNC_create(datas);
	}
	else {
		sync_node_update();
	}
}
var test_update_id = {};
var except_ids = [];
sync_node_update = function() {
	var node_stack = sync_buffer.node_stack_update;
	var datas = [];
	if(node_stack.length > 0) {
		var node = null;
		var num = 0;
		
		while(num < 20 && node_stack.length > 0) {
			
			//get a node from create stack;
			node = node_stack.pop();
			var data = {
					_id: node.sid,
					pid: (node.pid == 0) ? '' : (local[node.pid] == null ? '' : local[node.pid].sid),
					type:64, 
					cid: node.id,
					folder: node.folder,
					order: node.order, 
					deleted: (node.state == BookmarkSyncState.REMOVE) ? 1 : 0,
					payload: {
						title: node.title,
						url: node.url
					}
			};
			num += 1;
			test_update_id[node.id] = false;
			datas.push(data);
		}
		SYNC_update(datas);
	}
	else {
		for(var id in local) {
			delete local[id].layer;
		}
		BookmarkSyncStorage.save(local);
		
		if(BookmarkInfo.latest_sid != -1){
			//save after_sid
			CommInfo.after_sid('bookmark', BookmarkInfo.latest_sid)
			// var after_sid_str = localStorage['DolphinBrowserAfterSid'];
			// var after_sid_json;
			// if(after_sid_str != null && after_sid_str != "")
			// {
			// 	after_sid_json = JSON.parse(after_sid_str);
			// }
			// else
			// {
			// 	after_sid_json={};
			// 	after_sid_json[CommInfo.user_name]={};
			// }
			
			// after_sid_json[CommInfo.user_name].bookmark = BookmarkInfo.latest_sid;
			// localStorage['DolphinBrowserAfterSid'] = JSON.stringify(after_sid_json);			
		}
		//BookmarkInfo.ongoing = 0;
		BookmarkSyncCtrl.setSyncStatus(0);
		local = null;
		//showNotification('Sync Complete','Sync complete!');
		track_event({
			category:'general',
			action:'BookmarkSync',
			label:'success',
			value:1
		});			
	}
}

function order_complete(callback){
	
	chrome.bookmarks.getTree(
		function (result){
			print_msg("init callback.");
			//print_msg(result);
			var data_json = BookmarkSyncStorage.load();
			var root_node = result[0];
			if(result){
				merge_buffer.node_order.splice(0, merge_buffer.node_order.length);
				for(var idx in root_node.children)
				{
					order_node_pre(root_node.children[idx], data_json);
				}
				BookmarkSyncStorage.save(data_json);
				if(callback != null){
					callback();				
				}
				else {
					BookmarkSyncCtrl.setSyncStatus(0);
					//BookmarkInfo.ongoing = 0;
					local = null;
				}				
			}
			else{
				print_msg("[BookmarkSync] getTree: result is null.");
				BookmarkSyncCtrl.setSyncStatus(0);
				//BookmarkInfo.ongoing = 0;
				local = null;
				track_event({
					category:'general',
					action:'BookmarkSync',
					label:'fail',
					value:1
				});					
			}
		}
	);
}

function order_node_pre(node, data_json){
	if(node.children)
	{
		var children_list = [];
		//children_list.splice(0, children_list.length);
		for(var idx in node.children)
		{
			if(data_json[node.children[idx].id])
			{
				children_list.push({id:node.children[idx].id, order:data_json[node.children[idx].id].order});				
			}
		}
		children_list.sort(function(a, b) { return a.order - b.order; });
		
		for(var idx in children_list) {
			merge_buffer.node_order.push({order: parseInt(idx), id:children_list[idx].id, pid:node.id});			
		}
		
		//free memory.
		children_list.splice(0, children_list.length);
		
		for(var idx in node.children) {
			order_node_pre(node.children[idx], data_json);
		}
	}
}

function order_node() {
	if(merge_buffer.node_order.length > 0) {
		var node = merge_buffer.node_order.pop();
		chrome.bookmarks.onMoved.removeListener(moveCallback);
		chrome.bookmarks.move(node.id, { index:node.order, parentId:node.pid }, function(result) {
			if(chrome.bookmarks.onMoved.hasListener(moveCallback) == false)
			{
				chrome.bookmarks.onMoved.addListener(moveCallback);					
			}		
			if(result)
			{
				order_node();
			}
			else
			{
				BookmarkSyncCtrl.setSyncStatus(0);
				print_msg('move error.');
			}
		});
	}
	else {
		//start local bookmark change sync to server.
		pre_process_local();
	}
}