/*
 * background.js:
 * listen for messages from contentscript.js
 * messages contain wp object with info about article
 * construct DPLA API queries using that info
 * when we have some API results, sendResponse back to contentscript.js
 */

'use strict';

// boilerplate from yeoman
chrome.runtime.onInstalled.addListener(function (details) {
    console.log('previousVersion', details.previousVersion);
});

chrome.runtime.onMessage.addListener( function ( request, sender, sendResponse ) {
    var id = sender.tab.id;

    console.log( 'Message from a content script at', sender.tab.url, 'with id', id );
    console.dir(sender);

    if ( request.hello === 'hello' ) {
      sendResponse( { farewell: 'goodbye' } );
    }
});
