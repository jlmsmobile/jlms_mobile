var jlms = {
	uri: null,	
	fileSystem: null,
	dbCounter: 0,
	instances: [],
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
		DIR_IMAGES: 'options'       
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
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, jlms.onFileSystemSuccess, jlms.failFile);		
    },
	getData: function() {
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
	}
};

document.addEventListener("deviceready", jlms.onDeviceReady, false);

$(document).ready( function() {	
	$.support.cors = true;
	$.mobile.allowCrossDomainPages = true;												
	$( document ).delegate("#dashboardPage", "pageinit", function() {		
		var data = jlms.getData();
		jlms.fileSystem.root.getDirectory( jlms.consts.DIR_IMAGES, {create: false}, function(dir) {
			var html = '<ul data-role="listview">';	
			$(data).each( function(i, el) {		
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
					var rand = Math.floor(Math.random() * (7)) + 3;					
					html += '<li><a href="'+el.cmd+'.html" ><img src="'+src+'" class="ui-li-thumb" style="top: 19%;" /><span style="top: 36%; position: absolute; left:50px">'+el.name+'</span><span class="ui-li-count">'+rand+' new</span></a></li>';															
				}
			});		
			html += '</ul>';			
			$('#dashboardPage #content').append(html).trigger('create');			
		}, jlms.failFile );
		
		$('.exit-btn').click(function() {
			navigator.app.exitApp();
		})
	});
	
	$( document ).delegate("#iframePage", "pageinit", function() {			
		var iframeSrc = $(document).data('iframeSrc');		
		var backHref = $(document).data('iframePageBackHref');
		
		$('#iframePageBack').attr('href', '#'+backHref);		
		$('#iframePage #if').attr('src', iframeSrc);				
	});
	
	$( document ).delegate("#setupPage", "pageinit", function() {
		var data = jlms.getData();		
		jlms.fileSystem.root.getDirectory( jlms.consts.DIR_IMAGES, {create: false}, function(dir) {
			var html = '<form><div class="ui-grid-d">';			
			$(data).each( function(i, el) {			
				html += '<div class="ui-block-a"><img style="max-height: 40px;" src="'+dir.fullPath+'/'+el.img+'"/></div>';
				html += '<div class="ui-block-b" style="width: 45%;">'+el.name+'</div>';
				html += '<div class="ui-block-d"><select class="flips" name="flip-'+i+'" id="flip-'+i+'" data-role="slider" data-mini="true"><option '+(el.value =='off'?'selected':'')+' value="off">Off</option><option '+(el.value=='on'?'selected':'')+' value="on">On</option></select></div>';				
			});				
			html += '</div></form>';						
			$('#setupPage #content').append(html).trigger( "create" );					
						
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
		
	$( document ).delegate("#loginPage", "pageinit", function() {	
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
	
	$( document ).delegate("#loginPage-first", "pageinit", function() {						
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
	$( document ).delegate("#announcePage", "pageinit", function() {
		function show() {
			var access = jlms.access();
			var page = $('#announcePage');			
			if(page.attr('requestsent') == undefined || page.attr('requestsent') == 0) {
				page.attr('requestsent', 1);				
			} else {				
				return false;
			}			
			var limitstart = page.attr('limitstart');			
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=announcements',
				type: 'get',
				dataType: 'html', 
				data: {'limitstart': limitstart},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {						
						var data = $.parseJSON(data);
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
								pages += '	<div>Start date:'+el.start_date+'</div>';
								pages += '	<div>End date:'+el.end_date+'</div>';
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
								$('#announcePage #content').append(content).trigger('create');										
							} else {
								$('#announce-items-list').append(content).listview('refresh');							
							}							
							
							limitstart = parseInt(limitstart)+parseInt(items.length);
							page.attr('limitstart', limitstart);
							page.attr('requestsent', 0);
						}
				},		
				error: function( jqXHR, textStatus, errorThrown){						
					//alert(textStatus);
					//alert(errorThrown);
				}
			});
		};		
	
		var page = $(this);		
		page.bind('endofpage', function(){			
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}			
		});		
		page.attr('limitstart', 0);		
		show();
	});
	$( document ).delegate("#coursesPage", "pageinit", function() {
		function show() {
			var access = jlms.access();
			var page = $('#coursesPage');			
			if(page.attr('requestsent') == undefined || page.attr('requestsent') == 0) {
				page.attr('requestsent', 1);				
			} else {				
				return false;
			}			
			var limitstart = page.attr('limitstart');			
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=courses',
				type: 'get',
				dataType: 'html', 
				data: {'limitstart': limitstart},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {						
						var data = $.parseJSON(data);
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
								content += '<li><a class="courses-links" extlink="'+el.link+'" href="#">'+el.course_name+'('+status+')</a></li>';								
							});							
							if( limitstart == 0 ) {
								content += '</ul>';
							}							
							if( limitstart == 0 ) {
								$('#coursesPage #content').append(content).trigger('create');										
							} else {
								$('#courses-items-list').append(content).listview('refresh');							
							}							
							
							var path = $.mobile.activePage[0].baseURI;							
							var currPage = path.substr(path.lastIndexOf('/')+1);							
							$(document).data('iframePageBackHref', currPage);							
							
							limitstart = parseInt(limitstart)+parseInt(items.length);
							page.attr('limitstart', limitstart);
							page.attr('requestsent', 0);
						}
				},		
				error: function( jqXHR, textStatus, errorThrown){						
					//alert(textStatus);
					//alert(errorThrown);
				}
			});
		};		
	
		var page = $(this);		
		page.bind('endofpage', function(){			
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}			
		});		
		page.attr('limitstart', 0);		
		show();
	});		
	$( document ).delegate("#homeworkPage", "pageinit", function() {
		function show() {
			var access = jlms.access();
			var page = $('#homeworkPage');			
			if(page.attr('requestsent') == undefined || page.attr('requestsent') == 0) {
				page.attr('requestsent', 1);				
			} else {				
				return false;
			}			
			var limitstart = page.attr('limitstart');			
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=homework',
				type: 'get',
				dataType: 'html', 
				data: {'limitstart': limitstart},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {					
						var data = $.parseJSON(data);
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
								pages += '		<button type="submit" id="send-'+hwId+'" data-theme="b" style="margin-top: 2px;">Completed</button>';																		
								pages += '</div>';						
								pages += '</div>';						
								content += '<li><a href="#'+hwId+'">'+el.name+'</a></li>';
								$(pages).appendTo( document.body );											
								$('#file-'+hwId).bind('change', function() {
									var file = $('#file'+hwId).val();
									$('#file-path-'+hwId).text(file.substr(file.lastIndexOf('/')+1)); 
								});
								$('#file-btn-'+hwId).bind('click', function(e){							
									$('#file-'+hwId).trigger('click');							
								});						
								
								$('#send-'+hwId).bind('click', function(){
									if(el.type == 3){
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
												params.id = el.id;
												params.type = el.type;
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
										if(el.type == 2) {
											var text = $('#text-'+messId).val();											
											canSend = (text.length > 0);
										}
										if( canSend ) {
											$.ajax({
												type: "POST",
												url: access.site+jlms.consts.HW_POST,
												enctype: 'multipart/form-data',
												data: {'write_text': text, 'id': el.id, 'type': el.type},
												success: function (r) {													
													if(res = jlms.checkAlert(r)) {
														alert(res);
													} else {
														alert('Completed');
													}			
												}										
											});
										}
									}
								});						
							});
							if( limitstart == 0 ) {
								content += '</ul>';
							}
							if( limitstart == 0 ) {
								$('#homeworkPage #content').append(content).trigger('create');										
							} else {
								$('#hw-items-list').append(content).listview('refresh');							
							}						
							limitstart = parseInt(limitstart)+parseInt(items.length);
							page.attr('limitstart', limitstart);
							page.attr('requestsent', 0);
						}
				},		
				error: function( jqXHR, textStatus, errorThrown){						
					//alert(textStatus);
					//alert(errorThrown);
				}
			});
		};		
	
		var page = $(this);		
		page.bind('endofpage', function(){			
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}			
		});		
		page.attr('limitstart', 0);		
		show();
	});	
	$( document ).delegate("#messagesPage", "pageinit", function() {
		function show() {			
			var access = jlms.access();			
			var page = $('#messagesPage');			
			if(page.attr('requestsent') == undefined || page.attr('requestsent') == 0) {
				page.attr('requestsent', 1);				
			} else {				
				return false;
			}			
			var limitstart = page.attr('limitstart');		
			$.ajax({
				url: access.site+'/index.php?option=com_jlms_mobile&task=messages',
				type: 'get',
				dataType: 'html', 
				data: {'limitstart': limitstart},
				beforeSend: function (xhr){ 
					xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
				},
				success: function(data) {					
					var data = $.parseJSON(data);
					var items = data.items;
					if( !data.isLimit && items.length ) {
						if( limitstart == 0 ) {
							var content = '<ul id="msg-items-list" data-role="listview">';
						} else {
							var content = '';
						}
						$(items).each( function(i, el) {							
							var messId = 'message-'+el.type+'-'+el.id+'Page';
							var pages = '';												
							pages += '<div data-role="page" id="'+messId+'">';
							pages += '	<div data-role="header"><a href="messages.html" data-icon="back">Back</a>';
							pages += '		<h1>'+el.subject+'</h1>';
							pages += '	<a href="#reply-panel-'+messId+'" data-icon="edit" >Reply</a>';
							pages += '	</div>';														
							pages += '	<div data-role="content">';
							if( el.filelink.length ) {
								pages += '	<p align="left"><a class="message-file" href="'+el.filelink+'">'+el.filename+'('+el.filelink+')'+'</a></p>';
							}
							pages += el.message+'</div>';
							pages += '<div data-role="panel" id="reply-panel-'+messId+'" data-position="right" data-display="overlay" data-theme="b">';							
							if(el.type == 'mb') {//for mailbox only
								pages += '		<input id="subject-'+messId+'" name="subject-'+messId+'" type="text" value="Re: '+el.subject+'" data-theme="c" placeholder="Subject"/>';						
								pages += '		<textarea cols="40" rows="8" name="text-'+messId+'" id="text-'+messId+'" placeholder="Text" data-theme="c"></textarea>';
							} else {
								pages += '		<input id="name-'+messId+'" name="name-'+messId+'" type="text" value="Re: '+el.subject+'" data-theme="c" placeholder="Name"/>';						
								pages += '		<textarea cols="40" rows="8" name="comment-'+messId+'" id="comment-'+messId+'" placeholder="Comment" data-theme="c"></textarea>';
							}
							pages += '		<div><span id="file-path-'+messId+'" ></span></div>';						
							pages += '		<button type="button" id="file-btn-'+messId+'" data-icon="grid" data-theme="a">File</button>';						
							pages += '		<button type="submit" id="send-'+messId+'" data-theme="b" style="margin-top: 2px;">Send</button>';						
							pages += '		<input type="file" value="" name="file-'+messId+'" id="file-'+messId+'" style="visibility: hidden; width: 1px;" data-role="none" >';
							pages += '</div>';							
							pages += '	<div data-role="footer" data-position="fixed"></div>';							
							pages += '</div>';						
							content += '<li><a href="#'+messId+'">'+el.subject+'</a></li>';						
							$(pages).appendTo( document.body );											
							$('#file-'+messId).bind('change', function() { 
								var file = $('#file'+messId).val();
								$('#file-path-'+messId).text(file.substr(file.lastIndexOf('/')+1)); 
							});
							$('#file-btn-'+messId).bind('click', function(e){							
								$('#file-'+messId).trigger('click');							
							});						
							
							$('#send-'+messId).bind('click', function(){
								var canSend = false;
								if(el.type == 'mb') {
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
								if($send) {			
									if( file.length ) {									
										jlms.fileSystem.root.getFile(file, {create: false, exclusive: false}, function(fileEntry) {								
											var options = new FileUploadOptions();
											options.fileKey="file";
											//options.fileName=file.substr(file.lastIndexOf('/')+1);
											options.fileName=fileEntry.fullPath.substr(fileEntry.fullPath.lastIndexOf('/')+1);
											//options.mimeType="text/plain";
											options.headers = {'Authorization':jlms.make_base_auth(access.name, access.pass)}; 
											
											var params = new Object();																				
											params.id = el.id;
											params.type = el.type;										
											if(el.type == 'mb') {										
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
													switch(el.type) {
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
										if(el.type == 'mb') {
											$.ajax({
												type: "POST",
												url: access.site+jlms.consts.MESSAGE_POST,
												enctype: 'multipart/form-data',
												data: {'message': text, 'id': el.id, 'type': el.type},
												success: function (r) {
													if(res = jlms.checkAlert(r)) {
															alert(res);
													} else {
														switch(el.type) {
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
						});							

						if( limitstart == 0 ) {
							content += '</ul>';
						}
						if( limitstart == 0 ) {
							$('#messagesPage #content').append(content).trigger('create');
						} else {
							$('#msg-items-list').append(content).listview('refresh');							
						}
						/*
						$('.message-file').on('click', function(){
							var src = $(this).attr('href');							
							window.open(src, '_system');
							event.stopPropagation();
						});
						*/
						limitstart = parseInt(limitstart)+parseInt(items.length);
						page.attr('limitstart', limitstart);
						page.attr('requestsent', 0);
					}
						/*$(pages).appendTo( document.body );*/					
				},		
				error: function( jqXHR, textStatus, errorThrown){						
					//alert(textStatus);
					//alert(errorThrown);
				}				
			});
		}
			
		var page = $(this);		
		page.bind('endofpage', function(){			
			if(page.attr('id') == $.mobile.activePage.attr('id')) {				
				show();
			}			
		});		
		page.attr('limitstart', 0);		
		show();
	});	
	
	$( document ).delegate("#fileBrowserPage", "pageinit", function() {	
		
	/*
		<ul data-role="listview">
			<li>Acura</li>
			<li>Audi</li>
			<li>BMW</li>
			<li>Cadillac</li>
			<li>Ferrari</li>
		</ul>
		*/
		//$.mobile.showPageLoadingMsg(); // show loading message		 				
		/*
		directoryEntry.getParent(function(par){ // success get parent
			parentDir = par; // set parent directory
			if( (parentDir.name == 'sdcard' && currentDir.name != 'sdcard') || parentDir.name != 'sdcard' ) $('#backBtn').show();
		}, function(error){ // error get parent
			console.log('Get parent error: '+error.code);
		});
		*/
		 
		var directoryReader = jlms.fileSystem.root.createReader();		
		directoryReader.readEntries(function(entries){			
			var dirArr = new Array();
			var fileArr = new Array();			
			for(var i=0; i<entries.length; ++i){ // sort entries				
				var entry = entries[i];				
				if( entry.isDirectory && entry.name[0] != '.' ) dirArr.push(entry);
				else if( entry.isFile && entry.name[0] != '.' ) fileArr.push(entry);
			}			
			 
			var sortedArr = dirArr.concat(fileArr); // sorted entries
			var uiBlock = ['a','b','c','d'];			    
			
			var html = ' <ul data-role="listview">';			
			for(var i=0; i < entries.length; ++i){ // show directories
				var entry = sortedArr[i];
				//var blockLetter = uiBlock[i%4];
				//console.log(entry.name);
				
				if( entry.isDirectory )
					html += '<li><a href="#">'+entry.name+'</a></li>';
				else if( entry.isFile )
					html += '<li>'+entry.name+'</li>';				
			}			
			html += '</ul>';									
			$('#fileBrowserPage #content').append(html).trigger('create');			
			//$.mobile.hidePageLoadingMsg(); // hide loading message
		}, function(error){
			console.log('listDir readEntries error: '+error.code);
		});	
	});
})		