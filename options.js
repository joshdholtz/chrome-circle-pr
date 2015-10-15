function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

// Saves options to chrome.storage.sync.
function save_options() {
	alert("hi");
  var config = document.getElementById('config').value;
	if (isJsonString(config)) {
	  chrome.storage.sync.set({
	    config: config,
	  }, function() {
	    // Update status to let user know options were saved.
	    var status = document.getElementById('status');
	    status.textContent = 'Options saved.';
	    setTimeout(function() {
	      status.textContent = '';
	    }, 750);
	  });
	} else {
		// Update status to let user know options were saved.
		var status = document.getElementById('status');
		status.textContent = 'Invalid JSON.';
		setTimeout(function() {
			status.textContent = '';
		}, 750);
	}
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    config: '',
  }, function(items) {
    document.getElementById('config').value = items.config;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
