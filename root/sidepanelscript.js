var port = chrome.runtime.connect({ name: "sidepanel" });
function pushFeeds(element_id, feeds) {
    myFeeds = document.querySelector('#' + element_id)
    feeds.forEach
        (feed_entry => myFeeds.innerHTML
            += `<li contenteditable="true"><data value="${feed_entry.href}">`
            + `${feed_entry.title}</data></li>`)
}
port.onMessage.addListener(function (msg) {
    switch (msg.title) {
        case "new":
            document.querySelector("#newFeeds").innerHTML
                += `<li contenteditable="true"><data value="${msg.feedURL}">`
                + `${msg.feedTitle}</data></li>`
            port.postMessage({ title: "new" }); break
        case "discarded": pushFeeds("discarded", msg.feeds); break
        case "new feeds": pushFeeds("newFeeds", msg.feeds)
            port.postMessage({ title: "new feeds" })
    }
});