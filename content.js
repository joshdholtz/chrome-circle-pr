/* Listen for messages */
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
		var branch = document.getElementsByClassName("current-branch")[1].children[0].innerHTML;
		msg["branch"] = branch
		console.log("msg", msg)
    sendResponse(msg);
});
