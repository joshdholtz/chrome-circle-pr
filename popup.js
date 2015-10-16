
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
      if (x.status >= 200 && x.status < 300) {
        callback(x);
      } else {
        errorCallback(x);
      }
    }
  }
  x.onerror = function() {
    errorCallback('Network error.');
  };
  if (body) {
    x.send(JSON.stringify(body));
  } else {
    x.send();
  }
}

// Renders top half to popup
function renderStatus(statusText) {
  document.getElementById('status').innerHTML = statusText;
}

// Render bottom half of popup
function renderBuilds(buildsHTML) {
  document.getElementById('builds').innerHTML = buildsHTML;
}

// This we need to use later
var githubPullRequestUrl = null;
var owner = null;
var repo = null;
var pull = null;

document.addEventListener('DOMContentLoaded', function() {
  getCurrentTabUrl(function(url, tab) {

    githubPullRequestUrl = url;

    // Gets the parts of the endpoint of the pages url says regex is hard (and not fun)
    var el = document.createElement('a');
    el.href = url;
    var parts = el.pathname.split("/");

    // Makes sure we can get the owner and repo base off of the url
    if (parts.length >= 3) {
      owner = parts[1];
      repo = parts[2];

      setTimeout(function() {
        chrome.tabs.sendMessage(tab.id, {}, showListOfBuilds);
      }, 500);
    } else {
      renderBuilds("This is not a Github page...");
    }

    // Verify that we are on a github pull request with regex on URL
    if (parts.length >= 5 && parts[3] === "pull") {
      pull = parts[4];

      // Creates the "Make build of PR" button
      var button = "<button id='kickOffButton'>Make build for PR " + pull + "</button>"
      var textfield = "<input id='parameters' type='text' placeholder='Build params as JSON (optional)'></intput"
      renderStatus(button + textfield);

      document.getElementById('kickOffButton').addEventListener('click', function () {
        document.getElementById('kickOffButton').disabled = true;
        var parameters = document.getElementById("parameters").value
        chrome.tabs.sendMessage(tab.id, { parameters: parameters }, doStuffWithDOM);
      });

    } else {
      renderStatus('Cannot create a build from this page');
    }

  });
});

// Shows a list of most recent builds from CircleCI
function showListOfBuilds(message) {

  renderBuilds("Loading list of recent CircleCI builds...");

  var branch = message.branch

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

    /*
     * Look for current builds
     */
    var circleURL = "https://circleci.com/api/v1/project/" + owner + "/" + repo + "?shallow=true&offset=0&limit=30&circle-token=" + circleToken;
    if (branch) {
      circleURL = "https://circleci.com/api/v1/project/" + owner + "/" + repo +"/tree/" + branch + "?shallow=true&offset=0&limit=30&circle-token=" + circleToken;
    }
    sendRequest(circleURL, 'GET', null, function(response) {

      var buildsForThisPR = []

      var obj = JSON.parse(response.responseText);
      for (var key in obj) {
        var build = obj[key]
        var pullRequestUrls = build["pull_request_urls"];

        var indexOfPR = pullRequestUrls.indexOf(githubPullRequestUrl)
        if (indexOfPR > -1 || pull === null) {
          buildsForThisPR.push(build)
        }
      }

      var listeners = [];

      var buildsHTML = ""

      buildsHTML += "<table><tbody>";
      buildsHTML += "<tr><th>Build</th><th>Branch</th><th>Log</th><th>Status</th><th>Outcome</th><th colspan=2>Action</th></tr>"
      for (var key in obj) {
        var build = obj[key]

        var status = build["status"];
        var startTime = build["start_time"];
        var outcome = build["outcome"];
        var buildUrl = build["build_url"];
        var buildNum = build["build_num"];
        var pullRequestUrls = build["pull_request_urls"];
        var subject = build["subject"];
        var buildBranch = build["branch"];

        if (outcome === null) {
          outcome = "running";
        }

        var viewButtonID = "btn-view-" + buildNum
        var cancelButtonID = "btn-cancel-" + buildNum

        buildsHTML += "<tr>";
        buildsHTML += "<td>" + buildNum + "</td>";
        buildsHTML += "<td>" + buildBranch + "</td>";
        buildsHTML += "<td>" + subject + "</td>";
        buildsHTML += "<td>" + status + "</td>";
        buildsHTML += "<td>" + outcome + "</td>";
        if (outcome === "running") {
          buildsHTML += "<td><button id='" + viewButtonID + "' type='button' text='View'>View</button></td>";
          buildsHTML += "<td><button id='" + cancelButtonID + "' type='button' text='Cancel'>Cancel</button></td>";
        } else {
          buildsHTML += "<td><button id='" + viewButtonID + "' type='button' text='View')'>View</button></td>";
          buildsHTML += "<td><td/>";
        }
        buildsHTML += "</tr>";


      }
      buildsHTML += "</tbody></table>";
      renderBuilds(buildsHTML);

      setTimeout(function() {
        for (var key in obj) {
          (function() {
            var build = obj[key]
            var buildNum = build["build_num"];

            var viewButtonID = "btn-view-" + buildNum
            var cancelButtonID = "btn-cancel-" + buildNum

            var viewBtn = document.getElementById(viewButtonID);
            var cancelBtn = document.getElementById(cancelButtonID);

            if (viewBtn) {
              viewBtn.addEventListener('click', function() {
                openCircleBuild(build);
              });
            }

            if (cancelBtn) {
              cancelBtn.addEventListener('click', function(event) {
                cancelCircleBuild(build, event.target)
              });
            }
          }());

        }
      }, 250);

    }, function(errorMessage) {

    });

  });

}

function openCircleBuild(build) {
  var buildUrl = build["build_url"];
  chrome.tabs.create({ url: buildUrl });
}

function cancelCircleBuild(build, element) {

  element.disabled = true

  var buildUrl = build["build_url"];
  var owner = build["username"];
  var repo = build["reponame"];
  var branch = build["branch"];
  var buildNum = build["build_num"];

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

    var circleURL = "https://circleci.com/api/v1/project/" + owner + "/" + repo +"/" + buildNum + "/cancel?circle-token=" + circleToken;
    sendRequest(circleURL, 'POST', null, function(response) {

      setTimeout(function() {
        getCurrentTabUrl(function(url, tab) {
          chrome.tabs.sendMessage(tab.id, {}, showListOfBuilds);
        });
      }, 500);

    });

  });


}

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
      renderStatus('Started build for - ' + owner + "/" + repo +"/tree/" + branch);

      // var obj = JSON.parse(response.responseText);
      // var buildUrl = obj['build_url'];
      // chrome.tabs.create({ url: buildUrl });

      setTimeout(function() {
        getCurrentTabUrl(function(url, tab) {
          chrome.tabs.sendMessage(tab.id, {}, showListOfBuilds);
        });
      }, 500);

    }, function(errorMessage) {
      renderStatus('Error :( - ' + errorMessage);
    });

  });

}
