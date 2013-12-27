var jlms = {
	uri: null,	
	fileSystem: null,
	dbCounter: 0,
	instances: [],
	consts: {
		AUTH_PAGE: 'index.php?option=com_jlms_mobile&task=checkaccess', //empty json file		
		PATH_ACCESS: 'config/',
        FILE_NAME_USERSETUP: 'usersetup.json',
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
			jlms.failFile
		);		
	},	
	onAfterLoadAccess: function(){
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
				jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_CONFIG, {create: true, exclusive: false}, function(fileEntry) {						
						var ft = new FileTransfer();
						ft.download(encodeURI(access.site+jlms.consts.PATH_ACCESS+jlms.consts.FILE_NAME_CONFIG), fileEntry.fullPath, function(){								
								jlms.fileSystem.root.getFile(jlms.consts.FILE_NAME_CONFIG, {create: false, exclusive: true}, function(fileEntry1) {
										fileEntry1.file(function(file) {
												var reader = new FileReader();				
												reader.onload = function(evt) {													
													var results = $.parseJSON(evt.target.result);					
													jlms.instances['config'] = results;
													var imgsLength = results.options.length;													
													if( results !== null && results !== undefined && results.options !== undefined  ) {																								
																jlms.fileSystem.root.getDirectory( jlms.consts.DIR_IMAGES, {create: true}, function(dirEntry) {
																	var dwCounter=0;																	
																	for(var i=0; i < imgsLength; i++ ) {
																		var img = results.options[i].img;																		
																		if( img.length > 1 )
																		{																		
																			dirEntry.getFile(img.substr(img.lastIndexOf('/')+1), {create: true, exclusive: false}, function(fileEntry2){
																					var ft = new FileTransfer();
																					ft.download(encodeURI(access.site+results.imgspath+fileEntry2.fullPath.substr(fileEntry2.fullPath.lastIndexOf('/')+1)), fileEntry2.fullPath, function(fileEntry3) {														
																						dwCounter++;																						
																						if(dwCounter == imgsLength) {																							
																							$.mobile.changePage( "dashboard.html" );
																						}		
																					}, jlms.failFileTransfer);											
																			}, jlms.failFile);	
																		}
																	}
																}, jlms.failFile );												
													}												
												};				
												reader.onloaderror = function(evt) {					
													alert('read config file error');
												};												
												reader.readAsText(file);																						
										}, jlms.failFile);					
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
			jlms.onAfterLoadAccess();
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
			var name = el.name;
			var imgName = img.substr(img.lastIndexOf('/')+1);			
			
			if( setup !== undefined && setup.options !== undefined ){				
				var usOpt = setup.options[i];		
			}			
			
			if ( usOpt !== undefined ) 
			{			
				value = usOpt.value;
			} else {
				value = el.default;
			}				
			
			var row = {'img': imgName, 'value': value, 'uri': uri, 'name': name };			
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
						alert('Username and password do not match2');
						$.mobile.changePage( "login-first.html" );
			        }
			    });			
			}
	},		
	failFile: function(error) {
		var err = '';
		
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
		
		alert(err);
		var err = new Error();		
		alert(err.stack);
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
					html += '<li><a class="external-links" href="iframe.html" data-href="'+link+'" ><img src="'+src+'" class="ui-li-thumb">'+el.name+'</a></li>';															
				}
			});		
			html += '</ul>';
			
			$('#dashboardPage #content').append(html).trigger('create');
			$('#dashboardPage .external-links').click(function(){				
				$('#dashboardPage').attr('data-ext-href', $(this).attr('data-href'));		
			})
		}, jlms.failFile );
		
		$('.exit-btn').click(function() {
			navigator.app.exitApp();
		})
	});
	
	$( document ).delegate("#iframePage", "pageinit", function() {			
		//$('#iframePage iframe').attr('src',$('#dashboardPage').attr('data-ext-href'));
		var access = jlms.access();					
		$.ajax({
					url: $('#dashboardPage').attr('data-ext-href'),
					type: 'post',
					dataType: 'html', 
					data: '{}',
					beforeSend: function (xhr){ 
						xhr.setRequestHeader('Authorization', jlms.make_base_auth(access.name, access.pass)); 
					},
					success: function(data) {													
						$('#iframePage #content').html(data);
					},		
			        error: function( jqXHR, textStatus, errorThrown){						
						//alert(textStatus);
						//alert(errorThrown);
			        }
			    });			
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
			$('#loginPage-first #site').val('http://projects.joomlalms.com/mobile/');
			$('#loginPage-first #name').val('student_1');
			$('#loginPage-first #password').val('password');		
		})		
	});
})		