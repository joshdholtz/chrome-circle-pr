/* Listen for messages */
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	// Gets branch name form document
	var branch = document.getElementsByClassName("current-branch")[1].children[0].innerHTML;
	msg["branch"] = branch
	sendResponse(msg);
});
