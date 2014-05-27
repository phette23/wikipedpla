/* global $ */
/*
 * background.js:
 * listen for messages from contentscript.js
 * messages contain wp object with info about article
 * construct DPLA API queries using that info
 * when we have some API results, sendResponse back to contentscript.js
 */

'use strict';

// construct a query URI
var buildURI = function (query) {
    var base = 'http://api.dp.la/v2/items',
        key = 'e4c036f3302aad8d8c188683967b9619';

    return base + '?api_key=' + key + '&q=' + encodeURIComponent(query);
},
// truncate string if too long & add …
trunc = function (str, int) {
    // default to 60 char cutoff
    var cutoff = parseInt(int, 10) || 60,
        // lots of Hathi Trust titles end in ' /'
        newStr = str.replace(/(\s\/)$/, '');
    if (newStr.length > cutoff) {
        // trim trailing whitespace of substring
        return newStr.substr(0, cutoff).replace(/\s$/,'') + '&hellip;';
    } else {
        return newStr;
    }
},
// given DPLA doc, see if its type array contains 'image'
isItAnImage = function (resource) {
    var types = resource.type;
    // type could be array or string
    if ($.isArray(types)) {
        for (var type in types) {
            if (types.hasOwnProperty(type) && type.toLowerCase() === 'image') {
                return true;
            }
        }
        return false;
    } else if (types && types.toLowerCase() === 'image') {
        return true;
    } else {
        return false;
    }
},
buildSuggestions = function (dpla) {
    var items = dpla.docs,
        current = {},
        suggestions = [];

    $.each(items, function (ind, item){
        var res = item.sourceResource;

        current.title = $.isArray(res.title) ? res.title[0] : res.title;
        current.title = trunc(current.title);
        current.uri = item.isShownAt;
        current.isImage = isItAnImage(res);

        suggestions.push(current);
        current = {};
    });

    return suggestions;
},
// send XHR to DPLA, pass results to callback
getDPLAresults = function (wp, cb) {
    var xhr = new XMLHttpRequest(),
        // @TODO only using title, need to employ fallbacks if no results
        url = buildURI(wp.title);

    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            var dpla = JSON.parse(xhr.responseText),
                suggestions = buildSuggestions(dpla);

            cb(suggestions);
        }
    };

    xhr.send();
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // contentscript sends wp object with info about article
    var wp = request,
        id = sender.tab.id;

    console.log('Message from a content script at', sender.tab.url);

    getDPLAresults(wp, function (suggestions) {
        // sendResponse never seems to work
        // but this does
        chrome.tabs.sendMessage(id, suggestions);
    });
});
