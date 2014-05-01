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
                var test = $(el).text().match('"(.*)" redirects here.');

                if (test) {
                    // this == current DOM el, not wp
                    wp.otherTitles.push(test[1]);
                }
            });
        }
    },
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
            if (wp.otherTitles.length > 0) {
                getData(wp.otherTitles.pop());
            } else if (wp.categories.length > 0) {
                // still nothing? try categories
                getData(wp.categories.pop());
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
        $('#wikipedpla').show('slow');
    },
    // add HTML to page based on info in suggestions array
    displaySuggestions = function () {
        // this is a terrible way to construct HTML
        // TODO: use a legit templating library like Mustache
        var html = '<style>.dp-img:after { content: " "; background: url(https://upload.wikimedia.org/wikipedia/commons/a/a3/VisualEditor_-_Icon_-_Picture.svg); width: 12px; height: 12px; display: inline-block; background-size: 12px 12px;} }</style><div id="wikipedpla" class="dablink" style="display:none;"><a href="http://dp.la">DPLA</a> ',
            last = false,
            s = suggestions,
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
    // run all the things if we're in the main namespace
    init = function () {
        // only execute on the Main (Articles) namespace
        // the first tab, text "Articles", has an id
        // of form "cs-nstab-$NAMESPACE"
        var tab = $('li[id^="ca-nstab-"]'),
            id = tab.attr('id'),
            onMainPg = (tab.text() === 'Main Page');

        // ensure JSONP callback function is in the global scope
        if (!window._handleResponse) {
            window._handleResponse = _handleResponse;
        }

        // adding a function to global scope in Grease/TamperMonkey
        if (typeof unsafeWindow !== 'undefined') {
            unsafeWindow._handleResponse = _handleResponse;
        }

        if (id.substr(-4) === 'main' && !onMainPg) {
            wp.getCategories();
            wp.getOtherTitles();
            getData(wp.title);
        }

        // remove click handler; no need to load DPLA results twice
        $('#loaddpla').off('click', init).css('cursor', 'default');
    };

// add "Load DPLA" icon
$('#firstHeading').append(' <a attr="load DPLA results" id="loaddpla" style="cursor:pointer;">DPLA</a>');
$('#loaddpla').on('click', init);
