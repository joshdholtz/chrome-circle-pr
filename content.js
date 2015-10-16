/* Listen for messages */
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  // Gets branch name form document
	var element = document.getElementsByClassName("current-branch")[1];
	var branch = null;

	if (element !== undefined) {
		branch = element.children[0].innerHTML;
	  msg["branch"] = branch
	}
  sendResponse(msg);
});
