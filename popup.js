// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url, tab);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, function(tabs) {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * @param {string} searchTerm - Search term for Google Image search.
 * @param {function(string,number,number)} callback - Called when an image has
 *   been found. The callback gets the URL, width and height of the image.
 * @param {function(string)} errorCallback - Called when the image is not found.
 *   The callback gets a string that describes the failure reason.
 */
function sendRequest(url, method, body, callback, errorCallback) {
  // Google image search - 100 searches per day.
  // https://developers.google.com/image-search/
  var x = new XMLHttpRequest();
  x.open(method, url);
  x.setRequestHeader('Accept', 'application/json');
  x.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  x.onreadystatechange = function() {
    if (x.readyState == 4) {
      console.log("x", x);
      if (x.status == 201) {
        callback(x);
      } else {
        errorCallback(x);
      }
    }
  }
  x.onerror = function() {
    errorCallback('Network error.');
  };
  x.send(JSON.stringify(body));
}

function renderStatus(statusText) {
  document.getElementById('status').innerHTML = statusText;
}

var owner = null;
var repo = null;
var pull = null;

document.addEventListener('DOMContentLoaded', function() {
  getCurrentTabUrl(function(url, tab) {
    // Put the image URL in Google search.
    var regex = /github.com\/(.*)\/(.*)\/pull\/([0-9]+)/;
    var matches = regex.exec(url);
    if (matches && matches.length == 4) {
      owner = matches[1];
      repo = matches[2];
      pull = matches[3];

      var button = "<button id='kickOffButton'>Make build for PR " + pull + "</button>"
      var textfield = "<input id='parameters' type='text'></intput"
      renderStatus(button + textfield);

      document.getElementById('kickOffButton').addEventListener('click', function () {
        var parameters = document.getElementById("parameters").value
        chrome.tabs.sendMessage(tab.id, { parameters: parameters }, doStuffWithDOM);
      });

    } else {
      renderStatus('Cannot create a build from this page');
    }
  });
});

/* A function creator for callbacks */
function doStuffWithDOM(message) {

  var branch = message.branch

  var customParameters = {};
  try {
    customParameters = JSON.parse(message.parameters);
  } catch (e) {

  }

  var circleToken = null;

  chrome.storage.sync.get({
    config: '',
  }, function(items) {
    var config = items.config || "{}";
    var obj = JSON.parse(config);
    var circleToken = obj[owner + "/" + repo];
    if (!circleToken) {
      renderStatus("No CircleCI API token found for: " + owner + "/" + repo);
      return;
    }

    var circleURL = "https://circleci.com/api/v1/project/" + owner + "/" + repo +"/tree/" + branch + "?circle-token=" + circleToken;

    var buildParameters = {
      OWNER: owner,
      REPO: repo,
      PULL: pull,
      BRANCH: branch
    }
    console.log("buildParameters", buildParameters);
    for (var attrname in customParameters) { buildParameters[attrname] = customParameters[attrname]; }

    var body = {
      build_parameters: buildParameters
    };
    console.log("body", body);

    sendRequest(circleURL, 'POST', body, function(response) {
      renderStatus('Stated build for - ' + owner + "/" + repo +"/tree/" + branch);

      var obj = JSON.parse(response.responseText);
      var buildUrl = obj['build_url'];
      chrome.tabs.create({ url: buildUrl });
    }, function(errorMessage) {
      renderStatus('Error :( - ' + errorMessage);
    });

  });

}
