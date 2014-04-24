/* global jQuery */
/* jQuery is available since loaded as another content script
 * using v. 1.8.3 since that's what Wikipedia uses, helps with consistency
 *
 * contentscript.js:
 * parse the article's HTML into wp object
 * send {wp} to background.js
 * on response from background.js, insert results into DOM
 */

'use strict';

var $ = jQuery,
    wp = {
        title: $('#firstHeading').text()
    };

chrome.runtime.sendMessage( JSON.stringify(wp), function (response) {
    console.log(response);
});
