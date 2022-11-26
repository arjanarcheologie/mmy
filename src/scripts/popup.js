var mailFolders = [];
var filter = "";
var selectedMailFolders = [];
var selectedRow = -1;
var action;
var messageList;
var historyArray = [];
var ACTION_MOVE = "move-msg";
var ACTION_JUMP = "fldr-jump";
var ACTION_MOVEJUMP = "move-jump";
var numberOfAccounts;

console.log('start popup')

//browser.runtime.sendMessage( { 'type': 'message', 'content' : 'hallo dit is content script' })

var gettingTitle = messenger.browserAction.getTitle({});

gettingTitle.then(function (title) {
   action = title;
   if (action == ACTION_MOVE || action == ACTION_MOVEJUMP) {
      messenger.mailTabs.getSelectedMessages().then(
         selectedMessages => {
            console.log('geselecteerde berichten:')
            console.log(selectedMessages.messages)
            if (!selectedMessages.messages.length) {
               window.close(); //no messages, so stop process
            } else {
               messageList = selectedMessages;
            }
         },
         error => {
            window.close(); // no messages, or error, stop process
         }
      );
   }
});

/** returns true if folder is in the history
 */
function historyContains(folder) {
   for (var i = 0; i < historyArray.length; i++) {
      if (historyArray[i].path == folder.path) {
         return true;
      }
   }
   return false;
}

/** Move the message(s) to selected folder
 */
async function fireMoveAction(destFolder, messageList) {
   console.log('move or jump action')
   if (!historyContains(destFolder)) {
      historyArray.push(destFolder);
      if (historyArray.length > 10) {
         historyArray.shift();
      }
   }
   await messenger.storage.local.set({
      history: historyArray
   }).then({});
   if (action == ACTION_MOVE || action == ACTION_MOVEJUMP) {
      browser.runtime.sendMessage({
         'type': 'move',
         'destFolder': destFolder,
         'messages': messageList.messages
      })
   }
   if (action == ACTION_JUMP || action == ACTION_MOVEJUMP) {
      browser.runtime.sendMessage({
         'type': 'show',
         'destFolder': destFolder
      })
   }
   console.log('END move or jump action')
   window.close();
}

/**
 * folder -> MailFolder 
 * returns: array of subfolders from nested objects, or return only this object if no subfolders
 */
function getSubFolders(folder) {
   let folders = []
   folders.push(folder)
   if (folder.hasOwnProperty('subFolders')) {
      for (let i = 0; i < folder.subFolders.length; i++) {
         folders = folders.concat(getSubFolders(folder.subFolders[i]))
      }
      return folders
   } else {
      return folders
   }
}

/** Initialize folder list
 */
messenger.accounts.list().then(accounts => {
   /** get list of all folders in all accounts, save it in global var
    */
   console.log("get all folders")
   numberOfAccounts = accounts.length;
   for (i = 0; i < accounts.length; i++) {
      console.log("get all folders from account" + i)
      let account = accounts[i]
      for (j = 0; j < account.folders.length; j++) {
         let folder = account.folders[j]
         mailFolders = mailFolders.concat(getSubFolders(folder))
      }
   }
   mailFolders.sort(compareFolders);
   browser.storage.local.get({
      history: []
   }).then(
      result => {
         historyArray = result.history;
         makeFolderList();
      });
});

function compareFolders(a, b) {
   if (a.path < b.path) {
      return -1;
   }
   if (a.path > b.path) {
      return 1;
   }
   return 0;
}

/** If enter pressed, and determine if return is pressed, if so and there is 1 folder in the list: excute move message
 */
document.addEventListener('keyup', determineKeyPressed);

/** Determine keypress Return (action: move folder) or key up/down (walk through list)
 */
function determineKeyPressed(event) {
   var listLength = document.getElementsByTagName('li').length;
   if (event.keyCode == 13) {
      if (listLength == 1) {
         fireMoveAction(selectedMailFolders[0], messageList);
      } else if (selectedRow > -1) {
         fireMoveAction(selectedMailFolders[selectedRow], messageList);
      }
   } else if (event.keyCode == 40) { //key down
      if (selectedRow < listLength - 1) {
         if (selectedRow > -1) {
            document.getElementsByTagName('li')[selectedRow].classList.remove("selected");
         }
         selectedRow = selectedRow + 1;
         document.getElementsByTagName('li')[selectedRow].classList.add("selected");
      } else { // selectedRow = listLength, jump to -1
         document.getElementsByTagName('li')[selectedRow].classList.remove("selected");
         selectedRow = -1;
      }
   } else if (event.keyCode == 38) { //key up
      if (selectedRow > -1) {
         if (selectedRow < listLength) {
            document.getElementsByTagName('li')[selectedRow].classList.remove("selected");
         }
         selectedRow = selectedRow - 1;
         if (selectedRow > -1) {
            document.getElementsByTagName('li')[selectedRow].classList.add("selected");
         }
      } else { // selectedRow = -1, jump selection to end of list
         selectedRow = listLength - 1;
         document.getElementsByTagName('li')[selectedRow].classList.add("selected");
      }
   } else {
      updateFolderList();
   }
}

/** Extracts the first 10 hits from all folders, using the text filter
 */
function makeFolderList() {
   var listbox = document.getElementById('list');
   if (listbox != null) {
      listbox.remove();
   }
   listbox = document.createElement('ui');
   listbox.setAttribute("id", "list");
   listbox.setAttribute("tabindex", "0");
   document.body.appendChild(listbox);
   var k = 0;
   selectedMailFolders = []; //reset global var
   if (filter == "") {
      foldersToShow = historyArray;
   } else {
      foldersToShow = mailFolders;
   }
   for (j = 0; j < foldersToShow.length; j++) {
      let folderName = foldersToShow[j].path;
      if (folderName.toLowerCase().indexOf(filter) == -1) {
         continue;
      }
      var listItem = document.createElement('li');
      if (k == selectedRow) {
         listItem.classList.add("selected");
      }
      listItem.setAttribute("id", k);
      selectedMailFolders.push(foldersToShow[j]);
      listItem.addEventListener("click", getSelectedFolder);
      if (numberOfAccounts > 1) {
         folderName = "[" + foldersToShow[j].accountId + "]" + folderName;
      }
      var label = document.createTextNode(folderName);
      listItem.appendChild(label);
      listbox.appendChild(listItem);
      k = k + 1;
      if (k == 10) {
         break;
      }
   }
}

/** Function and event binding for update the folder list after key input (keydown)
 */
const updateFolderList = function (e) {
   selectedRow = -1; //reset row selection
   filter = document.getElementById("filter").value.toLowerCase();
   makeFolderList();
}

/** Get selected folder from list
 */
function getSelectedFolder(event) {
   var id = event.target.attributes.id.value;
   fireMoveAction(selectedMailFolders[id], messageList);
}
