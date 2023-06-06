chrome.webNavigation.onCompleted.addListener(details => {
    chrome.tabs.query({ discarded: false }).then(completedTabs => {
        completedTabs = completedTabs.filter(v => v.id == details.tabId
            && !(v.url?.startsWith("chrome://")
                || v.url?.startsWith("about:")))
        if (0 < completedTabs.length)
            chrome.scripting.executeScript({
                target: { tabId: details.tabId, frameIds: [details.frameId] },
                func: () => Array.from(document.querySelectorAll(
                    "link[type*='atom+xml'],link[type*='rss+xml']"),
                    link => link.href)
            }).then(res => {
                res.forEach(r => {
                    if (null != r.result && 0 < r.result.length) console.log(r.result)
                })
            })
    })
})