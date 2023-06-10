var port = chrome.runtime.connect({ name: "sidepanel" });
function get_liMarkUp(myURL, myTitle) {
    return `<li><label><input type="checkbox" /><data value="${myURL}">`
        + `${myTitle}</data></label><details><summary>${myURL}</summary>`
        + `<label>pull interval: <select><option value="1" selected="true">`
        + `Daily</option><option value="2">Weekly</option></select> </label><`
        + `label hidden="true">Weekday<input type="range" list="days" min="1" `
        + `max="7"/></label><datalist id="days"><option value="1"></option><`
        + `option value="2"></option><option value="3"></option><option value=`
        + `"4"></option><option value="5"></option><option value="6"></option>`
        + `<option value="7"></option></datalist><label><input type="number" `
        + `min="1395" max="86400" value="61230" /> seconds</label><aside `
        + `contenteditable="true">${myURL}<br />${myTitle}</aside></details></`
        + `li>`
}
function pushFeeds(element_id, feeds) {
    myFeeds = document.querySelector('#' + element_id)
    feeds.forEach
        (feed_entry => myFeeds.innerHTML += get_liMarkUp(feed_entry.href,
            feed_entry.title))
}
port.onMessage.addListener(function (msg) {
    switch (msg.title) {
        case "new":
            document.querySelector("#newFeeds").innerHTML += get_liMarkUp
                (msg.feedURL, msg.feedTitle)
            port.postMessage({ title: "new" }); break
        case "discarded": pushFeeds("discarded", msg.feeds); break
        case "new feeds": pushFeeds("newFeeds", msg.feeds)
            port.postMessage({ title: "new feeds" })
    }
});