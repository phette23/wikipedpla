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
    title: $('#firstHeading').text(),
    categories: [],
    otherTitles: [],
    redirects: [],
    // find the categories on the page
    getCategories: function () {
        $('#mw-normal-catlinks li').each(function (index, el){
            // this == current DOM el, not wp
            wp.categories.push($(el).text());
        });
    },
    // find any '"Foo" redirects here.' alternate titles
    getOtherTitles: function () {
        $('.dablink').each(function (index, el){
            var test = $(el).text().match('"(.*)" redirects here.');
            if (test) {
                // this == current DOM el, not wp
                wp.otherTitles.push(test[1]);
            }
        });
    }
},
// on off-chance title contains unescaped HTML,
// replace any angle brackets < > with HTML entities
rmAngles = function (str) {
    return str.replace('<','&lt;').replace('>','&gt;');
},
// put constructed HTML on DOM
// @TODO but only if top of the article is in view
addToDOM = function (html) {
    // #mw-content-text is main body of article
    $('#mw-content-text').prepend(html);
    $('#wikipedpla').show('slow');
},
// add HTML to page based on info in suggestions array
displaySuggestions = function (s) {
    // this is a terrible way to construct HTML
    // TODO: use a legit templating library like Mustache
    var html = '<div id="wikipedpla" class="dablink" style="display:none;"><a href="http://dp.la">DPLA</a> ',
        last = false,
        len = s.length;

    if (len === 1) {
        html += 'item of possible interest:';
        html += ' <a href="' + rmAngles(s[0].uri) + '"';
        if (s[0].isImage) {
            html += ' class="dp-img"';
        }
        html += '>' + rmAngles(s[0].title) + '</a>.';
    } else {
        html += 'items of possible interest:';
        $.each(s, function (index, item) {
            if (index + 1 === len) {
                last = true;
            }
            if (last) {
                html += ' & ';
            }
            html += ' <a href="' + rmAngles(item.uri) + '"';
            if (item.isImage) {
                html += ' class="dp-img"';
            }
            html += '>' + rmAngles(item.title);
            if (!last) {
                html += '</a>,';
            } else {
                html += '</a>.';
            }
        });
    }

    html += '</div>';

    addToDOM(html);
},
init = function() {
    // only execute on the Main (Articles) namespace
    // the first tab, text "Articles", has an id
    // of form "cs-nstab-$NAMESPACE"
    var tab = $('li[id^="ca-nstab-"]'),
        id = tab.attr('id'),
        onMainPg = (tab.text() === 'Main Page');

    if (id.substr(-4) === 'main' && !onMainPg) {
        wp.getCategories();
        wp.getOtherTitles();

        chrome.runtime.sendMessage(wp, function (response) {
            // this never fires but onMessage.addListener below does
            console.log('got a response:', response);
        });

        chrome.runtime.onMessage.addListener(function (req) {
            console.log('content script got msg');
            displaySuggestions(req);
        });
    }
};

init();
