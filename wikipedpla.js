var wp = {
        // object representing the page's properties
        title: $('#firstHeading').text(),
        categories: [],
        otherTitles: [],
        redirects: [],
        // find the categories on the page
        getCategories: function () {
            $('#mw-normal-catlinks li').each( function (index, el){
                // this == current DOM el, not wp
                wp.categories.push( $(el).text() );
            });
        },
        // find any '"Foo" redirects here.' alternate titles
        getOtherTitles: function () {
            $('.dablink').each(function (index, el){
                test = $(el).text().match('"(.*)" redirects here.' );
                if (test) {
                    // this == current DOM el, not wp
                    wp.otherTitles.push(test[1]);
                }
            });
        }
    },
    // used in constructing the DPLA URI
    apiKey = 'e4c036f3302aad8d8c188683967b9619',
    apiBase = 'http://api.dp.la/v2/items',
    // counters used when employing backup query terms
    catCounter = 0,
    titleCounter = 0,
    // these vars will hold metadata from DPLA's API
    dpla = {},
    suggestions = [],
    // construct DPLA API JSONP query
    buildURI = function (query) {
        return apiBase + '?api_key=' + apiKey + '&q=' + encodeURIComponent(query) + '&callback=_handleResponse';
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
            current.title = $.isArray( res.title ) ? res.title[0] : res.title;
            current.title = trunc(current.title);
            current.uri = item.isShownAt;
            // TODO: don't just arbitrarily take 2nd type here
            current.type = $.isArray( res.type ) ? res.type[1] : res.type;
            current.isImage = isItAnImage(res);
            suggestions.push(current);
            current = {};
        });

        if ( typeof callback === 'function' ) {
            callback();
        }
    },
    // on off-chance title contains unescaped HTML,
    // replace any angle brackets < > with HTML entities
    rmAngles = function (str) {
        return str.replace('<','&lt;').replace('>','&gt;');
    },
    // add HTML to page based on info in suggestions array
    displaySuggestions = function () {
        // this is a terrible way to construct HTML
        // TODO: use a legit templating library like Mustache
        var html = '<style>.dp-img:after { content: " "; background: url(https://upload.wikimedia.org/wikipedia/commons/a/a3/VisualEditor_-_Icon_-_Picture.svg); width: 12px; height: 12px; display: inline-block; background-size: 12px 12px;} }</style><div id="wikipedpla" class="dablink" style="display:none;"><a href="http://dp.la">DPLA</a> items of possible interest:',
            last = false,
            len = suggestions.length;

        $.each(suggestions, function (index, item) {
            if (index + 1 == len) {
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
        // #mw-content-text is the main body of article
        $('#mw-content-text').prepend(html);
        $('#wikipedpla').show('slow');
    },
    // given DPLA doc, see if its type array contains 'image'
    isItAnImage = function (resource) {
        var t = resource.type;
        // type could be array or string
        if ($.isArray(type)) {
            for (var type in t) {
                if ( type.toLowerCase() == 'image' ) {
                    return true;
                }
            }
            return false;
        } else if ( t && t.toLowerCase() === 'image' ) {
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
        if (unsafeWindow) {
            unsafeWindow._handleResponse = _handleResponse;
        }

        if ( id.substr(-4) === 'main' ) {
            wp.getCategories();
            wp.getOtherTitles();
            getData(wp.title);
        }
    };

init();
