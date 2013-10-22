var jlms = {
	uri: null,	
	fileSystem: null,
	consts: {
		AUTH_PAGE: 'index.php?option=com_jlms_mobile&task=checkaccess', //empty json file		
		PATH_ACCESS: '/config/',
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
	jsonEntry: function( fileName ) 
	{
		jlms.file = false;
		jlms.fileSystem.root.getFile( fileName, {create: false, exclusive: true}, jlms.onFileGetSuccess, jlms.failFile);	
		
		if( jlms.file === false ) 
		{
				return false;
		}								
		
		jlms.readAsText();			
		
		/*
		if( fileName == lms.consts.FILE_NAME_USERSETUP ) 
		{
			alert(jlms.file.text);
		}
		*/
		
		if( jlms.file.text === undefined  )
		{
			return false;
		}
	
		return $.parseJSON(jlms.file.text);			
	},
	access: function( update ){						
		if( jlms.instances === undefined || jlms.instances['access'] === undefined || jlms.instances['access'] === false || update === true  ) 
		{				
			jlms.instances = {'access': jlms.jsonEntry( jlms.consts.FILE_NAME_ACCESS ) };							
		}		
		
		return jlms.instances['access'];
	},
	config: function( update ){
		if( jlms.instances === undefined || jlms.instances['config'] === undefined || jlms.instances['config'] === false || update === true  ) 
		{			
			jlms.instances = {'config': jlms.jsonEntry( jlms.consts.FILE_NAME_CONFIG ) };			
		}
		
		return jlms.instances['config'];
	},
	setup: function( update ){		
		if( jlms.instances === undefined || jlms.instances['setup'] === undefined || jlms.instances['setup'] === false || update === true  ) 
		{				
			jlms.instances = {'setup': jlms.jsonEntry( jlms.consts.FILE_NAME_USERSETUP ) };																
		}
		
		return jlms.instances['setup'];
	},	
	downloadFile: function(sourceUri, destDir) {			
		jlms.uri = sourceUri;	
						
		if( jlms.fileSystem !== null ) 
		{					
			if( destDir !== undefined ) 
			{
				jlms.fileSystem.root.getDirectory( destDir, {create: true}, jlms.onDirectoryGetSuccess, jlms.failFile );				
				
				var ft = new FileTransfer();																
				ft.download(encodeURI(jlms.uri), jlms.file.fullPath, jlms.onDownloadSuccess, jlms.failFileTransfer);											
			} else {				
				
				var fileName	= jlms.uri.substr(jlms.uri.lastIndexOf('/')+1);				
				
				if( fileName.length > 1 ) 
				{			
					jlms.fileSystem.root.getFile(fileName, {create: true, exclusive: false}, jlms.onFileGetSuccess, jlms.failFile);
					var ft = new FileTransfer();
					alert(jlms.uri);
					ft.download(encodeURI(jlms.uri), jlms.file.fullPath, jlms.onDownloadSuccess, jlms.failFileTransfer);						
				}				
			}	
		}		
	},
	getDir: function( dirName ) {		
		jlms.fileSystem.root.getDirectory( dirName, {create: false}, jlms.onDirectoryGetSuccess, jlms.failFile );
		return jlms.dir;
	},	
	onFileSystemSuccess: function(fileSystem) {		
		jlms.fileSystem = fileSystem;			
		jlms.onReady();
	},	
	onFileGetSuccess: function(fileEntry) {		
		jlms.fileEntry = fileEntry;		
		//jlms.fileEntry.remove();
		fileEntry.file( jlms.gotFile, jlms.failFile);
	},	
	gotFile: function(file)	{				
		jlms.file = file;				
	},
	onReady: function() {},
	readAsText: function() {				
		var reader = new FileReader();

		reader.onload = function(evt) {				
			jlms.file.text = evt.target.result;												
		};		
		reader.readAsText(jlms.file);
	},
	onDirectoryGetSuccess: function( dataDir ) {
		jlms.dir = dataDir;		
		if( jlms.uri !== null ) {
			var fileName	= jlms.uri.substr(jlms.uri.lastIndexOf('/')+1);							
			
			if( fileName.length > 1 ) 
			{		
				dataDir.getFile(fileName, {create: true, exclusive: false}, jlms.onFileGetSuccess, jlms.failFile);										
			}
		}
	},
	onDownloadSuccess: function(fileEntry) {	
		//alert("download complete2: " + fileEntry.fullPath);			
		fileEntry.file( jlms.gotFile, jlms.failFile);		
	},
    onDeviceReady: function() {   				
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 1024*20, jlms.onFileSystemSuccess, jlms.failFile);		
    },
	getData: function() {			
		var setup = jlms.setup();			
		var config = jlms.config();				
		var data = [];
		
		if( config === false || config.options == undefined ) 
		{
			return [];
		}		
		
		$(config.options).each( function( i, el ) {								
			var img = el.img;
			var uri = el.uri;
			var name = el.name;
			var imgName = img.substr(img.lastIndexOf('/')+1);			
			if( setup.options !== undefined ){				
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
		});
		
		return data;
	},
	writeToFile: function( fileName, text ) {		
		jlms.fileSystem.root.getFile( fileName, {create: true, exclusive: false}, jlms.onFileGetSuccess, jlms.failFile );						
		jlms.fileEntry.writeText = text;			
		jlms.fileEntry.createWriter(jlms.gotFileWriter, jlms.failFile);
	},
	gotFileWriter: function( writer ) {       			
        writer.write( jlms.fileEntry.writeText );
    },
	make_base_auth: function(user, password) {
		var tok = user + ':' + password;
		var hash = btoa(tok);
		return "Basic " + hash;
	},
	login: function( site, name, pass) {			
			
			if( site === undefined ) 
			{				
				var access = jlms.access();				
				
				if( access === false ) 
				{
					$.mobile.changePage( "login-first.html" );
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
						$.mobile.changePage( "dashboard.html" );
					},		
			        error: function( jqXHR, textStatus, errorThrown){						
						$.mobile.changePage( "login-first.html" );						
			        }
			    });						
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
						jlms.writeToFile(jlms.consts.FILE_NAME_ACCESS, access);												
						jlms.synchConfig();
					},		
			        error: function( jqXHR, textStatus, errorThrown){						
						alert(textStatus+' '+errorThrown);
			        }
			    });			
			}		
	},	
	synchConfig: function() {	
		var access = jlms.access();		 										
		var curi = access.site+jlms.consts.PATH_ACCESS+jlms.consts.FILE_NAME_CONFIG;			
		
		jlms.counter = 0;
		jlms.onDownloadSuccess = function(fileEntry) {
			//alert("download complete1: " + fileEntry.fullPath);			
		
			fileEntry.file( jlms.gotFile, jlms.failFile);				
		
			var config = jlms.config();		 				
			
			if( config !== false ) 
			{			
				$(config.options).each( function( i, el ) { 											
					var img = el.img;									
					
					if( img.length > 1 && config.options[i].loaded === undefined ) 
					{
						config.options[i].loaded = true;
						jlms.counter++;
						jlms.downloadFile( access.site+img, jlms.consts.DIR_IMAGES );										
					}
				} ); 		
			}							
			jlms.counter--;				
			if( jlms.counter == 0 ) 
			{				
				$.mobile.changePage( "dashboard.html" );
			}
		};
		jlms.counter++;
		jlms.downloadFile( curi );		
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
	console.log('document ready');
	$.support.cors = true;
	$.mobile.allowCrossDomainPages = true;												
	
	$( document ).delegate("#dashboardPage", "pageinit", function() {					
		var data = jlms.getData();							
		var dir = jlms.getDir(jlms.consts.DIR_IMAGES);		
		
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
		var dir = jlms.getDir(jlms.consts.DIR_IMAGES);				
		var html = '<form><div class="ui-grid-d">';	
		$(data).each( function(i, el) {								
			html += '<div class="ui-block-a"><img style="max-height: 40px;" src="'+dir.fullPath+'/'+el.img+'"/></div>';
			html += '<div class="ui-block-b">'+el.name+'</div>';								
			html += '<div class="ui-block-d"><select name="flip-'+i+'" id="flip-'+i+'" data-role="slider" data-mini="true"><option '+(el.value =='off'?'selected':'')+' value="off">Off</option><option '+(el.value=='on'?'selected':'')+' value="on">On</option></select></div>';				
		});				
		html += '</div></form>';						
		$('#setupPage #content').append(html).trigger( "create" );					
					
		$('#setupPage #save-btn').click(function() {			
			var text = '{"options":[';			
			$('#setupPage select').each( function( i, el) {
				if( i != 0 ) 
				{	
					text += ',';
				}				
				text += '{"value":"'+$(el).val()+'"}';				
			});
			text += ']}';									
			//alert(text);
			
			jlms.writeToFile( jlms.consts.FILE_NAME_USERSETUP, text );
			$.mobile.changePage( "dashboard.html" );
		})
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
		
		$('#loginPage-first #exit-btn').click(function() {
			navigator.app.exitApp();
		})
		
		$('#loginPage-first #test-data-btn').click(function() {
			$('#loginPage-first #site').val('http://projects.joomlalms.com/mobile/');
			$('#loginPage-first #name').val('student_1');
			$('#loginPage-first #password').val('password');		
		})		
	});					
})		

jlms.onReady = function() {		
	jlms.login();		
}	