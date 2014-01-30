// ==UserScript==
// @name       WikipeDPLA
// @author     Phette23
// @website    https://github.com/phette23/wikipedpla
// @updateURL  https://raw.github.com/phette23/wikipedpla/master/userscript.js
// @namespace  WikipeDPLA
// @version    0.4.1
// @description  Shows links to possibly related DPLA items at the top of Wikipedia pages.
// @match      http://*.wikipedia.org/wiki/*
// @match      https://*.wikipedia.org/wiki/*
// exclude some common, non-articles namespaces
// @exclude    https://*.wikipedia.org/wiki/User:*
// @exclude    https://*.wikipedia.org/wiki/Wikipedia:*
// @exclude    https://*.wikipedia.org/wiki/Talk:*
// @grant      unsafeWindow
// @copyright  CC0 Public Domain
// ==/UserScript==
// work around Greasemonkey's lack of access to window vars
var jQuery = unsafeWindow.jQuery,
    $ = jQuery;
var wp = {
        // object representing the page's properties
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
                test = $(el).text().match('"(.*)" redirects here.');
                if (test) {
                    // this == current DOM el, not wp
                    wp.otherTitles.push(test[1]);
                }
            });
        }
    },
    // counters used when employing backup query terms
    catCounter = 0,
    titleCounter = 0,
    // these vars will hold metadata from DPLA's API
    dpla = {},
    suggestions = [],
    // construct DPLA API JSONP query
    buildURI = function (query) {
        var key = 'e4c036f3302aad8d8c188683967b9619',
            base = 'http://api.dp.la/v2/items';
        return base + '?api_key=' + key + '&q=' + encodeURIComponent(query) + '&callback=_handleResponse';
    },
    // append JSONP script to DOM
    getData = function (query) {
        $('body').append('<script src="'+ buildURI(query) +'"></script>');
    },
    // callback function for JSONP data
    _handleResponse = function (data) {
        dpla = data;
        var numResults = dpla.docs.length;

        if (numResults > 0) {
            // if there are any results, show them
            buildSuggestions(displaySuggestions);
        } else {
            // no objects in query? try otherTitles
            if (titleCounter < wp.otherTitles.length) {
                getData(wp.otherTitles[titleCounter]);
                titleCounter++;
            } else if (catCounter < wp.categories.length) {
                // still nothing? try categories
                getData(wp.categories[catCounter]);
                catCounter++;
            }
        }

    },
    // truncate string if too long & add …
    trunc = function (str, int) {
        // default to 60 char cutoff
        var cutoff = parseInt(int, 10) || 60,
            // lots of Hathi Trust titles end in ' /'
            newStr = str.replace(/(\s\/)$/, '');
        if (newStr.length > cutoff) {
            // trim trailing whitespace of substring
            return newStr.substr(0, cutoff).replace(/\s$/,'') + "&hellip;";
        } else {
            return newStr;
        }
    },
    // map DPLA metadata into suggestions array
    buildSuggestions = function (callback) {
        var items = dpla.docs,
            current = {};

        $.each(items, function (ind, item){
            var res = item.sourceResource;
            current.title = $.isArray(res.title) ? res.title[0] : res.title;
            current.title = trunc(current.title);
            current.uri = item.isShownAt;
            current.isImage = isItAnImage(res);
            suggestions.push(current);
            current = {};
        });

        if (typeof callback === 'function') {
            callback();
        }
    },
    // on off-chance title contains unescaped HTML,
    // replace any angle brackets < > with HTML entities
    rmAngles = function (str) {
        return str.replace('<','&lt;').replace('>','&gt;');
    },
    // put constructed HTML on DOM
    // but only if top of the article is in view
    addToDOM = function (html) {
        var topEls = $('#firstHeading').add('.dablink');
        // #mw-content-text is main body of article
        $('#mw-content-text').prepend(html);
        // hide content initially
        $('#wikipedpla').css('display', 'hidden');

        // only display if element is visible
        // true => check for only partial visibility
        if (topEls.visible(true)) {
            $('#wikipedpla').show('slow');
        } else {
            // check if topEls are in view with every scroll
            // might have to revisit performance of this
            // scroll handlers are trouble
            $(window).on('scroll', function (event){
                if (topEls.visible(true)) {
                    $('#wikipedpla').show('slow');
                    $(window).off('scroll');
                }
            });
        }
    },
    // add HTML to page based on info in suggestions array
    displaySuggestions = function () {
        // this is a terrible way to construct HTML
        // TODO: use a legit templating library like Mustache
        var html = '<style>.dp-img:after { content: " "; background: url(https://upload.wikimedia.org/wikipedia/commons/a/a3/VisualEditor_-_Icon_-_Picture.svg); width: 12px; height: 12px; display: inline-block; background-size: 12px 12px;} }</style><div id="wikipedpla" class="dablink" style="display:none;"><a href="http://dp.la">DPLA</a> items of possible interest:',
            last = false,
            len = suggestions.length;


        $.each(suggestions, function (index, item) {
            if (index + 1 == len && len !== 1) {
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
        html += '</div>';

        addToDOM(html);
    },
    // given DPLA doc, see if its type array contains 'image'
    isItAnImage = function (resource) {
        var t = resource.type;
        // type could be array or string
        if ($.isArray(type)) {
            for (var type in t) {
                if (type.toLowerCase() == 'image') {
                    return true;
                }
            }
            return false;
        } else if (t && t.toLowerCase() === 'image') {
            return true;
        } else {
            return false;
        }
    },
    // run all the things if we're in the main namespace
    init = function () {
        // only execute on the Main (Articles) namespace
        // the first tab, text "Articles", has an id
        // of form "cs-nstab-$NAMESPACE"
        var id = $('li[id^="ca-nstab-"]').attr('id');

        // ensure JSONP callback function is in the global scope
        if (!window._handleResponse) {
            window._handleResponse = _handleResponse;
        }
        // adding a function to global scope in Grease/TamperMonkey
        if (typeof unsafeWindow !== 'undefined') {
            unsafeWindow._handleResponse = _handleResponse;
        }

        if (id.substr(-4) === 'main') {
            wp.getCategories();
            wp.getOtherTitles();
            getData(wp.title);
        }
    };

// jQuery().visible() plugin
// github.com/teamdf/jquery-visible
(function($){

    /**
     * Copyright 2012, Digital Fusion
     * Licensed under the MIT license.
     * http://teamdf.com/jquery-plugins/license/
     *
     * @author Sam Sehnert
     * @desc A small plugin that checks whether elements are within
     *       the user visible viewport of a web browser.
     *       only accounts for vertical position, not horizontal.
     */
    var $w = $(window);
    $.fn.visible = function(partial,hidden,direction){

        if (this.length < 1)
            return;

        var $t        = this.length > 1 ? this.eq(0) : this,
            t         = $t.get(0),
            vpWidth   = $w.width(),
            vpHeight  = $w.height(),
            direction = (direction) ? direction : 'both',
            clientSize = hidden === true ? t.offsetWidth * t.offsetHeight : true;

        if (typeof t.getBoundingClientRect === 'function'){

            // Use this native browser method, if available.
            var rec = t.getBoundingClientRect(),
                tViz = rec.top    >= 0 && rec.top    <  vpHeight,
                bViz = rec.bottom >  0 && rec.bottom <= vpHeight,
                lViz = rec.left   >= 0 && rec.left   <  vpWidth,
                rViz = rec.right  >  0 && rec.right  <= vpWidth,
                vVisible   = partial ? tViz || bViz : tViz && bViz,
                hVisible   = partial ? lViz || lViz : lViz && rViz;

            if(direction === 'both')
                return clientSize && vVisible && hVisible;
            else if(direction === 'vertical')
                return clientSize && vVisible;
            else if(direction === 'horizontal')
                return clientSize && hVisible;
        } else {

            var viewTop         = $w.scrollTop(),
                viewBottom      = viewTop + vpHeight,
                viewLeft        = $w.scrollLeft(),
                viewRight       = viewLeft + vpWidth,
                offset          = $t.offset(),
                _top            = offset.top,
                _bottom         = _top + $t.height(),
                _left           = offset.left,
                _right          = _left + $t.width(),
                compareTop      = partial === true ? _bottom : _top,
                compareBottom   = partial === true ? _top : _bottom,
                compareLeft     = partial === true ? _right : _left,
                compareRight    = partial === true ? _left : _right;

            if(direction === 'both')
                return !!clientSize && ((compareBottom <= viewBottom) && (compareTop >= viewTop)) && ((compareRight <= viewRight) && (compareLeft >= viewLeft));
            else if(direction === 'vertical')
                return !!clientSize && ((compareBottom <= viewBottom) && (compareTop >= viewTop));
            else if(direction === 'horizontal')
                return !!clientSize && ((compareRight <= viewRight) && (compareLeft >= viewLeft));
        }
    };

})(jQuery);

init();
