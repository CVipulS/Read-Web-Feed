let newFeeds = [], subscribed = [], discarded = [], myPort = null
let retrieval = chrome.storage.local.get().then((items) => {
    if (2 < Object.keys(items).length) subscribed = items.subscribed, discarded
        = items.discarded
    if (0 < Object.keys(items).length) newFeeds = items.newFeeds
});
let MyOverlay = () => chrome.action.getBadgeText({}).then(badge => {
    if ("" == badge) chrome.action.setBadgeText({ text: "New" })
})
chrome.runtime.onStartup.addListener(async () => {
    await retrieval
    if (0 < newFeeds.length) MyOverlay()
})
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
            }).then(async res => {
                await retrieval
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
                chrome.storage.local.set({ newFeeds: newFeeds })
            })
    })
})
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
chrome.runtime.onConnect.addListener(async port => {
    if ("sidepanel" != port.name) return
    myPort = port, port.onDisconnect.addListener(() => {
        myPort = null
        if (1 > newFeeds.length) chrome.action.setBadgeText({ text: "" })
    })
    await retrieval
    port.onMessage.addListener(msg => {
        let lookup = -1
        switch (msg.title) {
            case "new": MyOverlay(); discarded.unshift(newFeeds.pop()); break
            case "new feeds":
                discarded = newFeeds.concat(discarded), newFeeds = []; break
            case "subscription": lookup = discarded.findIndex(feed => msg.idURL
                == feed.href), lookup = - 1 < lookup ? (subscribed.push(
                    discarded[lookup]), discarded.splice(lookup, 1), subscribed
                        .length - 1) : subscribed.findIndex(feed => msg.idURL
                            == feed.href), subscribed[lookup].frequency =
                msg.daysFrequency, subscribed[lookup].day = msg.day, subscribed
                [lookup].waits = msg.duration, subscribed[lookup].meta =
                msg.customMeta, port.postMessage({ title: "updated" }); break
            case "discard":
                lookup = subscribed.findIndex(feed => msg.idURL == feed.href)
                if (- 1 < lookup) discarded.push(subscribed[lookup]),
                    subscribed.splice(lookup, 1)
                port.postMessage({ title: "updated" });
        }
        chrome.action.setBadgeText({ text: "" }), chrome.storage.local.set({
            newFeeds: newFeeds, subscribed: subscribed, discarded: discarded
        })
    })
    port.postMessage({
        title: "discarded",
        feeds: discarded
    })
    if (0 < newFeeds.length) port.postMessage({
        title: "new feeds",
        feeds: newFeeds
    })
    port.postMessage({
        title: "subscribed",
        feeds: subscribed
    })
})