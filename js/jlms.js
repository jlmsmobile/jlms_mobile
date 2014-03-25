var jlms = {
	uri: null,	
	fileSystem: null,
	dbCounter: 0,
	instances: [],
	courseslist: [],
	consts: {
		AUTH_PAGE: 'index.php?option=com_jlms_mobile&task=checkaccess',
		MESSAGE_POST: 'index.php?option=com_jlms_mobile&task=sendmessage',
		DROPBOX_POST: 'index.php?option=com_jlms_mobile&task=dropboxsend',
		HW_POST: 'index.php?option=com_jlms_mobile&task=changehw',		
		PATH_ACCESS: 'config/',
        FILE_NAME_USERSETUP: 'usersetup.json',
		FILE_NAME_CONFIG_TMP: 'mconfig_tmp.json',
		FILE_NAME_CONFIG: 'mconfig.json',		
		FILE_NAME_ACCESS: 'access.json',
		DIR_IMAGES: 'options',
		DIR_TMP: 'tmp'       
    },	
	warning: function( msg ) {
		$( "#warningDiv" ).text(msg);
		$( "#warningDiv" ).popup('open');
	},
	getAuthLink: function( link ) {		
		
		var access = jlms.access();					
			
		var site = access.site;
		var name = access.name;
		var pass = access.pass;
			
				
		if( site.indexOf('https://') == 0 ) 
		{
			site = site.slice(8);
			return 'https://'+name+':'+pass+'@'+site+link;		
		} else if( site.indexOf('http://') == 0 ) 
		{
			site = site.slice(7);
			return 'http://'+name+':'+pass+'@'+site+link;		
		} else {
			return 'http://'+name+':'+pass+'@'+site+link;
		}		
	},
	access: function(){		
		return jlms.instances['access'];
	},
	config: function(){		
		return jlms.instances['config'];
	},
	setup: function(){		
		return jlms.instances['setup'];
	},		
	onFileSystemSuccess: function(fileSystem) {						
		jlms.fileSystem = fileSystem;		
		jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_ACCESS, {create: false}, 
			function() {				
				jlms.login();
			},
			function() {						
				$.mobile.changePage("login-first.html");
			}
		);		
	},	
	onAfterAccessLoaded: function(){
		var access = jlms.access();				
		
		if( access === null || access === undefined || access.site == undefined ) 
		{				
			$.mobile.changePage( "login-first.html" );
			return true;
		}		
		
		$.ajax({
			url: access.site+jlms.consts.AUTH_PAGE,
			type: 'post',
			dataType: 'json', 
			data: '{}',
			beforeSend: function (xhr){ 
				xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
			},
			success: function(data) {
				$.ajax({
					url: access.site+'/index.php?option=com_jlms_mobile&task=courseslist',
					type: 'get',
					dataType: 'json',				
					beforeSend: function (xhr){ 
						xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
					},
					success: function(d) {							
							jlms.courseslist.items = d.items;							
					},		
					error: function( jqXHR, textStatus, errorThrown){						
						//alert(textStatus);
						//alert(errorThrown);
					}
				});
				jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_USERSETUP, {create: false, exclusive: true}, function(fileEntry) {
					fileEntry.file(function(file) {							
							var reader = new FileReader();				
							reader.onload = function(evt) {													
								var results = $.parseJSON(evt.target.result);					
								jlms.instances['setup'] = results;											
							};													
							reader.readAsText(file);																						
					}, jlms.failFile);					
				}, jlms.failFile);				
				jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_CONFIG_TMP, {create: true, exclusive: false}, function(fileEntryTmp) {						
						var ft = new FileTransfer();
						ft.download(encodeURI(access.site+jlms.consts.PATH_ACCESS+jlms.consts.FILE_NAME_CONFIG), fileEntryTmp.fullPath, function(){
							fileEntryTmp.file(function(fileTmp) {										
									var reader1 = new FileReader();									
									reader1.onload = function(evt) {										
										var results1 = $.parseJSON(evt.target.result);										
										jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_CONFIG, {create: true, exclusive: false}, function(fileEntry1) {																								
												fileEntry1.file(function(file) {																	
														var reader = new FileReader();								
														reader.onload = function(evt) {					
															var imgsLength = results1.options.length;
															jlms.instances['config'] = results1;																															
															
															if( evt.target.result.length > 0 ) {
																var results = $.parseJSON(evt.target.result);																					
															}															
															if( evt.target.result.length == 0 || parseFloat(results1.version) > parseFloat(results.version)) {																
																fileEntryTmp.copyTo(jlms.fileSystem.root, jlms.consts.FILE_NAME_CONFIG, function() { /*alert('file was copied');*/ }, function() { /*alert('error: file was\'t copied'); */});
																jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_USERSETUP, {create: false, exclusive: false}, function(setupFileEntry) {	setupFileEntry.remove(); } );
																jlms.fileSystem.root.getDirectory( jlms.consts.DIR_IMAGES, {create: true}, function(dirEntry) {																	
																	var dwCounter=0;																	
																	for(var i=0; i < imgsLength; i++ ) {
																		var img = results1.options[i].img;																		
																		if( img.length > 1 )
																		{																		
																			dirEntry.getFile(img.substr(img.lastIndexOf('/')+1), {create: true, exclusive: false}, function(fileEntry2){
																					var ft = new FileTransfer();
																					ft.download(encodeURI(access.site+results1.imgspath+fileEntry2.fullPath.substr(fileEntry2.fullPath.lastIndexOf('/')+1)), fileEntry2.fullPath, function(fileEntry3) {														
																						dwCounter++;																						
																						if(dwCounter == imgsLength) {																							
																							$.mobile.changePage( "dashboard.html" );
																						}		
																					}, jlms.failFileTransfer);											
																			}, jlms.failFile);	
																		}
																	}
																}, jlms.failFile );																
															} else {
																$.mobile.changePage( "dashboard.html" );
															}																	
														};				
														reader.onloaderror = function(evt) {					
															alert('read config file error');
														};												
														reader.readAsText(file);																						
												}, jlms.failFile);					
										}, jlms.failFile());
									};
									reader1.onloaderror = function(evt) {				
										alert('read config file error');
									};												
									reader1.readAsText(fileTmp);
							}, jlms.failFile);
						}, jlms.failFileTransfer);
				}, jlms.failFile);				
			},		
			error: function( jqXHR, textStatus, errorThrown){				
				$.mobile.changePage( "login-first.html" );						
			}
		});
	},
	readAccess: function(file) {		
		var reader = new FileReader();					
		reader.onload = function(evt) {
			jlms.instances['access'] = $.parseJSON(evt.target.result);					
			jlms.onAfterAccessLoaded();
		};
		reader.onloaderror = function(evt) {
			alert('read access file error');
		};				
		reader.readAsText(file);
	},	
    onDeviceReady: function() {		
		window.requestFileSystem(LocalFileSystem.TEMPORARY, 0, function(fileSystemTmp){
			jlms.fileSystemTmp = fileSystemTmp;
		});
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, jlms.onFileSystemSuccess, jlms.failFile);		
    },
	getDashboardItems: function() {
		var setup = jlms.setup();
		var config = jlms.config();
		var data = [];
				
		if( config === null || config === undefined || config.options === undefined ) 
		{
			return [];
		}	
		
		for(var i=0; i<config.options.length; i++) {			
			var el = config.options[i];			
			var img = el.img;			
			var uri = el.uri;
			var cmd = el.cmd;
			var name = el.name;
			var imgName = img.substr(img.lastIndexOf('/')+1);			
			
			if( setup !== undefined && setup.options !== undefined ){				
				var usOpt = setup.options[i];		
			}			
			
			if ( usOpt !== undefined ) 
			{			
				var value = usOpt.value;
			} else {
				var value = el.def;
			}				
			
			var row = {'img': imgName, 'value': value, 'uri': uri, 'name': name, 'cmd': cmd };			
			data.push( row );			
		}
		
		return data;
	},	
	make_base_auth: function(user, password) {
		var tok = user + ':' + password;
		var hash = btoa(tok);
		return "Basic " + hash;
	},
	login: function( site, name, pass) {			
			if( site === undefined ) 
			{					
				jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_ACCESS, {create: false, exclusive:true},					
					function(fileEntry){						
						fileEntry.file( function(file) {							
							jlms.readAccess(file);
						}, jlms.failFile);
					}, 
					function() {						
						$.mobile.changePage("login-first.html");
					}
				);				
			} else {				
				$.ajax({					
					url: site+jlms.consts.AUTH_PAGE,
					type: 'post',
					dataType: 'json', 
					data: '{}',
					beforeSend: function (xhr){ 
						xhr.setRequestHeader('Authorization', jlms.make_base_auth(name, pass)); 
					},
					success: function(data) {						
						site = site.replace(/"/g, '\\"');
						name = name.replace(/"/g, '\\"');
						pass = pass.replace(/"/g, '\\"');					
						
						var access = '{"site": "'+site+'", "name": "'+name+'", "pass": "'+pass+'" }';												
						jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_ACCESS, {create: true, exclusive: false}, function(fileEntry){							
							fileEntry.createWriter(function(writer) {																		
									writer.write( access );	
									writer.onwrite = function(){										
										fileEntry.file(jlms.readAccess, jlms.failFile);
									}
							}, jlms.failFile);
						}, jlms.failFile);					
					},		
			        error: function( jqXHR, textStatus, errorThrown){						
						alert('Username and password do not match');
						$.mobile.changePage( "login-first.html" );
			        }
			    });			
			}
	},		
	failFile: function(error) {
		var err = '';
		/*
		switch(error.code) 
		{		
			case FileError.NOT_FOUND_ERR:
					err = 'NOT_FOUND_ERR';
			break;
			case FileError.SECURITY_ERR:
				err = 'SECURITY_ERR';
			break;
			case FileError.ABORT_ERR:
				err = 'ABORT_ERR';
			break;
			case FileError.NOT_READABLE_ERR:
				err = 'NOT_READABLE_ERR';
			break;
			case FileError.ENCODING_ERR:
				err = 'ENCODING_ERR';
			break;
			case FileError.NO_MODIFICATION_ALLOWED_ERR:
				err = 'NO_MODIFICATION_ALLOWED_ERR';
			break;
			case FileError.INVALID_STATE_ERR:
				err = 'INVALID_STATE_ERR';
			break;
			case FileError.SYNTAX_ERR:
				err = 'INVALID_STATE_ERR';
			break;
			case FileError.INVALID_MODIFICATION_ERR:
				err = 'INVALID_MODIFICATION_ERR';
			break;
			case FileError.QUOTA_EXCEEDED_ERR:
				err = 'INVALID_MODIFICATION_ERR';
			break;
			case FileError.TYPE_MISMATCH_ERR:
				err = 'TYPE_MISMATCH_ERR';
			break;
			case FileError.PATH_EXISTS_ERR:
				err = 'PATH_EXISTS_ERR';
			break;
			default: 
				alert(error.code+'  '+error.target);
		}		
		alert(err);
		var err = new Error();		
		alert(err.stack);
		*/		
	},	
	failFileTransfer: function(error) {
		var err = '';
		
		switch(error.code) 
		{			
			case FileTransferError.FILE_NOT_FOUND_ERR:
				err = 'FILE_NOT_FOUND_ERR';
			break;
			case FileTransferError.INVALID_URL_ERR:
				err = 'INVALID_URL_ERR';
			break;
			case FileTransferError.CONNECTION_ERR:
				err = 'CONNECTION_ERR';
			break;
			case FileTransferError.ABORT_ERR:
				err = 'ABORT_ERR';
			break;		
			default: 
				alert(error.code+'  '+error.target);
		}
		
		alert(err+"\nsource:"+error.source+"\ntarget:"+error.target);
		/*
		var err = new Error();		
		alert(err.stack);			
		*/
	},
	checkAlert: function(str) {
		var re = /alert\([',"](.*)[',"]\)/i
		var found = str.match(re);
		return (found != null && found[1] != undefined && found[1].length > 0);
	},
	bindOpenFileEvent: function(sel){		
		$(sel).off('click').on('click', function(e){
			var href = $(this).attr('href');
			var fileName = $(this).attr('data-filename');
			
			e.stopPropagation();
			//e.preventDefault();			
			jlms.fileSystemTmp.root.getFile(fileName, {create: true, exclusive: false}, function(fileEntry) {						
				var ft = new FileTransfer();				
				ft.download(encodeURI(href), fileEntry.fullPath, function(fileEntry1){
					var localURI = fileEntry1.toURI();									
					window.open(localURI, '_blank');
				});
			});								
		});	
	},
	bindOpenExtLinkEvent: function(sel){
		var path = $.mobile.activePage[0].baseURI;							
		var currPage = path.substr(path.lastIndexOf('/')+1);		
		
		$(sel).off('click').on('click', function(e){
			var href = $(this).attr('href');
			$(document).data('iframeSrc', href);
			e.preventDefault();
			$(document).data('iframePageBackHref', currPage);
			$.mobile.changePage( "iframe.html" );			
		});	
	}
};

document.addEventListener("deviceready", jlms.onDeviceReady, false);

$(document).ready( function() {	
	$.support.cors = true;
	$.mobile.allowCrossDomainPages = true;	
	$.mobile.defaultPageTransition = "none";	
/*
	var testPageId = '#messagesPage';
	$( document ).delegate(testPageId, "pageshow", function() {		
		alert('pageshow');
	})
	$( document ).delegate(testPageId, "pageinit", function() {		
		alert('pageinit');
	})
	$( document ).delegate(testPageId, "pagecreate", function() {		
		alert('pagecreate');
	})	
	$( document ).delegate(testPageId, "pageremove", function() {		
		alert('pageremove');
	})
	$( document ).delegate(testPageId, "pagehide", function() {		
		alert('pagehide');
	})
	$( document ).delegate(testPageId, "pagechange", function() {		
		alert('pagechange');
	})
*/
	$( document ).delegate("#resourcesPage", "pageshow", function() {
		var page = $('#resourcesPage');
		page.data('history', []);
		page.attr('data-parent', 0);		
		function show() {
			$.mobile.loading("show");
			var access = jlms.access();			
			if(page.attr('requestsent') == undefined || page.attr('requestsent') == 0) {				
				page.attr('requestsent', 1);				
			} else {				
				return false;
			}			
			var limitstart = page.attr('limitstart');			
			var parent = page.attr('data-parent');
			var course = $('#res-courses-list').val();		
			
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=resources',
				type: 'get',
				dataType: 'json', 
				data: {'limitstart': limitstart, 'parent':parent, 'course': course},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {						
						var items = data.items;						
						if( !data.isLimit && items.length ) {
							if( limitstart == 0 ) {
								var content = '<ul id="res-items-list" data-role="listview">';
							} else {
								var content = '';
							}							
							$(items).each( function(i, el) {
								switch(el.type) {
									case 1: //link
										content += '<li data-icon="false"><a class="res-ext-link" href="'+el.link+'">'+el.title+'</a></li>';
									break;
									case 2: //file
										content += '<li data-icon="false"><a class="res-file-link" href="'+el.link+'" data-filename="'+el.file_name+'">'+el.title+'</a></li>';
									break;
									case 3: //dir
										content += '<li><a class="res-dir-link" data-parent="'+el.id+'" href="">'+el.title+'</a></li>';									
								}
							});							
							if( limitstart == 0 ) {
								content += '</ul>';
							}							
							if( limitstart == 0 ) {
								page.find('[data-role=content]').append(content).trigger('create');
							} else {
								page.find('#res-items-list').append(content).listview('refresh');							
							}							
							jlms.bindOpenFileEvent('.res-file-link');
							jlms.bindOpenExtLinkEvent('.res-ext-link');						
							
							limitstart = parseInt(limitstart)+parseInt(items.length);
							page.attr('limitstart', limitstart);							
						}
						page.attr('requestsent', 0);
						$('.res-dir-link').off('click').on('click', function(e){							
							page.find('#res-items-list').remove();
							//navigation								
							var history = page.data('history');
							history.push(page.attr('data-parent'));								
							page.data('history', history);
							//navigation								
							page.attr('data-parent', $(this).attr('data-parent'));
							page.attr('limitstart', 0);
							show();		
						});		
					$.mobile.loading("hide");						
				},		
				error: function( jqXHR, textStatus, errorThrown){	
					$.mobile.loading("hide");				
					//alert(textStatus);
					//alert(errorThrown);
				}
			});
		};		
		
		$('#res-back-btn').off('click').on('click', function(e){								
			page.find('#res-items-list').remove();								
			//navigation
			if(page.data('history').length != 0) {									
				e.preventDefault();
			}
			var prevPageParentId = page.data('history').pop();								
			page.attr('data-parent', prevPageParentId);
			//navigation								
			page.attr('limitstart', 0);
			/* if root folder */			
			show();								
		});
		
		var options = [];			
		$.each(jlms.courseslist.items, function(key, item)
		{				
			options.push('<option value="'+ item.id +'">'+ item.title +'</option>');
		});
		page.find('#res-courses-list').append(options.join(''));
		page.find('#res-courses-list').on('change', function(){
			page.attr('data-parent', 0);
			page.find('#res-items-list').remove();
			page.attr('limitstart', 0);
			show();
		});		
		page.bind('endofpage', function(){
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}	
		});				
		page.attr('limitstart', 0);		
		show();		
	});	

	$( document ).delegate("#dashboardPage", "pageshow", function(e, d) {		
		var access = jlms.access();
		$.mobile.loading("show");
		$.ajax({					
			url: access.site+'/index.php?option=com_jlms_mobile&task=newitems',
			type: 'get',
			dataType: 'json', 
			data: '{}',
			beforeSend: function (xhr){ 
				xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass));
			},
			success: function(newItems) {												
				var items = jlms.getDashboardItems();				
				jlms.fileSystem.root.getDirectory( jlms.consts.DIR_IMAGES, {create: false}, function(dir) {
					var html = '<ul data-role="listview">';	
					$(items).each( function(i, el) {
						if( el.value == 'on' ) 
						{			
							var access = jlms.access();					
							//var	link = jlms.getAuthLink(el.uri);				
							var	link = access.site+el.uri;				
							
							if( dir !== undefined ) 
							{
								var	src = dir.fullPath+'/'+el.img;								
							} else {
								var	src = '';								
							}												
							html += '<li><a href="'+el.cmd+'.html" ><img src="'+src+'" class="ui-li-thumb" style="top: 19%;" /><span style="top: 36%; position: absolute; left:50px">'+el.name+'</span>';
							if( newItems[el.cmd] !== undefined && newItems[el.cmd] > 0 ) {
								html += '<span class="ui-li-count">'+newItems[el.cmd]+' new</span></a></li>';
							}
						}
					});		
					html += '</ul>';						
					$.mobile.activePage.find('[data-role=content]').append(html).trigger('create');
					$.mobile.loading("hide");
				}, jlms.failFile );	
			},		
			error: function( jqXHR, textStatus, errorThrown){	
				$.mobile.loading("hide");
				//$.mobile.changePage( "login-first.html" );
			}
		});				
		
		$('.exit-btn').click(function() {
			navigator.app.exitApp();
		})
	});
	
	$( document ).delegate("#iframePage", "pageshow", function() {		
		var iframeSrc = $(document).data('iframeSrc');		
		var backHref = $(document).data('iframePageBackHref');
		$(this).find('#iframePageBack').attr('href', backHref);		
		$(this).find('#extcontent').attr('src', iframeSrc);		
		$(this).find('#extcontent').on('load', function() {			
			$.mobile.loading("hide");
		});
	});
	
	$( document ).delegate("#iframePage", "pageshow", function() {		
		$.mobile.loading("show");
	});
	
	$( document ).delegate("#setupPage", "pageshow", function() {
		var data = jlms.getDashboardItems();		
		jlms.fileSystem.root.getDirectory( jlms.consts.DIR_IMAGES, {create: false}, function(dir) {
			var html = '<form><div class="ui-grid-d">';			
			$(data).each( function(i, el) {			
				html += '<div class="ui-block-a"><img style="max-height: 40px;" src="'+dir.fullPath+'/'+el.img+'"/></div>';
				html += '<div class="ui-block-b" style="width: 45%;">'+el.name+'</div>';
				html += '<div class="ui-block-d"><select class="flips" name="flip-'+i+'" id="flip-'+i+'" data-role="slider" data-mini="true"><option '+(el.value =='off'?'selected':'')+' value="off">Off</option><option '+(el.value=='on'?'selected':'')+' value="on">On</option></select></div>';				
			});				
			html += '</div></form>';									
			
			$.mobile.activePage.find('[data-role=content]').append(html).trigger('create');
			
			$('#setupPage #save-btn').click(function(){			
				var text = '{"options":[';			
				$('#setupPage select').each( function( i, el) {
					if( i != 0 ) 
					{	
						text += ',';
					}				
					text += '{"value":"'+$(el).val()+'"}';				
				});
				text += ']}';													
				
				jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_USERSETUP, {create: true, exclusive: false}, function(fileEntry){					
					fileEntry.createWriter(function(writer) {						
							writer.write( text );
							jlms.instances['setup'] = $.parseJSON(text);							
					}, jlms.failFile);
				}, jlms.failFile);		
				$.mobile.changePage( "dashboard.html" );
			})
		}, jlms.failFile );
	});			
		
	$( document ).delegate("#loginPage", "pageshow", function() {	
		var access = jlms.access();
					
		$('#loginPage #site').val(access.site);
		$('#loginPage #name').val(access.name);
		$('#loginPage #password').val(access.pass);
		
		$('#loginPage #save-btn').click(function() {
			var site = $('#loginPage #site').val();
			var name = $('#loginPage #name').val();
			var pass = $('#loginPage #password').val();			
			
			jlms.login( site, name, pass );
		})		
	});	
	
	$( document ).delegate("#loginPage-first", "pageshow", function() {						
		$('#loginPage-first #save-btn').click(function() {			
			var site = $('#loginPage-first #site').val();
			var name = $('#loginPage-first #name').val();
			var pass = $('#loginPage-first #password').val();						
			jlms.login( site, name, pass );
		})			
		
		$('.exit-btn').click(function() {
			navigator.app.exitApp();
		})
		
		$('#loginPage-first #test-data-btn').click(function() {
			$('#loginPage-first #site').val('http://projects.joomlalms.com/mobile32/');
			$('#loginPage-first #name').val('student_1');
			$('#loginPage-first #password').val('password');		
		})		
	});	
	$(window).bind('scroll', function(){			
		var pos = $.mobile.window.scrollTop();		
		if( $(document).data('lastscrollpos') != undefined ) {
			var lastPos = $(document).data('lastscrollpos');
		} else {
			var lastPos = 0;
		}
		$(document).data('lastscrollpos', pos);	
		
		//if ($.mobile.window.scrollTop() > ($.mobile.document.height() - $.mobile.window.height() - 30)){						
		if (pos+" > "+lastPos){
			$('div[data-role="page"]').trigger('endofpage');
		}
	});
	$( document ).delegate("#announcePage", "pageshow", function() {
		var page = $('#announcePage');
		$.mobile.loading("show");
		function show() {			
			var access = jlms.access();			
			if(page.attr('requestsent') == undefined || page.attr('requestsent') == 0) {
				page.attr('requestsent', 1);				
			} else {				
				return false;
			}			
			var limitstart = page.attr('limitstart');			
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=announcements',
				type: 'get',
				dataType: 'json', 
				data: {'limitstart': limitstart},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {												
						var items = data.items;
						if( !data.isLimit && items.length ) {
							if( limitstart == 0 ) {
								var content = '<ul id="announce-items-list" data-role="listview">';
							} else {
								var content = '';
							}								
							$(items).each( function(i, el) {								
								var annId = 'ann-'+el.id+'Page';
								var pages = '';												
								pages += '<div data-role="page" id="'+annId+'">';
								pages += '	<div data-role="header"><a href="announcements.html" data-icon="back">Back</a>';
								pages += '		<h1>'+el.title+'</h1>';								
								pages += '	</div>';
								pages += '	<div data-role="content">'
								pages += '	<table>';
								pages += '	<tr><td>Start date:'+el.start_date+'<td></tr>';
								pages += '	<tr><td>End date:'+el.end_date+'<td></tr>';
								pages += '	</table>';
								pages += el.content
								pages += '	</div>';
								pages += '</div>';						
								$(pages).appendTo( document.body );		
								content += '<li><a href="#'+annId+'">'+el.title+'</a></li>';
							});							
							if( limitstart == 0 ) {
								content += '</ul>';
							}							
							if( limitstart == 0 ) {
								$.mobile.activePage.find('[data-role=content]').append(content).trigger('create');
							} else {
								$.mobile.activePage.find('#announce-items-list').append(content).listview('refresh');							
							}						
							
							limitstart = parseInt(limitstart)+parseInt(items.length);
							page.attr('limitstart', limitstart);
							page.attr('requestsent', 0);
						}
						$.mobile.loading("hide");
				},		
				error: function( jqXHR, textStatus, errorThrown){	
					$.mobile.loading("hide");
					//alert(textStatus);
					//alert(errorThrown);
				}
			});
		};			
		page.bind('endofpage', function(){			
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}			
		});		
		page.attr('limitstart', 0);	
		show();
	});
	$( document ).delegate("#certificatesPage", "pageshow", function() {
		var page = $('#certificatesPage');
		$.mobile.loading("show");
		function show() {			
			var access = jlms.access();			
			if(page.attr('requestsent') == undefined || page.attr('requestsent') == 0) {				
				page.attr('requestsent', 1);				
			} else {				
				return false;
			}			
			var limitstart = page.attr('limitstart');			
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=certificates',
				type: 'get',
				dataType: 'json', 
				data: {'limitstart': limitstart},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {												
						var items = data.items;
						if( !data.isLimit && items.length ) {
							if( limitstart == 0 ) {
								var content = '<ul id="certs-items-list" data-role="listview">';
							} else {
								var content = '';
							}						
							$(items).each( function(i, el) {								
								content += '<li><a class="certs-link" data-filename="cert'+el.type+el.id+'.png" href="'+el.link+'">'+el.title+'</a></li>';								
							});							
							if( limitstart == 0 ) {
								content += '</ul>';
							}							
							if( limitstart == 0 ) {
								$.mobile.activePage.find('[data-role=content]').append(content).trigger('create');
							} else {
								$.mobile.activePage.find('#certs-items-list').append(content).listview('refresh');							
							}						
							jlms.bindOpenFileEvent('.certs-link');							
							/*
							var path = $.mobile.activePage[0].baseURI;							
							var currPage = path.substr(path.lastIndexOf('/')+1);							
							$(document).data('iframePageBackHref', currPage);
							*/
							
							limitstart = parseInt(limitstart)+parseInt(items.length);
							page.attr('limitstart', limitstart);
							page.attr('requestsent', 0);
						}
						$.mobile.loading("hide");
				},		
				error: function( jqXHR, textStatus, errorThrown){
					$.mobile.loading("hide");
					//alert(textStatus);
					//alert(errorThrown);
				}
			});
		};		
		page.bind('endofpage', function(){			
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}			
		});		
		page.attr('limitstart', 0);
		show();
	});	
	$( document ).delegate("#coursesPage", "pageshow", function() {
		var page = $('#coursesPage');
		$.mobile.loading("show");
		function show() {			
			var access = jlms.access();			
			if(page.attr('requestsent') == undefined || page.attr('requestsent') == 0) {				
				page.attr('requestsent', 1);				
			} else {				
				return false;
			}			
			var limitstart = page.attr('limitstart');
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=courses',
				type: 'get',
				dataType: 'json', 
				data: {'limitstart': limitstart},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {												
						var items = data.items;
						if( !data.isLimit && items.length ) {
							if( limitstart == 0 ) {
								var content = '<ul id="courses-items-list" data-role="listview">';
							} else {
								var content = '';
							}						
							$(items).each( function(i, el) {								
								var status = 'Not Attempted';
								if(parseInt(el.expired)) {
									status = 'Expired';
								} else {
									if(el.passed) {
										status = 'Completed';
									} else {
										status = 'In Progress';
									}		
								}
								content += '<li><a class="courses-ext-links" href="'+el.link+'">'+el.course_name+'('+status+')</a></li>';								
							});							
							if( limitstart == 0 ) {
								content += '</ul>';
							}							
							if( limitstart == 0 ) {
								$.mobile.activePage.find('[data-role=content]').append(content).trigger('create');
							} else {
								$.mobile.activePage.find('#courses-items-list').append(content).listview('refresh');							
							}	

							jlms.bindOpenExtLinkEvent('.courses-ext-links');							
							/*
							var path = $.mobile.activePage[0].baseURI;							
							var currPage = path.substr(path.lastIndexOf('/')+1);							
							$(document).data('iframePageBackHref', currPage);
							*/
							
							limitstart = parseInt(limitstart)+parseInt(items.length);
							page.attr('limitstart', limitstart);
							page.attr('requestsent', 0);
						}
						$.mobile.loading("hide");
				},		
				error: function( jqXHR, textStatus, errorThrown){	
					$.mobile.loading("hide");
					//alert(textStatus);
					//alert(errorThrown);
				}
			});
		};		
		
		page.bind('endofpage', function(){			
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}			
		});		
		page.attr('limitstart', 0);
		show();		
	});		
	$( document ).delegate("#homeworkPage", "pageshow", function() {
		var page = $('#homeworkPage');
		$.mobile.loading("show");
		function show() {			
			var access = jlms.access();
			if(page.attr('requestsent') == undefined || page.attr('requestsent') == 0) {
				page.attr('requestsent', 1);				
			} else {				
				return false;
			}			
			var limitstart = page.attr('limitstart');			
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=homework',
				type: 'get',
				dataType: 'json', 
				data: {'limitstart': limitstart},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {											
						var items = data.items;
						if( !data.isLimit && items.length ) {
							if( limitstart == 0 ) {
								var content = '<ul id="hw-items-list" data-role="listview">';
							} else {
								var content = '';
							}						
							$(items).each( function(i, el) {
								el.type = parseInt(el.type);
								var hwId = 'hw-'+el.id+'Page';
								if(!$('#'+hwId).length) {
									var pages = '';
									pages += '<div data-role="page" id="'+hwId+'">';
									pages += '	<div data-role="header"><a href="homework.html" data-icon="back">Back</a>';
									pages += '		<h1>'+el.name+'</h1>';
									pages += '	<a href="#reply-panel-'+hwId+'" data-icon="edit" >Reply</a>';
									pages += '	</div>';
									pages += '	<div data-role="content">'+el.desc+'</div>';						
									pages += '<div data-role="panel" id="reply-panel-'+hwId+'" data-position="right" data-display="overlay" data-theme="b">';
									switch(el.type){						
										case 2:
										pages += '		<textarea cols="40" rows="8" name="text-'+hwId+'" id="text-'+hwId+'" placeholder="Description" data-theme="c"></textarea>';							
										break;
										case 3:												
										pages += '		<div><span id="file-path-'+hwId+'" ></span></div>';
										pages += '		<button type="button" id="file-btn-'+hwId+'" data-icon="grid" data-theme="a">File</button>';
										pages += '		<input type="file" value="" name="file-'+hwId+'" id="file-'+hwId+'" style="visibility: hidden; width: 1px;" data-role="none" >';
										break;
									}																		
									pages += '		<button type="submit"  elid="'+el.id+'" eltype="'+el.type+'" prefix="'+hwId+'" class="send-msg-btn" id="send-'+hwId+'" data-theme="b">Completed</button>';																		
									pages += '</div>';						
									pages += '</div>';								
									$(pages).appendTo( document.body );																			
									$('#file-'+hwId).bind('change', function() {
										var file = $('#file'+hwId).val();
										$('#file-path-'+hwId).text(file.substr(file.lastIndexOf('/')+1)); 
									});
									$('#file-btn-'+hwId).bind('click', function(e){							
										$('#file-'+hwId).trigger('click');							
									});
								}
								content += '<li><a class="hw-list-item" data-hw-id="'+el.id+'" href="#'+hwId+'">'+el.name+'</a></li>';								
							});														
							$('.send-msg-btn').off('click').on('click', function(){
								var hwId = $(this).attr('prefix');
								var elType = $(this).attr('eltype');
								var elId = $(this).attr('elid');
							
								if(elType == 3){
									//var file = $('#file'+hwId).val();
									var file = jlms.consts.DIR_IMAGES+'/messages.png';
									if( file.length ) {
										jlms.fileSystem.root.getFile(file, {create: false, exclusive: false}, function(fileEntry) {								
											var options = new FileUploadOptions();
											options.fileKey="file";
											//options.fileName=file.substr(file.lastIndexOf('/')+1);
											options.fileName=fileEntry.fullPath.substr(fileEntry.fullPath.lastIndexOf('/')+1);
											//options.mimeType="text/plain";
											options.headers = {'Authorization':jlms.make_base_auth(access.name, access.pass)}; 
											
											var params = new Object();																				
											params.id = elId;
											params.type = elType;
											params.completed = true;											
											options.params = params;
											
											$.mobile.loading("show");											
											var ft = new FileTransfer();																				
											var action = access.site+jlms.consts.HW_POST;		
											//ft.upload(file, action, function(r) {											
											ft.upload(fileEntry.fullPath, action, function(r) {													
												if(res = jlms.checkAlert(r.response)) {
													alert(res);
												} else {													
													alert('Completed');
												}
												$.mobile.loading("hide");
											}, function(error){ 
													jlms.failFileTransfer(error);
													$.mobile.loading("hide");
											}, options, true);										
										});
									}
								}else{									
									var canSend = true;
									if(elType == 2) {
										var text = $('#text-'+hwId).val();											
										canSend = (text.length > 0);
									}									
									if( canSend ) {										
										$.ajax({
											type: "POST",
											url: access.site+jlms.consts.HW_POST,
											enctype: 'multipart/form-data',
											data: {'write_text': text, 'id': elId, 'type': elType},
											beforeSend: function (xhr){ 
												xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
											},
											success: function (r) {												
												if(res = jlms.checkAlert(r)) {
													alert(res);
												} else {
													alert('Completed');
												}			
											},
											/*
											complete: function (r, status) {												
												alert(status);
												alert(r.responseText);
											}
											*/
										});
									}
								}
							});	
							if( limitstart == 0 ) {
								content += '</ul>';
							}
							if( limitstart == 0 ) {
								$.mobile.activePage.find('[data-role=content]').append(content).trigger('create');
							} else {
								$.mobile.activePage.find('#hw-items-list').append(content).listview('refresh');							
							}	
							$('.hw-list-item').off('click').on('click', function(){
								var hwId = $(this).attr('data-hw-id');								
								$.ajax({url: access.site+'/index.php?option=com_jlms_mobile&task=markviewedhw',
									type: 'get',
									data: {'id':hwId},
									beforeSend: function (xhr){ 
										xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass));
									},
									success: function() {},		
									error: function( jqXHR, textStatus, errorThrown){}
								})								
							});
							limitstart = parseInt(limitstart)+parseInt(items.length);
							page.attr('limitstart', limitstart);
							page.attr('requestsent', 0);
						}
						$.mobile.loading("hide");
				},		
				error: function( jqXHR, textStatus, errorThrown){
					$.mobile.loading("hide");
					//alert(textStatus);
					//alert(errorThrown);
				}
			});
		};		
	
		page.bind('endofpage', function(){			
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}			
		});		
		page.attr('limitstart', 0);		
		show();
	});	
	/*
	$( document ).delegate("#dashboardPage", "pageshow", function(e, data) {
		var str = '';
		for(var i in data['prevPage']){
			str += i+"\n";
		}		
		data['prevPage'].empty();
	})
	*/
	$( document ).delegate("#messagesPage", "pageshow", function() {
		var page = $('#messagesPage');
		var pageId = 'messagesPage';
		var limitStartSel = pageId+'-limitstart';
		var requestSentSel = 'requestsent';			
		$.mobile.loading("show");
		function show() {			
			var access = jlms.access();			
			var config = jlms.config();
			
			if($(document).data(requestSentSel) == undefined || $(document).data(requestSentSel) == 0) {
				$(document).data(requestSentSel, 1);
			} else {				
				return false;
			}			
			var limitstart = $(document).data(limitStartSel);			
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=messages',
				type: 'get',
				dataType: 'json', 
				data: {'limitstart': limitstart},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {					
					var items = data.items;
					if( !data.isLimit && items.length ) {
						if( limitstart == 0 ) {							
							var content = '<ul id="msg-items-list" data-role="listview">';
						} else {
							var content = '';
						}
						var newEls = false;						
						$(items).each( function(i, el) {					
							var messId = 'message-'+el.type+'-'+el.id+'Page';							
							if(!$('#'+messId).length) {
								var pages = '';
								pages += '<div class="subPages" data-role="page" id="'+messId+'">';
								pages += '	<div data-role="header"><a href="messages.html" data-icon="back">Back</a>';
								pages += '		<h1>'+el.subject+'</h1>';
								pages += '	<a href="#reply-panel-'+messId+'" data-icon="edit" >Reply</a>';
								pages += '	</div>';														
								pages += '	<div data-role="content">';
								if( el.filelink.length ) {
									pages += '	<p align="left"><a class="attached-file" data-filename="'+el.filename+'" href="'+el.filelink+'">'+el.filename+'</a></p>';
								}
								pages += el.message+'</div>';
								pages += '<div data-role="panel" id="reply-panel-'+messId+'" data-position="right" data-display="overlay" data-theme="b">';							
								if(el.type == 'mb') {//for mailbox only
									pages += '		<input id="subject-'+messId+'" type="text" value="Re: '+el.subject+'" data-theme="c" placeholder="Subject"/>';						
									pages += '		<textarea cols="40" rows="8" id="text-'+messId+'" placeholder="Text" data-theme="c"></textarea>';
								} else {
									pages += '		<input id="name-'+messId+'" type="text" value="Re: '+el.subject+'" data-theme="c" placeholder="Name"/>';						
									pages += '		<textarea cols="40" rows="8" id="comment-'+messId+'" placeholder="Comment" data-theme="c"></textarea>';
								}
								pages += '		<div><span id="file-path-'+messId+'" ></span></div>';						
								pages += '		<button type="button" id="file-btn-'+messId+'" data-icon="grid" data-theme="a">File</button>';						
								pages += '		<button type="button" elid="'+el.id+'" eltype="'+el.type+'" prefix="'+messId+'" class="send-msg-btn" data-theme="b">Send</button>';						
								pages += '		<input type="file" value="" id="file-'+messId+'" style="visibility: hidden; width: 1px;" data-role="none" >';
								pages += '</div>';							
								pages += '	<div data-role="footer" data-position="fixed"></div>';							
								pages += '</div>';								
								$(pages).appendTo( document.body );											
								$('#file-'+messId).bind('change', function() { 
									var file = $('#file'+messId).val();
									$('#file-path-'+messId).text(file.substr(file.lastIndexOf('/')+1)); 
								});
								$('#file-btn-'+messId).bind('click', function(e){							
									$('#file-'+messId).trigger('click');							
								});
							}
							content += '<li><a class="message-list-item" data-message-id="'+el.id+'" href="#'+messId+'">'+el.subject+'</a></li>';											
						});		
						

						$('.send-msg-btn').off('click').on('click', function(){						
							var messId = $(this).attr('prefix');
							var elType = $(this).attr('eltype');
							var elId = $(this).attr('elid');							
							var canSend = false;
							if(elType == 'mb') {
								var text = $('#text-'+messId).val();														
								var subject = $('#subject-'+messId).val();								
								canSend = (text.length > 0);
							} else {
								var name = $('#name-'+messId).val();														
								var comment = $('#comment-'+messId).val();								
								canSend = true;
							}							
							//var file = $('#file'+messId).val();
							var file = jlms.consts.DIR_IMAGES+'/messages.png';								
							if(canSend) {							
								if( file.length ) {								
									jlms.fileSystem.root.getFile(file, {create: false, exclusive: false}, function(fileEntry) {									
										var options = new FileUploadOptions();
										options.fileKey="file";
										//options.fileName=file.substr(file.lastIndexOf('/')+1);
										options.fileName=fileEntry.fullPath.substr(fileEntry.fullPath.lastIndexOf('/')+1);
										//options.mimeType="text/plain";
										options.headers = {'Authorization':jlms.make_base_auth(access.name, access.pass)}; 
										
										var params = new Object();																				
										params.id = elId;
										params.type = elType;										
										if(elType == 'mb') {										
											var action = access.site+jlms.consts.MESSAGE_POST;
											params.message = text;
											params.subject = subject;											
										} else {
											var action = access.site+jlms.consts.DROPBOX_POST;
											params.comment = comment;
											params.name = name;											
										}										
										options.params = params;
										
										$.mobile.loading("show");
										
										var ft = new FileTransfer();																				
										//ft.upload(file, action, function(r) {											
										ft.upload(fileEntry.fullPath, action, function(r) {											
											if(res = jlms.checkAlert(r.response)) {
												alert(res);
											} else {
												switch(elType) {
													case 'db':
														alert('File was sent');
													break
													case 'mb':
														alert('Message was sent');
													break	
												}
											}
											$.mobile.loading("hide");
										}, function(error){ 
												jlms.failFileTransfer(error);
												$.mobile.loading("hide");
										}, options, true);										
									});																	
								} else {	
									if(elType == 'mb') {
										$.ajax({
											type: "POST",
											url: access.site+jlms.consts.MESSAGE_POST,
											enctype: 'multipart/form-data',
											data: {'message': text, 'id': elId, 'type': elType},
											beforeSend: function (xhr){ 
												xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
											},
											success: function (r) {
												if(res = jlms.checkAlert(r)) {
														alert(res);
												} else {
													switch(elType) {
														case 'db':
															alert('File was sent');
														break
														case 'mb':
															alert('Message was sent');
														break	
													}
												}			
											}										
										});
									}
								}								
							}
						});

						if( limitstart == 0 ) {
							content += '</ul>';
						}
						if( limitstart == 0 ) {
							$.mobile.activePage.find('[data-role=content]').append(content).trigger('create');
						} else {
							$.mobile.activePage.find('#msg-items-list').append(content).listview('refresh');							
						}
						$('.message-list-item').off('click').on('click', function(){
							var messId = $(this).attr('data-message-id');							
							$.ajax({url: access.site+'/index.php?option=com_jlms_mobile&task=markviewedmessage',
								type: 'get',
								data: {'id':messId},
								beforeSend: function (xhr){ 
									xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass));
								},
								success: function() {},		
								error: function( jqXHR, textStatus, errorThrown){}
							})								
						});						
						
						jlms.bindOpenFileEvent('.attached-file');						
						/*
						$('.message-file').on('click', function(){
							var src = $(this).attr('href');							
							window.open(src, '_system');
							event.stopPropagation();
						});
						*/
						limitstart = parseInt(limitstart)+parseInt(items.length);
						$(document).data(limitStartSel, limitstart)						
						$(document).data(requestSentSel, 0);						
					}
					$.mobile.loading("hide");
						/*$(pages).appendTo( document.body );*/					
				},		
				error: function( jqXHR, textStatus, errorThrown){	
					$.mobile.loading("hide");
					//alert(textStatus);
					//alert(errorThrown);
				}				
			});
		}
			
		page.bind('endofpage', function(){			
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}			
		});		
		
		$(document).data(limitStartSel, 0);
		show();
	});
})		