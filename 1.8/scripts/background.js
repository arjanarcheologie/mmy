/**
 * Fired when a registered command is activated using a keyboard shortcut.
 *
 */

messenger.commands.onCommand.addListener((command) => {
    //console.log( command);
    if (command === "move-msg") {
        moveMessage = 0; // move message
    } else if ( command == "fldr-jump" ) {
        browser.browserAction.setIcon({path: "icons/to_folder.svg"});
        moveMessage = 1; // display folder
    }
    messenger.browserAction.setTitle( { title: command} );
    messenger.browserAction.openPopup();
});     




function notify(message ) {
	let type = message.type
	if ( type == 'message'  ){
 		console.log( message )
	} else if  ( type == 'show'  ){ 
		let destFolder = message.destFolder
 		console.log('show the folder' )
		//messenger.mailTabs.query( {} ).then( 
            		//result => {
		messenger.mailTabs.update( null, {displayedFolder:  destFolder } ).then ( //makes the dest folder displayed
			result => {
			},
			error => {
	        	//},
	    		//error=> { 
                		console.log( error )
				messenger.windows.create({
  					height: 400,
  					width: 500,
  					url: "alert.html",
  					type: "popup"
				});
			})
            		//}
		//);
	} else if  ( type == 'move'  ){ 
		let destFolder = message.destFolder
        	let mails = message.messages
 		console.log('move the message(s) to the folder')
 		console.log('count: ' + mails.length)
        	for ( i = 0; i < mails.length; i ++ ){
            		var messageId = mails[i].id;
            		messenger.messages.move ( [messageId], destFolder ).then(
            		result => {
			}, 
			error => {
				console.log( "in move" + error )
			}
		)
		}
	}
}

messenger.runtime.onMessage.addListener(notify);

