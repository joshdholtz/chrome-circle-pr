
function getCurrentTabUrl(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    var tab = tabs[0];
    var url = tab.url;
    callback(url, tab);
  });
}

// Doing sick nasty raw-ish ajax request
function sendRequest(url, method, body, callback, errorCallback) {
  var x = new XMLHttpRequest();
  x.open(method, url);
  x.setRequestHeader('Accept', 'application/json');
  x.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  x.onreadystatechange = function() {
    if (x.readyState == 4) {
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

    // Verify that we are on a github pull request with regex on URL
    var regex = /github.com\/(.*)\/(.*)\/pull\/([0-9]+)/;
    var matches = regex.exec(url);
    if (matches && matches.length == 4) {
      owner = matches[1];
      repo = matches[2];
      pull = matches[3];

      var button = "<button id='kickOffButton'>Make build for PR " + pull + "</button>"
      var textfield = "<input id='parameters' type='text' placeholder='Build params as JSON (optional)'></intput"
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

    // Create the build parameters for the repo
    var buildParameters = {
      OWNER: owner,
      REPO: repo,
      PULL: pull,
      BRANCH: branch
    }

    // Merge the build parameters with the cudstom parameters that we need to send in the request
    for (var attrname in customParameters) { buildParameters[attrname] = customParameters[attrname]; }
    var body = {
      build_parameters: buildParameters
    };

    // Send the parameterized build to CicleCI
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
