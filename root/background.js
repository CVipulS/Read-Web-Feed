var creating_offscreen
let newFeeds = [], subscribed = [], discarded = [], posts = [], myPort = null,
    amilistening = false
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
    if (details.url.startsWith("about:") || details.url.startsWith("chrome")
        || details.url.includes("://chrome.google.com/webstore")) return
    chrome.tabs.query({ discarded: false }).then(availableTabs => {
        requiredTabArray = availableTabs.filter(v => v.id == details.tabId)
        if (0 < requiredTabArray.length)
            chrome.scripting.executeScript({
                target: { tabId: details.tabId, frameIds: [details.frameId] },
                func: () => document.contentType.toLowerCase().includes("html")
                    ? Array.from(document.querySelectorAll(
                        "link[rel*='alternate'][type*='atom+xml'],link[rel*="
                        + "'alternate'][type*='rss+xml']"),
                        link => ({
                            href: link.href, title: link.title, dated:
                                Date.now()
                        })) : []
            }).then(async res => {
                await retrieval
                if (subscribed.every(feed => feed.posts.every(item => details.
                    url != item.link))) {
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
                } else {
                    for (feed of subscribed) {
                        let visitIndex = feed.posts.findIndex(entry => details.
                            url == entry.link)
                        if (-1 < visitIndex) {
                            feed.posts[visitIndex].visited = true, chrome.
                                storage.local.set({ subscribed: subscribed })
                            break
                        }
                    }
                }
                if (0 < subscribed.length && 0 == details.frameId) {
                    if (creating_offscreen) await creating_offscreen
                    else {
                        const offscreenUrl = chrome.runtime.getURL(
                            "off_screen.xhtml")
                        const matchedClients = await clients.matchAll()
                        if (matchedClients.every(client => offscreenUrl !=
                            client.url))
                            creating_offscreen = chrome.offscreen.
                                createDocument({
                                    url: 'off_screen.xhtml',
                                    reasons: ['DOM_PARSER'],
                                    justification:
                                        'to get links of individual posts from'
                                        + ' Atom/RSS xml feeds',
                                })
                        await creating_offscreen
                        if (!amilistening)
                            await chrome.runtime.onMessage.addListener(
                                message => {
                                    let checkedIndex = subscribed.findIndex
                                        (feed => message.target == feed.
                                            href)
                                    if (-1 == checkedIndex) return
                                    subscribed[checkedIndex].willCheckAfter +=
                                        1000 * subscribed[checkedIndex].waits
                                    if (subscribed[checkedIndex].frequency)
                                        while (subscribed[checkedIndex].day - 1
                                            != new Date(subscribed[checkedIndex
                                            ].willCheckAfter).getDay())
                                            subscribed[checkedIndex].
                                                willCheckAfter += 86400000
                                    let lastPostIndex = 0 < subscribed[
                                        checkedIndex].posts.length ?
                                        message.data.findIndex(post => post
                                            .link == subscribed
                                            [checkedIndex].posts[0].link) :
                                        message.data.length
                                    if (-1 == lastPostIndex) lastPostIndex =
                                        message.data.length
                                    subscribed[checkedIndex].posts =
                                        message.data.slice(0, lastPostIndex).
                                            concat(subscribed[checkedIndex].
                                                posts)
                                    if (0 < lastPostIndex)
                                        chrome.action.setIcon({
                                            path: {
                                                "16": "icons/activeIcon16x16.png",
                                                "32": "icons/activeIcon32x32.png",
                                                "48": "icons/activeIcon48x48.png",
                                                "128": "icons/activeIcon128x128.png"
                                            }
                                        })
                                    if (subscribed[checkedIndex].posts.some(
                                        post => !Object.hasOwn(post, 'visited')))
                                        subscribed.unshift(
                                            subscribed.splice(checkedIndex, 1)[
                                            0])
                                    if (null != myPort) myPort.postMessage({
                                        title: "subscribed",
                                        feeds: subscribed
                                    })
                                    chrome.storage.local.set({
                                        subscribed: subscribed
                                    })
                                }), amilistening = true
                    }
                    let nextCheckIndex = subscribed.findLastIndex(feed => Date.
                        now() > feed.willCheckAfter)
                    if (-1 < nextCheckIndex) chrome.runtime.sendMessage({
                        target: 'offscreen',
                        data: subscribed[nextCheckIndex].href
                    })
                }
            })
    })
})
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
                            == feed.href), subscribed[lookup].willCheckAfter =
                Date.now(), subscribed[lookup].frequency = msg.daysFrequency,
                subscribed[lookup].day = msg.day, subscribed[lookup].waits =
                msg.duration, subscribed[lookup].meta = msg.customMeta
                if (!Object.hasOwn(subscribed[lookup], 'posts')) subscribed
                [lookup].posts = []
                port.postMessage({ title: "updated" }); break
            case "discard":
                lookup = subscribed.findIndex(feed => msg.idURL == feed.href)
                if (- 1 < lookup) subscribed[lookup].dated = Date.now(),
                    discarded.push(subscribed[lookup]), subscribed.splice(
                        lookup, 1)
                port.postMessage({ title: "updated" });
        }
        let d = new Date()
        d.setDate(d.getDate() - 120), d = d.valueOf()
        discarded = discarded.filter(feed => feed.dated > d)
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
chrome.runtime.onInstalled.addListener(() => chrome.sidePanel.setPanelBehavior(
    { openPanelOnActionClick: true }))