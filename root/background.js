let newFeeds = [], subscribed = [], discarded = [], myPort = null
function MyOverlay() {
    chrome.action.getBadgeText({}).then(badge => {
        if ("" == badge) chrome.action.setBadgeText({ text: "New" })
    })
}
chrome.webNavigation.onCompleted.addListener(details => {
    if (details.url.startsWith("about:") || details.url.startsWith("chrome:")
        || details.url.includes("://chrome.google.com/webstore")) return
    chrome.tabs.query({ discarded: false }).then(availableTabs => {
        requiredTabArray = availableTabs.filter(v => v.id == details.tabId)
        if (0 < requiredTabArray.length)
            chrome.scripting.executeScript({
                target: { tabId: details.tabId, frameIds: [details.frameId] },
                func: () => Array.from(document.querySelectorAll(
                    "link[type*='atom+xml'],link[type*='rss+xml']"),
                    link => ({ href: link.href, title: link.title }))
            }).then(res => {
                res.forEach(r => {
                    if (null != r.result && 0 < r.result.length)
                        r.result.forEach(feed => {
                            if (!(newFeeds.some(feedEntry =>
                                feed.href == feedEntry.href)
                                || subscribed.some(feedEntry =>
                                    feed.href == feedEntry.href)
                                || discarded.some(feedEntry =>
                                    feed.href == feedEntry.href))) {
                                newFeeds.unshift(feed)
                                if (null != myPort) myPort.postMessage({
                                    title: "new",
                                    feedURL: feed.href,
                                    feedTitle: feed.title
                                })
                                else MyOverlay()
                            }
                        })
                })
            })
    })
})
chrome.runtime.onConnect.addListener(port => {
    if ("sidepanel" != port.name) return
    myPort = port, port.onDisconnect.addListener(() => {
        myPort = null
        if (1 > newFeeds.length) chrome.action.setBadgeText({ text: "" })
    })
    port.onMessage.addListener(msg => {
        switch (msg.title) {
            case "new": MyOverlay(); discarded.unshift(newFeeds.pop()); break
            case "new feeds":
                discarded = newFeeds.concat(discarded), newFeeds = []; break
            case "subscription": case "discard": port.postMessage({ title: "updated" });
        }
    })
    port.postMessage({
        title: "discarded",
        feeds: discarded
    })
    if (0 < newFeeds.length) port.postMessage({
        title: "new feeds",
        feeds: newFeeds
    })
})