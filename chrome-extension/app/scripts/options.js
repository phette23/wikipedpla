'use strict';
var d = document
    , loadstyle = d.getElementById('loadstyle')
    , numresults = d.getElementById('numresults')
    // see https://developer.chrome.com/extensions/storage
    , storage = chrome.storage.sync;

// unneeded placeholder, fired whenever any form el changes
function storageSet () {
    console.log('options updated');
}

function onLoadstyleChange (ev) {
    storage.set({ 'loadstyle': ev.target.value}, storageSet);
}

function onNumresultsChange (ev) {
    // input values are text by default, parse into integer
    storage.set({ 'numresults': parseInt(ev.target.value) }, storageSet);
}

function localize () {
    // set of CSS selector-textContent pairings
    var map = {
      'h1': 'optsTitle',
      'title': 'optsTitle',
      'label[for="loadstyle"]': 'optsLoadstyleLabel',
      '#loadstyle option[value="icon"]': 'optsLoadIcon',
      '#loadstyle option[value="dablink"]': 'optsLoadDablink',
      '#loadstyle option[value="auto"]': 'optsLoadAuto',
      'label[for="numresults"]': 'optsNumresultsLabel'
    };

    Object.keys(map).forEach(function (key) {
        // see https://developer.chrome.com/extensions/i18n
        // also https://developer.chrome.com/webstore/i18n
        d.querySelector(key).textContent = chrome.i18n.getMessage(map[key]);
    });
}

function fillOptions () {
    // null => get all storage items
    storage.get(null, function (opts) {
        if (opts.loadstyle) {
            loadstyle.value = opts.loadstyle;
        }
        if (opts.numresults) {
            numresults.value = opts.numresults;
        }
    });
}

// add event listeners, fill in stored options values
// replace text with localized strings
function init () {
    // replace defaults with stored values
    storage.get('loadstyle', function (obj) {
        loadstyle.value = obj.loadstyle;
    });
    storage.get('numresults', function (obj) {
        numresults.value = obj.numresults;
    });

    // replace text with localized strings
    localize();

    // fill in any already-selected options
    fillOptions();

    // listen for changes then save them to storage
    loadstyle.addEventListener('change', onLoadstyleChange, false);
    numresults.addEventListener('change', onNumresultsChange, false);
}

// kick it off
d.addEventListener('DOMContentLoaded', init, false);
